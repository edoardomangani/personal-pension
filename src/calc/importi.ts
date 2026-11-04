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

const IMPORTO_IT = /^(\d+)(?:,(\d{1,2}))?$/

/** Legge un importo digitato in formato it-IT; `null` se non è un importo positivo valido. */
export function leggiImporto(testo: string): Centesimi | null {
  const pulito = testo.replace(/[\s €.]/g, '')
  const parti = IMPORTO_IT.exec(pulito)
  if (parti === null) return null
  const interi = Number(parti[1])
  const decimali = Number((parti[2] ?? '').padEnd(2, '0'))
  return interi * 100 + decimali
}
