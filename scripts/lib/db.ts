import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import {
  daApplicare,
  eMigrazione,
  hashContenuto,
  mancanzeFunzioni,
  mancanzeSicurezza,
  type FileMigrazione,
  type RigaRegistro,
  type StatoFunzione,
  type StatoTabella,
} from './migrazioni'
import {
  TABELLE_UTENTE,
  TOTALI_ATTESI,
  archivioDaRighe,
  decidiImport,
  differenzeTotali,
  righeTotali,
  totaliDi,
  type RigheImport,
  type RigheLette,
  type TabellaUtente,
  type UtenteTrovato,
} from './importa'
import { centesimiInEuro } from '../../src/calc/importi'

const CARTELLA = fileURLToPath(new URL('../../db/migrations/', import.meta.url))
const PRIVILEGI = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger']

export const scrivi = (riga: string) => process.stdout.write(riga + '\n')

function leggiMigrazioni(): (FileMigrazione & { testo: string })[] {
  return readdirSync(CARTELLA)
    .filter(eMigrazione)
    .map((nome) => {
      const testo = readFileSync(join(CARTELLA, nome), 'utf8')
      return { nome, hash: hashContenuto(testo), testo }
    })
}

async function preparaRegistro(client: pg.Client): Promise<RigaRegistro[]> {
  await client.query('create schema if not exists migrazioni')
  await client.query(`create table if not exists migrazioni.applicate (
    nome text primary key,
    hash text not null,
    applicata_il timestamptz not null default now()
  )`)
  const { rows } = await client.query<RigaRegistro>(
    'select nome, hash from migrazioni.applicate order by nome',
  )
  return rows
}

async function applica(client: pg.Client, registro: RigaRegistro[]): Promise<void> {
  const file = leggiMigrazioni()
  const lista = daApplicare(file, registro)
  if (lista.length === 0) scrivi('Nessuna migration da applicare.')
  for (const m of lista) {
    const testo = file.find((f) => f.nome === m.nome)?.testo ?? ''
    try {
      await client.query('begin')
      await client.query(testo)
      await client.query('insert into migrazioni.applicate (nome, hash) values ($1, $2)', [
        m.nome,
        m.hash,
      ])
      await client.query('commit')
      scrivi(`Applicata ${m.nome}`)
    } catch (e) {
      await client.query('rollback')
      throw new Error(`${m.nome}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

async function controllaSicurezza(client: pg.Client): Promise<void> {
  const { rows: tabelle } = await client.query<{ tabella: string; rls: boolean }>(
    `select c.relname as tabella, c.relrowsecurity as rls
       from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      order by c.relname`,
  )
  const stati: StatoTabella[] = []
  for (const { tabella, rls } of tabelle) {
    const { rows: policy } = await client.query<{ qual: string | null; withCheck: string | null }>(
      `select qual, with_check as "withCheck" from pg_policies
        where schemaname = 'public' and tablename = $1 and 'authenticated' = any(roles)`,
      [tabella],
    )
    const privilegiAnonymous: string[] = []
    for (const privilegio of PRIVILEGI) {
      const { rows } = await client.query<{ ha: boolean }>(
        `select has_table_privilege('anonymous', format('public.%I', $1::text), $2) as ha`,
        [tabella, privilegio],
      )
      if (rows[0]?.ha) privilegiAnonymous.push(privilegio)
    }
    const { rows: predefinito } = await client.query<{ espressione: string }>(
      `select pg_get_expr(d.adbin, d.adrelid) as espressione
         from pg_attrdef d
         join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
        where d.adrelid = format('public.%I', $1::text)::regclass and a.attname = 'user_id'`,
      [tabella],
    )
    stati.push({
      tabella,
      rls,
      policy,
      privilegiAnonymous,
      defaultUserId: predefinito[0]?.espressione ?? null,
    })
  }
  const { rows: funzioni } = await client.query<StatoFunzione>(
    `select p.oid::regprocedure::text as funzione,
            p.prosecdef as "securityDefiner",
            has_function_privilege('anonymous', p.oid, 'execute') as "eseguibileDaAnonymous"
       from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and p.prorettype <> 'trigger'::regtype
      order by 1`,
  )
  const mancanze = [...mancanzeSicurezza(stati), ...mancanzeFunzioni(funzioni)]
  if (mancanze.length > 0) {
    throw new Error(`Controllo di sicurezza fallito:\n  ${mancanze.join('\n  ')}`)
  }
  scrivi(
    `Controllo di sicurezza: ${stati.length} tabelle con RLS, policy e default a posto; ` +
      `${funzioni.length} funzioni senza execute per anonymous.`,
  )
}

/** Registro, migration mancanti (ognuna nella sua transazione) e controllo di sicurezza. */
export async function applicaMigrazioni(client: pg.Client): Promise<void> {
  const registro = await preparaRegistro(client)
  await applica(client, registro)
  await controllaSicurezza(client)
}

/** Utente di Neon Auth con quell'email e quante righe ha già in ogni tabella; null se non c'è. */
async function cercaUtente(client: pg.Client, email: string): Promise<UtenteTrovato | null> {
  const { rows } = await client.query<{ id: string }>(
    'select id::text as id from neon_auth."user" where lower(email) = lower($1)',
    [email],
  )
  if (rows.length > 1) throw new Error(`Più utenti con email ${email} in Neon Auth.`)
  const id = rows[0]?.id
  if (id === undefined) return null
  const conteggi: Record<TabellaUtente, number> = {
    fondi: 0,
    movimenti: 0,
    movimento_righe: 0,
    buste_paga: 0,
    busta_righe: 0,
    estratti_conto: 0,
    impostazioni: 0,
  }
  for (const tabella of TABELLE_UTENTE) {
    const { rows: n } = await client.query<{ n: number }>(
      `select count(*)::int as n from public.${tabella} where user_id = $1`,
      [id],
    )
    conteggi[tabella] = n[0]?.n ?? 0
  }
  return { id, conteggi }
}

const euro = centesimiInEuro
const euroONull = (c: number | null) => (c === null ? null : euro(c))

function idInserito(rows: { id: string }[], cosa: string): string {
  const id = rows[0]?.id
  if (id === undefined) throw new Error(`Import: l'insert di ${cosa} non ha restituito un id.`)
  return id
}

function idDi(mappa: Map<string, string>, chiave: string, cosa: string): string {
  const id = mappa.get(chiave)
  if (id === undefined) throw new Error(`Import: ${cosa} «${chiave}» non inserito.`)
  return id
}

async function inserisci(client: pg.Client, utente: string, r: RigheImport): Promise<void> {
  const fondi = new Map<string, string>()
  for (const f of r.fondi) {
    const { rows } = await client.query<{ id: string }>(
      'insert into fondi (user_id, nome) values ($1, $2) returning id',
      [utente, f.nome],
    )
    fondi.set(f.chiave, idInserito(rows, `fondo ${f.chiave}`))
  }

  const movimenti = new Map<string, string>()
  for (const m of r.movimenti) {
    const { rows } = await client.query<{ id: string }>(
      'insert into movimenti (user_id, fondo_id, data, note) values ($1, $2, $3, $4) returning id',
      [utente, idDi(fondi, m.fondo, 'fondo'), m.data, m.note],
    )
    const id = idInserito(rows, `movimento ${m.chiave}`)
    movimenti.set(m.chiave, id)
    for (const riga of m.righe) {
      await client.query(
        'insert into movimento_righe (user_id, movimento_id, tipo, importo) values ($1, $2, $3, $4)',
        [utente, id, riga.tipo, euro(riga.importo)],
      )
    }
  }

  for (const b of r.buste) {
    const movimento = b.movimento === null ? null : idDi(movimenti, b.movimento, 'movimento')
    const { rows } = await client.query<{ id: string }>(
      `insert into buste_paga (user_id, fondo_id, competenza, data, movimento_id, note)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [utente, idDi(fondi, b.fondo, 'fondo'), b.competenza, b.data, movimento, b.note],
    )
    const id = idInserito(rows, `busta ${b.chiave}`)
    for (const riga of b.righe) {
      await client.query(
        'insert into busta_righe (user_id, busta_id, tipo, importo) values ($1, $2, $3, $4)',
        [utente, id, riga.tipo, euro(riga.importo)],
      )
    }
  }

  for (const e of r.estratti) {
    await client.query(
      'insert into estratti_conto (user_id, fondo_id, data, valore, note) values ($1, $2, $3, $4, $5)',
      [utente, idDi(fondi, e.fondo, 'fondo'), e.data, euro(e.valore), e.note],
    )
  }

  const i = r.impostazioni
  await client.query(
    `insert into impostazioni (user_id, anno_nascita, eta_pensione, rendimento, inflazione, crescita,
       tfr_mensile, datore_mensile, personale_mensile, volontario_mensile, aliquota, limite_deducibile)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      utente,
      i.annoNascita,
      i.etaPensione,
      i.rendimento,
      i.inflazione,
      i.crescita,
      euroONull(i.tfrMensile),
      euroONull(i.datoreMensile),
      euroONull(i.personaleMensile),
      euro(i.volontarioMensile),
      i.aliquota,
      euro(i.limiteDeducibile),
    ],
  )
}

async function rileggi(client: pg.Client, utente: string): Promise<RigheLette> {
  const leggi = async <T extends pg.QueryResultRow>(sql: string) =>
    (await client.query<T>(sql, [utente])).rows
  return {
    fondi: await leggi('select id, nome from fondi where user_id = $1'),
    movimenti: await leggi(
      'select id, fondo_id, data::text as data, note from movimenti where user_id = $1',
    ),
    movimento_righe: await leggi(
      'select movimento_id, tipo, importo from movimento_righe where user_id = $1',
    ),
    buste_paga: await leggi(
      `select id, fondo_id, competenza::text as competenza, data::text as data, movimento_id, note
         from buste_paga where user_id = $1`,
    ),
    busta_righe: await leggi('select busta_id, tipo, importo from busta_righe where user_id = $1'),
    estratti_conto: await leggi(
      'select id, fondo_id, data::text as data, valore, note from estratti_conto where user_id = $1',
    ),
    impostazioni:
      (
        await leggi<NonNullable<RigheLette['impostazioni']>>(
          `select anno_nascita, eta_pensione, rendimento, inflazione, crescita, tfr_mensile,
                  datore_mensile, personale_mensile, volontario_mensile, aliquota, limite_deducibile
             from impostazioni where user_id = $1`,
        )
      )[0] ?? null,
  }
}

/** R11-R12: import per l'utente con quell'email, in un'unica transazione; rollback se i totali non tornano. */
export async function importaPerEmail(
  client: pg.Client,
  email: string,
  righe: RigheImport,
): Promise<void> {
  const esito = decidiImport(email, await cercaUtente(client, email))
  if (esito.tipo === 'rifiuta') throw new Error(esito.messaggio)
  const utente = esito.utente

  await client.query('begin')
  try {
    await inserisci(client, utente, righe)
    const totali = totaliDi(archivioDaRighe(await rileggi(client, utente)))
    const differenze = differenzeTotali(totali, TOTALI_ATTESI)
    if (differenze.length > 0) {
      throw new Error(`Totali diversi dall'atteso, import annullato:\n  ${differenze.join('\n  ')}`)
    }
    await client.query('commit')
    scrivi(`Importato per ${email}:`)
    for (const riga of righeTotali(totali)) scrivi(`  ${riga}`)
  } catch (e) {
    await client.query('rollback')
    throw e
  }
}

export const SEED_PREDEFINITO = fileURLToPath(new URL('../../data/seed.json', import.meta.url))

export function leggiFileSeed(percorso: string): unknown {
  let testo: string
  try {
    testo = readFileSync(percorso, 'utf8')
  } catch {
    throw new Error(`Il file ${percorso} non esiste o non si legge.`)
  }
  try {
    return JSON.parse(testo)
  } catch {
    throw new Error(`Il file ${percorso} non è JSON valido.`)
  }
}
