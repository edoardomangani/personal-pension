// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  TOTALI_ATTESI,
  archivioDaRighe,
  decidiImport,
  differenzeTotali,
  leggiSeed,
  righeDaSeed,
  righeTotali,
  totaliDi,
  type RigheImport,
  type TabellaUtente,
  type RigheLette,
} from './importa'

const TESTO_SEED = readFileSync(new URL('../../data/seed.json', import.meta.url), 'utf8')
const SEED: unknown = JSON.parse(TESTO_SEED)

type Voce = Record<string, unknown>

/** Seed nuovo a ogni chiamata, da alterare nei casi non validi. */
function seedGrezzo(): Record<'versamenti' | 'tfr_accumulato' | 'estratti_conto', Voce[]> {
  return JSON.parse(TESTO_SEED)
}

// Come le rileggerebbe il DB: chiavi del seed al posto degli uuid, importi come stringhe.
function comeLette(r: RigheImport): RigheLette {
  const euro = (c: number) => (c / 100).toFixed(2)
  const i = r.impostazioni
  return {
    fondi: r.fondi.map((f) => ({ id: f.chiave, nome: f.nome })),
    movimenti: r.movimenti.map((m) => ({
      id: m.chiave,
      fondo_id: m.fondo,
      data: m.data,
      note: m.note,
    })),
    movimento_righe: r.movimenti.flatMap((m) =>
      m.righe.map((riga) => ({
        movimento_id: m.chiave,
        tipo: riga.tipo,
        importo: euro(riga.importo),
      })),
    ),
    buste_paga: r.buste.map((b) => ({
      id: b.chiave,
      fondo_id: b.fondo,
      competenza: b.competenza,
      data: b.data,
      movimento_id: b.movimento,
      note: b.note,
    })),
    busta_righe: r.buste.flatMap((b) =>
      b.righe.map((riga) => ({ busta_id: b.chiave, tipo: riga.tipo, importo: euro(riga.importo) })),
    ),
    estratti_conto: r.estratti.map((e) => ({
      id: e.chiave,
      fondo_id: e.fondo,
      data: e.data,
      valore: euro(e.valore),
      note: e.note,
    })),
    impostazioni: {
      anno_nascita: i.annoNascita,
      eta_pensione: i.etaPensione,
      rendimento: String(i.rendimento),
      inflazione: String(i.inflazione),
      crescita: String(i.crescita),
      tfr_mensile: i.tfrMensile === null ? null : euro(i.tfrMensile),
      datore_mensile: i.datoreMensile === null ? null : euro(i.datoreMensile),
      personale_mensile: i.personaleMensile === null ? null : euro(i.personaleMensile),
      volontario_mensile: euro(i.volontarioMensile),
      aliquota: String(i.aliquota),
      limite_deducibile: euro(i.limiteDeducibile),
    },
  }
}

describe('righeDaSeed (R11)', () => {
  const righe = righeDaSeed(leggiSeed(SEED))

  it('1 fondo, 4 movimenti (3 TFR, 1 Spesa) con una riga ciascuno', () => {
    expect(righe.fondi).toEqual([
      { chiave: 'Amundi Seconda Pensione', nome: 'Amundi Seconda Pensione' },
    ])
    expect(righe.movimenti).toHaveLength(4)
    expect(righe.movimenti.every((m) => m.righe.length === 1)).toBe(true)
    const tipi = righe.movimenti.map((m) => m.righe[0]?.tipo)
    expect(tipi.filter((t) => t === 'TFR')).toHaveLength(3)
    expect(tipi.filter((t) => t === 'Spesa')).toHaveLength(1)
  })

  it('14 buste con una riga TFR, 8 collegate a un movimento', () => {
    expect(righe.buste).toHaveLength(14)
    expect(righe.buste.every((b) => b.righe.length === 1 && b.righe[0]?.tipo === 'TFR')).toBe(true)
    expect(righe.buste.filter((b) => b.movimento !== null)).toHaveLength(8)
  })

  it('competenza YYYY-MM-01 e collegamento per id del seed', () => {
    const agosto = righe.buste.find((b) => b.chiave === 'tfr-2025-08')
    expect(agosto?.competenza).toBe('2025-08-01')
    expect(agosto?.movimento).toBe('v-2025-11-04')
    expect(righe.movimenti.some((m) => m.chiave === agosto?.movimento)).toBe(true)
  })

  it('importi in centesimi interi', () => {
    const maggio = righe.buste.find((b) => b.chiave === 'tfr-2026-05')
    expect(maggio?.righe[0]?.importo).toBe(17780)
    const dicembre = righe.buste.find((b) => b.chiave === 'tfr-2025-12')
    expect(dicembre?.righe[0]?.importo).toBe(35015)
    expect(righe.estratti.map((e) => e.valore)).toEqual([34719, 106629, 167020, 164145])
  })

  it('impostazioni mappate come nelle Decisioni', () => {
    expect(righe.impostazioni).toEqual({
      annoNascita: 1994,
      etaPensione: 67,
      rendimento: 3,
      inflazione: 2,
      crescita: 1.5,
      tfrMensile: null,
      datoreMensile: null,
      personaleMensile: 0,
      volontarioMensile: 0,
      aliquota: 35,
      limiteDeducibile: 516457,
    })
  })

  it('4 estratti', () => {
    expect(righe.estratti).toHaveLength(4)
  })
})

describe('totali (R12)', () => {
  it('il seed riletto dal DB dà i totali attesi, senza differenze', () => {
    const archivio = archivioDaRighe(comeLette(righeDaSeed(leggiSeed(SEED))))
    const totali = totaliDi(archivio)
    expect(totali).toEqual(TOTALI_ATTESI)
    expect(differenzeTotali(totali, TOTALI_ATTESI)).toEqual([])
  })

  it('un importo alterato si vede come differenza', () => {
    const lette = comeLette(righeDaSeed(leggiSeed(SEED)))
    const riga = lette.busta_righe.find((r) => r.busta_id === 'tfr-2026-09')
    if (riga) riga.importo = '177.81'
    const differenze = differenzeTotali(totaliDi(archivioDaRighe(lette)), TOTALI_ATTESI)
    expect(differenze).toEqual([
      'TFR in busta: atteso 265915, ottenuto 265916',
      'da versare: atteso 106724, ottenuto 106725',
    ])
  })

  it('competenza riletta come YYYY-MM e numeric da stringa a centesimi', () => {
    const archivio = archivioDaRighe(comeLette(righeDaSeed(leggiSeed(SEED))))
    expect(archivio.buste.find((b) => b.id === 'tfr-2025-08')?.competenza).toBe('2025-08')
    expect(archivio.movimenti.find((m) => m.id === 'v-2026-02-03')?.righe).toEqual([
      { tipo: 'TFR', importo: 70681 },
    ])
  })

  it('tipo di riga sconosciuto nel DB → errore', () => {
    const lette = comeLette(righeDaSeed(leggiSeed(SEED)))
    const riga = lette.movimento_righe[0]
    if (riga) riga.tipo = 'Bonus'
    expect(() => archivioDaRighe(lette)).toThrow(/sconosciuto: Bonus/)
  })
})

describe('leggiSeed: seed non validi', () => {
  it('fondo sconosciuto → errore che lo nomina', () => {
    const s = seedGrezzo()
    if (s.versamenti[0]) s.versamenti[0].fondo = 'Fondo fantasma'
    expect(() => leggiSeed(s)).toThrow(/versamenti\[0\]: fondo sconosciuto «Fondo fantasma»/)
  })

  it('versamento inesistente in una busta → errore', () => {
    const s = seedGrezzo()
    if (s.tfr_accumulato[0]) s.tfr_accumulato[0].versamento = 'v-inesistente'
    expect(() => leggiSeed(s)).toThrow(/il versamento «v-inesistente» non esiste/)
  })

  it('tipo diverso da TFR o Spesa → errore', () => {
    const s = seedGrezzo()
    if (s.versamenti[0]) s.versamenti[0].tipo = 'Personale'
    expect(() => leggiSeed(s)).toThrow(/tipo «Personale» non previsto/)
  })

  it('campi mancanti o di tipo sbagliato → errore in italiano', () => {
    const s = seedGrezzo()
    if (s.estratti_conto[0]) s.estratti_conto[0].valore = '1641,45'
    expect(() => leggiSeed(s)).toThrow(
      /Seed non valido:[\s\S]*estratti_conto\[0\]\.valore: non è un numero/,
    )
  })

  it('non un oggetto → errore', () => {
    expect(() => leggiSeed([])).toThrow(/seed: non è un oggetto/)
  })
})

describe('decidiImport (R11)', () => {
  const email = 'collaudo1@pianopensione.test'
  const zero: Record<TabellaUtente, number> = {
    fondi: 0,
    movimenti: 0,
    movimento_righe: 0,
    buste_paga: 0,
    busta_righe: 0,
    estratti_conto: 0,
    impostazioni: 0,
  }

  it('utente assente → rifiuto che nomina l’email', () => {
    const esito = decidiImport(email, null)
    expect(esito.tipo).toBe('rifiuta')
    expect(esito.tipo === 'rifiuta' && esito.messaggio).toMatch(email)
  })

  it('tutti i conteggi a zero → procedi', () => {
    expect(decidiImport(email, { id: 'u1', conteggi: zero })).toEqual({
      tipo: 'procedi',
      utente: 'u1',
    })
  })

  it('utente con dati già presenti (solo impostazioni) → rifiuto che nomina la tabella', () => {
    const esito = decidiImport(email, { id: 'u1', conteggi: { ...zero, impostazioni: 1 } })
    expect(esito.tipo).toBe('rifiuta')
    expect(esito.tipo === 'rifiuta' && esito.messaggio).toMatch(/già dati in impostazioni:/)
  })

  it('elenca tutte le tabelle con dati', () => {
    const esito = decidiImport(email, { id: 'u1', conteggi: { ...zero, fondi: 1, busta_righe: 3 } })
    expect(esito.tipo === 'rifiuta' && esito.messaggio).toMatch(/già dati in fondi, busta_righe:/)
  })
})

describe('righeTotali', () => {
  it('stampa i totali attesi in formato it-IT', () => {
    const righe = righeTotali(TOTALI_ATTESI)
    expect(righe[0]).toBe('TFR in busta: 2.659,15\u00a0€')
    expect(righe[4]).toBe('Ultimo valore: 1.641,45\u00a0€ al 03/11/2026')
  })
})
