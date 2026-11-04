import { inject, ref, type InjectionKey, type Ref } from 'vue'

// Indice della vetrina: l'ordine dà i numeri «01» e «1.2»; ogni blocco è usato da un solo ShowcaseBlock (vetrina.test.ts).
// Prefissi di progetto fuori da docs/convenzioni-vetrina.md (il test li legge da qui):
// - AMT: importi
// - MOV: elenco dei movimenti
// - ACC: ruoli dell'accento
const ordineSezioni = [
  'fondamenta',
  'shell',
  'azioni',
  'campi',
  'form',
  'overlay',
  'struttura',
] as const

export type ShowcaseSectionId = (typeof ordineSezioni)[number]

const etichetteSezioni: Record<ShowcaseSectionId, string> = {
  fondamenta: 'Fondamenta',
  shell: 'Shell',
  azioni: 'Azioni',
  campi: 'Campi',
  form: 'Moduli',
  overlay: 'Overlay',
  struttura: 'Struttura',
}

export const showcaseSections = ordineSezioni.map((id) => ({ id, label: etichetteSezioni[id] }))

export const showcaseBlocks = {
  'fondamenta-colori': { section: 'fondamenta', title: 'Colori' },
  'fondamenta-ruoli': { section: 'fondamenta', title: "Ruoli dell'accento" },
  'fondamenta-tipografia': { section: 'fondamenta', title: 'Tipografia' },
  'fondamenta-raggi': { section: 'fondamenta', title: 'Raggi' },
  'fondamenta-spaziature': { section: 'fondamenta', title: 'Spaziature' },
  'fondamenta-icone': { section: 'fondamenta', title: 'Icone' },
  'fondamenta-importi': { section: 'fondamenta', title: 'Saldo e importi' },
  'shell-marchio': { section: 'shell', title: 'Marchio' },
  'shell-sidebar': { section: 'shell', title: 'Sidebar desktop' },
  'shell-voci': { section: 'shell', title: 'Voci di navigazione' },
  'shell-barra-alta': { section: 'shell', title: 'Barra in alto desktop' },
  'shell-testata-mobile': { section: 'shell', title: 'Testata mobile' },
  'shell-barra-bassa': { section: 'shell', title: 'Barra in basso mobile' },
  'shell-telefono': { section: 'shell', title: 'Schermata del telefono' },
  'azioni-bottoni': { section: 'azioni', title: 'Bottoni: varianti' },
  'azioni-bottoni-misure': { section: 'azioni', title: 'Bottoni: misure' },
  'azioni-bottoni-stati': { section: 'azioni', title: 'Bottoni: stati' },
  'azioni-badge': { section: 'azioni', title: 'Badge' },
  'azioni-nuovo-movimento': { section: 'azioni', title: 'Nuovo movimento' },
  'campi-label': { section: 'campi', title: 'Etichetta' },
  'campi-testo-stati': { section: 'campi', title: 'Campo di testo: stati' },
  'campi-select': { section: 'campi', title: 'Selezione' },
  'campi-checkbox': { section: 'campi', title: 'Casella di spunta' },
  'form-righe': { section: 'form', title: 'Tipi di riga' },
  'form-errore': { section: 'form', title: 'Stato di errore' },
  'form-accesso': { section: 'form', title: 'Email e password' },
  'form-note': { section: 'form', title: 'Testo lungo' },
  'overlay-menu': { section: 'overlay', title: 'Menu a discesa' },
  'overlay-tooltip': { section: 'overlay', title: 'Suggerimento' },
  'overlay-dialog': { section: 'overlay', title: 'Finestra di dialogo' },
  'overlay-sheet': { section: 'overlay', title: 'Pannello laterale' },
  'overlay-drawer': { section: 'overlay', title: 'Pannello dal basso' },
  'overlay-toast': { section: 'overlay', title: 'Notifica' },
  'overlay-sheet-responsive': { section: 'overlay', title: 'Pannello adattivo' },
  'struttura-card': { section: 'struttura', title: 'Scheda' },
  'struttura-breadcrumb': { section: 'struttura', title: 'Percorso' },
  'struttura-alert': { section: 'struttura', title: 'Avviso' },
  'struttura-avatar': { section: 'struttura', title: 'Avatar' },
  'struttura-indicatori': { section: 'struttura', title: 'Indicatori' },
  'struttura-separatori': { section: 'struttura', title: 'Separatore' },
  'struttura-collapsible': { section: 'struttura', title: 'Sezione espandibile' },
  'struttura-movimenti': { section: 'struttura', title: 'Lista dei movimenti' },
} as const satisfies Record<string, { section: ShowcaseSectionId; title: string }>

export type ShowcaseBlockId = keyof typeof showcaseBlocks

export type ShowcaseHeading = { id: string; number: string; title: string }

export function sectionNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

function indiceSezione(id: ShowcaseSectionId): number {
  return ordineSezioni.indexOf(id)
}

export function showcaseSection(id: ShowcaseSectionId): ShowcaseHeading {
  return { id, number: sectionNumber(indiceSezione(id)), title: etichetteSezioni[id] }
}

// Blocchi di una sezione nell'ordine di dichiarazione, già numerati «N.M».
export function sectionBlocks(id: ShowcaseSectionId): ShowcaseHeading[] {
  const sectionIndex = indiceSezione(id)

  return Object.entries(showcaseBlocks)
    .filter(([, block]) => block.section === id)
    .map(([blockId, block], blockIndex) => ({
      id: blockId,
      number: `${sectionIndex + 1}.${blockIndex + 1}`,
      title: block.title,
    }))
}

export function showcaseBlock(id: ShowcaseBlockId): ShowcaseHeading {
  const { section, title } = showcaseBlocks[id]
  const position = Object.entries(showcaseBlocks)
    .filter(([, block]) => block.section === section)
    .findIndex(([blockId]) => blockId === id)

  return { id, number: `${indiceSezione(section) + 1}.${position + 1}`, title }
}

// Il selettore decide solo la cornice: «mobile» mette il campione nel telefono da 390px, le misure non cambiano.
export type ShowcaseDensity = 'desktop' | 'mobile'

export const showcaseDensityKey: InjectionKey<Ref<ShowcaseDensity>> = Symbol('showcaseDensity')

export function useShowcaseDensity(): Ref<ShowcaseDensity> {
  return inject(showcaseDensityKey, ref<ShowcaseDensity>('desktop'))
}
