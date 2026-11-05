import pg from 'pg'
import {
  MESSAGGIO_GIA_GOOGLE,
  MESSAGGIO_SOLO_GOOGLE,
  controllaRuoloCollaudo,
  istruzioneSoloGoogle,
  messaggioUtenteAssente,
  queryAccountUtente,
  statoSoloGoogle,
  utentiAggiuntivi,
  type RigaAccount,
} from './lib/collaudo'
import { scrivi } from './lib/db'
import { caricaVariabili, richiedi, valoreOpzione } from './lib/env'

const ENV_COLLAUDO = '.env.collaudo.local'

async function main(): Promise<void> {
  const variabili = caricaVariabili(valoreOpzione(process.argv.slice(2), '--env') ?? ENV_COLLAUDO)
  // R3: l'update parte solo su un'email che ha passato i controlli degli utenti aggiuntivi.
  const [, , u5] = utentiAggiuntivi(variabili)

  const client = new pg.Client({ connectionString: richiedi(variabili, 'DATABASE_URL') })
  await client.connect()
  try {
    // R1: la guardia è la prima query, prima di qualsiasi scrittura.
    const { rows } = await client.query<{ utente: string }>('select current_user as utente')
    controllaRuoloCollaudo(rows[0]?.utente ?? '?')

    const account = queryAccountUtente(u5.email)
    const { rows: righe } = await client.query<RigaAccount>(account.sql, account.parametri)
    const stato = statoSoloGoogle(righe)
    if (stato.tipo === 'assente') throw new Error(messaggioUtenteAssente(u5.email))
    if (stato.tipo === 'già google') {
      scrivi(MESSAGGIO_GIA_GOOGLE)
      return
    }

    const update = istruzioneSoloGoogle(stato.idUtente)
    await client.query('begin')
    try {
      const { rowCount } = await client.query(update.sql, update.parametri)
      if (rowCount !== 1)
        throw new Error(`Aggiornate ${rowCount ?? 0} righe invece di 1. Nessuna modifica.`)
      await client.query('commit')
    } catch (e) {
      await client.query('rollback')
      throw e
    }
    scrivi(MESSAGGIO_SOLO_GOOGLE)
  } finally {
    await client.end()
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`db:collaudo-google: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
