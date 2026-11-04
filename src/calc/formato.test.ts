import { describe, expect, it } from 'vitest'
import {
  formatoData,
  formatoEuro,
  formatoEuroIntero,
  formatoGiorno,
  formatoMese,
  formatoPercentuale,
} from './formato'

// Intl mette uno spazio non separabile prima di €.
const NBSP = ' '

describe('formatoEuro', () => {
  it('usa il segno − (U+2212) per i negativi', () => {
    expect(formatoEuro(-1500)).toBe(`−15,00${NBSP}€`)
  })

  it('raggruppa le migliaia', () => {
    expect(formatoEuro(123450)).toBe(`1.234,50${NBSP}€`)
  })

  it('zero senza segno e null come trattino lungo', () => {
    expect(formatoEuro(0)).toBe(`0,00${NBSP}€`)
    expect(formatoEuro(null)).toBe('—')
  })
})

describe('formatoEuroIntero', () => {
  it('senza decimali, con − per i negativi', () => {
    expect(formatoEuroIntero(-123450)).toBe(`−1.235${NBSP}€`)
    expect(formatoEuroIntero(270869)).toBe(`2.709${NBSP}€`)
  })

  it('un negativo che si arrotonda a zero non ha segno', () => {
    expect(formatoEuroIntero(-40)).toBe(`0${NBSP}€`)
  })
})

describe('formatoData e formatoMese', () => {
  it('formattano le stringhe ISO', () => {
    expect(formatoData('2026-11-03')).toBe('03/11/2026')
    expect(formatoMese('2026-09')).toBe('Settembre 2026')
  })

  it('date non valide o assenti → —', () => {
    expect(formatoData(null)).toBe('—')
    expect(formatoData('2026-11')).toBe('—')
    expect(formatoMese('2026-13')).toBe('—')
  })
})

describe('formatoGiorno', () => {
  it('giorno della settimana, giorno e mese minuscoli, senza anno', () => {
    expect(formatoGiorno('2026-11-04')).toBe('mercoledì 4 novembre')
    expect(formatoGiorno('2026-01-01')).toBe('giovedì 1 gennaio')
  })

  it('tiene conto degli anni bisestili', () => {
    expect(formatoGiorno('2028-02-29')).toBe('martedì 29 febbraio')
    expect(formatoGiorno('2000-03-01')).toBe('mercoledì 1 marzo')
  })

  it('mese o giorno fuori calendario → —', () => {
    expect(formatoGiorno('2026-13-01')).toBe('—')
    expect(formatoGiorno('2026-02-30')).toBe('—')
    expect(formatoGiorno('2026-02-29')).toBe('—')
    expect(formatoGiorno('2026-11-00')).toBe('—')
    expect(formatoGiorno('04/11/2026')).toBe('—')
  })
})

describe('formatoPercentuale', () => {
  it('segno esplicito e decimali scelti', () => {
    expect(formatoPercentuale(0.0475, 1)).toBe('+4,8%')
    expect(formatoPercentuale(0.03112)).toBe('+3,11%')
  })

  it('− per i negativi, + per lo zero arrotondato', () => {
    expect(formatoPercentuale(-0.125, 1)).toBe('−12,5%')
    expect(formatoPercentuale(-0.00001, 1)).toBe('+0,0%')
  })

  it('null → —', () => {
    expect(formatoPercentuale(null)).toBe('—')
  })
})
