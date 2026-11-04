import { euroInCentesimi } from '../calc/importi'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type {
  Archivio,
  BustaPaga,
  EstrattoConto,
  Movimento,
  TipoRigaBusta,
  TipoRigaMovimento,
} from '../types/dominio'

// Costruttori di archivi sintetici condivisi dai test di src/calc/.

const TIPI_MOVIMENTO: TipoRigaMovimento[] = ['TFR', 'Datore', 'Personale', 'Volontario', 'Spesa']
const TIPI_BUSTA: TipoRigaBusta[] = ['TFR', 'Datore', 'Personale']

function righe<T extends string>(
  tipi: T[],
  euro: Partial<Record<T, number>>,
): { tipo: T; importo: number }[] {
  return tipi.flatMap((tipo) => {
    const importo = euro[tipo]
    return importo === undefined ? [] : [{ tipo, importo: euroInCentesimi(importo) }]
  })
}

export function archivio(parti: Partial<Archivio> = {}): Archivio {
  return {
    fondi: [],
    buste: [],
    movimenti: [],
    estratti: [],
    impostazioni: { ...IMPOSTAZIONI_PREDEFINITE },
    ...parti,
  }
}

export function movimento(
  id: string,
  fondoId: string,
  data: string,
  euro: Partial<Record<TipoRigaMovimento, number>>,
): Movimento {
  return { id, fondoId, data, righe: righe(TIPI_MOVIMENTO, euro), note: '' }
}

/** `quando` è la competenza `YYYY-MM` (data al 15) o la data `YYYY-MM-DD`. */
export function busta(
  id: string,
  fondoId: string,
  quando: string,
  euro: Partial<Record<TipoRigaBusta, number>>,
  movimentoId: string | null = null,
): BustaPaga {
  const competenza = quando.slice(0, 7)
  const data = quando.length === 7 ? `${quando}-15` : quando
  return { id, fondoId, competenza, data, righe: righe(TIPI_BUSTA, euro), movimentoId, note: '' }
}

export function estratto(id: string, fondoId: string, data: string, euro: number): EstrattoConto {
  return { id, fondoId, data, valore: euroInCentesimi(euro), note: '' }
}
