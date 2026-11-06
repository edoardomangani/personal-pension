import type { Fondo } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_FONDO, fondoDaDb, fondoInDb, type Bozza, type FondoDb } from './mappe'

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

/** Crea senza `id`, aggiorna con `id`; restituisce il fondo riletto. */
export async function salvaFondo(f: Bozza<Fondo>): Promise<Fondo> {
  const tabella = clientDati().from('fondi')
  const scrittura =
    f.id === undefined
      ? tabella.insert(fondoInDb(f))
      : tabella.update(fondoInDb(f)).eq('id', f.id)
  const riga = await attendi(
    scrittura.select(COLONNE_FONDO).single().overrideTypes<FondoDb, { merge: false }>(),
  )
  return fondoDaDb(riga)
}

export async function eliminaFondo(id: string): Promise<void> {
  await attendi(clientDati().from('fondi').delete().eq('id', id))
}
