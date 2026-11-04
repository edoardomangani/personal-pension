import { authDati, type RispostaAuth, type UtenteAuth } from './client'
import { ErroreDati, erroreDaEccezione } from './errori'

export interface Utente {
  id: string
  email: string
}

const MESSAGGIO_CREDENZIALI = 'Email o password non corretti.'
const MESSAGGIO_SESSIONE = 'La sessione è scaduta. Accedi di nuovo.'
const MESSAGGIO_RETE = 'Non riesco a raggiungere il server. Controlla la connessione e riprova.'
const MESSAGGIO_ALTRO = 'Qualcosa è andato storto. Riprova tra poco.'

function erroreDaStatus(status: number | undefined, credenziali: boolean): ErroreDati {
  if (status === 0) return new ErroreDati('rete', MESSAGGIO_RETE)
  if (status === 401 || status === 403) {
    return new ErroreDati('sessione', credenziali ? MESSAGGIO_CREDENZIALI : MESSAGGIO_SESSIONE)
  }
  return new ErroreDati('altro', MESSAGGIO_ALTRO)
}

function statusDi(valore: unknown): number | undefined {
  if (typeof valore !== 'object' || valore === null) return undefined
  // L'adapter di Neon lancia con lo status HTTP in `.error.status`, Better Fetch lo mette in `.status`.
  const interno = 'error' in valore ? statusDi(valore.error) : undefined
  if (interno !== undefined) return interno
  return 'status' in valore && typeof valore.status === 'number' ? valore.status : undefined
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
    const status = statusDi(eccezione)
    throw status === undefined ? erroreDaEccezione(eccezione) : erroreDaStatus(status, credenziali)
  }
  if (risposta.error !== null) throw erroreDaStatus(risposta.error.status, credenziali)
  return risposta.data
}

const utenteDa = (u: UtenteAuth): Utente => ({ id: u.id, email: u.email })

export async function sessioneCorrente(): Promise<Utente | null> {
  const dati = await chiama(() => authDati().getSession())
  return dati === null ? null : utenteDa(dati.user)
}

export async function accedi(email: string, password: string): Promise<Utente> {
  const dati = await chiama(() => authDati().signIn.email({ email, password }), true)
  if (dati === null) throw new ErroreDati('altro', MESSAGGIO_ALTRO)
  return utenteDa(dati.user)
}

export async function esci(): Promise<void> {
  await chiama(() => authDati().signOut())
}
