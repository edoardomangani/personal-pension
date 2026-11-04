import { delFondo, ultimiEstratti, ultimoValore, versatoDelMovimento } from './posizione'
import type { Archivio, Centesimi } from '../types/dominio'

export interface Flusso {
  data: string
  /** Negativo per i versamenti, positivo per il valore finale. */
  importo: Centesimi
}

export type Rendimento =
  { valore: number; motivo: null } | { valore: null; motivo: 'storia-breve' | 'non-calcolabile' }

const GIORNI_ANNO = 365.25

/** Giorni dal 1970-01-01 di una data ISO, sul calendario gregoriano (senza `Date`). */
export function giornoCivile(data: string): number {
  const anno = Number(data.slice(0, 4))
  const mese = Number(data.slice(5, 7))
  const giorno = Number(data.slice(8, 10))
  // L'anno parte da marzo, così il 29 febbraio è l'ultimo giorno.
  const a = mese <= 2 ? anno - 1 : anno
  const era = Math.floor(a / 400)
  const annoEra = a - era * 400
  const meseDaMarzo = (mese + 9) % 12
  const giornoAnno = Math.floor((153 * meseDaMarzo + 2) / 5) + giorno - 1
  const giornoEra = annoEra * 365 + Math.floor(annoEra / 4) - Math.floor(annoEra / 100) + giornoAnno
  return era * 146097 + giornoEra - 719468
}

export function giorniTra(da: string, a: string): number {
  return giornoCivile(a) - giornoCivile(da)
}

/** Tasso annuo per bisezione tra −99% e +1000%, come il prototipo; `null` se non si può calcolare. */
export function xirr(flussi: readonly Flusso[]): number | null {
  if (flussi.length < 2) return null
  const primo = flussi.map((f) => f.data).reduce((min, d) => (d < min ? d : min))
  const termini = flussi.map((f) => ({
    importo: f.importo,
    anni: giorniTra(primo, f.data) / GIORNI_ANNO,
  }))
  if (Math.max(...termini.map((t) => t.anni)) < 0.08) return null
  const f = (r: number) => termini.reduce((s, t) => s + t.importo / Math.pow(1 + r, t.anni), 0)
  let basso = -0.99
  let alto = 10
  let fBasso = f(basso)
  if (fBasso * f(alto) > 0) return null
  for (let i = 0; i < 200; i++) {
    const medio = (basso + alto) / 2
    const fMedio = f(medio)
    if (Math.abs(fMedio) < 1e-7) return medio
    if (fBasso * fMedio < 0) {
      alto = medio
    } else {
      basso = medio
      fBasso = fMedio
    }
  }
  return (basso + alto) / 2
}

/** Primo movimento con almeno una riga non `Spesa`: è quello che apre la storia del rendimento. */
function dataPrimoMovimento(archivio: Archivio, fondoId?: string): string | null {
  const date = delFondo(archivio.movimenti, fondoId)
    .filter((m) => versatoDelMovimento(m) > 0)
    .map((m) => m.data)
  return date.reduce<string | null>((min, d) => (min === null || d < min ? d : min), null)
}

/** Stessa data un anno dopo, sulla stringa (il 29/02 diventa 29/02, che sta tra 28/02 e 01/03). */
function dopoUnAnno(data: string): string {
  return `${Number(data.slice(0, 4)) + 1}${data.slice(4)}`
}

/** Flussi XIRR: i versamenti fino all'ultimo estratto del loro fondo, più l'ultimo valore. */
export function flussiRendimento(archivio: Archivio, fondoId?: string): Flusso[] {
  const finale = ultimoValore(archivio, fondoId)
  if (finale === null) return []
  const versamenti = ultimiEstratti(archivio, fondoId).flatMap((estratto) =>
    archivio.movimenti
      .filter((m) => m.fondoId === estratto.fondoId && m.data <= estratto.data)
      .map((m) => ({ data: m.data, importo: -versatoDelMovimento(m) }))
      .filter((f) => f.importo !== 0),
  )
  if (versamenti.length === 0) return []
  return [...versamenti, { data: finale.data, importo: finale.valore }].sort((a, b) =>
    a.data.localeCompare(b.data),
  )
}

export function rendimentoAnnuo(archivio: Archivio, oggi: string, fondoId?: string): Rendimento {
  const primo = dataPrimoMovimento(archivio, fondoId)
  if (primo === null || dopoUnAnno(primo) > oggi) return { valore: null, motivo: 'storia-breve' }
  const valore = xirr(flussiRendimento(archivio, fondoId))
  return valore === null ? { valore: null, motivo: 'non-calcolabile' } : { valore, motivo: null }
}
