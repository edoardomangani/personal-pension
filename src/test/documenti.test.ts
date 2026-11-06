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

describe('DS-05 R12 fase 3: DESIGN.md', () => {
  const design = leggi('DESIGN.md')

  it('la barra di stato è piena, non più trasparente', () => {
    expect(design).not.toContain('barra di stato trasparente')
    expect(riga(design, 'Installata dalla Home')).toContain('barra di stato piena e scura')
  })

  it('lo zoom touch è bloccato', () => {
    const zoom = riga(design, '- **Zoom:**')
    expect(zoom).toContain('zoom touch è bloccato')
    expect(zoom).toContain('doppio tocco')
    expect(zoom).toContain('pizzico')
    expect(zoom).toContain('al focus')
  })
})

describe.skipIf(!inCiclo('ciclo/riferimenti'))(
  'DS-05 R13: riferimenti delle voci con la shell',
  () => {
    const regola =
      '- La shell (vetro di testata e barre, bagliore, spazio sopra il contenuto su telefono) segue DS-05, anche dove le tavole la mostrano diversa.'

    it.each(['MOV-01', 'VAL-01', 'FIS-01', 'IMP-01', 'NOT-01', 'PAN-01'])(
      '%s ha la riga nelle Regole',
      (voce) => {
        const testo = leggi(`ciclo/riferimenti/${voce}/riferimento.md`)
        const inizio = testo.indexOf('\n## Regole\n')
        expect(inizio).toBeGreaterThanOrEqual(0)
        const fine = testo.indexOf('\n## ', inizio + 1)
        const regole = testo.slice(inizio, fine === -1 ? undefined : fine)
        expect(regole.split('\n')).toContain(regola)
      },
    )
  },
)
