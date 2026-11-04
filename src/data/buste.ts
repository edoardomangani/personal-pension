import type { BustaPaga } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { bustaDaDb, COLONNE_BUSTA, type BustaDb } from './mappe'

export async function elencaBuste(): Promise<BustaPaga[]> {
  const righe = await attendi(
    clientDati()
      .from('buste_paga')
      .select(COLONNE_BUSTA)
      .order('data')
      .overrideTypes<BustaDb[], { merge: false }>(),
  )
  return righe.map(bustaDaDb)
}
