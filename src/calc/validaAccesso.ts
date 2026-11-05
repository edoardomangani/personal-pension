/** Errori per campo, in italiano: un campo assente o `undefined` è valido. */
export type ErroriDi<Bozza> = Partial<Record<keyof Bozza, string>>

export interface BozzaAccesso {
  email: string
  password: string
}

export interface BozzaRegistrazione {
  nome: string
  email: string
  password: string
  conferma: string
}

export interface BozzaCodice {
  codice: string
}

export interface BozzaRichiestaReset {
  email: string
}

export interface BozzaNuovaPassword {
  password: string
  conferma: string
}

export interface BozzaCambioPassword {
  attuale: string
  nuova: string
  conferma: string
}

export interface BozzaNome {
  nome: string
}

export interface BozzaConfermaCancellazione {
  /** La password, o l'email per un account solo Google. */
  conferma: string
}

export interface BozzaOnboarding {
  fondo: string
  annoNascita: string
  etaPensione: string
}

const NOME_MASSIMO = 80
const PASSWORD_MINIMA = 8
const PASSWORD_MASSIMA = 128
const ANNO_MINIMO = 1940
// Chi ha meno di 16 anni non ha un fondo pensione proprio.
const ETA_MINIMA_ISCRITTO = 16
const ETA_PENSIONE_MINIMA = 40
const ETA_PENSIONE_MASSIMA = 80

const FORMA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function erroreEmail(email: string): string | undefined {
  return FORMA_EMAIL.test(email.trim()) ? undefined : 'Scrivi un indirizzo email valido.'
}

function errorePasswordNuova(password: string): string | undefined {
  if (password.length < PASSWORD_MINIMA) return 'Almeno 8 caratteri.'
  if (password.length > PASSWORD_MASSIMA) return 'Al massimo 128 caratteri.'
  return undefined
}

function erroreConferma(password: string, conferma: string): string | undefined {
  return conferma === password ? undefined : 'Le password non coincidono.'
}

function erroreNome(nome: string): string | undefined {
  const pulito = nome.trim()
  if (pulito === '') return 'Scrivi il tuo nome.'
  if (pulito.length > NOME_MASSIMO) return 'Al massimo 80 caratteri.'
  return undefined
}

/** Bozza valida: nessun campo ha un messaggio. */
export function eValida<Bozza>(errori: ErroriDi<Bozza>): boolean {
  return Object.values(errori).every((messaggio) => messaggio === undefined)
}

export function validaAccesso(bozza: BozzaAccesso): ErroriDi<BozzaAccesso> {
  return {
    email: erroreEmail(bozza.email),
    password: bozza.password === '' ? 'Scrivi la password.' : undefined,
  }
}

export function validaRegistrazione(bozza: BozzaRegistrazione): ErroriDi<BozzaRegistrazione> {
  return {
    nome: erroreNome(bozza.nome),
    email: erroreEmail(bozza.email),
    password: errorePasswordNuova(bozza.password),
    conferma: erroreConferma(bozza.password, bozza.conferma),
  }
}

export function validaCodice(bozza: BozzaCodice): ErroriDi<BozzaCodice> {
  return {
    codice: /^\d{6}$/.test(bozza.codice.trim()) ? undefined : 'Il codice ha 6 cifre.',
  }
}

export function validaRichiestaReset(bozza: BozzaRichiestaReset): ErroriDi<BozzaRichiestaReset> {
  return { email: erroreEmail(bozza.email) }
}

export function validaNuovaPassword(bozza: BozzaNuovaPassword): ErroriDi<BozzaNuovaPassword> {
  return {
    password: errorePasswordNuova(bozza.password),
    conferma: erroreConferma(bozza.password, bozza.conferma),
  }
}

export function validaCambioPassword(bozza: BozzaCambioPassword): ErroriDi<BozzaCambioPassword> {
  return {
    attuale: bozza.attuale === '' ? 'Scrivi la password.' : undefined,
    nuova: errorePasswordNuova(bozza.nuova),
    conferma: erroreConferma(bozza.nuova, bozza.conferma),
  }
}

export function validaNome(bozza: BozzaNome): ErroriDi<BozzaNome> {
  return { nome: erroreNome(bozza.nome) }
}

/** Solo la forma: il confronto con l'email dell'account lo fa lo store (R6). */
export function validaConfermaCancellazione(
  bozza: BozzaConfermaCancellazione,
  conPassword: boolean,
): ErroriDi<BozzaConfermaCancellazione> {
  if (conPassword) return { conferma: bozza.conferma === '' ? 'Scrivi la password.' : undefined }
  return { conferma: erroreEmail(bozza.conferma) }
}

/** `annoCorrente` arriva da fuori: il validatore resta puro. */
export function validaOnboarding(
  bozza: BozzaOnboarding,
  annoCorrente: number,
): ErroriDi<BozzaOnboarding> {
  const anno = bozza.annoNascita.trim()
  const annoValido =
    /^\d{4}$/.test(anno) &&
    Number(anno) >= ANNO_MINIMO &&
    Number(anno) <= annoCorrente - ETA_MINIMA_ISCRITTO
  const eta = bozza.etaPensione.trim()
  const etaValida =
    /^\d{1,3}$/.test(eta) &&
    Number(eta) >= ETA_PENSIONE_MINIMA &&
    Number(eta) <= ETA_PENSIONE_MASSIMA
  return {
    fondo: bozza.fondo.trim() === '' ? 'Scrivi il nome del tuo fondo pensione.' : undefined,
    annoNascita: annoValido ? undefined : "Scrivi l'anno con quattro cifre, es. 1994.",
    etaPensione: etaValida ? undefined : "Un'età fra 40 e 80 anni.",
  }
}
