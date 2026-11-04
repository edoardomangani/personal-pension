import { createClient, type NeonPostgrestClient } from '@neon/neon-js'
import { ErroreDati } from './errori'

/** Quello che serve ai moduli per tabella: un client di test con `fetch` finto lo soddisfa. */
export type ClientDati = Pick<NeonPostgrestClient, 'from' | 'rpc'>

/** Errore di Better Auth, nella risposta `{ data, error }`. */
export interface ErroreAuth {
  status?: number
  message?: string
  code?: string
}

export interface RispostaAuth<T> {
  data: T | null
  error: ErroreAuth | null
}

export interface UtenteAuth {
  id: string
  email: string
}

/** La parte di `auth` che usa `sessione.ts`: il client vero la soddisfa, un finto pure. */
export interface AuthDati {
  getSession(): Promise<RispostaAuth<{ user: UtenteAuth }>>
  signIn: {
    email(credenziali: { email: string; password: string }): Promise<RispostaAuth<{ user: UtenteAuth }>>
  }
  signOut(): Promise<RispostaAuth<unknown>>
}

interface Istanza {
  dati: ClientDati
  auth: AuthDati
}

let istanza: Istanza | null = null
let clientIniettato: ClientDati | null = null
let authIniettato: AuthDati | null = null

/** L'env si legge qui e non al caricamento: gli script Node importano `src/data/` senza Vite. */
function istanzaVera(): Istanza {
  if (istanza === null) {
    const url = import.meta.env.VITE_NEON_DATABASE_URL
    if (url === undefined || url === '') {
      throw new ErroreDati('altro', 'Configurazione mancante: imposta VITE_NEON_DATABASE_URL.')
    }
    const creato = createClient(url)
    // Stessa istanza per dati e auth: la Data API riceve il JWT della sessione.
    istanza = { dati: creato, auth: creato.auth }
  }
  return istanza
}

export function clientDati(): ClientDati {
  return clientIniettato ?? istanzaVera().dati
}

export function authDati(): AuthDati {
  return authIniettato ?? istanzaVera().auth
}

/** Per test e script; `null` torna alla creazione dall'env. */
export function impostaClientDati(nuovo: ClientDati | null): void {
  clientIniettato = nuovo
}

/** Per test e script; `null` torna all'auth del client creato dall'env. */
export function impostaAuthDati(nuovo: AuthDati | null): void {
  authIniettato = nuovo
}
