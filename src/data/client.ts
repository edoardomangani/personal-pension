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
  name: string
  image?: string | null
  emailVerified: boolean
  // L'SDK lo tipizza `Date`, ma dalla cache della sessione può tornare la stringa ISO.
  createdAt: Date | string
}

/** Risposta di chi apre una sessione: `user` c'è, il token può mancare. */
interface ConUtente {
  user: UtenteAuth
}

/** La parte di `auth` che usa `sessione.ts`, con le firme dell'SDK: il client vero la soddisfa, un finto pure. */
export interface AuthDati {
  getSession(): Promise<RispostaAuth<ConUtente>>
  signIn: {
    email(credenziali: { email: string; password: string }): Promise<RispostaAuth<ConUtente>>
    social(dati: { provider: string; callbackURL?: string }): Promise<RispostaAuth<unknown>>
  }
  signUp: {
    email(dati: { name: string; email: string; password: string }): Promise<RispostaAuth<ConUtente>>
  }
  signOut(): Promise<RispostaAuth<unknown>>
  emailOtp: {
    verifyEmail(dati: {
      email: string
      otp: string
    }): Promise<RispostaAuth<{ user?: UtenteAuth; token?: string | null }>>
    sendVerificationOtp(dati: {
      email: string
      type: 'email-verification'
    }): Promise<RispostaAuth<unknown>>
  }
  sendVerificationEmail(dati: { email: string; callbackURL?: string }): Promise<RispostaAuth<unknown>>
  requestPasswordReset(dati: { email: string; redirectTo?: string }): Promise<RispostaAuth<unknown>>
  resetPassword(dati: { newPassword: string; token: string }): Promise<RispostaAuth<unknown>>
  changePassword(dati: {
    currentPassword: string
    newPassword: string
    revokeOtherSessions?: boolean
  }): Promise<RispostaAuth<unknown>>
  updateUser(dati: { name: string }): Promise<RispostaAuth<unknown>>
  listAccounts(): Promise<RispostaAuth<{ providerId: string }[]>>
}

/** `$fetch` dell'SDK, per gli endpoint che i suoi tipi non espongono. */
type FetchAuth = <T>(
  percorso: string,
  opzioni: { method: 'POST'; body: Record<string, string> },
) => Promise<RispostaAuth<T>>

/** Il client di Neon Auth come lo tipizza l'SDK: tutto `AuthDati` tranne `emailOtp`, più `$fetch`. */
export type AuthSdk = Omit<AuthDati, 'emailOtp'> & { $fetch: FetchAuth }

/**
 * I tipi del plugin email OTP si perdono (due versioni di `@better-fetch/fetch` sotto
 * `@neon/auth`), ma l'endpoint c'è: lo si chiama per percorso con lo stesso `$fetch`, e quindi
 * con gli stessi hook dell'adapter.
 */
export function authDaSdk(auth: AuthSdk): AuthDati {
  return {
    getSession: () => auth.getSession(),
    signIn: {
      email: (dati) => auth.signIn.email(dati),
      social: (dati) => auth.signIn.social(dati),
    },
    signUp: { email: (dati) => auth.signUp.email(dati) },
    signOut: () => auth.signOut(),
    emailOtp: {
      verifyEmail: (dati) =>
        auth.$fetch('/email-otp/verify-email', { method: 'POST', body: dati }),
      sendVerificationOtp: (dati) =>
        auth.$fetch('/email-otp/send-verification-otp', { method: 'POST', body: dati }),
    },
    sendVerificationEmail: (dati) => auth.sendVerificationEmail(dati),
    requestPasswordReset: (dati) => auth.requestPasswordReset(dati),
    resetPassword: (dati) => auth.resetPassword(dati),
    changePassword: (dati) => auth.changePassword(dati),
    updateUser: (dati) => auth.updateUser(dati),
    listAccounts: () => auth.listAccounts(),
  }
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
    istanza = { dati: creato, auth: authDaSdk(creato.auth) }
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
