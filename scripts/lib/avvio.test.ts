// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCHERMI, estraiSegno, latoSegno, nomeFile, pixel, svgAvvio, type Schermo } from './avvio'

const iconSvg = readFileSync(join(import.meta.dirname, '..', '..', 'icons', 'icon.svg'), 'utf8')
const PILLOLA = 'M60 102 L130 102 A26 26 0 0 1 130 154 L60 154 A26 26 0 0 1 60 102 Z'
const PUNTO = /<circle cx="196" cy="128" r="26"\s*\/>/

// R9: punti × densità.
const ATTESI: [number, number, number][] = [
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [414, 896, 2],
  [414, 896, 3],
  [390, 844, 3],
  [428, 926, 3],
  [393, 852, 3],
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
]

const iphone15: Schermo = { punti: { larghezza: 390, altezza: 844 }, densita: 3 }

describe('SCHERMI', () => {
  it('sono le 11 dimensioni di R9, senza doppioni', () => {
    const elenco = SCHERMI.map((s) => [s.punti.larghezza, s.punti.altezza, s.densita])
    expect(elenco).toEqual(ATTESI)
    expect(new Set(SCHERMI.map(nomeFile)).size).toBe(11)
  })

  it('pixel = punti × densità', () => {
    expect(pixel(iphone15)).toEqual({ larghezza: 1170, altezza: 2532 })
    expect(pixel({ punti: { larghezza: 375, altezza: 667 }, densita: 2 })).toEqual({
      larghezza: 750,
      altezza: 1334,
    })
  })

  it('il nome del file porta i pixel', () => {
    expect(nomeFile(iphone15)).toBe('avvio-1170x2532.png')
  })
})

describe('svgAvvio', () => {
  const svg = svgAvvio(iphone15, estraiSegno(iconSvg))

  it('ha il fondo pieno #060708, senza bagliore', () => {
    expect(svg).toContain('<rect width="1170" height="2532" fill="#060708"/>')
    expect(svg).not.toContain('Gradient')
  })

  it('usa i path del segno di icon.svg in Bianco Gesso', () => {
    expect(svg).toContain(`d="${PILLOLA}"`)
    expect(svg).toMatch(PUNTO)
    expect(svg).toContain('viewBox="0 0 256 256" fill="#f3f5f2"')
  })

  it('il segno è il 28,7% della larghezza, centrato', () => {
    expect(latoSegno(390)).toBe(112)
    expect(latoSegno(1170)).toBe(336)
    expect(svg).toContain('<svg x="417" y="1098" width="336" height="336"')
  })

  it('ha le proporzioni esatte in pixel', () => {
    expect(svg).toContain('viewBox="0 0 1170 2532"')
  })

  it('estraiSegno rifiuta un SVG senza segno', () => {
    expect(() => estraiSegno('<svg viewBox="0 0 32 32"></svg>')).toThrow()
  })
})
