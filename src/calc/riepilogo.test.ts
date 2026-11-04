import { describe, expect, it } from 'vitest'
import { archivioDalSeed } from '../test/seed'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import type { Archivio, EstrattoConto, Movimento, TipoRigaMovimento } from '../types/dominio'
import { euroInCentesimi } from './importi'
import { riepilogoAnnuale } from './riepilogo'

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

describe('riepilogoAnnuale', () => {
  it('sul seed', () => {
    expect(riepilogoAnnuale(archivioDalSeed())).toEqual([
      { anno: 2026, tfr: 124176, altri: 0, spese: 0, valore: 164145 },
      { anno: 2025, tfr: 35015, altri: 0, spese: 1500, valore: 34719 },
    ])
  })

  it('archivio vuoto → nessuna riga', () => {
    expect(riepilogoAnnuale(archivio())).toEqual([])
  })

  it('un anno con soli movimenti ha valore null', () => {
    const a = archivio({
      movimenti: [
        movimento('m1', 'A', '2024-05-10', { TFR: 100, Datore: 20, Personale: 10, Volontario: 5 }),
        movimento('m2', 'A', '2025-05-10', { TFR: 50, Spesa: 3 }),
      ],
      estratti: [estratto('e1', 'A', '2025-12-31', 200)],
    })
    expect(riepilogoAnnuale(a)).toEqual([
      { anno: 2025, tfr: 5000, altri: 0, spese: 300, valore: 20000 },
      { anno: 2024, tfr: 10000, altri: 3500, spese: 0, valore: null },
    ])
  })

  it('un anno con soli estratti ha le somme a 0', () => {
    const a = archivio({ estratti: [estratto('e1', 'A', '2026-03-31', 80)] })
    expect(riepilogoAnnuale(a)).toEqual([{ anno: 2026, tfr: 0, altri: 0, spese: 0, valore: 8000 }])
  })

  describe('due fondi', () => {
    const a = archivio({
      movimenti: [
        movimento('a1', 'A', '2026-02-01', { TFR: 100 }),
        movimento('b1', 'B', '2025-02-01', { Personale: 40, Spesa: 2 }),
        movimento('b2', 'B', '2026-03-01', { Volontario: 60 }),
      ],
      estratti: [
        estratto('a1', 'A', '2026-06-30', 110),
        estratto('a2', 'A', '2026-12-31', 120),
        estratto('b1', 'B', '2026-09-30', 100),
      ],
    })

    it('somma tutti i fondi, con l’ultimo estratto di ognuno nell’anno', () => {
      expect(riepilogoAnnuale(a)).toEqual([
        { anno: 2026, tfr: 10000, altri: 6000, spese: 0, valore: 22000 },
        { anno: 2025, tfr: 0, altri: 4000, spese: 200, valore: null },
      ])
    })

    it('con fondoId vale solo quel fondo', () => {
      expect(riepilogoAnnuale(a, 'A')).toEqual([
        { anno: 2026, tfr: 10000, altri: 0, spese: 0, valore: 12000 },
      ])
    })
  })
})
