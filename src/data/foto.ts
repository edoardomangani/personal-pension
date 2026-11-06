import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_FOTO, type FotoDb } from './mappe'

/** La foto dell'utente come data URL; null se non ne ha una. */
export async function leggiFoto(): Promise<string | null> {
  const riga = await attendi(
    clientDati()
      .from('foto_profilo')
      .select(COLONNE_FOTO)
      .maybeSingle()
      .overrideTypes<FotoDb | null, { merge: false }>(),
  )
  return riga?.immagine ?? null
}

/** Upsert sulla riga dell'utente: `user_id` lo mette il default, il conflitto lo trova. */
export async function salvaFoto(dataUrl: string): Promise<void> {
  const riga: FotoDb = { immagine: dataUrl }
  await attendi(clientDati().from('foto_profilo').upsert(riga, { onConflict: 'user_id' }))
}

export async function eliminaFoto(): Promise<void> {
  // Filtro solo per non mandare un DELETE senza condizioni: la riga la sceglie RLS.
  await attendi(clientDati().from('foto_profilo').delete().not('user_id', 'is', null))
}
