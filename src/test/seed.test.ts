import { describe, expect, it } from 'vitest'
import { sommaCentesimi } from '../calc/importi'
import { archivioDalSeed } from './seed'

describe('archivioDalSeed', () => {
  const archivio = archivioDalSeed()

  it('ha i conteggi del seed', () => {
    expect(archivio.fondi).toEqual([
      { id: 'Amundi Seconda Pensione', nome: 'Amundi Seconda Pensione' },
    ])
    expect(archivio.buste).toHaveLength(14)
    expect(archivio.movimenti).toHaveLength(4)
    expect(archivio.estratti).toHaveLength(4)
  })

  it('collega 8 buste a movimenti TFR esistenti', () => {
    const collegate = archivio.buste.filter((b) => b.movimentoId !== null)
    expect(collegate).toHaveLength(8)
    for (const busta of collegate) {
      const movimento = archivio.movimenti.find((m) => m.id === busta.movimentoId)
      expect(movimento?.righe.map((r) => r.tipo)).toEqual(['TFR'])
    }
  })

  it('riferisce ogni record al fondo', () => {
    const record = [...archivio.buste, ...archivio.movimenti, ...archivio.estratti]
    expect(record.every((r) => r.fondoId === 'Amundi Seconda Pensione')).toBe(true)
  })

  it('converte gli importi nei totali del handoff', () => {
    const righeBuste = archivio.buste.flatMap((b) => b.righe)
    expect(righeBuste.every((r) => r.tipo === 'TFR')).toBe(true)
    expect(sommaCentesimi(righeBuste.map((r) => r.importo))).toBe(265915)

    const righeMovimenti = archivio.movimenti.flatMap((m) => m.righe)
    const versato = righeMovimenti.filter((r) => r.tipo !== 'Spesa').map((r) => r.importo)
    const spese = righeMovimenti.filter((r) => r.tipo === 'Spesa').map((r) => r.importo)
    expect(sommaCentesimi(versato)).toBe(159191)
    expect(sommaCentesimi(spese)).toBe(1500)

    expect(archivio.estratti.find((e) => e.data === '2026-11-03')?.valore).toBe(164145)
  })

  it('tutti gli importi sono interi', () => {
    const importi = [
      ...archivio.buste.flatMap((b) => b.righe.map((r) => r.importo)),
      ...archivio.movimenti.flatMap((m) => m.righe.map((r) => r.importo)),
      ...archivio.estratti.map((e) => e.valore),
      archivio.impostazioni.limiteDeducibile,
    ]
    expect(importi.every(Number.isInteger)).toBe(true)
  })

  it('parte dai default e prende le impostazioni del seed', () => {
    expect(archivio.impostazioni).toEqual({
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

  it('restituisce un archivio nuovo a ogni chiamata', () => {
    const altro = archivioDalSeed()
    expect(altro).toEqual(archivio)
    expect(altro.buste[0]).not.toBe(archivio.buste[0])
  })
})
