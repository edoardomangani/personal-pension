import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Niente `new URL`: sotto jsdom è quello di jsdom e fileURLToPath lo rifiuta.
const radice = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const html = readFileSync(join(radice, 'index.html'), 'utf8')
const documento = new DOMParser().parseFromString(html, 'text/html')

describe('index.html', () => {
  const icone = documento.head.querySelectorAll('link[rel="icon"]')

  it('dichiara una sola icona, in SVG', () => {
    expect(icone).toHaveLength(1)
    expect(icone[0]?.getAttribute('type')).toBe('image/svg+xml')
  })

  it('punta a icons/icon.svg, che esiste', () => {
    const href = icone[0]?.getAttribute('href') ?? ''
    const relativo = href.replace(/^\//, '')
    expect(relativo).toBe('icons/icon.svg')
    expect(existsSync(join(radice, relativo))).toBe(true)
  })

  it('non usa la cartella public/', () => {
    expect(existsSync(join(radice, 'public'))).toBe(false)
  })

  it('lascia invariati gli altri tag', () => {
    expect(html).toContain('<html lang="it" class="dark">')
    expect(html).toContain('<meta charset="UTF-8" />')
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    )
    expect(html).toContain('background-color: #060708;')
    expect(html).toContain('<title>Next</title>')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('src="/src/main.ts"')
  })
})

describe('index.html, meta della PWA', () => {
  const meta = (nome: string) =>
    documento.head.querySelector(`meta[name="${nome}"]`)?.getAttribute('content')

  it('la viewport copre le safe area', () => {
    expect(meta('viewport')).toContain('viewport-fit=cover')
  })

  it.each([
    ['theme-color', '#060708'],
    ['apple-mobile-web-app-capable', 'yes'],
    ['mobile-web-app-capable', 'yes'],
    ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
    ['apple-mobile-web-app-title', 'Next'],
  ])('%s vale %s', (nome, valore) => {
    expect(documento.head.querySelectorAll(`meta[name="${nome}"]`)).toHaveLength(1)
    expect(meta(nome)).toBe(valore)
  })

  it('apple-touch-icon punta a icons/apple-touch-icon.png, che esiste', () => {
    const link = documento.head.querySelectorAll('link[rel="apple-touch-icon"]')
    expect(link).toHaveLength(1)
    const href = link[0]?.getAttribute('href') ?? ''
    // Assoluto dalla radice: Vite lo riscrive con la base.
    expect(href).toBe('/icons/apple-touch-icon.png')
    expect(existsSync(join(radice, href.replace(/^\//, '')))).toBe(true)
  })

  it('non scrive a mano il link al manifest: lo inietta il plugin', () => {
    expect(documento.head.querySelector('link[rel="manifest"]')).toBeNull()
  })
})

describe('index.html, immagini di avvio', () => {
  // R9: punti × densità degli iPhone in verticale.
  const schermi: [number, number, number][] = [
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
  const link = [...documento.head.querySelectorAll('link[rel="apple-touch-startup-image"]')]

  it('ha un apple-touch-startup-image per ogni schermo', () => {
    expect(link).toHaveLength(schermi.length)
  })

  it.each(schermi)('%i×%i @%i ha media query e PNG giusti', (larghezza, altezza, densita) => {
    const media =
      `(device-width: ${larghezza}px) and (device-height: ${altezza}px)` +
      ` and (-webkit-device-pixel-ratio: ${densita}) and (orientation: portrait)`
    const trovati = link.filter((l) => l.getAttribute('media') === media)
    expect(trovati).toHaveLength(1)

    const href = trovati[0]?.getAttribute('href') ?? ''
    expect(href).toMatch(/^\/icons\/avvio\/[^/]+\.png$/)
    const file = join(radice, href.replace(/^\//, ''))
    expect(existsSync(file)).toBe(true)
    // Larghezza e altezza dall'IHDR, ai byte 16–23.
    const png = readFileSync(file)
    expect({ larghezza: png.readUInt32BE(16), altezza: png.readUInt32BE(20) }).toEqual({
      larghezza: larghezza * densita,
      altezza: altezza * densita,
    })
  })
})
