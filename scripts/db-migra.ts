import pg from 'pg'
import { applicaMigrazioni, scrivi } from './lib/db'
import { caricaVariabili, leggiArgomenti, richiedi } from './lib/env'

async function codiceErrore(client: pg.Client, sql: string, valori: unknown[]): Promise<string> {
  await client.query('savepoint prova')
  try {
    await client.query(sql, valori)
    await client.query('release savepoint prova')
    return 'nessuno'
  } catch (e) {
    await client.query('rollback to savepoint prova')
    return e instanceof pg.DatabaseError ? (e.code ?? 'sconosciuto') : 'sconosciuto'
  }
}

async function primoId(client: pg.Client, sql: string, valori: unknown[]): Promise<string> {
  const { rows } = await client.query<{ id: string }>(sql, valori)
  const id = rows[0]?.id
  if (id === undefined) throw new Error(`Prova: l'insert non ha restituito un id (${sql})`)
  return id
}

// Prova dei trigger di coerenza in una transazione sempre annullata: non lascia dati.
async function provaTrigger(client: pg.Client): Promise<void> {
  const utente = 'prova-db-migra'
  const fallimenti: string[] = []
  const attendi = (cosa: string, atteso: string, ottenuto: string) => {
    if (ottenuto !== atteso) fallimenti.push(`${cosa}: atteso ${atteso}, ottenuto ${ottenuto}`)
  }

  await client.query('begin')
  try {
    const fondo = 'insert into fondi (user_id, nome) values ($1, $2) returning id'
    const fondoA = await primoId(client, fondo, [utente, 'Prova A'])
    const fondoB = await primoId(client, fondo, [utente, 'Prova B'])
    const movimento = await primoId(
      client,
      `insert into movimenti (user_id, fondo_id, data) values ($1, $2, '2026-01-31') returning id`,
      [utente, fondoA],
    )
    const busta = `insert into buste_paga (user_id, fondo_id, competenza, data, movimento_id)
                   values ($1, $2, '2026-01-01', '2026-01-27', $3) returning id`

    attendi(
      'busta di un altro fondo collegata al movimento',
      'P0001',
      await codiceErrore(client, busta, [utente, fondoB, movimento]),
    )
    attendi(
      'movimento su un fondo di un altro utente',
      'P0001',
      await codiceErrore(
        client,
        `insert into movimenti (user_id, fondo_id, data) values ('altro-utente', $1, '2026-01-31')`,
        [fondoA],
      ),
    )

    const bustaId = await primoId(client, busta, [utente, fondoA, movimento])
    attendi(
      'riga di busta con utente diverso dalla testata',
      'P0001',
      await codiceErrore(
        client,
        `insert into busta_righe (user_id, busta_id, tipo, importo) values ('altro-utente', $1, 'TFR', 1)`,
        [bustaId],
      ),
    )
    attendi(
      'cambio di fondo di un movimento con buste collegate',
      'P0001',
      await codiceErrore(client, 'update movimenti set fondo_id = $1 where id = $2', [
        fondoB,
        movimento,
      ]),
    )

    await client.query('delete from movimenti where id = $1', [movimento])
    const { rows } = await client.query<{ movimentoId: string | null }>(
      'select movimento_id as "movimentoId" from buste_paga where id = $1',
      [bustaId],
    )
    attendi(
      'busta dopo l’eliminazione del movimento',
      'da versare',
      rows[0]?.movimentoId === null ? 'da versare' : 'ancora collegata',
    )
  } finally {
    await client.query('rollback')
  }

  if (fallimenti.length > 0) {
    throw new Error(`Prova dei trigger fallita:\n  ${fallimenti.join('\n  ')}`)
  }
  scrivi('Prova dei trigger: verde (transazione annullata).')
}

async function main(): Promise<void> {
  const argomenti = leggiArgomenti(process.argv.slice(2))
  const variabili = caricaVariabili(argomenti.env)
  const client = new pg.Client({ connectionString: richiedi(variabili, 'DATABASE_URL') })
  await client.connect()
  try {
    const { rows } = await client.query<{ utente: string; database: string }>(
      'select current_user as utente, current_database() as database',
    )
    scrivi(`Connesso come ${rows[0]?.utente ?? '?'} a ${rows[0]?.database ?? '?'}`)
    await applicaMigrazioni(client)
    if (argomenti.prova) await provaTrigger(client)
  } finally {
    await client.end()
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`db:migra: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
