import type { Centesimi } from '../types/dominio'
import { centesimiInEuro } from './importi'

const MENO = '−'
const VUOTO = '—'

// `true` equivale a 'always' (ECMA-402 v3); la stringa non è nei tipi della lib ES2022 del progetto.
const EURO = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: true,
})
const EURO_INTERO = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  useGrouping: true,
})

const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

// Si formatta il valore assoluto e si mette il segno a mano: niente trattino né "−0" dopo l'arrotondamento.
function conSegno(negativo: boolean, testo: string, positivo = ''): string {
  const nullo = !/[1-9]/.test(testo)
  if (nullo) return positivo + testo
  return (negativo ? MENO : positivo) + testo
}

export function formatoEuro(importo: Centesimi | null): string {
  if (importo === null || !Number.isFinite(importo)) return VUOTO
  return conSegno(importo < 0, EURO.format(centesimiInEuro(Math.abs(importo))))
}

export function formatoEuroIntero(importo: Centesimi | null): string {
  if (importo === null || !Number.isFinite(importo)) return VUOTO
  return conSegno(importo < 0, EURO_INTERO.format(centesimiInEuro(Math.abs(importo))))
}

/** `YYYY-MM-DD` → `GG/MM/AAAA`. */
export function formatoData(data: string | null): string {
  const parti = data === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (parti === null) return VUOTO
  return `${parti[3]}/${parti[2]}/${parti[1]}`
}

/** `YYYY-MM` → `Settembre 2026`. */
export function formatoMese(competenza: string | null): string {
  const parti = competenza === null ? null : /^(\d{4})-(\d{2})$/.exec(competenza)
  if (parti === null) return VUOTO
  const mese = MESI[Number(parti[2]) - 1]
  if (mese === undefined) return VUOTO
  return `${mese} ${parti[1]}`
}

/** Frazione → percentuale con segno esplicito (`0.0475` → `+4,75%`). */
export function formatoPercentuale(frazione: number | null, decimali = 2): string {
  if (frazione === null || !Number.isFinite(frazione)) return VUOTO
  const testo = (Math.abs(frazione) * 100).toLocaleString('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  })
  return conSegno(frazione < 0, testo, '+') + '%'
}
