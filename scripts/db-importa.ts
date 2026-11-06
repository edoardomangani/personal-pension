import { resolve } from 'node:path'
import pg from 'pg'
import { SEED_PREDEFINITO, importaPerEmail, leggiFileSeed, scrivi } from './lib/db'
import { caricaVariabili, richiedi, valoreOpzione } from './lib/env'
import { leggiSeed, righeDaSeed } from './lib/importa'

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const email = valoreOpzione(argv, '--email')
  if (email === null) throw new Error('Manca --email <email dell’utente in Neon Auth>.')
  const file = valoreOpzione(argv, '--file')
  const righe = righeDaSeed(
    leggiSeed(leggiFileSeed(file === null ? SEED_PREDEFINITO : resolve(file))),
  )

  const variabili = caricaVariabili(valoreOpzione(argv, '--env'))
  const client = new pg.Client({ connectionString: richiedi(variabili, 'DATABASE_URL') })
  await client.connect()
  try {
    const { rows } = await client.query<{ utente: string; database: string }>(
      'select current_user as utente, current_database() as database',
    )
    scrivi(`Connesso come ${rows[0]?.utente ?? '?'} a ${rows[0]?.database ?? '?'}`)
    await importaPerEmail(client, email, righe)
  } finally {
    await client.end()
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`db:importa: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
