import { BetterAuthVanillaAdapter, createClient } from '@neon/neon-js'
import pg from 'pg'
import { elencaBuste, salvaBusta } from '../src/data/buste'
import { impostaAuthDati, impostaClientDati, type ClientDati } from '../src/data/client'
import { attendi, eErroreDati } from '../src/data/errori'
import { elencaEstratti } from '../src/data/estratti'
import { elencaFondi } from '../src/data/fondi'
import { leggiImpostazioni } from '../src/data/impostazioni'
import { elencaMovimenti } from '../src/data/movimenti'
import { accedi, esci } from '../src/data/sessione'
import type { BustaPaga } from '../src/types/dominio'
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
  esitoLetturaAnonima,
  esitoScritturaAltrui,
  esitoScritturaAnonima,
  mancanzeConteggi,
  riepilogo,
  type Controllo,
  type RispostaHttp,
  type TentativoAltrui,
} from './lib/verifica'

const ENV_COLLAUDO = '.env.collaudo.local'

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
  impostaAuthDati(creato.auth)
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
    const controllo: Controllo = {
      nome: 'utente 1: totali R12 da src/data/ e src/calc/',
      mancanza: differenze.length === 0 ? null : differenze.join('; '),
    }
    return { controllo, busta: buste[0] ?? null }
  } finally {
    await esci()
  }
}

async function tentativo(salva: () => Promise<string>): Promise<TentativoAltrui> {
  try {
    await salva()
    return { tipo: 'riuscito' }
  } catch (e) {
    if (eErroreDati(e)) return { tipo: 'rifiutato', errore: e.tipo }
    throw e
  }
}

async function utente2(
  c: Configurazione,
  email: string,
  password: string,
  altrui: BustaPaga,
): Promise<Controllo[]> {
  const client = nuovoClient(c)
  await accedi(email, password)
  try {
    const { id, fondoId, competenza, data, note, righe } = altrui
    const aggiorna = await tentativo(() =>
      salvaBusta({ id, fondoId, competenza, data, note, righe }),
    )
    const crea = await tentativo(() =>
      salvaBusta({ fondoId, competenza, data, note: 'verifica', righe }),
    )
    // Dopo i tentativi: se uno fosse riuscito, la riga creata comparirebbe qui.
    const conteggi = zeri()
    for (const t of TABELLE_UTENTE) {
      conteggi[t] = (await attendi(client.from(t).select('user_id').limit(1))).length
    }
    const mancanze = mancanzeConteggi(conteggi)
    return [
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
  const controlli: Controllo[] = [uno.controllo]
  if (uno.busta === null) {
    controlli.push({ nome: 'utente 2: scritture altrui', mancanza: 'l’utente 1 non ha buste' })
  } else {
    controlli.push(
      ...(await utente2(
        c,
        richiedi(variabili, 'COLLAUDO2_EMAIL'),
        richiedi(variabili, 'COLLAUDO2_PASSWORD'),
        uno.busta,
      )),
    )
  }
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
  const messaggio = eErroreDati(e)
    ? `${e.tipo}: ${e.messaggio}`
    : e instanceof Error
      ? e.message
      : String(e)
  scrivi(`db:verifica: ${messaggio}`)
  scrivi('DATI: ROSSO')
  process.exitCode = 1
})
