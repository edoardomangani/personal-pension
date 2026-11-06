import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { utenteDiProva } from '../test/utenti'
import {
  CHIAVE_ULTIMO_UTENTE,
  cancellaUltimoUtente,
  leggiUltimoUtente,
  salvaUltimoUtente,
} from './ultimoUtente'

const GIULIA = utenteDiProva({ id: 'u3', email: 'giulia.conti@esempio.it', nome: 'Giulia Conti' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('ultimo utente noto (R1)', () => {
  it('T1: salva e rilegge lo stesso utente, con solo i cinque campi', () => {
    const conToken = { ...GIULIA, token: 'segreto' }
    salvaUltimoUtente(conToken)
    expect(leggiUltimoUtente()).toEqual(GIULIA)
    expect(Object.keys(JSON.parse(localStorage.getItem(CHIAVE_ULTIMO_UTENTE) ?? '{}')).sort()).toEqual(
      ['email', 'emailVerificata', 'id', 'nome', 'registratoIl'],
    )
  })

  it('T1: nome null si conserva', () => {
    const senzaNome = utenteDiProva()
    salvaUltimoUtente(senzaNome)
    expect(leggiUltimoUtente()).toEqual(senzaNome)
  })

  it('nessuna chiave → null', () => {
    expect(leggiUltimoUtente()).toBeNull()
  })

  it('cancella toglie la chiave', () => {
    salvaUltimoUtente(GIULIA)
    cancellaUltimoUtente()
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  const malformati = [
    { caso: 'JSON rotto', testo: '{"id":' },
    { caso: 'campo mancante', testo: JSON.stringify({ ...GIULIA, registratoIl: undefined }) },
    { caso: 'emailVerificata non booleano', testo: JSON.stringify({ ...GIULIA, emailVerificata: 'sì' }) },
    { caso: 'nome numero', testo: JSON.stringify({ ...GIULIA, nome: 3 }) },
    { caso: 'non un oggetto', testo: '"u3"' },
  ]

  for (const { caso, testo } of malformati) {
    it(`T2: ${caso} → null e chiave cancellata`, () => {
      localStorage.setItem(CHIAVE_ULTIMO_UTENTE, testo)
      expect(leggiUltimoUtente()).toBeNull()
      expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
    })
  }

  it('T3: localStorage che lancia → lettura null, salva e cancella non lanciano', () => {
    const negato = () => {
      throw new DOMException('negato', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(negato)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(negato)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(negato)
    expect(leggiUltimoUtente()).toBeNull()
    expect(() => salvaUltimoUtente(GIULIA)).not.toThrow()
    expect(() => cancellaUltimoUtente()).not.toThrow()
  })

  it('T3: chiave malformata con removeItem che lancia → null senza eccezioni', () => {
    localStorage.setItem(CHIAVE_ULTIMO_UTENTE, '{')
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('negato', 'SecurityError')
    })
    expect(leggiUltimoUtente()).toBeNull()
  })
})
