// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TABELLE_UTENTE, type TabellaUtente } from './importa'
import {
  TABELLE_ACCOUNT,
  emailUsaEGetta,
  esitoAccessoNonVerificato,
  esitoBustaAncoraDaVersare,
  esitoFotoAltrui,
  esitoLetturaAnonima,
  esitoRifiutoAtteso,
  esitoScritturaAltrui,
  esitoScritturaAnonima,
  esitoStatoInvariato,
  mancanzaCollegamentoPerso,
  mancanzeConteggi,
  mancanzeResidui,
  MESSAGGIO_BUSTA_ASSENTE,
  MESSAGGIO_BUSTA_COLLEGATA,
  riepilogo,
  type StatoCollegamento,
  type TabellaAccount,
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
    expect(
      esitoScritturaAltrui('aggiornare una busta', { tipo: 'rifiutato', errore, messaggio: 'x' }),
    ).toBeNull()
  })

  it.each(['rete', 'sessione'] as const)('rifiuto %s → mancanza', (errore) => {
    expect(
      esitoScritturaAltrui('aggiornare una busta', { tipo: 'rifiutato', errore, messaggio: 'x' }),
    ).toMatch(errore)
  })

  it('salvataggio riuscito → mancanza', () => {
    expect(esitoScritturaAltrui('aggiornare una busta', { tipo: 'riuscito' })).toMatch(/riesce/)
  })
})

describe('esitoRifiutoAtteso (R7)', () => {
  const descrizione = 'salvare un movimento con una busta già collegata'

  it('vincolo col messaggio atteso → ok', () => {
    expect(
      esitoRifiutoAtteso(
        descrizione,
        { tipo: 'rifiutato', errore: 'vincolo', messaggio: MESSAGGIO_BUSTA_COLLEGATA },
        MESSAGGIO_BUSTA_COLLEGATA,
      ),
    ).toBeNull()
  })

  it('salvataggio riuscito → mancanza con «riesce» e la descrizione', () => {
    const m = esitoRifiutoAtteso(descrizione, { tipo: 'riuscito' }, MESSAGGIO_BUSTA_COLLEGATA)
    expect(m).toMatch(/riesce/)
    expect(m).toContain(descrizione)
  })

  it('vincolo con un altro messaggio (R5) → mancanza col messaggio ricevuto', () => {
    expect(
      esitoRifiutoAtteso(
        descrizione,
        { tipo: 'rifiutato', errore: 'vincolo', messaggio: 'Il fondo non esiste' },
        MESSAGGIO_BUSTA_ASSENTE,
      ),
    ).toContain('Il fondo non esiste')
  })

  it.each(['rete', 'sessione', 'altro'] as const)('rifiuto %s → mancanza col tipo', (errore) => {
    expect(
      esitoRifiutoAtteso(
        descrizione,
        { tipo: 'rifiutato', errore, messaggio: MESSAGGIO_BUSTA_COLLEGATA },
        MESSAGGIO_BUSTA_COLLEGATA,
      ),
    ).toContain(errore)
  })
})

describe('esitoStatoInvariato (R8)', () => {
  const prima: StatoCollegamento = { movimenti: 4, righe: 9, movimentoId: 'm1' }

  it('prima = dopo → ok', () => {
    expect(esitoStatoInvariato(prima, { ...prima })).toBeNull()
  })

  it('movimenti 4 → 5 → mancanza con tabella e conteggi', () => {
    const m = esitoStatoInvariato(prima, { ...prima, movimenti: 5 })
    expect(m).toContain('movimenti da 4 a 5')
  })

  it('righe 9 → 10 → mancanza con movimento_righe', () => {
    expect(esitoStatoInvariato(prima, { ...prima, righe: 10 })).toContain(
      'movimento_righe da 9 a 10',
    )
  })

  it('busta m1 → m2 → mancanza col collegamento prima e dopo', () => {
    expect(esitoStatoInvariato(prima, { ...prima, movimentoId: 'm2' })).toMatch(
      /collegamento.*m1.*m2/,
    )
  })

  it('busta senza movimento → m2 → mancanza (collegamento creato)', () => {
    expect(
      esitoStatoInvariato({ ...prima, movimentoId: null }, { ...prima, movimentoId: 'm2' }),
    ).toMatch(/collegamento.*nessuno.*m2/)
  })

  it('più differenze → tutte elencate', () => {
    const m = esitoStatoInvariato(prima, { movimenti: 5, righe: 10, movimentoId: 'm2' })
    expect(m?.split('; ')).toHaveLength(3)
  })
})

describe('esitoBustaAncoraDaVersare (R6)', () => {
  it('busta non trovata → mancanza', () => {
    expect(esitoBustaAncoraDaVersare('b1', undefined)).toBe('la busta b1 non si trova più')
  })

  it('busta collegata a m2 → mancanza col movimento', () => {
    expect(esitoBustaAncoraDaVersare('b1', { movimentoId: 'm2' })).toBe(
      'la busta b1 è collegata al movimento m2',
    )
  })

  it('busta da versare → ok', () => {
    expect(esitoBustaAncoraDaVersare('b1', { movimentoId: null })).toBeNull()
  })
})

describe('mancanzaCollegamentoPerso (R1)', () => {
  it('originale m1 → nomina busta, movimento e rimedio', () => {
    const m = mancanzaCollegamentoPerso('b1', 'm1')
    expect(m).toContain('b1')
    expect(m).toContain('m1')
    expect(m).toContain('db:collaudo')
  })

  it('originale null → nomina «nessuno»', () => {
    expect(mancanzaCollegamentoPerso('b1', null)).toContain('nessuno')
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

describe('emailUsaEGetta', () => {
  it('timestamp e dominio di COLLAUDO2_EMAIL', () => {
    expect(emailUsaEGetta('collaudo2@prova.esempio.it', 1767225600000)).toBe(
      'collaudo-cancella-1767225600000@prova.esempio.it',
    )
  })

  it('email senza dominio → errore', () => {
    expect(() => emailUsaEGetta('collaudo2', 1)).toThrow(/senza dominio/)
  })
})

describe('mancanzeResidui', () => {
  const zero = (): Record<TabellaAccount, number> => ({
    fondi: 0,
    movimenti: 0,
    movimento_righe: 0,
    buste_paga: 0,
    busta_righe: 0,
    estratti_conto: 0,
    impostazioni: 0,
    foto_profilo: 0,
  })

  it('comprende foto_profilo', () => {
    expect(TABELLE_ACCOUNT).toContain('foto_profilo')
  })

  it('tutto a zero e utente sparito → nessuna mancanza', () => {
    expect(mancanzeResidui(zero(), false)).toEqual([])
  })

  it('righe rimaste e utente ancora in neon_auth → una mancanza ciascuno', () => {
    expect(mancanzeResidui({ ...zero(), fondi: 1, foto_profilo: 1 }, true)).toEqual([
      'restano 1 righe in fondi',
      'restano 1 righe in foto_profilo',
      'la riga in neon_auth."user" c\'è ancora',
    ])
  })
})

describe('esitoFotoAltrui', () => {
  it('zero righe → ok; una → mancanza', () => {
    expect(esitoFotoAltrui(0)).toBeNull()
    expect(esitoFotoAltrui(1)).toMatch(/vede 1 foto/)
  })
})

describe('esitoAccessoNonVerificato', () => {
  it('rifiuto sessione con codice email-da-verificare → ok', () => {
    expect(
      esitoAccessoNonVerificato({
        tipo: 'rifiutato',
        errore: 'sessione',
        messaggio: 'Verifica la tua email.',
        codice: 'email-da-verificare',
      }),
    ).toBeNull()
  })

  it('accesso riuscito → la verifica non è obbligatoria', () => {
    expect(esitoAccessoNonVerificato({ tipo: 'riuscito' })).toMatch(
      /la verifica email non è obbligatoria/,
    )
  })

  it('altro errore o altro codice → mancanza col messaggio', () => {
    expect(
      esitoAccessoNonVerificato({
        tipo: 'rifiutato',
        errore: 'sessione',
        messaggio: 'Email o password non corretti.',
      }),
    ).toMatch(/Email o password non corretti\./)
    expect(
      esitoAccessoNonVerificato({ tipo: 'rifiutato', errore: 'rete', messaggio: 'Rete giù' }),
    ).toMatch(/rete «Rete giù»/)
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
