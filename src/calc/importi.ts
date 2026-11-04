import type { Centesimi } from '../types/dominio'

export function euroInCentesimi(euro: number): Centesimi {
  return Math.round(euro * 100)
}

/** Solo al bordo (formattazione, livello dati): la logica resta sui centesimi. */
export function centesimiInEuro(centesimi: Centesimi): number {
  return centesimi / 100
}

export function sommaCentesimi(importi: readonly Centesimi[]): Centesimi {
  return importi.reduce((totale, importo) => totale + importo, 0)
}

// Il punto vale solo come separatore delle migliaia ben formato: "12.50" è ambiguo e si rifiuta.
const IMPORTO_IT = /^(\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/

/** Legge un importo digitato in formato it-IT; `null` se non è un importo positivo valido. */
export function leggiImporto(testo: string): Centesimi | null {
  const pulito = testo.replace(/[\s€]/g, '')
  if (!IMPORTO_IT.test(pulito)) return null
  const virgola = pulito.indexOf(',')
  const intera = virgola === -1 ? pulito : pulito.slice(0, virgola)
  const decimali = virgola === -1 ? '' : pulito.slice(virgola + 1)
  return Number(intera.replaceAll('.', '')) * 100 + Number(decimali.padEnd(2, '0'))
}
