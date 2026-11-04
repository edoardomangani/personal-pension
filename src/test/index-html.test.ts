import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const radice = process.cwd()
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
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    )
    expect(html).toContain('background-color: #060708;')
    expect(html).toContain('<title>Next</title>')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('src="/src/main.ts"')
  })
})
