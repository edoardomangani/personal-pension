import { describe, expect, it } from 'vitest'
import { archivioDalSeed } from '../test/seed'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type { Archivio, EstrattoConto, Movimento, TipoRigaMovimento } from '../types/dominio'
import { euroInCentesimi } from './importi'
import { flussiRendimento, giorniTra, rendimentoAnnuo, xirr } from './xirr'

function archivio(parti: Partial<Archivio> = {}): Archivio {
  return {
    fondi: [],
    buste: [],
    movimenti: [],
    estratti: [],
    impostazioni: { ...IMPOSTAZIONI_PREDEFINITE },
    ...parti,
  }
}

const TIPI_MOVIMENTO: TipoRigaMovimento[] = ['TFR', 'Datore', 'Personale', 'Volontario', 'Spesa']

function movimento(
  id: string,
  fondoId: string,
  data: string,
  euro: Partial<Record<TipoRigaMovimento, number>>,
): Movimento {
  const righe = TIPI_MOVIMENTO.flatMap((tipo) => {
    const importo = euro[tipo]
    return importo === undefined ? [] : [{ tipo, importo: euroInCentesimi(importo) }]
  })
  return { id, fondoId, data, righe, note: '' }
}

function estratto(id: string, fondoId: string, data: string, euro: number): EstrattoConto {
  return { id, fondoId, data, valore: euroInCentesimi(euro), note: '' }
}

const OGGI = '2026-11-04'

describe('giorniTra', () => {
  it('conta il 29 febbraio negli anni bisestili', () => {
    expect(giorniTra('2024-02-28', '2024-03-01')).toBe(2)
    expect(giorniTra('2024-01-01', '2025-01-01')).toBe(366)
    expect(giorniTra('2025-01-01', '2026-01-01')).toBe(365)
  })

  it('il 1900 e il 2100 non sono bisestili, il 2000 sì', () => {
    expect(giorniTra('2100-02-28', '2100-03-01')).toBe(1)
    expect(giorniTra('1900-02-28', '1900-03-01')).toBe(1)
    expect(giorniTra('2000-02-28', '2000-03-01')).toBe(2)
  })

  it('conta all’indietro e tra mesi diversi', () => {
    expect(giorniTra('2026-11-03', '2025-11-04')).toBe(-364)
    expect(giorniTra('1970-01-01', '2026-11-04')).toBe(20761)
  })
})

describe('xirr', () => {
  it('meno di due flussi → null', () => {
    expect(xirr([])).toBeNull()
    expect(xirr([{ data: '2026-01-01', importo: -10000 }])).toBeNull()
  })

  it('flussi in meno di 0,08 anni → null', () => {
    const flussi = [
      { data: '2026-01-01', importo: -10000 },
      { data: '2026-01-20', importo: 11000 },
    ]
    expect(xirr(flussi)).toBeNull()
  })

  it('nessun cambio di segno → null', () => {
    const flussi = [
      { data: '2025-01-01', importo: 10000 },
      { data: '2026-01-01', importo: 11000 },
    ]
    expect(xirr(flussi)).toBeNull()
  })

  it('un anno esatto al 10%', () => {
    const flussi = [
      { data: '2025-01-01', importo: -10000 },
      { data: '2026-01-01', importo: 11000 },
    ]
    expect(xirr(flussi)).toBeCloseTo(Math.pow(1.1, 365.25 / 365) - 1, 6)
  })
})

describe('rendimentoAnnuo', () => {
  it('sul seed con 12 mesi di storia', () => {
    const r = rendimentoAnnuo(archivioDalSeed(), OGGI)
    expect(r.motivo).toBeNull()
    expect(r.valore).toBeCloseTo(0.0475, 3)
  })

  it('sul seed il giorno prima dei 12 mesi → storia breve', () => {
    expect(rendimentoAnnuo(archivioDalSeed(), '2026-11-03')).toEqual({
      valore: null,
      motivo: 'storia-breve',
    })
  })

  it('archivio vuoto → null', () => {
    expect(rendimentoAnnuo(archivio(), OGGI).valore).toBeNull()
  })

  it('con 12 mesi di storia ma senza estratti → non calcolabile', () => {
    const a = archivio({ movimenti: [movimento('m1', 'A', '2025-01-10', { TFR: 100 })] })
    expect(rendimentoAnnuo(a, OGGI)).toEqual({ valore: null, motivo: 'non-calcolabile' })
  })

  it('il primo movimento di sola Spesa non apre la storia', () => {
    const a = archivio({
      movimenti: [
        movimento('m0', 'A', '2025-01-10', { Spesa: 5 }),
        movimento('m1', 'A', '2026-01-10', { TFR: 100 }),
      ],
      estratti: [estratto('e1', 'A', '2026-10-10', 105)],
    })
    expect(rendimentoAnnuo(a, OGGI).motivo).toBe('storia-breve')
  })

  it('i 12 mesi da un 29 febbraio scadono dopo il 28 febbraio', () => {
    const a = archivio({
      movimenti: [movimento('m1', 'A', '2024-02-29', { TFR: 100 })],
      estratti: [estratto('e1', 'A', '2025-02-01', 105)],
    })
    expect(rendimentoAnnuo(a, '2025-02-28').motivo).toBe('storia-breve')
    expect(rendimentoAnnuo(a, '2025-03-01').motivo).toBeNull()
  })

  it('esclude dai flussi i movimenti di sola Spesa e quelli dopo l’ultimo estratto', () => {
    const base = archivioDalSeed()
    const conAltri: Archivio = {
      ...base,
      movimenti: [
        ...base.movimenti,
        movimento('spesa', 'Amundi Seconda Pensione', '2026-03-01', { Spesa: 20 }),
        movimento('dopo', 'Amundi Seconda Pensione', '2026-11-04', { TFR: 500 }),
      ],
    }
    expect(flussiRendimento(conAltri)).toEqual(flussiRendimento(base))
    expect(rendimentoAnnuo(conAltri, OGGI)).toEqual(rendimentoAnnuo(base, OGGI))
  })

  it('i flussi del seed: tre versamenti e l’ultimo valore', () => {
    expect(flussiRendimento(archivioDalSeed())).toEqual([
      { data: '2025-11-04', importo: -35015 },
      { data: '2026-02-03', importo: -70681 },
      { data: '2026-07-09', importo: -53495 },
      { data: '2026-11-03', importo: 164145 },
    ])
  })

  describe('due fondi', () => {
    const a = archivio({
      movimenti: [
        movimento('a1', 'A', '2024-01-10', { TFR: 1000 }),
        movimento('b1', 'B', '2026-06-01', { Personale: 1000 }),
        // Fondo senza estratti: i suoi movimenti non sono flussi.
        movimento('c1', 'C', '2024-01-10', { TFR: 1000 }),
      ],
      estratti: [estratto('ea', 'A', '2026-01-10', 1100), estratto('eb', 'B', '2026-10-01', 1100)],
    })

    it('i flussi dipendono dal fondo', () => {
      expect(flussiRendimento(a, 'A')).toEqual([
        { data: '2024-01-10', importo: -100000 },
        { data: '2026-01-10', importo: 110000 },
      ])
      expect(flussiRendimento(a)).toEqual([
        { data: '2024-01-10', importo: -100000 },
        { data: '2026-06-01', importo: -100000 },
        { data: '2026-10-01', importo: 220000 },
      ])
    })

    it('rendimento con e senza fondoId', () => {
      const soloA = rendimentoAnnuo(a, OGGI, 'A')
      const tutti = rendimentoAnnuo(a, OGGI)
      expect(soloA.valore).toBeCloseTo(Math.pow(1.1, 365.25 / 731) - 1, 5)
      expect(tutti.motivo).toBeNull()
      expect(tutti.valore).not.toBeCloseTo(soloA.valore ?? 0, 3)
    })

    it('il fondo con meno di 12 mesi di storia è storia breve solo da solo', () => {
      expect(rendimentoAnnuo(a, OGGI, 'B')).toEqual({ valore: null, motivo: 'storia-breve' })
      expect(rendimentoAnnuo(a, OGGI).valore).not.toBeNull()
    })
  })
})
