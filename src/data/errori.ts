export type TipoErroreDati = 'rete' | 'sessione' | 'vincolo' | 'altro'

/** Errore unico del livello dati: `messaggio` è già in italiano, pronto per le viste. */
export class ErroreDati extends Error {
  readonly tipo: TipoErroreDati
  readonly messaggio: string

  constructor(tipo: TipoErroreDati, messaggio: string) {
    super(messaggio)
    this.name = 'ErroreDati'
    this.tipo = tipo
    this.messaggio = messaggio
  }
}

export function eErroreDati(valore: unknown): valore is ErroreDati {
  return valore instanceof ErroreDati
}

/** La parte dell'errore di PostgREST che serve alla mappatura. */
export interface ErrorePostgrest {
  message: string
  code?: string
}

/** Risposta dell'SDK: con un errore `data` è null. */
export type RispostaDati<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: ErrorePostgrest; status: number }

const MESSAGGI: Record<Exclude<TipoErroreDati, 'vincolo'>, string> = {
  rete: 'Non riesco a raggiungere il server. Controlla la connessione e riprova.',
  sessione: 'La sessione è scaduta. Accedi di nuovo.',
  altro: 'Qualcosa è andato storto. Riprova tra poco.',
}
const MESSAGGIO_VINCOLO = 'I dati non rispettano un vincolo: controlla i campi e riprova.'

// PGRST301/302/303: JWT non valido, mancante o scaduto.
const CODICI_SESSIONE = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

const nuovo = (tipo: Exclude<TipoErroreDati, 'vincolo'>) => new ErroreDati(tipo, MESSAGGI[tipo])

export function erroreDaRisposta(status: number, errore: ErrorePostgrest): ErroreDati {
  const codice = errore.code ?? ''
  // Con status 0 l'SDK ha catturato un'eccezione e l'ha scritta come "<nome>: <messaggio>".
  if (status === 0) {
    return errore.message.startsWith('AuthRequiredError') ? nuovo('sessione') : nuovo('rete')
  }
  if (status === 401 || CODICI_SESSIONE.has(codice)) return nuovo('sessione')
  if (codice === 'P0001') {
    return new ErroreDati('vincolo', errore.message !== '' ? errore.message : MESSAGGIO_VINCOLO)
  }
  if (codice.startsWith('23')) return new ErroreDati('vincolo', MESSAGGIO_VINCOLO)
  return nuovo('altro')
}

export function erroreDaEccezione(eccezione: unknown): ErroreDati {
  if (eErroreDati(eccezione)) return eccezione
  if (eccezione instanceof Error && eccezione.name === 'AuthRequiredError') return nuovo('sessione')
  if (eccezione instanceof TypeError) return nuovo('rete')
  return nuovo('altro')
}

/** Attende una richiesta dell'SDK: risolve con i dati o rifiuta con un `ErroreDati`. */
export async function attendi<T>(richiesta: PromiseLike<RispostaDati<T>>): Promise<T> {
  let risposta: RispostaDati<T>
  try {
    risposta = await richiesta
  } catch (eccezione) {
    throw erroreDaEccezione(eccezione)
  }
  if (risposta.error !== null) throw erroreDaRisposta(risposta.status, risposta.error)
  return risposta.data
}
