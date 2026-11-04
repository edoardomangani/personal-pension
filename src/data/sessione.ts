import { authDati, type RispostaAuth, type UtenteAuth } from './client'
import { ErroreDati, MESSAGGI, erroreDaEccezione } from './errori'

export interface Utente {
  id: string
  email: string
}

const MESSAGGIO_CREDENZIALI = 'Email o password non corretti.'
const MESSAGGIO_EMAIL_DA_VERIFICARE =
  "Devi ancora confermare l'email: apri il link che ti abbiamo mandato e riprova."

interface DatiErrore {
  status: number | undefined
  code: string | undefined
}

function erroreDaStatus({ status, code }: DatiErrore, credenziali: boolean): ErroreDati {
  if (status === 0) return new ErroreDati('rete', MESSAGGI.rete)
  if (credenziali) {
    if (status === 401) return new ErroreDati('sessione', MESSAGGIO_CREDENZIALI)
    if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
      return new ErroreDati('sessione', MESSAGGIO_EMAIL_DA_VERIFICARE)
    }
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
  credenziali = false,
): Promise<T | null> {
  let risposta: RispostaAuth<T>
  try {
    risposta = await richiesta()
  } catch (eccezione) {
    const dati = datiErroreDi(eccezione)
    throw dati.status === undefined ? erroreDaEccezione(eccezione) : erroreDaStatus(dati, credenziali)
  }
  if (risposta.error !== null) throw erroreDaStatus(datiErroreDi(risposta.error), credenziali)
  return risposta.data
}

const utenteDa = (u: UtenteAuth): Utente => ({ id: u.id, email: u.email })

export async function sessioneCorrente(): Promise<Utente | null> {
  const dati = await chiama(() => authDati().getSession())
  return dati === null ? null : utenteDa(dati.user)
}

export async function accedi(email: string, password: string): Promise<Utente> {
  const dati = await chiama(() => authDati().signIn.email({ email, password }), true)
  if (dati === null) throw new ErroreDati('altro', MESSAGGI.altro)
  return utenteDa(dati.user)
}

export async function esci(): Promise<void> {
  await chiama(() => authDati().signOut())
}
