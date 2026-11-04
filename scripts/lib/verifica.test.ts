// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TABELLE_UTENTE, type TabellaUtente } from './importa'
import {
  esitoLetturaAnonima,
  esitoScritturaAltrui,
  esitoScritturaAnonima,
  mancanzeConteggi,
  riepilogo,
} from './verifica'

const SENZA_CREDENZIALI = {
  message: 'missing authentication credentials: required authorization bearer token in JWT format',
  code: null,
}

describe('esitoLetturaAnonima (R1)', () => {
  it('401 → ok', () => {
    expect(esitoLetturaAnonima('fondi', { status: 401, corpo: { code: 'PGRST302' } })).toBeNull()
  })

  it('200 con zero righe → ok', () => {
    expect(esitoLetturaAnonima('fondi', { status: 200, corpo: [] })).toBeNull()
  })

  it('200 con una riga → mancanza con la tabella', () => {
    expect(esitoLetturaAnonima('fondi', { status: 200, corpo: [{ user_id: 'x' }] })).toMatch(
      /fondi.*1 righe/,
    )
  })

  it('403 con codice 42501 (ruolo anonymous) → ok', () => {
    expect(
      esitoLetturaAnonima('fondi', { status: 403, corpo: { code: '42501', message: 'x' } }),
    ).toBeNull()
  })

  it('400 senza credenziali (nessun Authorization) → ok', () => {
    expect(esitoLetturaAnonima('fondi', { status: 400, corpo: SENZA_CREDENZIALI })).toBeNull()
  })

  it('400 con un altro messaggio → mancanza', () => {
    expect(
      esitoLetturaAnonima('fondi', { status: 400, corpo: { code: null, message: 'bad request' } }),
    ).toMatch(/400/)
  })

  it('500 → mancanza', () => {
    expect(esitoLetturaAnonima('fondi', { status: 500, corpo: null })).toMatch(/500/)
  })
})

describe('esitoScritturaAnonima (R1)', () => {
  it.each([401, 403])('%i → ok', (status) => {
    expect(esitoScritturaAnonima('buste_paga', { status, corpo: null })).toBeNull()
  })

  it('400 con codice 42501 → ok', () => {
    expect(
      esitoScritturaAnonima('buste_paga', { status: 400, corpo: { code: '42501' } }),
    ).toBeNull()
  })

  it('400 senza credenziali (nessun Authorization) → ok', () => {
    expect(
      esitoScritturaAnonima('buste_paga', { status: 400, corpo: SENZA_CREDENZIALI }),
    ).toBeNull()
  })

  it.each([200, 201])('%i → mancanza: la scrittura riesce', (status) => {
    expect(esitoScritturaAnonima('buste_paga', { status, corpo: [] })).toMatch(/riesce/)
  })

  it('400 con un altro codice → mancanza', () => {
    expect(esitoScritturaAnonima('buste_paga', { status: 400, corpo: { code: '23502' } })).toMatch(
      /23502/,
    )
  })
})

describe('esitoScritturaAltrui (R13)', () => {
  it.each(['vincolo', 'altro'] as const)('rifiuto %s → ok', (errore) => {
    expect(esitoScritturaAltrui('aggiornare una busta', { tipo: 'rifiutato', errore })).toBeNull()
  })

  it.each(['rete', 'sessione'] as const)('rifiuto %s → mancanza', (errore) => {
    expect(esitoScritturaAltrui('aggiornare una busta', { tipo: 'rifiutato', errore })).toMatch(
      errore,
    )
  })

  it('salvataggio riuscito → mancanza', () => {
    expect(esitoScritturaAltrui('aggiornare una busta', { tipo: 'riuscito' })).toMatch(/riesce/)
  })
})

describe('mancanzeConteggi (R13)', () => {
  const zero: Record<TabellaUtente, number> = {
    fondi: 0,
    movimenti: 0,
    movimento_righe: 0,
    buste_paga: 0,
    busta_righe: 0,
    estratti_conto: 0,
    impostazioni: 0,
  }

  it('copre tutte le tabelle dell’utente', () => {
    expect(Object.keys(zero).sort()).toEqual([...TABELLE_UTENTE].sort())
  })

  it('tutto a zero → nessuna mancanza', () => {
    expect(mancanzeConteggi(zero)).toEqual([])
  })

  it('un conteggio diverso da zero → mancanza col nome della tabella', () => {
    expect(mancanzeConteggi({ ...zero, buste_paga: 1 })).toEqual([
      "l'utente 2 vede 1 righe in buste_paga",
    ])
  })
})

describe('riepilogo', () => {
  it('tutti ok → DATI: VERDE ed exit 0', () => {
    const r = riepilogo([
      { nome: 'totali', mancanza: null },
      { nome: 'anonimo', mancanza: null },
    ])
    expect(r.righe.at(-1)).toBe('DATI: VERDE')
    expect(r.exitCode).toBe(0)
  })

  it('una mancanza → DATI: ROSSO, la mancanza tra le righe ed exit 1', () => {
    const r = riepilogo([
      { nome: 'totali', mancanza: null },
      { nome: 'anonimo', mancanza: 'senza token fondi restituisce 1 righe' },
    ])
    expect(r.righe.at(-1)).toBe('DATI: ROSSO')
    expect(r.righe.some((riga) => riga.includes('senza token fondi restituisce 1 righe'))).toBe(
      true,
    )
    expect(r.exitCode).toBe(1)
  })
})
