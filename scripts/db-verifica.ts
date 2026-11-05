import { BetterAuthVanillaAdapter, createClient } from '@neon/neon-js'
import pg from 'pg'
import { elencaBuste, salvaBusta } from '../src/data/buste'
import { authDaSdk, impostaAuthDati, impostaClientDati, type ClientDati } from '../src/data/client'
import { attendi, eErroreDati } from '../src/data/errori'
import { elencaEstratti } from '../src/data/estratti'
import { elencaFondi, eliminaFondo, salvaFondo } from '../src/data/fondi'
import { leggiImpostazioni } from '../src/data/impostazioni'
import type { Bozza } from '../src/data/mappe'
import { elencaMovimenti, eliminaMovimento, salvaMovimento } from '../src/data/movimenti'
import { accedi, esci } from '../src/data/sessione'
import type { BustaPaga, Fondo, Movimento } from '../src/types/dominio'
import { controllaRuoloCollaudo } from './lib/collaudo'
import { scrivi } from './lib/db'
import { caricaVariabili, richiedi, valoreOpzione, type Variabili } from './lib/env'
import {
  TABELLE_UTENTE,
  TOTALI_ATTESI,
  differenzeTotali,
  totaliDi,
  type TabellaUtente,
} from './lib/importa'
import {
  MESSAGGIO_ALTRO_FONDO,
  MESSAGGIO_BUSTA_ASSENTE,
  MESSAGGIO_BUSTA_COLLEGATA,
  esitoBustaAncoraDaVersare,
  esitoLetturaAnonima,
  esitoRifiutoAtteso,
  esitoScritturaAltrui,
  esitoScritturaAnonima,
  esitoStatoInvariato,
  mancanzaCollegamentoPerso,
  mancanzeConteggi,
  riepilogo,
  type Controllo,
  type RispostaHttp,
  type StatoCollegamento,
  type TentativoAltrui,
} from './lib/verifica'

const ENV_COLLAUDO = '.env.collaudo.local'

// R11: riconoscibile come residuo di verifica.
const NOME_TEMPORANEO = 'verifica db — temporaneo'

interface Configurazione {
  authUrl: string
  dataApiUrl: string
}

// Better Auth rifiuta i POST senza Origin: è un dominio già ammesso sul branch collaudo.
const ORIGINE = 'http://localhost:4174'

/** Node non ha cookie: la sessione del sign-in va rimandata a mano, se no `get-session` non dà il JWT. */
function adapterConCookie() {
  const cookie = new Map<string, string>()
  return BetterAuthVanillaAdapter({
    fetchOptions: {
      onRequest: (ctx) => {
        ctx.headers.set('Origin', ORIGINE)
        if (cookie.size > 0) {
          ctx.headers.set('Cookie', [...cookie].map(([k, v]) => `${k}=${v}`).join('; '))
        }
      },
      onSuccess: (ctx) => {
        for (const riga of ctx.response.headers.getSetCookie()) {
          const coppia = riga.split(';', 1)[0] ?? ''
          const uguale = coppia.indexOf('=')
          if (uguale > 0) cookie.set(coppia.slice(0, uguale), coppia.slice(uguale + 1))
        }
      },
    },
  })
}

/** Un client nuovo per ogni utente, iniettato in `src/data/`. */
function nuovoClient(c: Configurazione): ClientDati {
  const creato = createClient({
    auth: { url: c.authUrl, adapter: adapterConCookie() },
    dataApi: { url: c.dataApiUrl },
  })
  impostaClientDati(creato)
  impostaAuthDati(authDaSdk(creato.auth))
  return creato
}

async function controllaRuolo(databaseUrl: string): Promise<void> {
  const db = new pg.Client({ connectionString: databaseUrl })
  await db.connect()
  try {
    const { rows } = await db.query<{ utente: string }>('select current_user as utente')
    controllaRuoloCollaudo(rows[0]?.utente ?? '?')
  } finally {
    await db.end()
  }
}

async function utente1(c: Configurazione, email: string, password: string) {
  nuovoClient(c)
  await accedi(email, password)
  try {
    const [fondi, buste, movimenti, estratti, impostazioni] = await Promise.all([
      elencaFondi(),
      elencaBuste(),
      elencaMovimenti(),
      elencaEstratti(),
      leggiImpostazioni(),
    ])
    const differenze = differenzeTotali(
      totaliDi({ fondi, buste, movimenti, estratti, impostazioni }),
      TOTALI_ATTESI,
    )
    // R13: i totali prima delle prove che scrivono.
    const controlli: Controllo[] = [
      {
        nome: 'utente 1: totali R12 da src/data/ e src/calc/',
        mancanza: differenze.length === 0 ? null : differenze.join('; '),
      },
    ]
    const collegata = buste.find((b) => b.movimentoId !== null) ?? null
    const daVersare = buste.find((b) => b.movimentoId === null) ?? null
    controlli.push(...(await provaBustaCollegata(collegata)))
    controlli.push(...(await provaAltroFondo(daVersare)))
    return { controlli, busta: buste[0] ?? null, daVersare }
  } finally {
    await esci()
  }
}

function descrivi(e: unknown): string {
  if (eErroreDati(e)) return `${e.tipo}: ${e.messaggio}`
  return e instanceof Error ? e.message : String(e)
}

function bozzaProva(fondoId: string): Bozza<Movimento> {
  return { fondoId, data: '2026-01-15', righe: [{ tipo: 'TFR', importo: 100 }], note: 'verifica' }
}

async function statoCollegamento(bustaId: string): Promise<StatoCollegamento> {
  const [movimenti, buste] = await Promise.all([elencaMovimenti(), elencaBuste()])
  return {
    movimenti: movimenti.length,
    righe: movimenti.reduce((n, m) => n + m.righe.length, 0),
    movimentoId: buste.find((b) => b.id === bustaId)?.movimentoId ?? null,
  }
}

/** Converte un rifiuto del DB in esito; conserva il valore di un salvataggio riuscito per la pulizia (R9). */
async function tentativo<T>(
  salva: () => Promise<T>,
): Promise<{ esito: TentativoAltrui; valore: T | null }> {
  try {
    const valore = await salva()
    return { esito: { tipo: 'riuscito' }, valore }
  } catch (e) {
    if (eErroreDati(e)) {
      return { esito: { tipo: 'rifiutato', errore: e.tipo, messaggio: e.messaggio }, valore: null }
    }
    throw e
  }
}

/** R9: prima i movimenti creati per errore, poi il fondo; ogni residuo è nominato. */
async function pulizia(
  chi: string,
  creati: readonly string[],
  fondo: Fondo | null,
): Promise<Controllo | null> {
  const residui: string[] = []
  for (const id of creati) {
    try {
      await eliminaMovimento(id)
    } catch (e) {
      residui.push(`movimento ${id} (${descrivi(e)})`)
    }
  }
  if (fondo !== null) {
    try {
      await eliminaFondo(fondo.id)
    } catch (e) {
      residui.push(`fondo «${fondo.nome}» ${fondo.id} (${descrivi(e)})`)
    }
  }
  if (residui.length === 0) return null
  return { nome: `${chi}: pulizia dei dati temporanei`, mancanza: `resta ${residui.join(', ')}` }
}

/** R1-R2: sul fondo del seed, una busta già collegata in un movimento nuovo. */
async function provaBustaCollegata(busta: BustaPaga | null): Promise<Controllo[]> {
  if (busta === null) {
    return [
      {
        nome: 'utente 1: R1 busta già collegata in un movimento nuovo',
        mancanza: 'l’utente 1 non ha buste collegate',
      },
    ]
  }
  const creati: string[] = []
  const controlli: Controllo[] = []
  // Fuori dal try: la riga del collegamento perso serve anche se la pulizia fallisce.
  let collegamentoPerso: string | null = null
  try {
    const prima = await statoCollegamento(busta.id)
    const { esito, valore: creato } = await tentativo(() =>
      salvaMovimento(bozzaProva(busta.fondoId), [busta.id]),
    )
    if (creato !== null) {
      creati.push(creato)
      collegamentoPerso = mancanzaCollegamentoPerso(busta.id, prima.movimentoId)
    }
    const dopo = await statoCollegamento(busta.id)
    controlli.push(
      {
        nome: 'utente 1: R1 busta già collegata in un movimento nuovo',
        mancanza: esitoRifiutoAtteso(
          'collegare una busta già collegata in un movimento nuovo',
          esito,
          MESSAGGIO_BUSTA_COLLEGATA,
        ),
      },
      { nome: 'utente 1: R2 stato invariato dopo R1', mancanza: esitoStatoInvariato(prima, dopo) },
    )
  } finally {
    const residuo = await pulizia('utente 1', creati, null)
    if (residuo !== null) controlli.push(residuo)
    if (collegamentoPerso !== null) {
      controlli.push({
        nome: 'utente 1: R1 collegamento originale della busta',
        mancanza: collegamentoPerso,
      })
    }
  }
  return controlli
}

/** R3-R4: una busta da versare del seed in un movimento sul fondo temporaneo. */
async function provaAltroFondo(busta: BustaPaga | null): Promise<Controllo[]> {
  if (busta === null) {
    return [
      {
        nome: 'utente 1: R3 busta su un altro fondo',
        mancanza: 'l’utente 1 non ha buste da versare',
      },
    ]
  }
  let fondo: Fondo
  try {
    fondo = await salvaFondo({ nome: NOME_TEMPORANEO })
  } catch (e) {
    return [
      {
        nome: 'utente 1: R3 busta su un altro fondo',
        mancanza: `il fondo temporaneo non si crea (${descrivi(e)})`,
      },
    ]
  }
  const creati: string[] = []
  const controlli: Controllo[] = []
  try {
    const prima = await statoCollegamento(busta.id)
    const { esito, valore: creato } = await tentativo(() =>
      salvaMovimento(bozzaProva(fondo.id), [busta.id]),
    )
    if (creato !== null) creati.push(creato)
    const dopo = await statoCollegamento(busta.id)
    controlli.push(
      {
        nome: 'utente 1: R3 busta su un altro fondo',
        mancanza: esitoRifiutoAtteso(
          'collegare una busta a un movimento di un altro fondo',
          esito,
          MESSAGGIO_ALTRO_FONDO,
        ),
      },
      { nome: 'utente 1: R4 stato invariato dopo R3', mancanza: esitoStatoInvariato(prima, dopo) },
    )
  } finally {
    const residuo = await pulizia('utente 1', creati, fondo)
    if (residuo !== null) controlli.push(residuo)
  }
  return controlli
}

/** R5: l'utente 2, su un fondo temporaneo suo, prova a collegare una busta da versare dell'utente 1. */
async function provaBustaAltrui(busta: BustaPaga | null): Promise<Controllo[]> {
  if (busta === null) {
    return [
      {
        nome: 'utente 2: R5 collegare una busta altrui',
        mancanza: 'l’utente 1 non ha buste da versare',
      },
    ]
  }
  let fondo: Fondo
  try {
    fondo = await salvaFondo({ nome: NOME_TEMPORANEO })
  } catch (e) {
    return [
      {
        nome: 'utente 2: R5 collegare una busta altrui',
        mancanza: `il fondo temporaneo non si crea (${descrivi(e)})`,
      },
    ]
  }
  const creati: string[] = []
  const controlli: Controllo[] = []
  try {
    const { esito, valore: creato } = await tentativo(() =>
      salvaMovimento(bozzaProva(fondo.id), [busta.id]),
    )
    if (creato !== null) creati.push(creato)
    controlli.push({
      nome: 'utente 2: R5 collegare una busta altrui',
      mancanza: esitoRifiutoAtteso(
        'collegare una busta dell’utente 1',
        esito,
        MESSAGGIO_BUSTA_ASSENTE,
      ),
    })
  } finally {
    const residuo = await pulizia('utente 2', creati, fondo)
    if (residuo !== null) controlli.push(residuo)
  }
  return controlli
}

async function utente2(
  c: Configurazione,
  email: string,
  password: string,
  altrui: BustaPaga,
  daVersare: BustaPaga | null,
): Promise<Controllo[]> {
  const client = nuovoClient(c)
  await accedi(email, password)
  try {
    // R10: il fondo temporaneo sparisce prima del controllo «zero righe».
    const prove = await provaBustaAltrui(daVersare)
    const { id, fondoId, competenza, data, note, righe } = altrui
    const { esito: aggiorna } = await tentativo(() =>
      salvaBusta({ id, fondoId, competenza, data, note, righe }),
    )
    const { esito: crea } = await tentativo(() =>
      salvaBusta({ fondoId, competenza, data, note: 'verifica', righe }),
    )
    // Dopo i tentativi: se uno fosse riuscito, la riga creata comparirebbe qui.
    const conteggi = zeri()
    for (const t of TABELLE_UTENTE) {
      conteggi[t] = (await attendi(client.from(t).select('user_id').limit(1))).length
    }
    const mancanze = mancanzeConteggi(conteggi)
    return [
      ...prove,
      {
        nome: 'utente 2: aggiornare una busta dell’utente 1',
        mancanza: esitoScritturaAltrui('aggiornare una busta dell’utente 1', aggiorna),
      },
      {
        nome: 'utente 2: creare una busta sul fondo dell’utente 1',
        mancanza: esitoScritturaAltrui('creare una busta sul fondo dell’utente 1', crea),
      },
      {
        nome: 'utente 2: zero righe in ogni tabella',
        mancanza: mancanze.length === 0 ? null : mancanze.join('; '),
      },
    ]
  } finally {
    await esci()
  }
}

/** R6 e residui: terza sessione, dopo che l'utente 2 è uscito. */
async function rientroUtente1(
  c: Configurazione,
  email: string,
  password: string,
  bustaR5: BustaPaga | null,
): Promise<Controllo[]> {
  nuovoClient(c)
  await accedi(email, password)
  try {
    const [buste, fondi] = await Promise.all([elencaBuste(), elencaFondi()])
    const r6 =
      bustaR5 === null
        ? 'l’utente 1 non ha buste da versare'
        : esitoBustaAncoraDaVersare(
            bustaR5.id,
            buste.find((b) => b.id === bustaR5.id),
          )
    const residui = fondi.filter((f) => f.nome === NOME_TEMPORANEO)
    return [
      { nome: 'utente 1: R6 busta di R5 ancora da versare', mancanza: r6 },
      {
        nome: 'utente 1: nessun fondo temporaneo residuo',
        mancanza:
          residui.length === 0
            ? null
            : `restano ${residui.map((f) => `«${f.nome}» ${f.id}`).join(', ')}`,
      },
    ]
  } finally {
    await esci()
  }
}

function zeri(): Record<TabellaUtente, number> {
  return {
    fondi: 0,
    movimenti: 0,
    movimento_righe: 0,
    buste_paga: 0,
    busta_righe: 0,
    estratti_conto: 0,
    impostazioni: 0,
  }
}

async function richiesta(
  url: string,
  token: string | null,
  init?: RequestInit,
): Promise<RispostaHttp> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (token !== null) headers.Authorization = `Bearer ${token}`
  const risposta = await fetch(url, { ...init, headers })
  const testo = await risposta.text()
  let corpo: unknown = null
  try {
    corpo = testo === '' ? null : JSON.parse(testo)
  } catch {
    corpo = null
  }
  return { status: risposta.status, corpo }
}

/** JWT del ruolo `anonymous`: con questo le richieste arrivano a Postgres, non si fermano alla Data API. */
async function tokenAnonimo(authUrl: string): Promise<string | null> {
  const r = await fetch(`${authUrl}/token/anonymous`, { headers: { Origin: ORIGINE } })
  if (!r.ok) return null
  const corpo: unknown = await r.json()
  if (typeof corpo !== 'object' || corpo === null || !('token' in corpo)) return null
  return typeof corpo.token === 'string' ? corpo.token : null
}

async function controlliAnonimi(dataApiUrl: string, chi: string, token: string | null) {
  const controlli: Controllo[] = []
  for (const t of TABELLE_UTENTE) {
    const r = await richiesta(`${dataApiUrl}/${t}?select=user_id&limit=1`, token)
    controlli.push({ nome: `${chi}: lettura di ${t}`, mancanza: esitoLetturaAnonima(t, r) })
  }
  const scritture: [string, string, string][] = [
    ['rpc salva_busta', `${dataApiUrl}/rpc/salva_busta`, '{"p":{}}'],
    ['insert in buste_paga', `${dataApiUrl}/buste_paga`, '{}'],
  ]
  for (const [nome, url, body] of scritture) {
    const r = await richiesta(url, token, { method: 'POST', body })
    controlli.push({ nome: `${chi}: ${nome}`, mancanza: esitoScritturaAnonima(nome, r) })
  }
  return controlli
}

async function anonimo(c: Configurazione): Promise<Controllo[]> {
  const senzaToken = await controlliAnonimi(c.dataApiUrl, 'senza token', null)
  const token = await tokenAnonimo(c.authUrl)
  if (token === null) {
    return [...senzaToken, { nome: 'ruolo anonymous', mancanza: 'il token anonimo non si ottiene' }]
  }
  return [...senzaToken, ...(await controlliAnonimi(c.dataApiUrl, 'ruolo anonymous', token))]
}

async function verifica(variabili: Variabili): Promise<Controllo[]> {
  // R10: la guardia viene prima di auth e Data API, perché i controlli provano a scrivere.
  await controllaRuolo(richiedi(variabili, 'DATABASE_URL'))
  const c: Configurazione = {
    authUrl: richiedi(variabili, 'VITE_NEON_AUTH_URL'),
    dataApiUrl: richiedi(variabili, 'VITE_NEON_DATA_API_URL'),
  }

  // Un utente alla volta: la cache di sessione dell'SDK è globale al modulo.
  const uno = await utente1(
    c,
    richiedi(variabili, 'COLLAUDO_EMAIL'),
    richiedi(variabili, 'COLLAUDO_PASSWORD'),
  )
  const controlli: Controllo[] = [...uno.controlli]
  if (uno.busta === null) {
    controlli.push({ nome: 'utente 2: scritture altrui', mancanza: 'l’utente 1 non ha buste' })
  } else {
    controlli.push(
      ...(await utente2(
        c,
        richiedi(variabili, 'COLLAUDO2_EMAIL'),
        richiedi(variabili, 'COLLAUDO2_PASSWORD'),
        uno.busta,
        uno.daVersare,
      )),
    )
  }
  controlli.push(
    ...(await rientroUtente1(
      c,
      richiedi(variabili, 'COLLAUDO_EMAIL'),
      richiedi(variabili, 'COLLAUDO_PASSWORD'),
      uno.daVersare,
    )),
  )
  controlli.push(...(await anonimo(c)))
  return controlli
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const variabili = caricaVariabili(valoreOpzione(argv, '--env') ?? ENV_COLLAUDO)
  const { righe, exitCode } = riepilogo(await verifica(variabili))
  for (const riga of righe) scrivi(riga)
  process.exitCode = exitCode
}

main().catch((e: unknown) => {
  scrivi(`db:verifica: ${descrivi(e)}`)
  scrivi('DATI: ROSSO')
  process.exitCode = 1
})
