import type { BustaPaga } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import {
  bustaDaDb,
  bustaInRpc,
  COLONNE_BUSTA,
  idRestituito,
  type BozzaBusta,
  type BustaDb,
} from './mappe'

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

/** Testata e righe in una chiamata (`salva_busta`); il collegamento al movimento non cambia. */
export async function salvaBusta(bozza: BozzaBusta): Promise<string> {
  const id = await attendi(
    clientDati()
      .rpc('salva_busta', { p: bustaInRpc(bozza) })
      .overrideTypes<unknown, { merge: false }>(),
  )
  return idRestituito(id)
}

/** Una busta collegata si può eliminare: il movimento resta con le sue righe. */
export async function eliminaBusta(id: string): Promise<void> {
  await attendi(clientDati().from('buste_paga').delete().eq('id', id))
}
