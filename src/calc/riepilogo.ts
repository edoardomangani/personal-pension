import { sommaCentesimi } from './importi'
import { delFondo, ultimoValore } from './posizione'
import type { Archivio, Centesimi, TipoRigaMovimento } from '../types/dominio'

export interface RigaRiepilogo {
  anno: number
  tfr: Centesimi
  /** Datore + Personale + Volontario. */
  altri: Centesimi
  spese: Centesimi
  /** Ultimo valore dell'anno; `null` senza estratti nell'anno. */
  valore: Centesimi | null
}

const annoDi = (data: string) => data.slice(0, 4)

/** Tabella anno per anno, dal più recente. */
export function riepilogoAnnuale(archivio: Archivio, fondoId?: string): RigaRiepilogo[] {
  const movimenti = delFondo(archivio.movimenti, fondoId)
  const estratti = delFondo(archivio.estratti, fondoId)
  const anni = [...new Set([...movimenti, ...estratti].map((r) => annoDi(r.data)))].sort().reverse()

  return anni.map((anno) => {
    const righe = movimenti.filter((m) => annoDi(m.data) === anno).flatMap((m) => m.righe)
    const somma = (tipi: readonly TipoRigaMovimento[]) =>
      sommaCentesimi(righe.filter((r) => tipi.includes(r.tipo)).map((r) => r.importo))
    const ultimo = ultimoValore(
      { ...archivio, estratti: estratti.filter((e) => annoDi(e.data) === anno) },
      fondoId,
    )
    return {
      anno: Number(anno),
      tfr: somma(['TFR']),
      altri: somma(['Datore', 'Personale', 'Volontario']),
      spese: somma(['Spesa']),
      valore: ultimo === null ? null : ultimo.valore,
    }
  })
}
