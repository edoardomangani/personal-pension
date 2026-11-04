import { describe, expect, it } from 'vitest'
import { centesimiInEuro, euroInCentesimi, leggiImporto, sommaCentesimi } from './importi'

describe('euroInCentesimi', () => {
  it('arrotonda al centesimo intero', () => {
    expect(euroInCentesimi(177.8)).toBe(17780)
    expect(euroInCentesimi(0.1 + 0.2)).toBe(30)
  })
})

describe('centesimiInEuro e sommaCentesimi', () => {
  it('converte e somma sui centesimi', () => {
    expect(centesimiInEuro(123450)).toBe(1234.5)
    expect(sommaCentesimi([17780, 30, 1])).toBe(17811)
    expect(sommaCentesimi([])).toBe(0)
  })
})

describe('leggiImporto', () => {
  it.each([
    ['1.234,5', 123450],
    ['12', 1200],
    ['€ 15,00', 1500],
    ['1.234', 123400],
    ['0,5', 50],
    ['1 234,56 €', 123456],
  ])('legge %j come %i centesimi', (testo, atteso) => {
    expect(leggiImporto(testo)).toBe(atteso)
  })

  it.each(['abc', '', '1,234', '-5', '12,', ',5', '1,2,3'])('rifiuta %j', (testo) => {
    expect(leggiImporto(testo)).toBeNull()
  })
})
