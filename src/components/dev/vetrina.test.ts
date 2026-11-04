// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sectionBlocks, showcaseBlocks, showcaseSections } from './showcase'

const DEV = fileURLToPath(new URL('.', import.meta.url))

function sorgente(nome: string): string {
  return readFileSync(`${DEV}${nome}`, 'utf8')
}

const BLOCCHI_ATTESI = [
  'fondamenta-colori',
  'fondamenta-ruoli',
  'fondamenta-tipografia',
  'fondamenta-raggi',
  'fondamenta-spaziature',
  'fondamenta-icone',
  'fondamenta-importi',
  'shell-sidebar',
  'shell-voci',
  'shell-barra-alta',
  'shell-testata-mobile',
  'shell-barra-bassa',
  'shell-telefono',
  'azioni-bottoni',
  'azioni-bottoni-misure',
  'azioni-bottoni-stati',
  'azioni-badge',
  'azioni-nuovo-movimento',
  'campi-label',
  'campi-testo-stati',
  'campi-select',
  'campi-checkbox',
  'form-righe',
  'form-errore',
  'form-accesso',
  'form-note',
  'overlay-menu',
  'overlay-tooltip',
  'overlay-dialog',
  'overlay-sheet',
  'overlay-drawer',
  'overlay-toast',
  'overlay-sheet-responsive',
  'struttura-card',
  'struttura-breadcrumb',
  'struttura-alert',
  'struttura-avatar',
  'struttura-indicatori',
  'struttura-separatori',
  'struttura-collapsible',
  'struttura-movimenti',
]

describe('indice della vetrina (showcase.ts)', () => {
  it("ha le sezioni nell'ordine della convenzione, senza «pattern» che resterebbe vuota", () => {
    expect(showcaseSections.map((s) => s.id)).toEqual([
      'fondamenta',
      'shell',
      'azioni',
      'campi',
      'form',
      'overlay',
      'struttura',
    ])
  })

  it("ha i blocchi nell'ordine atteso", () => {
    expect(Object.keys(showcaseBlocks)).toEqual(BLOCCHI_ATTESI)
  })

  it('non ha i blocchi tolti da R10', () => {
    const ids = Object.keys(showcaseBlocks)
    for (const tolto of ['campi-otp', 'pattern-filtri', 'pattern-peek', 'struttura-paginazione']) {
      expect(ids).not.toContain(tolto)
    }
  })

  it('ha id unici e nessuna sezione vuota', () => {
    const sezioni = showcaseSections.map((s) => s.id)
    const ids = [...sezioni, ...Object.keys(showcaseBlocks)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const sezione of sezioni) expect(sectionBlocks(sezione)).not.toEqual([])
  })

  it("i blocchi di una sezione hanno l'id che comincia con la sezione", () => {
    for (const [id, blocco] of Object.entries(showcaseBlocks)) {
      expect(id.startsWith(`${blocco.section}-`)).toBe(true)
    }
  })
})

// Tabella dei prefissi di docs/convenzioni-vetrina.md.
const PREFISSI_CONVENZIONE = [
  'CLR',
  'TYP',
  'RAD',
  'SHD',
  'SPC',
  'ICN',
  'SHL',
  'BTN',
  'TGL',
  'BDG',
  'CHP',
  'LNK',
  'LBL',
  'INP',
  'TXA',
  'NUM',
  'SEL',
  'TAG',
  'CHK',
  'RDO',
  'SWT',
  'SLD',
  'DAT',
  'TIM',
  'OTP',
  'FIL',
  'FRM',
  'MNU',
  'TIP',
  'POP',
  'DLG',
  'CNF',
  'SHT',
  'DRW',
  'TST',
  'CRD',
  'BOX',
  'TBL',
  'TAB',
  'PAG',
  'BRC',
  'ALR',
  'AVT',
  'IND',
  'SEP',
  'CLP',
  'PAT',
]

// Codici dei Specimen come scritti: il template literal senza backtick.
function codiciScritti(testo: string): string[] {
  return [...testo.matchAll(/<Specimen\b[^>]*?\s:?code="([^"]+)"/gs)].map((m) =>
    (m[1] ?? '').replace(/^[`']|[`']$/g, ''),
  )
}

function blocchiUsati(testo: string): string[] {
  return [...testo.matchAll(/<ShowcaseBlock\b[^>]*?\sid="([^"]+)"/gs)].map((m) => m[1] ?? '')
}

function sezioneDi(testo: string): string | undefined {
  return /<ShowcaseSection\b[^>]*?\sid="([^"]+)"/s.exec(testo)?.[1]
}

function prefissiDichiarati(testo: string): string[] {
  return [...testo.matchAll(/^\/\/ - ([A-Z]{3}): \S/gm)].map((m) => m[1] ?? '')
}

// Elenchi letterali (`const x = [...]`) che finiscono in un codice via `v-for="voce in x"` e `${voce.campo}`.
function elenchiDeiCodici(testo: string): Record<string, string[]> {
  const segnaposti = new Map<string, string>()
  for (const codice of testo.matchAll(/:code="([^"]+)"/g)) {
    for (const m of (codice[1] ?? '').matchAll(/\$\{(\w+)(?:\.(\w+))?\}/g)) {
      segnaposti.set(m[1] ?? '', m[2] ?? '')
    }
  }
  const elenchi: Record<string, string[]> = {}
  for (const ciclo of testo.matchAll(/v-for="(\w+) in (\w+)"/g)) {
    const [, voce = '', nome = ''] = ciclo
    const campo = segnaposti.get(voce)
    if (campo === undefined) continue
    const corpo = new RegExp(
      `const ${nome}\\b[^=]*=\\s*\\[(.*?)\\](?=;|\\s+as const|\\.|\\n)`,
      's',
    ).exec(testo)?.[1]
    if (corpo === undefined) continue
    const valore = campo === '' ? /'([^']*)'/g : new RegExp(`\\b${campo}\\s*:\\s*'([^']*)'`, 'g')
    elenchi[nome] = [...corpo.matchAll(valore)].map((m) => m[1] ?? '')
  }
  return elenchi
}

function importaDatiOStore(testo: string): boolean {
  return /(?:from\s+|import\s*\(\s*|import\s+)['"]@\/(?:data|stores)(?:[/'"])/.test(testo)
}

function vueIn(cartella: string): string[] {
  if (!existsSync(cartella)) return []
  return readdirSync(cartella)
    .filter((f) => f.endsWith('.vue') || f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts'))
    .map((f) => join(cartella, f))
}

const VIEWS_DEV = fileURLToPath(new URL('../../views/dev/', import.meta.url))
const FILE_DEV = vueIn(DEV).filter((f) => f.endsWith('.vue'))
const SEZIONI = FILE_DEV.filter(
  (f) => f.endsWith('Section.vue') && basename(f) !== 'ShowcaseSection.vue',
)

describe('estrattori del test (casi positivi e negativi)', () => {
  it('leggono codici, blocchi, sezioni e prefissi', () => {
    const esempio = `<ShowcaseSection id="shell"><ShowcaseBlock id="shell-voci">
      <Specimen code="SHL-a" /><Specimen
        v-for="x in xs" :key="x.code"
        :code="\`CLR-\${x.code}\`" /></ShowcaseBlock><Showcase id="no" /><Specimenx code="NO" />`
    expect(codiciScritti(esempio)).toEqual(['SHL-a', 'CLR-${x.code}'])
    expect(blocchiUsati(esempio)).toEqual(['shell-voci'])
    expect(sezioneDi(esempio)).toBe('shell')
    expect(sezioneDi('<ShowcaseBlock id="x" />')).toBeUndefined()
    expect(prefissiDichiarati('// - AMT: importi\n// - xx: no\n//- MOV: no')).toEqual(['AMT'])
  })

  it('trovano i doppioni negli elenchi letterali, con o senza campo', () => {
    const esempio = `const xs = [
  { code: 'a', v: 'z' },
  { code: 'a', v: 'y' },
]
const ws = ['r', 's'] as const
const ns = ref(['q'])
<Specimen v-for="x in xs" :code="\`CLR-\${x.code}\`" />
<Specimen v-for="w in ws" :code="\`ICN-\${w}\`" />
<Specimen v-for="n in ns" :code="\`SEL-\${n}\`" />
<Specimen v-for="k in xs" code="TYP-fisso" />`
    expect(elenchiDeiCodici(esempio)).toEqual({ xs: ['a', 'a'], ws: ['r', 's'] })
  })

  it('riconoscono gli import di dati e store', () => {
    expect(importaDatiOStore("import { x } from '@/data/client'")).toBe(true)
    expect(importaDatiOStore("import { useDati } from '@/stores/dati'")).toBe(true)
    expect(importaDatiOStore("await import('@/stores')")).toBe(true)
    expect(importaDatiOStore("import { formatoEuro } from '@/calc/formato'")).toBe(false)
    expect(importaDatiOStore("import x from '@/database'")).toBe(false)
  })
})

describe('campioni e blocchi nei sorgenti della vetrina (R9)', () => {
  it('i codici dei Specimen sono unici come scritti nel sorgente', () => {
    const codici = FILE_DEV.flatMap((f) => codiciScritti(readFileSync(f, 'utf8')))
    expect(codici).not.toEqual([])
    expect(codici.filter((c, i) => codici.indexOf(c) !== i)).toEqual([])
  })

  it('i codici usano i prefissi della convenzione o quelli dichiarati in showcase.ts', () => {
    const dichiarati = prefissiDichiarati(sorgente('showcase.ts'))
    expect(dichiarati).toEqual(['AMT', 'MOV', 'ACC'])
    const prefissi = new Set(
      FILE_DEV.flatMap((f) => codiciScritti(readFileSync(f, 'utf8'))).map(
        (c) => /^([A-Z]{3})-/.exec(c)?.[1] ?? c,
      ),
    )
    expect(prefissi.size).toBeGreaterThan(0)
    const ammessi = [...PREFISSI_CONVENZIONE, ...dichiarati]
    expect([...prefissi].filter((p) => !ammessi.includes(p))).toEqual([])
  })

  it('gli elenchi letterali che generano codici non hanno doppioni', () => {
    const elenchi = Object.fromEntries(
      FILE_DEV.flatMap((f) =>
        Object.entries(elenchiDeiCodici(readFileSync(f, 'utf8'))).map(
          ([nome, valori]) => [`${basename(f)}: ${nome}`, valori] as const,
        ),
      ),
    )
    expect(Object.keys(elenchi)).toContain('FoundationsSection.vue: colorTokens')
    expect(Object.keys(elenchi)).toContain('ActionsSection.vue: buttonVariants')
    expect(Object.keys(elenchi)).toContain('FieldsSection.vue: fieldStates')
    expect(Object.keys(elenchi)).toContain('OverlaysSection.vue: sheetSamples')
    expect(Object.keys(elenchi)).toContain('StructureSection.vue: movementRows')
    for (const [nome, valori] of Object.entries(elenchi)) {
      expect(valori, `${nome} è vuoto`).not.toEqual([])
      expect(
        valori.filter((v, i) => valori.indexOf(v) !== i),
        `${nome} ha valori ripetuti`,
      ).toEqual([])
    }
  })

  it("ogni ShowcaseBlock è usato una volta sola ed è nell'indice", () => {
    const usati = FILE_DEV.flatMap((f) => blocchiUsati(readFileSync(f, 'utf8')))
    expect(usati).not.toEqual([])
    expect(usati.filter((b, i) => usati.indexOf(b) !== i)).toEqual([])
    expect(usati.filter((b) => !(b in showcaseBlocks))).toEqual([])
  })

  it("ogni file *Section.vue rende i blocchi della sua sezione nell'ordine dell'indice", () => {
    expect(SEZIONI).not.toEqual([])
    for (const file of SEZIONI) {
      const testo = readFileSync(file, 'utf8')
      const sezione = sezioneDi(testo)
      const attesi = Object.entries(showcaseBlocks)
        .filter(([, blocco]) => blocco.section === sezione)
        .map(([id]) => id)
      expect(sezione, `${basename(file)} senza ShowcaseSection`).toBeDefined()
      expect(blocchiUsati(testo), `${basename(file)} fuori ordine`).toEqual(attesi)
    }
  })

  it("VistaVetrina monta le sezioni nell'ordine dell'indice", () => {
    const vista = readFileSync(`${VIEWS_DEV}VistaVetrina.vue`, 'utf8')
    const template = vista.slice(vista.indexOf('<template>'))
    const montate = [...template.matchAll(/<(\w+Section) \/>/g)].map((m) => m[1] ?? '')
    const sezioneDelFile = Object.fromEntries(
      SEZIONI.map((f) => [basename(f, '.vue'), sezioneDi(readFileSync(f, 'utf8'))]),
    )
    expect(montate.map((nome) => sezioneDelFile[nome])).toEqual(showcaseSections.map((s) => s.id))
    expect(montate).toHaveLength(SEZIONI.length)
  })

  it('nessun file della vetrina importa dati o store (R8)', () => {
    const file = [...vueIn(DEV), ...vueIn(VIEWS_DEV)]
    expect(file.length).toBeGreaterThan(0)
    expect(
      file.filter((f) => importaDatiOStore(readFileSync(f, 'utf8'))).map((f) => basename(f)),
    ).toEqual([])
  })
})

describe('mattoni della vetrina', () => {
  it('Specimen espone il codice come data-specimen', () => {
    expect(sorgente('Specimen.vue')).toMatch(/<figure\b[^>]*\s:data-specimen="code"[^>]*>/s)
  })

  it('ShowcaseSection non disegna una superficie', () => {
    const sezione = sorgente('ShowcaseSection.vue')
    expect(sezione).not.toContain('bg-card')
    expect(sezione).not.toContain('shadow')
    expect(sezione).not.toMatch(/(?<![\w-])p-\d/)
  })
})
