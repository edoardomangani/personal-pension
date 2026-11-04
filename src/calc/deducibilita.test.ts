import { describe, expect, it } from 'vitest'
import { archivio, busta, movimento } from '../test/archivi'
import { archivioDalSeed } from '../test/seed'
import { deducibilitaAnno, storicoDeducibilita } from './deducibilita'

describe('deducibilitaAnno', () => {
  const casoTabella = archivio({
    buste: [busta('b1', 'A', '2025-12-16', { Datore: 100, Personale: 50 }, 'm1')],
    movimenti: [
      movimento('m1', 'A', '2026-02-03', { TFR: 300, Datore: 100, Personale: 50 }),
      movimento('m2', 'A', '2026-03-01', { Volontario: 200 }),
    ],
  })

  it('conta le buste per data e i movimenti solo per il Volontario', () => {
    expect(deducibilitaAnno(casoTabella, 2025).deducibile).toBe(15000)
    expect(deducibilitaAnno(casoTabella, 2026).deducibile).toBe(20000)
  })

  it('sopra il limite: residuo 0 e risparmio sul limite', () => {
    const a = archivio({ buste: [busta('b1', 'A', '2026-01-16', { Personale: 6000 })] })
    expect(deducibilitaAnno(a, 2026)).toEqual({
      anno: 2026,
      deducibile: 600000,
      limite: 516457,
      residuo: 0,
      risparmio: 180760,
    })
  })

  it('sotto il limite: residuo positivo', () => {
    const a = archivio({ buste: [busta('b1', 'A', '2026-01-16', { Datore: 1000 })] })
    expect(deducibilitaAnno(a, 2026)).toMatchObject({
      deducibile: 100000,
      residuo: 416457,
      risparmio: 35000,
    })
  })

  it('la riga TFR della busta non conta', () => {
    const a = archivio({ buste: [busta('b1', 'A', '2026-01-16', { TFR: 200, Personale: 30 })] })
    expect(deducibilitaAnno(a, 2026).deducibile).toBe(3000)
  })

  it('somma tutti i fondi', () => {
    const a = archivio({
      buste: [busta('a1', 'A', '2026-01-16', { Datore: 40 })],
      movimenti: [movimento('b1', 'B', '2026-04-01', { Volontario: 60 })],
    })
    expect(deducibilitaAnno(a, 2026).deducibile).toBe(10000)
  })

  it('sul seed, 2026', () => {
    expect(deducibilitaAnno(archivioDalSeed(), 2026)).toMatchObject({ deducibile: 0, risparmio: 0 })
  })
})

describe('storicoDeducibilita', () => {
  it('sul seed contiene solo l’anno di oggi', () => {
    const storico = storicoDeducibilita(archivioDalSeed(), '2026-11-04')
    expect(storico.map((d) => d.anno)).toEqual([2026])
  })

  it('anni con contributi più l’anno di oggi, dal più recente', () => {
    const a = archivio({
      buste: [busta('b1', 'A', '2024-12-16', { Datore: 10 })],
      movimenti: [movimento('m1', 'A', '2025-03-01', { Volontario: 20, TFR: 5 })],
    })
    expect(storicoDeducibilita(a, '2026-11-04').map((d) => [d.anno, d.deducibile])).toEqual([
      [2026, 0],
      [2025, 2000],
      [2024, 1000],
    ])
  })
})
