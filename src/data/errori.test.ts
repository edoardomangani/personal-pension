import { describe, expect, it } from 'vitest'
import {
  attendi,
  eErroreDati,
  ErroreDati,
  erroreDaEccezione,
  erroreDaRisposta,
  type RispostaDati,
} from './errori'

describe('mappatura degli errori (R6)', () => {
  it('fetch che lancia TypeError → rete', () => {
    expect(erroreDaEccezione(new TypeError('fetch failed')).tipo).toBe('rete')
  })

  it('risposta 401 → sessione', () => {
    expect(erroreDaRisposta(401, { message: 'JWT expired', code: '' }).tipo).toBe('sessione')
  })

  it('errore Postgres 23505 → vincolo, senza testo tecnico', () => {
    const errore = erroreDaRisposta(409, {
      message: 'duplicate key value violates unique constraint "busta_righe_busta_id_tipo_key"',
      code: '23505',
    })
    expect(errore.tipo).toBe('vincolo')
    expect(errore.messaggio).not.toContain('duplicate')
  })

  it('P0001 → vincolo con il messaggio del trigger', () => {
    const errore = erroreDaRisposta(400, {
      message: 'Il movimento è di un altro fondo',
      code: 'P0001',
    })
    expect({ tipo: errore.tipo, messaggio: errore.messaggio }).toEqual({
      tipo: 'vincolo',
      messaggio: 'Il movimento è di un altro fondo',
    })
  })

  it('status 0 con AuthRequiredError → sessione', () => {
    const errore = erroreDaRisposta(0, {
      message: 'AuthRequiredError: Authentication required.',
      code: '',
    })
    expect(errore.tipo).toBe('sessione')
  })

  it('status 0 con TypeError: fetch failed → rete', () => {
    expect(erroreDaRisposta(0, { message: 'TypeError: fetch failed', code: '' }).tipo).toBe('rete')
  })

  it('PGRST303 → sessione', () => {
    expect(erroreDaRisposta(401, { message: 'JWT expired', code: 'PGRST303' }).tipo).toBe(
      'sessione',
    )
    expect(erroreDaRisposta(400, { message: 'JWT expired', code: 'PGRST303' }).tipo).toBe(
      'sessione',
    )
  })

  it('codice sconosciuto → altro con messaggio italiano', () => {
    const errore = erroreDaRisposta(500, { message: 'internal error', code: 'XX000' })
    expect(errore.tipo).toBe('altro')
    expect(errore.messaggio).not.toBe('')
    expect(errore.messaggio).not.toContain('internal')
  })

  it("un'eccezione AuthRequiredError → sessione, un ErroreDati passa invariato", () => {
    const auth = new Error('Authentication required.')
    auth.name = 'AuthRequiredError'
    expect(erroreDaEccezione(auth).tipo).toBe('sessione')
    const gia = new ErroreDati('vincolo', 'x')
    expect(erroreDaEccezione(gia)).toBe(gia)
  })
})

describe('ErroreDati', () => {
  it('porta il codice facoltativo, assente se non dato', () => {
    expect(new ErroreDati('sessione', 'x', 'email-da-verificare').codice).toBe(
      'email-da-verificare',
    )
    expect(new ErroreDati('altro', 'x').codice).toBeUndefined()
  })
})

describe('attendi', () => {
  it('risolve con i dati', async () => {
    const risposta: RispostaDati<number[]> = { data: [1], error: null, status: 200 }
    await expect(attendi(Promise.resolve(risposta))).resolves.toEqual([1])
  })

  it('rifiuta con un ErroreDati sia per la risposta sia per l’eccezione', async () => {
    const risposta: RispostaDati<number[]> = {
      data: null,
      error: { message: 'x', code: '23503' },
      status: 409,
    }
    const errore: unknown = await attendi(Promise.resolve(risposta)).catch((e: unknown) => e)
    expect(eErroreDati(errore) && errore.tipo).toBe('vincolo')

    const rete: unknown = await attendi(Promise.reject(new TypeError('fetch failed'))).catch(
      (e: unknown) => e,
    )
    expect(eErroreDati(rete) && rete.tipo).toBe('rete')
  })
})
