import { describe, expect, it } from 'vitest'
import { archivioDalSeed } from '../test/seed'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type {
  Archivio,
  BustaPaga,
  EstrattoConto,
  Movimento,
  TipoRigaBusta,
  TipoRigaMovimento,
} from '../types/dominio'
import { euroInCentesimi } from './importi'
import { crescita, daVersare, speseAl, stimaMensile, ultimoValore, versatoAl } from './posizione'

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

const TIPI_BUSTA: TipoRigaBusta[] = ['TFR', 'Datore', 'Personale']

function busta(
  competenza: string,
  fondoId: string,
  euro: Partial<Record<TipoRigaBusta, number>>,
  movimentoId: string | null = null,
): BustaPaga {
  const righe = TIPI_BUSTA.flatMap((tipo) => {
    const importo = euro[tipo]
    return importo === undefined ? [] : [{ tipo, importo: euroInCentesimi(importo) }]
  })
  const id = `${fondoId}-${competenza}`
  return { id, fondoId, competenza, data: `${competenza}-15`, righe, movimentoId, note: '' }
}

function estratto(id: string, fondoId: string, data: string, euro: number): EstrattoConto {
  return { id, fondoId, data, valore: euroInCentesimi(euro), note: '' }
}

describe('versatoAl e speseAl', () => {
  const seed = archivioDalSeed()

  it('sul seed al 2026-11-03', () => {
    expect(versatoAl(seed, '2026-11-03')).toBe(159191)
    expect(speseAl(seed, '2026-11-03')).toBe(1500)
  })

  it('sul seed al 2026-01-31', () => {
    expect(versatoAl(seed, '2026-01-31')).toBe(35015)
  })

  it('archivio vuoto → 0', () => {
    expect(versatoAl(archivio(), '2026-11-04')).toBe(0)
    expect(speseAl(archivio(), '2026-11-04')).toBe(0)
  })

  it('un movimento di sola Spesa non conta nel versato', () => {
    const a = archivio({ movimenti: [movimento('m1', 'A', '2026-01-10', { Spesa: 15 })] })
    expect(versatoAl(a, '2026-12-31')).toBe(0)
    expect(speseAl(a, '2026-12-31')).toBe(1500)
  })

  it('filtra per fondo', () => {
    const a = archivio({
      movimenti: [
        movimento('m1', 'A', '2026-01-10', { TFR: 100, Spesa: 5 }),
        movimento('m2', 'B', '2026-01-10', { Volontario: 40 }),
      ],
    })
    expect(versatoAl(a, '2026-12-31')).toBe(14000)
    expect(versatoAl(a, '2026-12-31', 'B')).toBe(4000)
    expect(speseAl(a, '2026-12-31', 'B')).toBe(0)
  })
})

describe('ultimoValore', () => {
  it('sul seed', () => {
    expect(ultimoValore(archivioDalSeed())).toEqual({ data: '2026-11-03', valore: 164145 })
  })

  it('archivio vuoto → null', () => {
    expect(ultimoValore(archivio())).toBeNull()
  })

  describe('due fondi', () => {
    const a = archivio({
      estratti: [
        estratto('a1', 'A', '2026-01-31', 800),
        estratto('a2', 'A', '2026-06-30', 1000),
        estratto('b1', 'B', '2026-09-30', 500),
      ],
    })

    it('somma l’ultimo di ogni fondo con la data più alta', () => {
      expect(ultimoValore(a)).toEqual({ data: '2026-09-30', valore: 150000 })
    })

    it('con fondoId vale solo quel fondo', () => {
      expect(ultimoValore(a, 'A')).toEqual({ data: '2026-06-30', valore: 100000 })
    })
  })

  it('due estratti nella stessa data → vale l’id maggiore', () => {
    const a = archivio({
      estratti: [estratto('e2', 'A', '2026-06-30', 200), estratto('e1', 'A', '2026-06-30', 100)],
    })
    expect(ultimoValore(a)?.valore).toBe(20000)
  })
})

describe('crescita', () => {
  it('sul seed', () => {
    const c = crescita(archivioDalSeed())
    expect(c?.importo).toBe(4954)
    expect(c?.percentuale).toBeCloseTo(0.03112, 5)
    expect(c?.spese).toBe(1500)
    expect(c?.versato).toBe(159191)
  })

  it('archivio vuoto → null', () => {
    expect(crescita(archivio())).toBeNull()
  })

  it('un solo estratto senza movimenti → percentuale null', () => {
    const a = archivio({ estratti: [estratto('e1', 'A', '2026-06-30', 100)] })
    expect(crescita(a)).toEqual({ importo: 10000, percentuale: null, spese: 0, versato: 0 })
  })

  it('un movimento dopo l’ultimo estratto conta nel versato a oggi ma non nella crescita', () => {
    const a = archivio({
      movimenti: [
        movimento('m1', 'A', '2026-01-10', { TFR: 100 }),
        movimento('m2', 'A', '2026-08-10', { TFR: 50, Spesa: 3 }),
      ],
      estratti: [estratto('e1', 'A', '2026-06-30', 110)],
    })
    expect(versatoAl(a, '2026-11-04')).toBe(15000)
    const c = crescita(a)
    expect(c?.importo).toBe(1000)
    expect(c?.versato).toBe(10000)
    expect(c?.spese).toBe(0)
    expect(c?.percentuale).toBeCloseTo(0.1, 10)
  })

  describe('due fondi', () => {
    const a = archivio({
      movimenti: [
        movimento('m1', 'A', '2026-01-10', { TFR: 1000 }),
        movimento('m2', 'B', '2026-01-10', { Personale: 400, Spesa: 10 }),
        // Dopo l'ultimo estratto di A ma prima di quello di B: conta solo per B.
        movimento('m3', 'A', '2026-08-01', { TFR: 200 }),
      ],
      estratti: [estratto('a1', 'A', '2026-06-30', 1100), estratto('b1', 'B', '2026-09-30', 500)],
    })

    it('conta il versato di ogni fondo alla data del suo ultimo estratto', () => {
      const c = crescita(a)
      expect(c?.importo).toBe(20000)
      expect(c?.versato).toBe(140000)
      expect(c?.spese).toBe(1000)
      expect(c?.percentuale).toBeCloseTo(160000 / 140000 - 1, 10)
    })

    it('con fondoId vale solo quel fondo', () => {
      expect(crescita(a, 'B')).toEqual({
        importo: 10000,
        percentuale: 0.25,
        spese: 1000,
        versato: 40000,
      })
    })
  })
})

describe('daVersare', () => {
  it('sul seed', () => {
    const d = daVersare(archivioDalSeed())
    expect(d.totale).toBe(106724)
    expect(d.perTipo).toEqual({ TFR: 106724, Datore: 0, Personale: 0 })
    expect(d.buste.map((b) => b.competenza)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ])
  })

  it('archivio vuoto → 0', () => {
    expect(daVersare(archivio())).toEqual({
      totale: 0,
      perTipo: { TFR: 0, Datore: 0, Personale: 0 },
      buste: [],
    })
  })

  it('somma per tipo e ordina per competenza', () => {
    const a = archivio({
      buste: [
        busta('2026-03', 'A', { TFR: 100, Personale: 50 }),
        busta('2026-01', 'A', { TFR: 90, Datore: 20 }),
        busta('2026-02', 'A', { TFR: 95 }, 'm1'),
      ],
    })
    const d = daVersare(a)
    expect(d.perTipo).toEqual({ TFR: 19000, Datore: 2000, Personale: 5000 })
    expect(d.totale).toBe(26000)
    expect(d.buste.map((b) => b.competenza)).toEqual(['2026-01', '2026-03'])
  })
})

describe('stimaMensile', () => {
  it('sul seed, TFR', () => {
    expect(stimaMensile(archivioDalSeed(), 'TFR')).toBe(17780)
  })

  it('5 buste TFR → l’elemento centrale', () => {
    const a = archivio({
      buste: [500, 100, 400, 200, 300].map((euro, i) =>
        busta(`2026-0${i + 1}`, 'A', { TFR: euro }),
      ),
    })
    expect(stimaMensile(a, 'TFR')).toBe(30000)
  })

  it('nessuna busta Datore → 0', () => {
    expect(stimaMensile(archivioDalSeed(), 'Datore')).toBe(0)
  })

  it('archivio vuoto → 0', () => {
    expect(stimaMensile(archivio(), 'TFR')).toBe(0)
  })

  it('usa solo le ultime 6 buste e, con n pari, l’elemento floor(n/2)', () => {
    const a = archivio({
      buste: [900, 100, 200, 300, 400, 500, 600].map((euro, i) =>
        busta(`2026-0${i + 1}`, 'A', { TFR: euro }),
      ),
    })
    // Ultime 6 ordinate: 100..600 → indice 3 = 400.
    expect(stimaMensile(a, 'TFR')).toBe(40000)
  })

  it('una busta senza la riga del tipo non entra nella stima', () => {
    const a = archivio({
      buste: [
        busta('2026-01', 'A', { TFR: 100, Datore: 10 }),
        busta('2026-02', 'A', { TFR: 100, Datore: 30 }),
        busta('2026-03', 'A', { TFR: 100 }),
        busta('2026-04', 'A', { TFR: 100 }),
      ],
    })
    // Con le buste senza Datore la mediana sarebbe 0 o 10; solo 10 e 30 → indice 1 = 30.
    expect(stimaMensile(a, 'Datore')).toBe(3000)
  })
})

describe('daVersare e stimaMensile con due fondi', () => {
  const a = archivio({
    buste: [
      busta('2026-01', 'A', { TFR: 100 }),
      busta('2026-02', 'A', { TFR: 100 }, 'm1'),
      busta('2026-03', 'A', { TFR: 100 }),
      busta('2026-01', 'B', { TFR: 300 }),
      busta('2026-02', 'B', { TFR: 300 }),
      busta('2026-03', 'B', { TFR: 300 }),
      busta('2026-04', 'B', { TFR: 300 }),
    ],
  })

  it('daVersare filtra per fondo', () => {
    expect(daVersare(a).totale).toBe(140000)
    expect(daVersare(a, 'A').totale).toBe(20000)
    expect(daVersare(a, 'B').buste).toHaveLength(4)
  })

  it('stimaMensile filtra per fondo', () => {
    // Su tutti i fondi le ultime 6 sono 300, 300, 100, 300, 100, 300 → indice 3 = 300.
    expect(stimaMensile(a, 'TFR')).toBe(30000)
    expect(stimaMensile(a, 'TFR', 'A')).toBe(10000)
    expect(stimaMensile(a, 'TFR', 'B')).toBe(30000)
  })
})
