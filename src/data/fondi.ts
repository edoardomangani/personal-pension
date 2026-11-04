import type { Fondo } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_FONDO, fondoDaDb, type FondoDb } from './mappe'

export async function elencaFondi(): Promise<Fondo[]> {
  const righe = await attendi(
    clientDati()
      .from('fondi')
      .select(COLONNE_FONDO)
      .order('nome')
      .overrideTypes<FondoDb[], { merge: false }>(),
  )
  return righe.map(fondoDaDb)
}
