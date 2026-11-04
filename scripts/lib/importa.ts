import { formatoData, formatoEuro } from '../../src/calc/formato'
import { euroInCentesimi, sommaCentesimi } from '../../src/calc/importi'
import { crescita, daVersare, ultimoValore } from '../../src/calc/posizione'
import { IMPOSTAZIONI_PREDEFINITE } from '../../src/types/dominio'
import type {
  Archivio,
  BustaPaga,
  Centesimi,
  Impostazioni,
  Movimento,
  RigaBusta,
  RigaMovimento,
  TipoRigaBusta,
  TipoRigaMovimento,
} from '../../src/types/dominio'

// --- Seed ----------------------------------------------------------------------------------

export type TipoVersamentoSeed = 'TFR' | 'Spesa'

export interface VersamentoSeed {
  id: string
  fondo: string
  tipo: TipoVersamentoSeed
  data: string
  importo: number
  note: string
}

export interface BustaSeed {
  id: string
  fondo: string
  competenza: string
  data: string
  importo: number
  versamento: string | null
  note: string
}

export interface EstrattoSeed {
  id: string
  fondo: string
  data: string
  valore: number
  note: string
}

export interface ImpostazioniSeed {
  annoNascita: number | null
  etaPensione: number
  rendimento: number
  inflazione: number
  crescita: number
  tfrMensile: number | null
  personaleMensile: number | null
  aliquota: number
  limite: number
}

export interface Seed {
  fondi: string[]
  impostazioni: ImpostazioniSeed
  versamenti: VersamentoSeed[]
  tfr_accumulato: BustaSeed[]
  estratti_conto: EstrattoSeed[]
}

type Oggetto = Record<string, unknown>

function eOggetto(valore: unknown): valore is Oggetto {
  return typeof valore === 'object' && valore !== null && !Array.isArray(valore)
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
const MESE = /^\d{4}-\d{2}$/

class LettoreSeed {
  constructor(private readonly errori: string[]) {}

  oggetto(valore: unknown, dove: string): Oggetto {
    if (eOggetto(valore)) return valore
    this.errori.push(`${dove}: non è un oggetto`)
    return {}
  }

  lista(valore: unknown, dove: string): unknown[] {
    if (Array.isArray(valore)) return valore
    this.errori.push(`${dove}: non è una lista`)
    return []
  }

  testo(o: Oggetto, campo: string, dove: string, formato?: RegExp): string {
    const v = o[campo]
    if (typeof v === 'string' && (formato === undefined || formato.test(v))) return v
    this.errori.push(`${dove}.${campo}: valore non valido`)
    return ''
  }

  numero(o: Oggetto, campo: string, dove: string): number {
    const v = o[campo]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    this.errori.push(`${dove}.${campo}: non è un numero`)
    return 0
  }

  numeroONull(o: Oggetto, campo: string, dove: string): number | null {
    return o[campo] === null ? null : this.numero(o, campo, dove)
  }

  testoONull(o: Oggetto, campo: string, dove: string): string | null {
    return o[campo] === null ? null : this.testo(o, campo, dove)
  }
}

/** Legge e valida il seed; errore in italiano con tutti i problemi trovati. */
export function leggiSeed(dati: unknown): Seed {
  const errori: string[] = []
  const l = new LettoreSeed(errori)
  const radice = l.oggetto(dati, 'seed')

  const fondi = l.lista(radice.fondi, 'fondi').map((nome, i) => {
    if (typeof nome === 'string' && nome !== '') return nome
    errori.push(`fondi[${i}]: nome non valido`)
    return ''
  })
  const fondoNoto = (o: Oggetto, dove: string) => {
    const fondo = l.testo(o, 'fondo', dove)
    if (fondo !== '' && !fondi.includes(fondo)) errori.push(`${dove}: fondo sconosciuto «${fondo}»`)
    return fondo
  }

  const imp = l.oggetto(radice.impostazioni, 'impostazioni')
  const impostazioni: ImpostazioniSeed = {
    annoNascita: l.numeroONull(imp, 'annoNascita', 'impostazioni'),
    etaPensione: l.numero(imp, 'etaPensione', 'impostazioni'),
    rendimento: l.numero(imp, 'rendimento', 'impostazioni'),
    inflazione: l.numero(imp, 'inflazione', 'impostazioni'),
    crescita: l.numero(imp, 'crescita', 'impostazioni'),
    tfrMensile: l.numeroONull(imp, 'tfrMensile', 'impostazioni'),
    personaleMensile: l.numeroONull(imp, 'personaleMensile', 'impostazioni'),
    aliquota: l.numero(imp, 'aliquota', 'impostazioni'),
    limite: l.numero(imp, 'limite', 'impostazioni'),
  }

  const versamenti = l.lista(radice.versamenti, 'versamenti').map((v, i): VersamentoSeed => {
    const dove = `versamenti[${i}]`
    const o = l.oggetto(v, dove)
    const tipo = l.testo(o, 'tipo', dove)
    if (tipo !== 'TFR' && tipo !== 'Spesa' && tipo !== '') {
      errori.push(`${dove}: tipo «${tipo}» non previsto (solo TFR o Spesa)`)
    }
    return {
      id: l.testo(o, 'id', dove),
      fondo: fondoNoto(o, dove),
      tipo: tipo === 'Spesa' ? 'Spesa' : 'TFR',
      data: l.testo(o, 'data', dove, DATA),
      importo: l.numero(o, 'importo', dove),
      note: l.testo(o, 'note', dove),
    }
  })
  const idVersamenti = new Set(versamenti.map((v) => v.id))

  const buste = l.lista(radice.tfr_accumulato, 'tfr_accumulato').map((t, i): BustaSeed => {
    const dove = `tfr_accumulato[${i}]`
    const o = l.oggetto(t, dove)
    const versamento = l.testoONull(o, 'versamento', dove)
    if (versamento !== null && !idVersamenti.has(versamento)) {
      errori.push(`${dove}: il versamento «${versamento}» non esiste`)
    }
    return {
      id: l.testo(o, 'id', dove),
      fondo: fondoNoto(o, dove),
      competenza: l.testo(o, 'competenza', dove, MESE),
      data: l.testo(o, 'data', dove, DATA),
      importo: l.numero(o, 'importo', dove),
      versamento,
      note: l.testo(o, 'note', dove),
    }
  })

  const estratti = l.lista(radice.estratti_conto, 'estratti_conto').map((e, i): EstrattoSeed => {
    const dove = `estratti_conto[${i}]`
    const o = l.oggetto(e, dove)
    return {
      id: l.testo(o, 'id', dove),
      fondo: fondoNoto(o, dove),
      data: l.testo(o, 'data', dove, DATA),
      valore: l.numero(o, 'valore', dove),
      note: l.testo(o, 'note', dove),
    }
  })

  if (errori.length > 0) throw new Error(`Seed non valido:\n  ${errori.join('\n  ')}`)
  return { fondi, impostazioni, versamenti, tfr_accumulato: buste, estratti_conto: estratti }
}

// --- Righe da inserire ---------------------------------------------------------------------

/** Ogni riga si riferisce alle altre per chiave del seed: gli uuid li assegna il DB. */
export interface RigheImport {
  fondi: { chiave: string; nome: string }[]
  movimenti: { chiave: string; fondo: string; data: string; note: string; righe: RigaMovimento[] }[]
  buste: {
    chiave: string
    fondo: string
    /** `YYYY-MM-01`. */
    competenza: string
    data: string
    note: string
    movimento: string | null
    righe: RigaBusta[]
  }[]
  estratti: { chiave: string; fondo: string; data: string; valore: Centesimi; note: string }[]
  impostazioni: Impostazioni
}

export function righeDaSeed(seed: Seed): RigheImport {
  const s = seed.impostazioni
  return {
    fondi: seed.fondi.map((nome) => ({ chiave: nome, nome })),
    movimenti: seed.versamenti.map((v) => ({
      chiave: v.id,
      fondo: v.fondo,
      data: v.data,
      note: v.note,
      righe: [{ tipo: v.tipo, importo: euroInCentesimi(v.importo) }],
    })),
    buste: seed.tfr_accumulato.map((t) => ({
      chiave: t.id,
      fondo: t.fondo,
      competenza: `${t.competenza}-01`,
      data: t.data,
      note: t.note,
      movimento: t.versamento,
      righe: [{ tipo: 'TFR', importo: euroInCentesimi(t.importo) }],
    })),
    estratti: seed.estratti_conto.map((e) => ({
      chiave: e.id,
      fondo: e.fondo,
      data: e.data,
      valore: euroInCentesimi(e.valore),
      note: e.note,
    })),
    impostazioni: {
      ...IMPOSTAZIONI_PREDEFINITE,
      annoNascita: s.annoNascita,
      etaPensione: s.etaPensione,
      rendimento: s.rendimento,
      inflazione: s.inflazione,
      crescita: s.crescita,
      tfrMensile: s.tfrMensile === null ? null : euroInCentesimi(s.tfrMensile),
      datoreMensile: null,
      personaleMensile: s.personaleMensile === null ? null : euroInCentesimi(s.personaleMensile),
      volontarioMensile: 0,
      aliquota: s.aliquota,
      limiteDeducibile: euroInCentesimi(s.limite),
    },
  }
}

// --- Rilettura dal DB ----------------------------------------------------------------------

/** `numeric` arriva da `pg` come stringa. */
type Numerico = string | number

/** Righe come le legge il DB, con le date già in testo (`YYYY-MM-DD`). */
export interface RigheLette {
  fondi: { id: string; nome: string }[]
  movimenti: { id: string; fondo_id: string; data: string; note: string }[]
  movimento_righe: { movimento_id: string; tipo: string; importo: Numerico }[]
  buste_paga: {
    id: string
    fondo_id: string
    competenza: string
    data: string
    movimento_id: string | null
    note: string
  }[]
  busta_righe: { busta_id: string; tipo: string; importo: Numerico }[]
  estratti_conto: { id: string; fondo_id: string; data: string; valore: Numerico; note: string }[]
  impostazioni: {
    anno_nascita: number | null
    eta_pensione: number
    rendimento: Numerico
    inflazione: Numerico
    crescita: Numerico
    tfr_mensile: Numerico | null
    datore_mensile: Numerico | null
    personale_mensile: Numerico | null
    volontario_mensile: Numerico
    aliquota: Numerico
    limite_deducibile: Numerico
  } | null
}

const centesimi = (euro: Numerico): Centesimi => euroInCentesimi(Number(euro))
const centesimiONull = (euro: Numerico | null): Centesimi | null =>
  euro === null ? null : centesimi(euro)

const TIPI_BUSTA: readonly TipoRigaBusta[] = ['TFR', 'Datore', 'Personale']
const TIPI_MOVIMENTO: readonly TipoRigaMovimento[] = [
  'TFR',
  'Datore',
  'Personale',
  'Volontario',
  'Spesa',
]

function tipoBusta(tipo: string): TipoRigaBusta {
  const trovato = TIPI_BUSTA.find((t) => t === tipo)
  if (trovato === undefined) throw new Error(`Tipo di riga di busta sconosciuto: ${tipo}`)
  return trovato
}

function tipoMovimento(tipo: string): TipoRigaMovimento {
  const trovato = TIPI_MOVIMENTO.find((t) => t === tipo)
  if (trovato === undefined) throw new Error(`Tipo di riga di movimento sconosciuto: ${tipo}`)
  return trovato
}

export function archivioDaRighe(r: RigheLette): Archivio {
  const movimenti: Movimento[] = r.movimenti.map((m) => ({
    id: m.id,
    fondoId: m.fondo_id,
    data: m.data,
    note: m.note,
    righe: r.movimento_righe
      .filter((riga) => riga.movimento_id === m.id)
      .map((riga) => ({ tipo: tipoMovimento(riga.tipo), importo: centesimi(riga.importo) })),
  }))
  const buste: BustaPaga[] = r.buste_paga.map((b) => ({
    id: b.id,
    fondoId: b.fondo_id,
    competenza: b.competenza.slice(0, 7),
    data: b.data,
    movimentoId: b.movimento_id,
    note: b.note,
    righe: r.busta_righe
      .filter((riga) => riga.busta_id === b.id)
      .map((riga) => ({ tipo: tipoBusta(riga.tipo), importo: centesimi(riga.importo) })),
  }))
  const i = r.impostazioni
  const impostazioni: Impostazioni =
    i === null
      ? { ...IMPOSTAZIONI_PREDEFINITE }
      : {
          annoNascita: i.anno_nascita,
          etaPensione: i.eta_pensione,
          rendimento: Number(i.rendimento),
          inflazione: Number(i.inflazione),
          crescita: Number(i.crescita),
          tfrMensile: centesimiONull(i.tfr_mensile),
          datoreMensile: centesimiONull(i.datore_mensile),
          personaleMensile: centesimiONull(i.personale_mensile),
          volontarioMensile: centesimi(i.volontario_mensile),
          aliquota: Number(i.aliquota),
          limiteDeducibile: centesimi(i.limite_deducibile),
        }
  return {
    fondi: r.fondi.map((f) => ({ id: f.id, nome: f.nome })),
    buste,
    movimenti,
    estratti: r.estratti_conto.map((e) => ({
      id: e.id,
      fondoId: e.fondo_id,
      data: e.data,
      valore: centesimi(e.valore),
      note: e.note,
    })),
    impostazioni,
  }
}

// --- Totali (R12) --------------------------------------------------------------------------

export interface TotaliImport {
  tfrInBusta: Centesimi
  versato: Centesimi
  daVersare: Centesimi
  spese: Centesimi
  ultimoValore: Centesimi | null
  dataUltimoValore: string | null
  buste: number
  busteCollegate: number
  movimenti: number
  estratti: number
}

export const TOTALI_ATTESI: Readonly<TotaliImport> = Object.freeze({
  tfrInBusta: 265915,
  versato: 159191,
  daVersare: 106724,
  spese: 1500,
  ultimoValore: 164145,
  dataUltimoValore: '2026-11-03',
  buste: 14,
  busteCollegate: 8,
  movimenti: 4,
  estratti: 4,
})

export function totaliDi(archivio: Archivio): TotaliImport {
  const c = crescita(archivio)
  const ultimo = ultimoValore(archivio)
  return {
    tfrInBusta: sommaCentesimi(
      archivio.buste.flatMap((b) => b.righe.filter((r) => r.tipo === 'TFR').map((r) => r.importo)),
    ),
    versato: c?.versato ?? 0,
    daVersare: daVersare(archivio).totale,
    spese: c?.spese ?? 0,
    ultimoValore: ultimo?.valore ?? null,
    dataUltimoValore: ultimo?.data ?? null,
    buste: archivio.buste.length,
    busteCollegate: archivio.buste.filter((b) => b.movimentoId !== null).length,
    movimenti: archivio.movimenti.length,
    estratti: archivio.estratti.length,
  }
}

const NOMI_TOTALI: Record<keyof TotaliImport, string> = {
  tfrInBusta: 'TFR in busta',
  versato: 'versato',
  daVersare: 'da versare',
  spese: 'spese',
  ultimoValore: 'ultimo valore',
  dataUltimoValore: 'data dell’ultimo valore',
  buste: 'buste',
  busteCollegate: 'buste collegate',
  movimenti: 'movimenti',
  estratti: 'estratti',
}

const CHIAVI_TOTALI: readonly (keyof TotaliImport)[] = [
  'tfrInBusta',
  'versato',
  'daVersare',
  'spese',
  'ultimoValore',
  'dataUltimoValore',
  'buste',
  'busteCollegate',
  'movimenti',
  'estratti',
]

/** Grandezze diverse dall'atteso, una per riga; lista vuota se tornano tutte. */
export function differenzeTotali(ottenuti: TotaliImport, attesi: TotaliImport): string[] {
  return CHIAVI_TOTALI.filter((k) => ottenuti[k] !== attesi[k]).map(
    (k) => `${NOMI_TOTALI[k]}: atteso ${String(attesi[k])}, ottenuto ${String(ottenuti[k])}`,
  )
}

/** Totali da stampare a fine import, una grandezza per riga. */
export function righeTotali(t: TotaliImport): string[] {
  return [
    `TFR in busta: ${formatoEuro(t.tfrInBusta)}`,
    `Versato: ${formatoEuro(t.versato)}`,
    `Da versare: ${formatoEuro(t.daVersare)}`,
    `Spese: ${formatoEuro(t.spese)}`,
    `Ultimo valore: ${formatoEuro(t.ultimoValore)} al ${formatoData(t.dataUltimoValore)}`,
    `Buste: ${t.buste} (${t.busteCollegate} collegate), movimenti: ${t.movimenti}, estratti: ${t.estratti}`,
  ]
}

// --- Decisione sull'import (R11) -----------------------------------------------------------

export const TABELLE_UTENTE = [
  'fondi',
  'movimenti',
  'movimento_righe',
  'buste_paga',
  'busta_righe',
  'estratti_conto',
  'impostazioni',
] as const

export type TabellaUtente = (typeof TABELLE_UTENTE)[number]

export type EsitoImport =
  { tipo: 'procedi'; utente: string } | { tipo: 'rifiuta'; messaggio: string }

export interface UtenteTrovato {
  /** `neon_auth."user".id` come testo, lo stesso valore di `user_id`. */
  id: string
  conteggi: Record<TabellaUtente, number>
}

/** `utente` null = nessun utente con quell'email in Neon Auth. */
export function decidiImport(email: string, utente: UtenteTrovato | null): EsitoImport {
  if (utente === null) {
    return {
      tipo: 'rifiuta',
      messaggio: `Nessun utente con email ${email} in Neon Auth: registralo prima di importare.`,
    }
  }
  const conDati = TABELLE_UTENTE.filter((t) => utente.conteggi[t] !== 0)
  if (conDati.length > 0) {
    return {
      tipo: 'rifiuta',
      messaggio: `L'utente ${email} ha già dati in ${conDati.join(', ')}: import annullato, nessuna scrittura.`,
    }
  }
  return { tipo: 'procedi', utente: utente.id }
}
