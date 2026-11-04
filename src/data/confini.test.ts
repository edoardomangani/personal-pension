// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const QUESTO = fileURLToPath(import.meta.url)

/** `DATABASE_URL` da sola o dopo `process.env.`; `VITE_NEON_DATABASE_URL` è pubblica e ammessa. */
function leggeDatabaseUrl(testo: string): boolean {
  return /(?<![A-Z_])DATABASE_URL/.test(testo)
}

function importaNeon(testo: string): boolean {
  return /(?:from\s+|import\s*\(\s*|import\s+)['"]@neon\//.test(testo)
}

function fileDi(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(cartella, voce.name)
    return voce.isDirectory() ? fileDi(percorso) : [percorso]
  })
}

const FILE = fileDi(SRC).filter((f) => f !== QUESTO)

describe('regole dei confini', () => {
  it('riconosce DATABASE_URL solo quando non è una VITE_*', () => {
    expect(leggeDatabaseUrl('import.meta.env.VITE_NEON_DATABASE_URL')).toBe(false)
    expect(leggeDatabaseUrl('process.env.DATABASE_URL')).toBe(true)
    expect(leggeDatabaseUrl('DATABASE_URL')).toBe(true)
  })

  it('riconosce gli import di @neon/', () => {
    expect(importaNeon("import { createClient } from '@neon/neon-js'")).toBe(true)
    expect(importaNeon("await import('@neon/auth')")).toBe(true)
    expect(importaNeon("import '@neon/postgrest-js'")).toBe(true)
    expect(importaNeon("import { x } from './neon'")).toBe(false)
  })
})

describe('confini di src/ (R2, R6)', () => {
  it('nessun file di src/ legge DATABASE_URL', () => {
    const colpevoli = FILE.filter((f) => leggeDatabaseUrl(readFileSync(f, 'utf8')))
    expect(colpevoli.map((f) => relative(SRC, f))).toEqual([])
  })

  it("solo src/data/ importa l'SDK di Neon", () => {
    const fuori = FILE.filter((f) => !relative(SRC, f).startsWith(`data${sep}`))
    const colpevoli = fuori.filter((f) => importaNeon(readFileSync(f, 'utf8')))
    expect(colpevoli.map((f) => relative(SRC, f))).toEqual([])
  })

  it('scorre davvero i file di src/', () => {
    expect(FILE.some((f) => relative(SRC, f) === join('data', 'client.ts'))).toBe(true)
  })
})
