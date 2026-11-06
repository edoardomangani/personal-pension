import { sommaCentesimi } from './importi'
import type { Archivio, Centesimi } from '../types/dominio'

export interface Deducibilita {
  anno: number
  deducibile: Centesimi
  limite: Centesimi
  residuo: Centesimi
  risparmio: Centesimi
}

const annoDi = (data: string) => Number(data.slice(0, 4))

// Datore e Personale si contano sulle buste (anche non versate), non sui movimenti.
function importiDeducibili(archivio: Archivio): { anno: number; importo: Centesimi }[] {
  const daBuste = archivio.buste.flatMap((b) =>
    b.righe
      .filter((r) => r.tipo === 'Datore' || r.tipo === 'Personale')
      .map((r) => ({ anno: annoDi(b.data), importo: r.importo })),
  )
  const daMovimenti = archivio.movimenti.flatMap((m) =>
    m.righe
      .filter((r) => r.tipo === 'Volontario')
      .map((r) => ({ anno: annoDi(m.data), importo: r.importo })),
  )
  return [...daBuste, ...daMovimenti]
}

/** Limite unico su tutti i fondi: non si filtra per fondo. */
export function deducibilitaAnno(archivio: Archivio, anno: number): Deducibilita {
  const { limiteDeducibile: limite, aliquota } = archivio.impostazioni
  const deducibile = sommaCentesimi(
    importiDeducibili(archivio)
      .filter((i) => i.anno === anno)
      .map((i) => i.importo),
  )
  return {
    anno,
    deducibile,
    limite,
    residuo: Math.max(0, limite - deducibile),
    risparmio: Math.round((Math.min(deducibile, limite) * aliquota) / 100),
  }
}

/** Anni con contributi deducibili più l'anno di oggi, dal più recente. */
export function storicoDeducibilita(archivio: Archivio, oggi: string): Deducibilita[] {
  const anni = new Set([annoDi(oggi), ...importiDeducibili(archivio).map((i) => i.anno)])
  return [...anni].sort((a, b) => b - a).map((anno) => deducibilitaAnno(archivio, anno))
}
