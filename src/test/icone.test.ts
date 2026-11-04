// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const cartella = join(process.cwd(), 'icons')
const leggi = (nome: string) => readFileSync(join(cartella, nome), 'utf8')

const PILLOLA = 'M60 102 L130 102 A26 26 0 0 1 130 154 L60 154 A26 26 0 0 1 60 102 Z'
const PUNTO = /<circle cx="196" cy="128" r="26"\s*\/>/

const favicon = leggi('icon.svg')
const app = leggi('icon-app.svg')
const maskable = leggi('icon-maskable.svg')

describe('icone SVG', () => {
  it.each([
    ['icon.svg', favicon],
    ['icon-app.svg', app],
    ['icon-maskable.svg', maskable],
  ])('%s contiene la pillola e il punto del segno', (_nome, svg) => {
    expect(svg).toContain(`d="${PILLOLA}"`)
    expect(svg).toMatch(PUNTO)
    expect(svg).toContain('viewBox="0 0 256 256"')
    expect(svg).toContain('fill="#f3f5f2"')
  })

  it.each([
    ['icon.svg', favicon],
    ['icon-app.svg', app],
    ['icon-maskable.svg', maskable],
  ])('%s non ha i colori della vecchia icona', (_nome, svg) => {
    expect(svg.toLowerCase()).not.toContain('#f05a28')
    expect(svg.toLowerCase()).not.toContain('#ece8df')
  })

  it('la favicon ha fondo #060708 pieno, senza bagliore', () => {
    expect(favicon).toContain('fill="#060708"')
    expect(favicon).not.toContain('radialGradient')
  })

  it.each([
    ['icon-app.svg', app],
    ['icon-maskable.svg', maskable],
  ])('%s ha fondo #060708 col bagliore', (_nome, svg) => {
    expect(svg).toContain('fill="#060708"')
    expect(svg).toContain('<radialGradient')
    expect(svg).toMatch(/stop-color="#d4f53c" stop-opacity="0.15"/)
  })
})

// Larghezza e altezza stanno nell'IHDR, ai byte 16–23 del file.
function misura(nome: string): { larghezza: number; altezza: number } {
  const png = readFileSync(join(cartella, nome))
  return { larghezza: png.readUInt32BE(16), altezza: png.readUInt32BE(20) }
}

describe('icone PNG', () => {
  it.each([
    ['icon-512.png', 512],
    ['icon-192.png', 192],
    ['apple-touch-icon.png', 180],
  ])('%s è quadrato di lato %i', (nome, lato) => {
    const png = readFileSync(join(cartella, nome))
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR')
    expect(misura(nome)).toEqual({ larghezza: lato, altezza: lato })
  })
})
