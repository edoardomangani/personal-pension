import type { Movimento } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import {
  COLONNE_MOVIMENTO,
  movimentoDaDb,
  movimentoInRpc,
  idRestituito,
  type Bozza,
  type MovimentoDb,
} from './mappe'

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

/** Testata, righe e buste collegate in una transazione (`salva_movimento`, R4). */
export async function salvaMovimento(
  bozza: Bozza<Movimento>,
  busteIds: readonly string[],
): Promise<string> {
  const id = await attendi(
    clientDati()
      .rpc('salva_movimento', { p: movimentoInRpc(bozza, busteIds) })
      .overrideTypes<unknown, { merge: false }>(),
  )
  return idRestituito(id)
}

/** Le buste collegate tornano da versare. */
export async function eliminaMovimento(id: string): Promise<void> {
  await attendi(clientDati().rpc('elimina_movimento', { id }))
}
