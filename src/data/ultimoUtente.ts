import type { Utente } from './sessione'

/** Chiave in `localStorage` dell'ultimo utente entrato su questo dispositivo. */
export const CHIAVE_ULTIMO_UTENTE = 'next.ultimoUtente'

function eUtente(valore: unknown): valore is Utente {
  if (typeof valore !== 'object' || valore === null) return false
  return (
    'id' in valore &&
    typeof valore.id === 'string' &&
    'email' in valore &&
    typeof valore.email === 'string' &&
    'nome' in valore &&
    (typeof valore.nome === 'string' || valore.nome === null) &&
    'emailVerificata' in valore &&
    typeof valore.emailVerificata === 'boolean' &&
    'registratoIl' in valore &&
    typeof valore.registratoIl === 'string'
  )
}

/** L'ultimo utente noto; null se manca, è illeggibile (e allora si cancella) o l'archivio è negato. */
export function leggiUltimoUtente(): Utente | null {
  let testo: string | null
  try {
    testo = localStorage.getItem(CHIAVE_ULTIMO_UTENTE)
  } catch {
    return null
  }
  if (testo === null) return null
  let valore: unknown
  try {
    valore = JSON.parse(testo)
  } catch {
    valore = null
  }
  if (!eUtente(valore)) {
    cancellaUltimoUtente()
    return null
  }
  return {
    id: valore.id,
    email: valore.email,
    nome: valore.nome,
    emailVerificata: valore.emailVerificata,
    registratoIl: valore.registratoIl,
  }
}

/** Solo i cinque campi di `Utente`: niente token né dati del piano. */
export function salvaUltimoUtente(utente: Utente): void {
  const { id, email, nome, emailVerificata, registratoIl } = utente
  try {
    localStorage.setItem(
      CHIAVE_ULTIMO_UTENTE,
      JSON.stringify({ id, email, nome, emailVerificata, registratoIl }),
    )
  } catch {
    // Archivio negato o pieno: senza ultimo utente l'app riparte dall'accesso.
  }
}

export function cancellaUltimoUtente(): void {
  try {
    localStorage.removeItem(CHIAVE_ULTIMO_UTENTE)
  } catch {
    // Archivio negato: non c'è niente da cancellare.
  }
}
