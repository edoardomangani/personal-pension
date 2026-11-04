import { centesimiInEuro, euroInCentesimi } from '../calc/importi'
import {
  IMPOSTAZIONI_PREDEFINITE,
  type BustaPaga,
  type Centesimi,
  type EstrattoConto,
  type Fondo,
  type Impostazioni,
  type Movimento,
  type TipoRigaBusta,
  type TipoRigaMovimento,
} from '../types/dominio'
import { ErroreDati } from './errori'

// Righe come le restituisce la Data API: `numeric` arriva come numero JSON, `date` come `YYYY-MM-DD`.

export interface FondoDb {
  id: string
  nome: string
}

export interface RigaImportoDb {
  tipo: string
  importo: number
}

export interface BustaDb {
  id: string
  fondo_id: string
  competenza: string
  data: string
  movimento_id: string | null
  note: string
  busta_righe: RigaImportoDb[]
}

export interface MovimentoDb {
  id: string
  fondo_id: string
  data: string
  note: string
  movimento_righe: RigaImportoDb[]
}

export interface EstrattoDb {
  id: string
  fondo_id: string
  data: string
  valore: number
  note: string
}

export interface ImpostazioniDb {
  anno_nascita: number | null
  eta_pensione: number
  rendimento: number
  inflazione: number
  crescita: number
  tfr_mensile: number | null
  datore_mensile: number | null
  personale_mensile: number | null
  volontario_mensile: number
  aliquota: number
  limite_deducibile: number
}

export const COLONNE_FONDO = 'id, nome'
export const COLONNE_BUSTA =
  'id, fondo_id, competenza, data, movimento_id, note, busta_righe(tipo, importo)'
export const COLONNE_MOVIMENTO = 'id, fondo_id, data, note, movimento_righe(tipo, importo)'
export const COLONNE_ESTRATTO = 'id, fondo_id, data, valore, note'
export const COLONNE_IMPOSTAZIONI =
  'anno_nascita, eta_pensione, rendimento, inflazione, crescita, tfr_mensile, datore_mensile, ' +
  'personale_mensile, volontario_mensile, aliquota, limite_deducibile'

const centesimiONull = (euro: number | null): Centesimi | null =>
  euro === null ? null : euroInCentesimi(euro)

const TIPI_BUSTA: readonly TipoRigaBusta[] = ['TFR', 'Datore', 'Personale']
const TIPI_MOVIMENTO: readonly TipoRigaMovimento[] = [
  'TFR',
  'Datore',
  'Personale',
  'Volontario',
  'Spesa',
]

const FORMATO_INATTESO = 'I dati ricevuti non sono nel formato atteso.'

// Il `check` del DB rende impossibile un tipo diverso: se arriva, lo schema non è quello atteso.
function tipoNoto<T extends string>(tipi: readonly T[], tipo: string): T {
  const trovato = tipi.find((t) => t === tipo)
  if (trovato === undefined) throw new ErroreDati('altro', FORMATO_INATTESO)
  return trovato
}

export function fondoDaDb(f: FondoDb): Fondo {
  return { id: f.id, nome: f.nome }
}

export function bustaDaDb(b: BustaDb): BustaPaga {
  return {
    id: b.id,
    fondoId: b.fondo_id,
    competenza: b.competenza.slice(0, 7),
    data: b.data,
    movimentoId: b.movimento_id,
    note: b.note,
    righe: b.busta_righe.map((r) => ({
      tipo: tipoNoto(TIPI_BUSTA, r.tipo),
      importo: euroInCentesimi(r.importo),
    })),
  }
}

export function movimentoDaDb(m: MovimentoDb): Movimento {
  return {
    id: m.id,
    fondoId: m.fondo_id,
    data: m.data,
    note: m.note,
    righe: m.movimento_righe.map((r) => ({
      tipo: tipoNoto(TIPI_MOVIMENTO, r.tipo),
      importo: euroInCentesimi(r.importo),
    })),
  }
}

export function estrattoDaDb(e: EstrattoDb): EstrattoConto {
  return {
    id: e.id,
    fondoId: e.fondo_id,
    data: e.data,
    valore: euroInCentesimi(e.valore),
    note: e.note,
  }
}

/** Nessuna riga → copia nuova dei default (R7). */
export function impostazioniDaDb(i: ImpostazioniDb | null): Impostazioni {
  if (i === null) return { ...IMPOSTAZIONI_PREDEFINITE }
  return {
    annoNascita: i.anno_nascita,
    etaPensione: i.eta_pensione,
    rendimento: i.rendimento,
    inflazione: i.inflazione,
    crescita: i.crescita,
    tfrMensile: centesimiONull(i.tfr_mensile),
    datoreMensile: centesimiONull(i.datore_mensile),
    personaleMensile: centesimiONull(i.personale_mensile),
    volontarioMensile: euroInCentesimi(i.volontario_mensile),
    aliquota: i.aliquota,
    limiteDeducibile: euroInCentesimi(i.limite_deducibile),
  }
}

// Dominio → DB. Nessun payload contiene `user_id`: lo mette il default auth.user_id() (R2).

/** Entità da salvare: senza `id` si crea, con `id` si aggiorna. */
export type Bozza<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

/** Il collegamento al movimento lo decide solo `salvaMovimento`. */
export type BozzaBusta = Omit<Bozza<BustaPaga>, 'movimentoId'>

const euroONull = (centesimi: Centesimi | null): number | null =>
  centesimi === null ? null : centesimiInEuro(centesimi)

const righeInDb = (righe: readonly { tipo: string; importo: Centesimi }[]): RigaImportoDb[] =>
  righe.map((r) => ({ tipo: r.tipo, importo: centesimiInEuro(r.importo) }))

export function fondoInDb(f: Bozza<Fondo>): Omit<FondoDb, 'id'> {
  return { nome: f.nome }
}

export function estrattoInDb(e: Bozza<EstrattoConto>): Omit<EstrattoDb, 'id'> {
  return { fondo_id: e.fondoId, data: e.data, valore: centesimiInEuro(e.valore), note: e.note }
}

export function impostazioniInDb(i: Impostazioni): ImpostazioniDb {
  return {
    anno_nascita: i.annoNascita,
    eta_pensione: i.etaPensione,
    rendimento: i.rendimento,
    inflazione: i.inflazione,
    crescita: i.crescita,
    tfr_mensile: euroONull(i.tfrMensile),
    datore_mensile: euroONull(i.datoreMensile),
    personale_mensile: euroONull(i.personaleMensile),
    volontario_mensile: centesimiInEuro(i.volontarioMensile),
    aliquota: i.aliquota,
    limite_deducibile: centesimiInEuro(i.limiteDeducibile),
  }
}

/** Payload `p` di `salva_busta`. */
export interface BustaRpc {
  id?: string
  fondo_id: string
  competenza: string
  data: string
  note: string
  righe: RigaImportoDb[]
}

/** Payload `p` di `salva_movimento`. */
export interface MovimentoRpc {
  id?: string
  fondo_id: string
  data: string
  note: string
  righe: RigaImportoDb[]
  buste: string[]
}

export function bustaInRpc(b: BozzaBusta): BustaRpc {
  return {
    ...(b.id === undefined ? {} : { id: b.id }),
    fondo_id: b.fondoId,
    competenza: `${b.competenza}-01`,
    data: b.data,
    note: b.note,
    righe: righeInDb(b.righe),
  }
}

export function movimentoInRpc(m: Bozza<Movimento>, busteIds: readonly string[]): MovimentoRpc {
  return {
    ...(m.id === undefined ? {} : { id: m.id }),
    fondo_id: m.fondoId,
    data: m.data,
    note: m.note,
    righe: righeInDb(m.righe),
    buste: [...busteIds],
  }
}

/** Le RPC `salva_*` restituiscono un uuid come stringa JSON; altro vuol dire schema diverso. */
export function idRestituito(valore: unknown): string {
  if (typeof valore !== 'string' || valore === '') {
    throw new ErroreDati('altro', FORMATO_INATTESO)
  }
  return valore
}
