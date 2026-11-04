import type { EstrattoConto } from '../types/dominio'
import { clientDati } from './client'
import { attendi } from './errori'
import { COLONNE_ESTRATTO, estrattoDaDb, estrattoInDb, type Bozza, type EstrattoDb } from './mappe'

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

/** Crea senza `id`, aggiorna con `id`; restituisce l'estratto riletto. */
export async function salvaEstratto(e: Bozza<EstrattoConto>): Promise<EstrattoConto> {
  const tabella = clientDati().from('estratti_conto')
  const scrittura =
    e.id === undefined
      ? tabella.insert(estrattoInDb(e))
      : tabella.update(estrattoInDb(e)).eq('id', e.id)
  const riga = await attendi(
    scrittura.select(COLONNE_ESTRATTO).single().overrideTypes<EstrattoDb, { merge: false }>(),
  )
  return estrattoDaDb(riga)
}

export async function eliminaEstratto(id: string): Promise<void> {
  await attendi(clientDati().from('estratti_conto').delete().eq('id', id))
}
