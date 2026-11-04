// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as db from './db'
import * as output from './output'

const righeImport = (percorso: string) =>
  readFileSync(join(import.meta.dirname, percorso), 'utf8')
    .split('\n')
    .filter((riga) => /^\s*import\b/.test(riga) || /^\s*}?\s*from\s+['"]/.test(riga))

afterEach(() => {
  vi.restoreAllMocks()
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
    expect(righe.filter((riga) => /['"](\.\/lib\/db|pg)['"]/.test(riga))).toEqual([])
  })
})
