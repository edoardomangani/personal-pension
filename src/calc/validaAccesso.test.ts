import { describe, expect, it } from 'vitest'
import {
  eValida,
  validaAccesso,
  validaCambioPassword,
  validaCodice,
  validaConfermaCancellazione,
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
const INTERVALLO_2026 = 'Un anno fra 1940 e 2010.'
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

describe('validaConfermaCancellazione', () => {
  it('con la password: valida se scritta, anche con spazi', () => {
    expect(eValida(validaConfermaCancellazione({ conferma: 'segreta12' }, true))).toBe(true)
    expect(eValida(validaConfermaCancellazione({ conferma: ' ' }, true))).toBe(true)
  })

  it('con la password: vuota → «Scrivi la password.»', () => {
    expect(validaConfermaCancellazione({ conferma: '' }, true)).toEqual({
      conferma: 'Scrivi la password.',
    })
  })

  it('con l’email: valida con la forma giusta, spazi ai lati compresi', () => {
    expect(
      eValida(validaConfermaCancellazione({ conferma: ' Giulia.Conti@Esempio.it ' }, false)),
    ).toBe(true)
  })

  it('con l’email: vuota o senza forma → messaggio dell’email', () => {
    expect(validaConfermaCancellazione({ conferma: '' }, false)).toEqual({
      conferma: EMAIL_NON_VALIDA,
    })
    expect(validaConfermaCancellazione({ conferma: 'giulia.conti' }, false)).toEqual({
      conferma: EMAIL_NON_VALIDA,
    })
  })
})

describe('validaOnboarding', () => {
  const valida = { fondo: 'Amundi Seconda Pensione', annoNascita: '1994', etaPensione: '67' }

  it('valido', () => {
    expect(eValida(validaOnboarding(valida, 2026))).toBe(true)
  })

  it('anno 1939, età 81 e fondo vuoto → i messaggi di R29', () => {
    expect(validaOnboarding({ fondo: '', annoNascita: '1939', etaPensione: '81' }, 2026)).toEqual({
      fondo: 'Scrivi il nome del tuo fondo pensione.',
      annoNascita: INTERVALLO_2026,
      etaPensione: ETA,
    })
  })

  it.each([
    ['', ANNO],
    ['94', ANNO],
    ['19a4', ANNO],
    ['19940', ANNO],
    ['1939', INTERVALLO_2026],
    [' 1939 ', INTERVALLO_2026],
    ['0000', INTERVALLO_2026],
    ['9999', INTERVALLO_2026],
    ['2011', INTERVALLO_2026],
    ['1940', undefined],
    ['2010', undefined],
  ])('anno «%s» con anno corrente 2026 → %s', (annoNascita, atteso) => {
    expect(validaOnboarding({ ...valida, annoNascita }, 2026).annoNascita).toBe(atteso)
  })

  it('il limite superiore segue l’anno corrente', () => {
    expect(eValida(validaOnboarding({ ...valida, annoNascita: '2011' }, 2027))).toBe(true)
    expect(validaOnboarding({ ...valida, annoNascita: '2012' }, 2027).annoNascita).toBe(
      'Un anno fra 1940 e 2011.',
    )
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
