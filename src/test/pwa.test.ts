// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import viteConfig, { opzioniPwa } from '../../vite.config.ts'

const radice = process.cwd()

interface Pacchetto {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

const pacchetto: Pacchetto = JSON.parse(readFileSync(join(radice, 'package.json'), 'utf8'))

describe('dipendenze', () => {
  it('vite-plugin-pwa è una dipendenza di sviluppo', () => {
    expect(pacchetto.devDependencies).toHaveProperty('vite-plugin-pwa')
    expect(pacchetto.dependencies).not.toHaveProperty('vite-plugin-pwa')
  })

  it('le immagini si fanno solo con @resvg/resvg-js', () => {
    const tutte = [
      ...Object.keys(pacchetto.dependencies),
      ...Object.keys(pacchetto.devDependencies),
    ]
    const immagini = tutte.filter((nome) =>
      /sharp|jimp|canvas|pwa-assets|imagemagick|resvg|png|svg/i.test(nome),
    )
    expect(immagini).toEqual(['@resvg/resvg-js'])
  })
})

describe('base', () => {
  const base = (mode: string, command: 'build' | 'serve' = 'build') =>
    viteConfig({ mode, command }).base

  it('la build di Pages sta sotto /personal-pension/', () => {
    expect(base('pages')).toBe('/personal-pension/')
  })

  it.each(['collaudo', 'production'])('la build %s resta su /', (mode) => {
    expect(base(mode)).toBe('/')
  })

  it('lo sviluppo resta su /', () => {
    expect(base('development', 'serve')).toBe('/')
  })

  it('build:pages usa il mode pages', () => {
    expect(readFileSync(join(radice, 'package.json'), 'utf8')).toMatch(
      /"build:pages": "[^"]*vite build --mode pages"/,
    )
  })
})

describe('manifest', () => {
  const manifest = opzioniPwa.manifest || {}
  const icone = manifest.icons ?? []

  it('ha nome, lingua, display e colori di Next', () => {
    expect(manifest).toMatchObject({
      name: 'Next',
      short_name: 'Next',
      lang: 'it',
      dir: 'ltr',
      display: 'standalone',
      theme_color: '#060708',
      background_color: '#060708',
    })
    expect(manifest.description).toBeTruthy()
    expect(manifest).not.toHaveProperty('orientation')
  })

  it('start_url e scope sono relativi alla base', () => {
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
  })

  it('ha le icone 192, 512 e la maskable 512', () => {
    expect(icone.map(({ sizes, purpose }) => [sizes, purpose])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ])
  })

  it.each(icone.map(({ src }) => src))('%s è relativa alla base ed esiste in icons/', (src) => {
    expect(src).toMatch(/^icons\//)
    expect(existsSync(join(radice, src))).toBe(true)
  })

  it('la maskable viene da icon-maskable.svg', () => {
    expect(icone.find(({ purpose }) => purpose === 'maskable')?.src).toBe(
      'icons/icon-maskable-512.png',
    )
    expect(readFileSync(join(radice, 'scripts/genera-icone.ts'), 'utf8')).toContain(
      'icon-maskable.svg',
    )
  })
})

describe('service worker', () => {
  const workbox = opzioniPwa.workbox ?? {}

  it('è generato da Workbox', () => {
    expect(opzioniPwa.strategies ?? 'generateSW').toBe('generateSW')
  })

  it('non ha runtimeCaching: Neon va sempre in rete', () => {
    expect(workbox).not.toHaveProperty('runtimeCaching')
  })

  it('ripiega le navigazioni su index.html', () => {
    expect(workbox.navigateFallback).toBe('index.html')
  })

  it('mette in precache la shell', () => {
    const glob = (workbox.globPatterns ?? []).join(' ')
    for (const estensione of ['html', 'js', 'css', 'png', 'svg', 'woff2']) {
      expect(glob).toContain(estensione)
    }
  })

  it('si aggiorna da solo e toglie i precache vecchi', () => {
    expect(workbox).toMatchObject({
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
    })
  })
})

describe('registrazione', () => {
  it('autoUpdate con lo script generato, mai in sviluppo', () => {
    expect(opzioniPwa.registerType).toBe('autoUpdate')
    expect(opzioniPwa.injectRegister).toBe('script')
    expect(opzioniPwa.devOptions?.enabled).not.toBe(true)
  })

  const sorgenti = (cartella: string): string[] =>
    readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
      const percorso = join(cartella, voce.name)
      if (voce.isDirectory()) return sorgenti(percorso)
      return /\.(ts|vue)$/.test(voce.name) && !voce.name.endsWith('.test.ts') ? [percorso] : []
    })

  it.each(sorgenti(join(radice, 'src')))(
    '%s non registra il service worker e non ricarica la pagina',
    (file) => {
      const testo = readFileSync(file, 'utf8')
      expect(testo).not.toContain('virtual:pwa-register')
      expect(testo).not.toMatch(/location\.reload/)
    },
  )
})
