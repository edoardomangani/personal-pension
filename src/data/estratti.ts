import type { EstrattoConto } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_ESTRATTO, estrattoDaDb, type EstrattoDb } from './mappe'

export async function elencaEstratti(): Promise<EstrattoConto[]> {
  const righe = await attendi(
    clientDati()
      .from('estratti_conto')
      .select(COLONNE_ESTRATTO)
      .order('data')
      .overrideTypes<EstrattoDb[], { merge: false }>(),
  )
  return righe.map(estrattoDaDb)
}
