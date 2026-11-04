// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as db from './db'
import * as output from './output'

// Tiene import, re-export con `from` e la riga di chiusura `} from '…'` degli import su più righe.
const filtraImport = (testo: string) =>
  testo
    .split('\n')
    .filter(
      (riga) =>
        /^\s*import\b/.test(riga) ||
        /^\s*}?\s*from\s+['"]/.test(riga) ||
        /^\s*export\b.*\bfrom\s+['"]/.test(riga),
    )

const righeImport = (percorso: string) =>
  filtraImport(readFileSync(join(import.meta.dirname, percorso), 'utf8'))

const specificatoreVietato = (riga: string) => /(['"])(\.\/lib\/db(\.ts|\.js)?|pg)\1/.test(riga)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('filtraImport', () => {
  it.each([
    ["import { scrivi } from './lib/output'", true],
    ["} from 'pg'", true],
    ["export { x } from 'pg'", true],
    ["export * from 'pg'", true],
    ['export * as m from "pg"', true],
    ["export type { T } from './lib/db'", true],
    ['export { scrivi }', false],
    ["export const scrivi = (riga: string) => process.stdout.write(riga + '\\n')", false],
    ["const CARTELLA = join(import.meta.dirname, '..', 'icons')", false],
  ])('%s → tenuta: %s', (riga, tenuta) => {
    expect(filtraImport(riga)).toEqual(tenuta ? [riga] : [])
  })
})

describe('specificatoreVietato', () => {
  it.each([
    ["import { scrivi } from './lib/db'", true],
    ["import { scrivi } from './lib/db.ts'", true],
    ['import { scrivi } from "./lib/db.js"', true],
    ["import pg from 'pg'", true],
    ['export { x } from "pg"', true],
    ["import { scrivi } from './lib/output'", false],
    ["import { scrivi } from './lib/output.ts'", false],
    ["import x from './lib/dbx'", false],
    ["import x from 'pgx'", false],
    ["import { readFileSync } from 'node:fs'", false],
  ])('%s → vietata: %s', (riga, vietata) => {
    expect(specificatoreVietato(riga)).toBe(vietata)
  })
})

describe('output', () => {
  it('scrivi aggiunge un a capo e scrive una volta su stdout', () => {
    const spia = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    output.scrivi('icon-512.png 512×512')
    expect(spia).toHaveBeenCalledTimes(1)
    expect(spia).toHaveBeenCalledWith('icon-512.png 512×512\n')
  })

  it('il modulo non ha import', () => {
    expect(righeImport('output.ts')).toEqual([])
  })

  it('db riesporta la stessa scrivi, senza una seconda definizione', () => {
    expect(db.scrivi).toBe(output.scrivi)
  })

  it('genera-icone prende scrivi da lib/output, non da lib/db né da pg', () => {
    const righe = righeImport('../genera-icone.ts')
    expect(righe.some((riga) => riga.includes("'./lib/output'"))).toBe(true)
    expect(righe.filter(specificatoreVietato)).toEqual([])
  })
})
