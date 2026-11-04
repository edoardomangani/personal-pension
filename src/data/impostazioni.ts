import type { Impostazioni } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import {
  COLONNE_IMPOSTAZIONI,
  impostazioniDaDb,
  impostazioniInDb,
  type ImpostazioniDb,
} from './mappe'

/** Una riga per utente (RLS): senza riga valgono i default (R7). */
export async function leggiImpostazioni(): Promise<Impostazioni> {
  const riga = await attendi(
    clientDati()
      .from('impostazioni')
      .select(COLONNE_IMPOSTAZIONI)
      .maybeSingle()
      .overrideTypes<ImpostazioniDb | null, { merge: false }>(),
  )
  return impostazioniDaDb(riga)
}

/** Upsert sulla riga dell'utente (R7): `user_id` lo mette il default, il conflitto lo trova. */
export async function salvaImpostazioni(i: Impostazioni): Promise<Impostazioni> {
  const riga = await attendi(
    clientDati()
      .from('impostazioni')
      .upsert(impostazioniInDb(i), { onConflict: 'user_id' })
      .select(COLONNE_IMPOSTAZIONI)
      .single()
      .overrideTypes<ImpostazioniDb, { merge: false }>(),
  )
  return impostazioniDaDb(riga)
}
