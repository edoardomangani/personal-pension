/** Importo in centesimi di euro, sempre intero. */
export type Centesimi = number

export type TipoRigaBusta = 'TFR' | 'Datore' | 'Personale'
export type TipoRigaMovimento = 'TFR' | 'Datore' | 'Personale' | 'Volontario' | 'Spesa'

export interface Fondo {
  id: string
  nome: string
}

/** Importo > 0, al massimo una riga per tipo nella stessa busta. */
export interface RigaBusta {
  tipo: TipoRigaBusta
  importo: Centesimi
}

export interface BustaPaga {
  id: string
  fondoId: string
  /** Mese di competenza, `YYYY-MM`. */
  competenza: string
  data: string
  righe: RigaBusta[]
  movimentoId: string | null
  note: string
}

/** Importo > 0, al massimo una riga per tipo nello stesso movimento. */
export interface RigaMovimento {
  tipo: TipoRigaMovimento
  importo: Centesimi
}

export interface Movimento {
  id: string
  fondoId: string
  data: string
  righe: RigaMovimento[]
  note: string
}

export interface EstrattoConto {
  id: string
  fondoId: string
  data: string
  valore: Centesimi
  note: string
}

/** I campi mensili a `null` sono stimati dalle buste; le percentuali sono annue. */
export interface Impostazioni {
  annoNascita: number | null
  etaPensione: number
  rendimento: number
  inflazione: number
  crescita: number
  tfrMensile: Centesimi | null
  datoreMensile: Centesimi | null
  personaleMensile: Centesimi | null
  volontarioMensile: Centesimi
  aliquota: number
  limiteDeducibile: Centesimi
}

export interface Archivio {
  fondi: Fondo[]
  buste: BustaPaga[]
  movimenti: Movimento[]
  estratti: EstrattoConto[]
  impostazioni: Impostazioni
}

export const IMPOSTAZIONI_PREDEFINITE: Readonly<Impostazioni> = Object.freeze({
  annoNascita: null,
  etaPensione: 67,
  rendimento: 3,
  inflazione: 2,
  crescita: 1.5,
  tfrMensile: null,
  datoreMensile: null,
  personaleMensile: null,
  volontarioMensile: 0,
  aliquota: 35,
  limiteDeducibile: 516457,
})
