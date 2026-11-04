import type { Impostazioni } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_IMPOSTAZIONI, impostazioniDaDb, type ImpostazioniDb } from './mappe'

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
