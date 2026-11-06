import { clientDati } from './client'
import { attendi } from './errori'

/** Cancella dati e utente di Neon Auth in una transazione (RPC `security definer`). */
export async function cancellaAccount(): Promise<void> {
  await attendi(clientDati().rpc('cancella_account'))
}
