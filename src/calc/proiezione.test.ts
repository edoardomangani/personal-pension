import { describe, expect, it } from 'vitest'
import { archivioDalSeed } from '../test/seed'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type { Archivio, BustaPaga, EstrattoConto, Impostazioni } from '../types/dominio'
import { euroInCentesimi } from './importi'
import { contributiMensili, inEuroDiOggi, proiezione, simula } from './proiezione'
import type { ParametriSimulazione } from './proiezione'

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

function conImpostazioni(a: Archivio, impostazioni: Partial<Impostazioni>): Archivio {
  return { ...a, impostazioni: { ...a.impostazioni, ...impostazioni } }
}

function bustaTfr(id: string, fondoId: string, competenza: string, euro: number): BustaPaga {
  return {
    id,
    fondoId,
    competenza,
    data: `${competenza}-16`,
    righe: [{ tipo: 'TFR', importo: euroInCentesimi(euro) }],
    movimentoId: null,
    note: '',
  }
}

function estratto(id: string, fondoId: string, data: string, euro: number): EstrattoConto {
  return { id, fondoId, data, valore: euroInCentesimi(euro), note: '' }
}

const BASE: ParametriSimulazione = {
  partenza: 100000,
  contributoMensile: 10000,
  rendimento: 0,
  crescita: 0,
  anni: 1,
  annoInizio: 2026,
}

describe('contributiMensili', () => {
  it('sul seed: TFR dalla stima, gli altri 0', () => {
    expect(contributiMensili(archivioDalSeed())).toEqual({
      TFR: 17780,
      Datore: 0,
      Personale: 0,
      Volontario: 0,
    })
  })

  it('l’impostazione del TFR vince sulla stima', () => {
    const a = conImpostazioni(archivioDalSeed(), { tfrMensile: 20000 })
    expect(contributiMensili(a).TFR).toBe(20000)
  })

  it('il volontario è l’impostazione tale e quale', () => {
    const a = conImpostazioni(archivio(), { volontarioMensile: 5000 })
    expect(contributiMensili(a).Volontario).toBe(5000)
  })
})

describe('simula', () => {
  it('rendimento 0%: partenza più i contributi', () => {
    expect(simula(BASE).finale).toBe(220000)
  })

  it('rendimento 12% con capitalizzazione mensile', () => {
    expect(simula({ ...BASE, rendimento: 12 }).finale).toBe(238465)
  })

  it('la crescita dei contributi parte dopo il primo anno', () => {
    const s = simula({ ...BASE, partenza: 0, crescita: 10, anni: 2 })
    expect(s.totaleContributi).toBe(252000)
    expect(s.serie.map((p) => p.versatoCumulato)).toEqual([0, 120000, 252000])
  })

  it('la serie ha anni + 1 punti e parte dalla partenza', () => {
    const s = simula({ ...BASE, rendimento: 5, anni: 3 })
    expect(s.serie).toHaveLength(4)
    expect(s.serie[0]).toEqual({ anno: 2026, valore: 100000, versatoCumulato: 100000 })
    expect(s.serie.map((p) => p.anno)).toEqual([2026, 2027, 2028, 2029])
    expect(s.serie.at(-1)?.valore).toBe(s.finale)
  })

  it('rendimento negativo resta calcolabile', () => {
    expect(simula({ ...BASE, rendimento: -1 }).finale).toBeLessThan(220000)
  })
})

describe('inEuroDiOggi', () => {
  it('inflazione 2% su 35 anni', () => {
    expect(inEuroDiOggi(10000000, 2, 35)).toBe(5000276)
  })
})

describe('proiezione', () => {
  it('sul seed', () => {
    const p = proiezione(archivioDalSeed(), '2026-11-04')
    if (p.motivo !== null) throw new Error(`proiezione mancante: ${p.motivo}`)
    expect(p.anni).toBe(35)
    expect(p.annoPensione).toBe(2061)
    expect(p.partenza).toBe(270869)
    const [prudente, atteso, favorevole] = p.scenari
    expect(p.scenari.map((s) => s.rendimento)).toEqual([1, 3, 5])
    expect(prudente.finale).toBeLessThan(atteso.finale)
    expect(atteso.finale).toBeLessThan(favorevole.finale)
    for (const s of p.scenari) {
      expect(s.finaleOggi).toBeLessThan(s.finale)
      expect(s.serie).toHaveLength(36)
    }
  })

  it('senza anno di nascita → manca-nascita', () => {
    const a = conImpostazioni(archivioDalSeed(), { annoNascita: null })
    expect(proiezione(a, '2026-11-04')).toEqual({ motivo: 'manca-nascita' })
  })

  it('anno di pensione non futuro → anno-passato', () => {
    const a = conImpostazioni(archivio(), { annoNascita: 1959, etaPensione: 67 })
    expect(proiezione(a, '2026-11-04')).toEqual({ motivo: 'anno-passato' })
  })

  it('senza estratti la partenza è solo il da versare', () => {
    const a = conImpostazioni(archivio({ buste: [bustaTfr('b1', 'A', '2026-10', 150)] }), {
      annoNascita: 1994,
    })
    const p = proiezione(a, '2026-11-04')
    expect(p.motivo === null && p.partenza).toBe(15000)
  })

  describe('due fondi', () => {
    const a = conImpostazioni(
      archivio({
        buste: [bustaTfr('a1', 'A', '2026-10', 100), bustaTfr('b1', 'B', '2026-10', 40)],
        estratti: [estratto('a1', 'A', '2026-09-30', 1000), estratto('b1', 'B', '2026-09-30', 500)],
      }),
      { annoNascita: 1994 },
    )

    it('senza fondoId parte da tutto l’archivio', () => {
      const p = proiezione(a, '2026-11-04')
      expect(p.motivo === null && p.partenza).toBe(164000)
    })

    it('con fondoId parte solo dal fondo', () => {
      const p = proiezione(a, '2026-11-04', 'B')
      expect(p.motivo === null && p.partenza).toBe(54000)
      expect(p.motivo === null && p.contributi.TFR).toBe(4000)
    })
  })
})
