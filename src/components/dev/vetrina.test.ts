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
  'shell-marchio',
  'shell-sidebar',
  'shell-voci',
  'shell-barra-alta',
  'shell-menu-utente',
  'shell-testata-mobile',
  'shell-barra-bassa',
  'shell-telefono',
  'shell-profilo',
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

// Utility con valore arbitrario (`prefisso-[…]`) che contiene un colore, più `bg-white/`.
function coloriAMano(testo: string): string[] {
  const arbitrari = testo.matchAll(
    /[\w:!/.-]+-\[[^\]\s]*(?:rgba?\(|#[0-9a-fA-F]{3,8}\b)[^\]\s]*\]/g,
  )
  const bianchi = testo.matchAll(/(?<![\w-])[\w:!-]*bg-white\/[\w.[\]]*/g)
  return [...arbitrari, ...bianchi].map((m) => m[0])
}

describe('niente colori scritti a mano in shell e vetrina (R2)', () => {
  it("l'estrattore prende le classi con un colore e lascia stare il resto", () => {
    const esempio = `<div class="shadow-[0_0_0_1px_rgba(255,255,255,.2)] bg-[#0e0e0d] hover:text-[rgb(1,2,3)] bg-white/18" />
const colorTokens = [{ value: 'rgba(255,255,255,.18)' }, { value: '#0e0e0d' }]
<div class="rounded-[24px] tracking-[-0.02em] bg-foreground/32 ease-[cubic-bezier(.2,.8,.2,1)]" />`
    expect(coloriAMano(esempio)).toEqual([
      'shadow-[0_0_0_1px_rgba(255,255,255,.2)]',
      'bg-[#0e0e0d]',
      'hover:text-[rgb(1,2,3)]',
      'bg-white/18',
    ])
  })

  it('nessun .vue di src/components/, dev/, src/views/ e views/dev/ ne ha', () => {
    const VIEWS = fileURLToPath(new URL('../../views/', import.meta.url))
    const COMPONENTI = fileURLToPath(new URL('..', import.meta.url))
    const file = [COMPONENTI, DEV, VIEWS, VIEWS_DEV]
      .flatMap((c) => vueIn(c))
      .filter((f) => f.endsWith('.vue'))
    expect(file.length).toBeGreaterThan(0)
    const trovati = file.flatMap((f) =>
      coloriAMano(readFileSync(f, 'utf8')).map((c) => `${basename(f)}: ${c}`),
    )
    expect(trovati).toEqual([])
  })
})

describe('token di R1', () => {
  const COMPONENTI = fileURLToPath(new URL('..', import.meta.url))
  const casi = [
    { file: `${COMPONENTI}NewMovementButton.vue`, classe: 'shadow-fab' },
    { file: `${COMPONENTI}AppLayout.vue`, classe: 'max-w-content' },
    { file: `${DEV}StructureSection.vue`, classe: 'shadow-tile-outline' },
    { file: `${DEV}DrawerPreview.vue`, classe: 'bg-handle' },
  ]

  it.each(casi)('$file usa $classe al posto del valore arbitrario', ({ file, classe }) => {
    const testo = readFileSync(file, 'utf8')
    expect(testo).toContain(classe)
    expect(testo).not.toContain('rgba(')
    expect(testo).not.toContain('max-w-[1180px]')
    expect(testo).not.toContain('bg-white/18')
  })
})

describe('token del tile (DS-03-C2 R6)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  it('app.css ha --radius-tile: 12px in @theme inline', () => {
    const css = readFileSync(`${RADICE}src/styles/app.css`, 'utf8')
    const tema = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(tema).toMatch(/--radius-tile:\s*12px;/)
  })

  it('i raggi della vetrina hanno RAD-tile a 12px fra lg e xl', () => {
    const testo = readFileSync(`${RADICE}src/components/dev/FoundationsSection.vue`, 'utf8')
    const codici = elenchiDeiCodici(testo).radii ?? []
    const posizione = codici.indexOf('tile')
    expect(posizione).toBeGreaterThan(0)
    expect(codici[posizione - 1]).toBe('lg')
    expect(codici[posizione + 1]).toBe('xl')
    expect(testo).toMatch(/\{ code: 'tile', radius: 'rounded-tile', value: '12px' \}/)
  })

  it('DESIGN.md ha il raggio del tile nel frontmatter rounded', () => {
    const design = readFileSync(`${RADICE}DESIGN.md`, 'utf8')
    const rounded = /^rounded:\n((?: {2}.*\n)+)/m.exec(design)?.[1] ?? ''
    expect(rounded).toMatch(/^ {2}tile: "12px"$/m)
  })
})

describe('DESIGN.md della shell (DS-03-C2 R10)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  it('il piede della sidebar è una riga senza vetro, con sidebar-accent da aperto', () => {
    const design = readFileSync(`${RADICE}DESIGN.md`, 'utf8')
    const piede = /^- \*\*Piede della sidebar \(desktop\):\*\*.*$/m.exec(design)?.[0] ?? ''
    expect(piede).not.toBe('')
    expect(piede).not.toContain('pulsante di vetro')
    expect(piede).toContain('sidebar-accent')
  })
})

describe('altezza della barra in alto (DS-03-C2 R7)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  it(':root definisce --topbar-height a 64px e AppTopBar lo usa', () => {
    const css = readFileSync(`${RADICE}src/styles/app.css`, 'utf8')
    const radice = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(radice).toMatch(/--topbar-height:\s*64px;/)

    const barra = readFileSync(`${RADICE}src/components/AppTopBar.vue`, 'utf8')
    expect(barra).toContain('h-(--topbar-height)')
    expect(barra).not.toMatch(/\bh-16\b/)
  })

  it("l'indice usa il token della barra (DS-03-C2 R7)", () => {
    const vista = readFileSync(`${RADICE}src/views/dev/VistaVetrina.vue`, 'utf8')
    const indice = /<nav\s[^>]*aria-label="Indice della vetrina"[^>]*>/.exec(vista)?.[0] ?? ''
    expect(indice).toContain('top-(--topbar-height)')
    expect(indice).toContain('var(--topbar-height)')
    expect(indice).not.toMatch(/\btop-0\b/)
    expect(indice).not.toMatch(/\bh-dvh\b/)
  })
})

describe('padding in basso del contenuto (DS-03-C2-C1)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  it(':root definisce --content-pad-bottom a 48px', () => {
    const css = readFileSync(`${RADICE}src/styles/app.css`, 'utf8')
    const radice = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(radice).toMatch(/--content-pad-bottom:\s*48px;/)
  })

  it('il contenitore della shell usa il token al posto di lg:pb-12', () => {
    const layout = readFileSync(`${RADICE}src/components/AppLayout.vue`, 'utf8')
    const contenitore = /<div\s[^>]*data-contenuto[^>]*>/.exec(layout)?.[0] ?? ''
    expect(contenitore).toContain('lg:pb-(--content-pad-bottom)')
    expect(contenitore).not.toMatch(/\blg:pb-12\b/)
  })

  it("l'altezza dell'indice sottrae la barra e il token del padding", () => {
    const vista = readFileSync(`${RADICE}src/views/dev/VistaVetrina.vue`, 'utf8')
    const indice = /<nav\s[^>]*aria-label="Indice della vetrina"[^>]*>/.exec(vista)?.[0] ?? ''
    expect(indice).toContain('var(--topbar-height)')
    expect(indice).toContain('var(--content-pad-bottom)')
    expect(indice).not.toContain('--spacing)*12')
    expect(indice).toContain('top-(--topbar-height)')
  })
})

describe('testata del telefono (DS-03-C2-C2 R3)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  it(':root definisce --header-mobile-height a 68px, fuori da @theme inline', () => {
    const css = readFileSync(`${RADICE}src/styles/app.css`, 'utf8')
    const radice = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(radice).toMatch(/--header-mobile-height:\s*68px;/)
    const tema = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(tema).not.toBe('')
    expect(tema).not.toContain('--header-mobile-height')
  })

  // 12 + 44 + 12 = 68: se cambia la testata, va cambiato il token.
  it('AppMobileHeader somma ancora a 68px', () => {
    const testata = readFileSync(`${RADICE}src/components/AppMobileHeader.vue`, 'utf8')
    const header = /<header\s[^>]*>/.exec(testata)?.[0] ?? ''
    expect(header).toContain('pt-[calc(12px+env(safe-area-inset-top))]')
    expect(header).toMatch(/\bpb-3\b/)
    expect(testata).toMatch(/<div v-else class="[^"]*\bmin-h-11\b/)
  })
})

describe('scarto dello scroll della vetrina (DS-03-C2-C2 R4, R6)', () => {
  const RADICE = fileURLToPath(new URL('../../../', import.meta.url))

  function controllaScarto(tag: string): void {
    const sotto = /(?:^|\s)scroll-mt-\[([^\s"]*)\]/.exec(tag)?.[1] ?? ''
    expect(sotto).toContain('var(--header-mobile-height)')
    expect(sotto).toContain('env(safe-area-inset-top)')
    expect(sotto).toContain('--spacing(6)')
    const sopra = /\blg:scroll-mt-\[([^\s"]*)\]/.exec(tag)?.[1] ?? ''
    expect(sopra).toContain('var(--topbar-height)')
    expect(sopra).toContain('--spacing(6)')
    expect(tag).not.toMatch(/(?:^|[\s"])scroll-mt-6(?=[\s"]|$)/)
  }

  it('la section di ShowcaseSection scarta testata e barra', () => {
    const sezione = /<section\s[^>]*>/.exec(sorgente('ShowcaseSection.vue'))?.[0] ?? ''
    controllaScarto(sezione)
  })

  it("l'h3 di ShowcaseBlock scarta testata e barra", () => {
    const titolo = /<h3\s[^>]*>/.exec(sorgente('ShowcaseBlock.vue'))?.[0] ?? ''
    controllaScarto(titolo)
  })

  it('vaiA scorre con scrollIntoView, senza misure in JavaScript', () => {
    const vista = readFileSync(`${RADICE}src/views/dev/VistaVetrina.vue`, 'utf8')
    const vaiA = /function vaiA\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(vista)?.[1] ?? ''
    expect(vaiA).toContain('scrollIntoView()')
    expect(vista).not.toMatch(/\bscroll(To|By)\(/)
  })
})
