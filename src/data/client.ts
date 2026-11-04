import { createClient, type NeonPostgrestClient } from '@neon/neon-js'
import { ErroreDati } from './errori'

/** Quello che serve ai moduli per tabella: un client di test con `fetch` finto lo soddisfa. */
export type ClientDati = Pick<NeonPostgrestClient, 'from' | 'rpc'>

let client: ClientDati | null = null

/** L'env si legge qui e non al caricamento: gli script Node importano `src/data/` senza Vite. */
export function clientDati(): ClientDati {
  if (client === null) {
    const url = import.meta.env.VITE_NEON_DATABASE_URL
    if (url === undefined || url === '') {
      throw new ErroreDati('altro', 'Configurazione mancante: imposta VITE_NEON_DATABASE_URL.')
    }
    client = createClient(url)
  }
  return client
}

/** Per test e script; `null` torna alla creazione dall'env. */
export function impostaClientDati(nuovo: ClientDati | null): void {
  client = nuovo
}
