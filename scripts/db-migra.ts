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

async function erroreDi(client: pg.Client, sql: string, valori: unknown[]): Promise<string> {
  await client.query('savepoint prova')
  try {
    await client.query(sql, valori)
    await client.query('release savepoint prova')
    return 'nessuno'
  } catch (e) {
    await client.query('rollback to savepoint prova')
    return e instanceof pg.DatabaseError ? `${e.code ?? '?'} ${e.message}` : 'sconosciuto'
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

// Prova delle RPC di 002 in una transazione sempre annullata. Connessi come collaudo_admin
// (bypassrls): l'utente arriva solo dai claims, quindi si prova la logica e non il filtro RLS.
async function provaRpc(client: pg.Client): Promise<void> {
  const utente = 'prova-db-migra'
  const fallimenti: string[] = []
  const attendi = (cosa: string, atteso: string, ottenuto: string) => {
    if (ottenuto !== atteso) fallimenti.push(`${cosa}: atteso ${atteso}, ottenuto ${ottenuto}`)
  }
  const salvaBusta = (p: object) =>
    primoId(client, 'select salva_busta($1::jsonb) as id', [JSON.stringify(p)])
  const salvaMovimento = (p: object) =>
    primoId(client, 'select salva_movimento($1::jsonb) as id', [JSON.stringify(p)])
  const righe = async (tabella: 'busta_righe' | 'movimento_righe', colonna: string, id: string) =>
    (
      await client.query<{ riga: string }>(
        `select string_agg(tipo || ' ' || importo::text, ', ' order by tipo) as riga
           from ${tabella} where ${colonna} = $1`,
        [id],
      )
    ).rows[0]?.riga ?? 'nessuna'
  const collegamento = async (busta: string) =>
    (
      await client.query<{ movimentoId: string | null }>(
        'select movimento_id as "movimentoId" from buste_paga where id = $1',
        [busta],
      )
    ).rows[0]?.movimentoId ?? 'da versare'

  await client.query('begin')
  try {
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: utente }),
    ])
    const fondo = await primoId(client, 'insert into fondi (nome) values ($1) returning id', [
      'Prova RPC',
    ])
    const busta = (mese: string) => ({
      fondo_id: fondo,
      competenza: `2026-${mese}-01`,
      data: `2026-${mese}-27`,
      note: '',
      righe: [
        { tipo: 'TFR', importo: 706.81 },
        { tipo: 'Datore', importo: 30 },
      ],
    })

    const b1 = await salvaBusta(busta('01'))
    attendi(
      'busta con due righe',
      'Datore 30.00, TFR 706.81',
      await righe('busta_righe', 'busta_id', b1),
    )
    await salvaBusta({ ...busta('01'), id: b1, righe: [{ tipo: 'TFR', importo: 177.8 }] })
    attendi(
      'busta risalvata con una riga',
      'TFR 177.80',
      await righe('busta_righe', 'busta_id', b1),
    )
    const { rows: utenti } = await client.query<{ utente: string }>(
      'select user_id as utente from buste_paga where id = $1',
      [b1],
    )
    attendi('user_id della busta dai claims', utente, utenti[0]?.utente ?? 'nessuno')
    const b2 = await salvaBusta(busta('02'))
    const b3 = await salvaBusta(busta('03'))

    const movimento = (buste: string[], importo: number) => ({
      fondo_id: fondo,
      data: '2026-04-15',
      note: '',
      righe: [{ tipo: 'TFR', importo }],
      buste,
    })
    const a = await salvaMovimento(movimento([b1, b2], 100))
    const b = await salvaMovimento(movimento([b3], 50))
    attendi(
      'movimento B con una busta già in A',
      'P0001 La busta paga è già in un altro movimento',
      await erroreDi(client, 'select salva_movimento($1::jsonb)', [
        JSON.stringify({ ...movimento([b3, b1], 60), id: b }),
      ]),
    )
    attendi(
      'righe di B dopo il rifiuto',
      'TFR 50.00',
      await righe('movimento_righe', 'movimento_id', b),
    )
    attendi('busta 3 dopo il rifiuto', b, await collegamento(b3))
    attendi('busta 1 dopo il rifiuto', a, await collegamento(b1))

    await salvaMovimento({ ...movimento([b1], 80), id: a })
    attendi('busta 2 tolta da A', 'da versare', await collegamento(b2))
    attendi('busta 1 resta in A', a, await collegamento(b1))
    attendi('righe nuove di A', 'TFR 80.00', await righe('movimento_righe', 'movimento_id', a))

    await client.query('select elimina_movimento($1)', [a])
    attendi('busta 1 dopo elimina_movimento', 'da versare', await collegamento(b1))
    const { rows: rimasti } = await client.query<{ n: number }>(
      'select count(*)::int as n from movimenti where id = $1',
      [a],
    )
    attendi('movimento A eliminato', '0', String(rimasti[0]?.n ?? -1))
  } finally {
    await client.query('rollback')
  }

  if (fallimenti.length > 0) {
    throw new Error(`Prova delle RPC fallita:\n  ${fallimenti.join('\n  ')}`)
  }
  scrivi('Prova delle RPC: verde (transazione annullata).')
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
    if (argomenti.prova) {
      await provaTrigger(client)
      await provaRpc(client)
    }
  } finally {
    await client.end()
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`db:migra: ${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})
