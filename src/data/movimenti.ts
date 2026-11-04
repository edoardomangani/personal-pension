import type { Movimento } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_MOVIMENTO, movimentoDaDb, type MovimentoDb } from './mappe'

export async function elencaMovimenti(): Promise<Movimento[]> {
  const righe = await attendi(
    clientDati()
      .from('movimenti')
      .select(COLONNE_MOVIMENTO)
      .order('data')
      .overrideTypes<MovimentoDb[], { merge: false }>(),
  )
  return righe.map(movimentoDaDb)
}
