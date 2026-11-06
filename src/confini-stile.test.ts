// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('.', import.meta.url))
const INDEX = fileURLToPath(new URL('../index.html', import.meta.url))
const QUESTO = fileURLToPath(import.meta.url)

// Pacchetti di Wallet legati a Laravel, Inertia o alle icone lucide: qui non devono entrare.
const VIETATI =
  /(?:from\s+|import\s*\(\s*|import\s+)['"](?:@inertiajs\/|@laravel\/|@\/routes(?:[/'"])|@\/actions(?:[/'"])|laravel-vue-i18n['"/]|lucide-vue-next['"/])/

function importaVietato(testo: string): boolean {
  return VIETATI.test(testo)
}

function chiamaTrans(testo: string): boolean {
  return /(?<![\w$.])trans\(/.test(testo)
}

function usaGoogleFonts(testo: string): boolean {
  return testo.includes('fonts.googleapis.com')
}

function fileDi(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name)
    return voce.isDirectory() ? fileDi(percorso) : [percorso]
  })
}

const FILE = fileDi(SRC).filter((f) => f !== QUESTO)

function colpevoli(regola: (testo: string) => boolean): string[] {
  return FILE.filter((f) => regola(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f))
}

describe('regole dei confini di stile', () => {
  it('riconosce gli import vietati', () => {
    expect(importaVietato("import { Link } from '@inertiajs/vue3'")).toBe(true)
    expect(importaVietato("import { trans } from 'laravel-vue-i18n'")).toBe(true)
    expect(importaVietato("import { X } from 'lucide-vue-next'")).toBe(true)
    expect(importaVietato("import { dashboard } from '@/routes'")).toBe(true)
    expect(importaVietato("import { store } from '@/routes/movimenti'")).toBe(true)
    expect(importaVietato("import Ctrl from '@/actions/App/Http/Controllers'")).toBe(true)
    expect(importaVietato("await import('@laravel/passkeys')")).toBe(true)
    expect(importaVietato("import { X } from '@phosphor-icons/vue'")).toBe(false)
    expect(importaVietato("import { cn } from '@/lib/utils'")).toBe(false)
    expect(importaVietato("import { router } from '@/router'")).toBe(false)
    expect(importaVietato("import { x } from '@/routes-nuove'")).toBe(false)
  })

  it('riconosce le chiamate a trans(', () => {
    expect(chiamaTrans("{{ trans('Save') }}")).toBe(true)
    expect(chiamaTrans("const t = trans('Ciao')")).toBe(true)
    expect(chiamaTrans('transform()')).toBe(false)
    expect(chiamaTrans('style.trans(1)')).toBe(false)
    expect(chiamaTrans('ritrans(1)')).toBe(false)
  })

  it('riconosce Google Fonts', () => {
    expect(usaGoogleFonts('<link href="https://fonts.googleapis.com/css2?family=Geist">')).toBe(
      true,
    )
    expect(usaGoogleFonts("import '@fontsource/bricolage-grotesque/400.css'")).toBe(false)
  })
})

describe('confini di stile di src/ (R2, R3, R4)', () => {
  it('nessun file importa Inertia, Laravel, i18n di Laravel o lucide', () => {
    expect(colpevoli(importaVietato)).toEqual([])
  })

  it('nessun file chiama trans(', () => {
    expect(colpevoli(chiamaTrans)).toEqual([])
  })

  it('nessuna richiesta a Google Fonts in src/ e index.html', () => {
    expect(colpevoli(usaGoogleFonts)).toEqual([])
    expect(usaGoogleFonts(readFileSync(INDEX, 'utf8'))).toBe(false)
  })

  it('index.html ha un solo tema scuro in italiano e il font sul body', () => {
    const html = readFileSync(INDEX, 'utf8')
    expect(html).toMatch(/<html[^>]*\blang="it"/)
    expect(html).toMatch(/<html[^>]*\bclass="dark"/)
    expect(html).toMatch(/<body[^>]*\bclass="[^"]*\bfont-sans\b[^"]*\bantialiased\b/)
  })

  it('scorre davvero i file di src/', () => {
    expect(FILE.some((f) => relative(SRC, f) === 'main.ts')).toBe(true)
    expect(FILE).not.toContain(QUESTO)
  })
})
