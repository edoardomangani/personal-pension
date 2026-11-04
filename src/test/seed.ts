import seed from '../../data/seed.json'
import { euroInCentesimi } from '../calc/importi'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type { Archivio, Impostazioni, TipoRigaMovimento } from '../types/dominio'

// Il seed ha solo versamenti TFR e Spesa: un tipo diverso deve rompere i test, non i calcoli.
function tipoVersamento(tipo: string): TipoRigaMovimento {
  if (tipo === 'TFR' || tipo === 'Spesa') return tipo
  throw new Error(`Tipo di versamento sconosciuto nel seed: ${tipo}`)
}

function impostazioniDalSeed(): Impostazioni {
  const s = seed.impostazioni
  return {
    ...IMPOSTAZIONI_PREDEFINITE,
    annoNascita: s.annoNascita,
    etaPensione: s.etaPensione,
    rendimento: s.rendimento,
    inflazione: s.inflazione,
    crescita: s.crescita,
    tfrMensile: s.tfrMensile === null ? null : euroInCentesimi(s.tfrMensile),
    personaleMensile: euroInCentesimi(s.personaleMensile),
    aliquota: s.aliquota,
    limiteDeducibile: euroInCentesimi(s.limite),
  }
}

/** `data/seed.json` come `Archivio`; il fondo usa il nome come id. Ogni chiamata dà oggetti nuovi. */
export function archivioDalSeed(): Archivio {
  return {
    fondi: seed.fondi.map((nome) => ({ id: nome, nome })),
    buste: seed.tfr_accumulato.map((t) => ({
      id: t.id,
      fondoId: t.fondo,
      competenza: t.competenza,
      data: t.data,
      righe: [{ tipo: 'TFR', importo: euroInCentesimi(t.importo) }],
      movimentoId: t.versamento,
      note: t.note,
    })),
    movimenti: seed.versamenti.map((v) => ({
      id: v.id,
      fondoId: v.fondo,
      data: v.data,
      righe: [{ tipo: tipoVersamento(v.tipo), importo: euroInCentesimi(v.importo) }],
      note: v.note,
    })),
    estratti: seed.estratti_conto.map((e) => ({
      id: e.id,
      fondoId: e.fondo,
      data: e.data,
      valore: euroInCentesimi(e.valore),
      note: e.note,
    })),
    impostazioni: impostazioniDalSeed(),
  }
}
