import { authDati, type RispostaAuth, type UtenteAuth } from './client'
import { ErroreDati, MESSAGGI, erroreDaEccezione, type TipoErroreDati } from './errori'

export interface Utente {
  id: string
  email: string
  nome: string | null
  emailVerificata: boolean
  /** `YYYY-MM-DD`, giorno locale di registrazione; vuoto se l'SDK non dà una data leggibile. */
  registratoIl: string
}

export interface MetodiDiAccesso {
  password: boolean
  google: boolean
}

export const CODICE_EMAIL_DA_VERIFICARE = 'email-da-verificare'

interface Esito {
  tipo: TipoErroreDati
  messaggio: string
  codice?: string
}

const CREDENZIALI_ERRATE: Esito = { tipo: 'sessione', messaggio: 'Email o password non corretti.' }
const EMAIL_DA_VERIFICARE: Esito = {
  tipo: 'sessione',
  messaggio: "Devi ancora confermare l'email con il codice che ti abbiamo mandato.",
  codice: CODICE_EMAIL_DA_VERIFICARE,
}
const EMAIL_GIA_REGISTRATA: Esito = {
  tipo: 'vincolo',
  messaggio: 'Esiste già un account con questa email: accedi o reimposta la password.',
}
const CODICE_ERRATO: Esito = {
  tipo: 'vincolo',
  messaggio: 'Il codice non è giusto o è scaduto: controlla o fattene mandare un altro.',
}
const PASSWORD_ATTUALE_ERRATA: Esito = {
  tipo: 'vincolo',
  messaggio: 'La password attuale non è corretta.',
}
const LINK_SCADUTO: Esito = { tipo: 'vincolo', messaggio: 'Il link è scaduto.' }
const PASSWORD_ERRATA: Esito = { tipo: 'vincolo', messaggio: 'Password non corretta.' }
const TROPPI_TENTATIVI = 'Troppi tentativi: aspetta un minuto e riprova.'

/** Come leggere gli errori di una chiamata: i codici di Better Auth e il senso del 401. */
interface Contesto {
  codici?: Readonly<Record<string, Esito>>
  /** Sulle chiamate con le credenziali un 401 è la password sbagliata, non la sessione scaduta. */
  nonAutorizzato?: Esito
}

interface DatiErrore {
  status: number | undefined
  code: string | undefined
}

const errore = ({ tipo, messaggio, codice }: Esito) => new ErroreDati(tipo, messaggio, codice)

function erroreDaStatus({ status, code }: DatiErrore, contesto: Contesto): ErroreDati {
  if (status === 0) return new ErroreDati('rete', MESSAGGI.rete)
  if (status === 429) return new ErroreDati('altro', TROPPI_TENTATIVI)
  const tradotto = code === undefined ? undefined : contesto.codici?.[code]
  if (tradotto !== undefined) return errore(tradotto)
  if (contesto.nonAutorizzato !== undefined) {
    if (status === 401) return errore(contesto.nonAutorizzato)
  } else if (status === 401 || status === 403) {
    return new ErroreDati('sessione', MESSAGGI.sessione)
  }
  return new ErroreDati('altro', MESSAGGI.altro)
}

function campiDi(valore: object): DatiErrore {
  return {
    status: 'status' in valore && typeof valore.status === 'number' ? valore.status : undefined,
    code: 'code' in valore && typeof valore.code === 'string' ? valore.code : undefined,
  }
}

function datiErroreDi(valore: unknown): DatiErrore {
  if (typeof valore !== 'object' || valore === null) return { status: undefined, code: undefined }
  // L'adapter di Neon lancia con status e code in `.error`, Better Fetch li mette sul valore stesso.
  const interno = 'error' in valore ? datiErroreDi(valore.error) : undefined
  const esterno = campiDi(valore)
  if (interno?.status !== undefined) {
    return { status: interno.status, code: interno.code ?? esterno.code }
  }
  return { status: esterno.status, code: esterno.code ?? interno?.code }
}

/** Better Auth risponde `{ data, error }` o lancia: entrambe le forme diventano `ErroreDati`. */
async function chiama<T>(
  richiesta: () => Promise<RispostaAuth<T>>,
  contesto: Contesto = {},
): Promise<T | null> {
  let risposta: RispostaAuth<T>
  try {
    risposta = await richiesta()
  } catch (eccezione) {
    const dati = datiErroreDi(eccezione)
    throw dati.status === undefined ? erroreDaEccezione(eccezione) : erroreDaStatus(dati, contesto)
  }
  if (risposta.error !== null) throw erroreDaStatus(datiErroreDi(risposta.error), contesto)
  return risposta.data
}

const due = (n: number) => String(n).padStart(2, '0')

/** Il giorno di `createdAt` nel fuso di chi usa l'app. */
function giornoLocale(istante: Date | string): string {
  const data = typeof istante === 'string' ? new Date(istante) : istante
  if (Number.isNaN(data.getTime())) return ''
  return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`
}

const utenteDa = (u: UtenteAuth): Utente => ({
  id: u.id,
  email: u.email,
  nome: u.name.trim() === '' ? null : u.name,
  emailVerificata: u.emailVerified,
  registratoIl: giornoLocale(u.createdAt),
})

const altro = () => new ErroreDati('altro', MESSAGGI.altro)

export async function sessioneCorrente(): Promise<Utente | null> {
  const dati = await chiama(() => authDati().getSession())
  return dati === null ? null : utenteDa(dati.user)
}

export async function accedi(email: string, password: string): Promise<Utente> {
  const dati = await chiama(() => authDati().signIn.email({ email, password }), {
    nonAutorizzato: CREDENZIALI_ERRATE,
    codici: { EMAIL_NOT_VERIFIED: EMAIL_DA_VERIFICARE },
  })
  if (dati === null) throw altro()
  return utenteDa(dati.user)
}

export async function esci(): Promise<void> {
  await chiama(() => authDati().signOut())
}

/** Con la verifica obbligatoria non apre la sessione: la apre `verificaCodice`. */
export async function registrati(dati: { nome: string; email: string; password: string }): Promise<void> {
  await chiama(
    () => authDati().signUp.email({ name: dati.nome, email: dati.email, password: dati.password }),
    {
      codici: {
        USER_ALREADY_EXISTS: EMAIL_GIA_REGISTRATA,
        USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: EMAIL_GIA_REGISTRATA,
      },
    },
  )
}

/** Con l'auto-accesso dopo la verifica la risposta apre la sessione e porta l'utente. */
export async function verificaCodice(email: string, codice: string): Promise<Utente> {
  const dati = await chiama(() => authDati().emailOtp.verifyEmail({ email, otp: codice }), {
    codici: { INVALID_OTP: CODICE_ERRATO, OTP_EXPIRED: CODICE_ERRATO, TOO_MANY_ATTEMPTS: CODICE_ERRATO },
  })
  // Senza `user`, o con `token` null (auto-accesso spento), la sessione non c'è.
  if (dati?.user === undefined || dati.token === null) throw altro()
  return utenteDa(dati.user)
}

export async function reinviaCodice(email: string): Promise<void> {
  await chiama(() => authDati().emailOtp.sendVerificationOtp({ email, type: 'email-verification' }))
}

/**
 * `ritorno` è l'URL dell'app a cui Google rimanda dopo l'accesso; `ritornoErrore` quello per
 * un annullamento o un errore, a cui Better Auth aggiunge `?error=…`.
 */
export async function accediConGoogle(ritorno: string, ritornoErrore: string): Promise<void> {
  await chiama(() =>
    authDati().signIn.social({
      provider: 'google',
      callbackURL: ritorno,
      errorCallbackURL: ritornoErrore,
    }),
  )
}

export async function richiediReset(email: string, ritorno: string): Promise<void> {
  await chiama(() => authDati().requestPasswordReset({ email, redirectTo: ritorno }))
}

export async function reimpostaPassword(token: string, password: string): Promise<void> {
  await chiama(() => authDati().resetPassword({ newPassword: password, token }), {
    codici: { INVALID_TOKEN: LINK_SCADUTO },
  })
}

export async function cambiaPassword(attuale: string, nuova: string): Promise<void> {
  await chiama(
    () =>
      authDati().changePassword({
        currentPassword: attuale,
        newPassword: nuova,
        revokeOtherSessions: true,
      }),
    { codici: { INVALID_PASSWORD: PASSWORD_ATTUALE_ERRATA } },
  )
}

export async function aggiornaNome(nome: string): Promise<void> {
  await chiama(() => authDati().updateUser({ name: nome }))
}

export async function metodiDiAccesso(): Promise<MetodiDiAccesso> {
  const conti = await chiama(() => authDati().listAccounts())
  if (conti === null) throw altro()
  return {
    password: conti.some((c) => c.providerId === 'credential'),
    google: conti.some((c) => c.providerId === 'google'),
  }
}

/** Conferma della cancellazione: un nuovo accesso con la password scritta. */
export async function verificaPassword(email: string, password: string): Promise<void> {
  await chiama(() => authDati().signIn.email({ email, password }), {
    nonAutorizzato: PASSWORD_ERRATA,
  })
}
