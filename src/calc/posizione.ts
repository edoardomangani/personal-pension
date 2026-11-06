import { sommaCentesimi } from './importi'
import type {
  Archivio,
  BustaPaga,
  Centesimi,
  EstrattoConto,
  Movimento,
  RigaMovimento,
  TipoRigaBusta,
} from '../types/dominio'

export interface UltimoValore {
  data: string
  valore: Centesimi
}

export interface Crescita {
  importo: Centesimi
  /** Frazione (`0.03` = +3%); `null` se il versato è 0. */
  percentuale: number | null
  spese: Centesimi
  versato: Centesimi
}

export function delFondo<T extends { fondoId: string }>(
  elementi: readonly T[],
  fondoId?: string,
): readonly T[] {
  return fondoId === undefined ? elementi : elementi.filter((e) => e.fondoId === fondoId)
}

function sommaRighe(righe: readonly RigaMovimento[], conta: (r: RigaMovimento) => boolean) {
  return sommaCentesimi(righe.filter(conta).map((r) => r.importo))
}

const nonSpesa = (r: RigaMovimento) => r.tipo !== 'Spesa'
const spesa = (r: RigaMovimento) => r.tipo === 'Spesa'

/** Somma delle righe non `Spesa` del movimento. */
export function versatoDelMovimento(movimento: Movimento): Centesimi {
  return sommaRighe(movimento.righe, nonSpesa)
}

function righeFinoA(archivio: Archivio, data: string, fondoId: string | undefined) {
  return delFondo(archivio.movimenti, fondoId)
    .filter((m) => m.data <= data)
    .flatMap((m) => m.righe)
}

export function versatoAl(archivio: Archivio, data: string, fondoId?: string): Centesimi {
  return sommaRighe(righeFinoA(archivio, data, fondoId), nonSpesa)
}

export function speseAl(archivio: Archivio, data: string, fondoId?: string): Centesimi {
  return sommaRighe(righeFinoA(archivio, data, fondoId), spesa)
}

/** L'ultimo estratto di ogni fondo; a parità di data vale l'id maggiore. */
export function ultimiEstratti(archivio: Archivio, fondoId?: string): EstrattoConto[] {
  const perFondo = new Map<string, EstrattoConto>()
  for (const estratto of delFondo(archivio.estratti, fondoId)) {
    const attuale = perFondo.get(estratto.fondoId)
    const piuRecente =
      attuale === undefined ||
      estratto.data > attuale.data ||
      (estratto.data === attuale.data && estratto.id > attuale.id)
    if (piuRecente) perFondo.set(estratto.fondoId, estratto)
  }
  return [...perFondo.values()]
}

export function ultimoValore(archivio: Archivio, fondoId?: string): UltimoValore | null {
  const ultimi = ultimiEstratti(archivio, fondoId)
  if (ultimi.length === 0) return null
  const data = ultimi.reduce((max, e) => (e.data > max ? e.data : max), '')
  return { data, valore: sommaCentesimi(ultimi.map((e) => e.valore)) }
}

/** Versato e spese si contano fondo per fondo fino alla data del suo ultimo estratto. */
export function crescita(archivio: Archivio, fondoId?: string): Crescita | null {
  const ultimi = ultimiEstratti(archivio, fondoId)
  if (ultimi.length === 0) return null
  const valore = sommaCentesimi(ultimi.map((e) => e.valore))
  const versato = sommaCentesimi(ultimi.map((e) => versatoAl(archivio, e.data, e.fondoId)))
  const spese = sommaCentesimi(ultimi.map((e) => speseAl(archivio, e.data, e.fondoId)))
  return {
    importo: valore - versato,
    percentuale: versato === 0 ? null : valore / versato - 1,
    spese,
    versato,
  }
}

export interface DaVersare {
  totale: Centesimi
  perTipo: Record<TipoRigaBusta, Centesimi>
  /** Buste senza movimento, per competenza crescente. */
  buste: BustaPaga[]
}

const perCompetenza = (a: BustaPaga, b: BustaPaga) =>
  a.competenza.localeCompare(b.competenza) || a.id.localeCompare(b.id)

function importoDelTipo(busta: BustaPaga, tipo: TipoRigaBusta): Centesimi {
  return sommaCentesimi(busta.righe.filter((r) => r.tipo === tipo).map((r) => r.importo))
}

export function daVersare(archivio: Archivio, fondoId?: string): DaVersare {
  const buste = delFondo(archivio.buste, fondoId)
    .filter((b) => b.movimentoId === null)
    .sort(perCompetenza)
  const perTipo: Record<TipoRigaBusta, Centesimi> = {
    TFR: sommaCentesimi(buste.map((b) => importoDelTipo(b, 'TFR'))),
    Datore: sommaCentesimi(buste.map((b) => importoDelTipo(b, 'Datore'))),
    Personale: sommaCentesimi(buste.map((b) => importoDelTipo(b, 'Personale'))),
  }
  return { totale: sommaCentesimi(Object.values(perTipo)), perTipo, buste }
}

/** Mediana delle ultime 6 buste con quel tipo: la tredicesima non sporca la stima. */
export function stimaMensile(archivio: Archivio, tipo: TipoRigaBusta, fondoId?: string): Centesimi {
  const importi = delFondo(archivio.buste, fondoId)
    .filter((b) => b.righe.some((r) => r.tipo === tipo))
    .sort((a, b) => perCompetenza(b, a))
    .slice(0, 6)
    .map((b) => importoDelTipo(b, tipo))
    .sort((a, b) => a - b)
  return importi[Math.floor(importi.length / 2)] ?? 0
}
