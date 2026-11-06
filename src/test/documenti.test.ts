// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const leggi = (percorso: string) => readFileSync(join(process.cwd(), percorso), 'utf8')
// ciclo/ non va nelle PR: fuori dal branch di lavoro questi controlli si saltano.
const inCiclo = (percorso: string) => existsSync(join(process.cwd(), percorso))

function riga(testo: string, prefisso: string): string {
  const trovata = testo.split('\n').find((r) => r.startsWith(prefisso))
  if (trovata === undefined) throw new Error(`Riga «${prefisso}» non trovata`)
  return trovata
}

describe('DS-04 R7: CLAUDE.md', () => {
  const claude = leggi('CLAUDE.md')

  it('il punto 6 usa il fondo #060708', () => {
    const punto6 = riga(claude, '6. **PWA.**')
    expect(punto6).toContain('#060708')
    expect(punto6).not.toContain('#0e0e0d')
  })

  it('la riga «Stile» non dà al lime il «+» né il focus', () => {
    const stile = riga(claude, '- **Stile:')
    expect(stile).not.toContain('pulsante +')
    const lime = stile.slice(stile.indexOf('Il lime fa'))
    const compitiLime = lime.slice(0, lime.indexOf(';'))
    expect(compitiLime).not.toContain('+')
    expect(compitiLime).not.toContain('focus')
    expect(stile).toContain('White Acts')
  })
})

describe('DS-04 R8: PRODUCT.md', () => {
  const prodotto = leggi('PRODUCT.md')

  it('mantiene il formato Impeccable', () => {
    expect(prodotto).toContain('<!-- impeccable:product-schema 1 -->')
  })

  it("descrive l'app di oggi", () => {
    expect(prodotto).toContain('Neon')
    expect(prodotto).toContain('GitHub Pages')
  })

  it.each(['self-contained HTML artifact', 'owner-only', 'two record types only'])(
    'non dice più «%s»',
    (frase) => {
      expect(prodotto).not.toContain(frase)
    },
  )
})

describe.skipIf(!inCiclo('ciclo/PROFILO.md'))('DS-04 R9: ciclo/PROFILO.md', () => {
  const profilo = inCiclo('ciclo/PROFILO.md') ? leggi('ciclo/PROFILO.md') : ''

  it('il titolo porta il nome Next', () => {
    expect(profilo.split('\n')[0]).toContain('Next')
  })

  it('DESIGN.md non è più detto superato', () => {
    const righe = profilo.split('\n').filter((r) => r.includes('DESIGN.md'))
    expect(righe.length).toBeGreaterThan(0)
    for (const r of righe) expect(r).not.toContain('superato')
  })

  it('i temi sono solo scuro', () => {
    expect(profilo).not.toContain('Temi: da definire')
    expect(riga(profilo, '- **Larghezze**')).toContain('solo scuro')
    expect(riga(profilo, '- **Tema nel browser**')).toContain('non serve `page.emulateMedia`')
  })
})

describe('DS-04 R10: DESIGN.md', () => {
  it("la testata secondaria nomina l'azione a destra", () => {
    const testata = riga(leggi('DESIGN.md'), '- **Testata secondaria')
    expect(testata).toContain('a destra')
    expect(testata).toContain('«Salva»')
  })
})
