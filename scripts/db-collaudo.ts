import pg from 'pg'
import {
  QUERY_ROUTINE,
  controllaRuoloCollaudo,
  istruzioniSvuotamento,
  messaggioSvuotamento,
  type FunzioneTrovata,
  type TabellaTrovata,
} from './lib/collaudo'
import {
  SEED_PREDEFINITO,
  applicaMigrazioni,
  importaPerEmail,
  leggiFileSeed,
  scrivi,
} from './lib/db'
import { caricaVariabili, richiedi, valoreOpzione } from './lib/env'
import { leggiSeed, righeDaSeed } from './lib/importa'

const ENV_COLLAUDO = '.env.collaudo.local'

async function svuota(client: pg.Client): Promise<void> {
  const { rows: tabelle } = await client.query<TabellaTrovata>(
    `select n.nspname as schema, c.relname as nome
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and pg_get_userbyid(c.relowner) = current_user`,
  )
  const { rows: routine } = await client.query<FunzioneTrovata>(QUERY_ROUTINE)
  const { rows: registro } = await client.query<{ esiste: boolean }>(
    `select to_regclass('migrazioni.applicate') is not null as esiste`,
  )
  const istruzioni = istruzioniSvuotamento(tabelle, routine, registro[0]?.esiste === true)
  await client.query('begin')
  try {
    for (const sql of istruzioni) await client.query(sql)
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  }
  scrivi(messaggioSvuotamento(routine.length, tabelle.length))
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const vuoto = argv.includes('--vuoto')
  const variabili = caricaVariabili(valoreOpzione(argv, '--env') ?? ENV_COLLAUDO)
  // Prima di connettersi: seed ed email si controllano senza aver toccato nulla.
  const importa = vuoto
    ? null
    : {
        righe: righeDaSeed(leggiSeed(leggiFileSeed(SEED_PREDEFINITO))),
        email: richiedi(variabili, 'COLLAUDO_EMAIL'),
      }

  const client = new pg.Client({ connectionString: richiedi(variabili, 'DATABASE_URL') })
  await client.connect()
  try {
    // R10: la guardia è la prima query, prima di qualsiasi scrittura.
    const { rows } = await client.query<{ utente: string }>('select current_user as utente')
    controllaRuoloCollaudo(rows[0]?.utente ?? '?')
    scrivi(`Connesso come ${rows[0]?.utente ?? '?'} (branch collaudo)`)

    await svuota(client)
    await applicaMigrazioni(client)
    if (importa === null) scrivi('--vuoto: schema rifatto, nessun import.')
    else await importaPerEmail(client, importa.email, importa.righe)
  } finally {
    await client.end()
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`db:collaudo: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
