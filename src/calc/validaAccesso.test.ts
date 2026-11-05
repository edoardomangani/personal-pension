import { describe, expect, it } from 'vitest'
import {
  eValida,
  validaAccesso,
  validaCambioPassword,
  validaCodice,
  validaNome,
  validaNuovaPassword,
  validaOnboarding,
  validaRegistrazione,
  validaRichiestaReset,
} from './validaAccesso'

const EMAIL_NON_VALIDA = 'Scrivi un indirizzo email valido.'
const ALMENO_8 = 'Almeno 8 caratteri.'
const NON_COINCIDONO = 'Le password non coincidono.'
const ANNO = "Scrivi l'anno con quattro cifre, es. 1994."
const ETA = "Un'età fra 40 e 80 anni."

describe('validaAccesso', () => {
  it('valido', () => {
    expect(eValida(validaAccesso({ email: ' giulia@esempio.it ', password: 'x' }))).toBe(true)
  })

  it('email senza forma x@y.z e password vuota', () => {
    expect(validaAccesso({ email: 'giulia@esempio', password: '' })).toEqual({
      email: EMAIL_NON_VALIDA,
      password: 'Scrivi la password.',
    })
    expect(validaAccesso({ email: '', password: 'x' }).email).toBe(EMAIL_NON_VALIDA)
  })
})

describe('validaRegistrazione', () => {
  const valida = {
    nome: 'Giulia Conti',
    email: 'giulia@esempio.it',
    password: 'segreta12',
    conferma: 'segreta12',
  }

  it('valido', () => {
    expect(eValida(validaRegistrazione(valida))).toBe(true)
  })

  it('campi vuoti → un messaggio per campo', () => {
    expect(validaRegistrazione({ nome: '', email: '', password: '', conferma: '' })).toEqual({
      nome: 'Scrivi il tuo nome.',
      email: EMAIL_NON_VALIDA,
      password: ALMENO_8,
    })
  })

  it('password di 7 caratteri, conferma diversa, nome di soli spazi (R29)', () => {
    expect(
      validaRegistrazione({ ...valida, nome: '   ', password: 'segreta', conferma: 'segreta1' }),
    ).toEqual({ nome: 'Scrivi il tuo nome.', password: ALMENO_8, conferma: NON_COINCIDONO })
  })

  it('limiti di lunghezza', () => {
    const lunga = 'a'.repeat(129)
    expect(validaRegistrazione({ ...valida, password: lunga, conferma: lunga }).password).toBe(
      'Al massimo 128 caratteri.',
    )
    const giusta = 'a'.repeat(128)
    expect(eValida(validaRegistrazione({ ...valida, password: giusta, conferma: giusta }))).toBe(
      true,
    )
    expect(validaRegistrazione({ ...valida, nome: 'a'.repeat(81) }).nome).toBe(
      'Al massimo 80 caratteri.',
    )
  })
})

describe('validaCodice', () => {
  it('sei cifre → valido', () => {
    expect(eValida(validaCodice({ codice: '123456' }))).toBe(true)
  })

  it('«12a456», cinque o sette cifre → «Il codice ha 6 cifre.» (R29)', () => {
    for (const codice of ['12a456', '12345', '1234567', '']) {
      expect(validaCodice({ codice })).toEqual({ codice: 'Il codice ha 6 cifre.' })
    }
  })
})

describe('validaRichiestaReset', () => {
  it('valido e non valido', () => {
    expect(eValida(validaRichiestaReset({ email: 'giulia@esempio.it' }))).toBe(true)
    expect(validaRichiestaReset({ email: 'giulia esempio.it' })).toEqual({
      email: EMAIL_NON_VALIDA,
    })
  })
})

describe('validaNuovaPassword', () => {
  it('valido', () => {
    expect(eValida(validaNuovaPassword({ password: 'segreta12', conferma: 'segreta12' }))).toBe(
      true,
    )
  })

  it('corta e conferma diversa', () => {
    expect(validaNuovaPassword({ password: 'segreta', conferma: '' })).toEqual({
      password: ALMENO_8,
      conferma: NON_COINCIDONO,
    })
  })
})

describe('validaCambioPassword', () => {
  it('valido', () => {
    expect(
      eValida(validaCambioPassword({ attuale: 'x', nuova: 'segreta12', conferma: 'segreta12' })),
    ).toBe(true)
  })

  it('attuale vuota, nuova corta, conferma diversa', () => {
    expect(validaCambioPassword({ attuale: '', nuova: 'abc', conferma: 'abcd' })).toEqual({
      attuale: 'Scrivi la password.',
      nuova: ALMENO_8,
      conferma: NON_COINCIDONO,
    })
  })
})

describe('validaNome', () => {
  it('valido e non valido (R29)', () => {
    expect(eValida(validaNome({ nome: ' Giulia ' }))).toBe(true)
    expect(validaNome({ nome: '   ' })).toEqual({ nome: 'Scrivi il tuo nome.' })
  })
})

describe('validaOnboarding', () => {
  const valida = { fondo: 'Amundi Seconda Pensione', annoNascita: '1994', etaPensione: '67' }

  it('valido', () => {
    expect(eValida(validaOnboarding(valida, 2026))).toBe(true)
  })

  it('anno 1939 ed età 81 → i messaggi di R29', () => {
    expect(validaOnboarding({ ...valida, annoNascita: '1939', etaPensione: '81' }, 2026)).toEqual({
      annoNascita: ANNO,
      etaPensione: ETA,
    })
  })

  it('limiti dell’anno: 1940 e anno corrente − 16', () => {
    expect(eValida(validaOnboarding({ ...valida, annoNascita: '1940' }, 2026))).toBe(true)
    expect(eValida(validaOnboarding({ ...valida, annoNascita: '2010' }, 2026))).toBe(true)
    expect(validaOnboarding({ ...valida, annoNascita: '2011' }, 2026).annoNascita).toBe(ANNO)
    expect(validaOnboarding({ ...valida, annoNascita: '94' }, 2026).annoNascita).toBe(ANNO)
  })

  it('limiti dell’età e fondo vuoto', () => {
    expect(eValida(validaOnboarding({ ...valida, etaPensione: '40' }, 2026))).toBe(true)
    expect(eValida(validaOnboarding({ ...valida, etaPensione: '80' }, 2026))).toBe(true)
    expect(validaOnboarding({ ...valida, etaPensione: '39' }, 2026).etaPensione).toBe(ETA)
    expect(validaOnboarding({ ...valida, etaPensione: '' }, 2026).etaPensione).toBe(ETA)
    expect(validaOnboarding({ ...valida, fondo: '  ' }, 2026)).toEqual({
      fondo: 'Scrivi il nome del tuo fondo pensione.',
    })
  })
})
