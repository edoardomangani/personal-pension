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

const GIORNI = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
] as const

// Scarti dei mesi dell'algoritmo di Sakamoto: giorno della settimana senza `Date` né fuso orario.
const SCARTI_MESE = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const

function bisestile(anno: number): boolean {
  return (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0
}

function giorniNelMese(anno: number, mese: number): number {
  if (mese === 2) return bisestile(anno) ? 29 : 28
  return [4, 6, 9, 11].includes(mese) ? 30 : 31
}

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

/** `YYYY-MM-DD` → `mercoledì 4 novembre`. */
export function formatoGiorno(data: string): string {
  const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (parti === null) return VUOTO
  const anno = Number(parti[1])
  const mese = Number(parti[2])
  const giorno = Number(parti[3])
  const nomeMese = MESI[mese - 1]
  const scarto = SCARTI_MESE[mese - 1]
  if (nomeMese === undefined || scarto === undefined) return VUOTO
  if (giorno < 1 || giorno > giorniNelMese(anno, mese)) return VUOTO
  const a = mese < 3 ? anno - 1 : anno
  const settimana =
    GIORNI[
      (a + Math.floor(a / 4) - Math.floor(a / 100) + Math.floor(a / 400) + scarto + giorno) % 7
    ]
  return `${settimana} ${giorno} ${nomeMese.toLowerCase()}`
}

/** `YYYY-MM-DD` → `12 set 2026`: mese abbreviato minuscolo, senza punto. */
export function formatoDataBreve(data: string | null): string {
  const parti = data === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (parti === null) return VUOTO
  const anno = Number(parti[1])
  const mese = Number(parti[2])
  const giorno = Number(parti[3])
  const nomeMese = MESI[mese - 1]
  if (nomeMese === undefined) return VUOTO
  if (giorno < 1 || giorno > giorniNelMese(anno, mese)) return VUOTO
  // Le prime tre lettere dei mesi italiani sono le abbreviazioni di it-IT.
  return `${giorno} ${nomeMese.slice(0, 3).toLowerCase()} ${parti[1]}`
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
