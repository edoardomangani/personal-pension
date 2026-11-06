import { describe, expect, it } from 'vitest'
import { ritaglioCentrato, validaFileFoto } from './foto'

const file = (tipo: string, dimensione = 1000, nome = 'foto.jpg') => ({ tipo, dimensione, nome })

describe('validaFileFoto (R26)', () => {
  it('accetta 5 MB esatti e rifiuta un byte in più', () => {
    expect(validaFileFoto(file('image/jpeg', 5_242_880))).toBeNull()
    expect(validaFileFoto(file('image/jpeg', 5_242_881))).toEqual({
      titolo: 'Foto troppo grande',
      testo: 'Scegline una sotto i 5 MB.',
    })
  })

  it('rifiuta un formato diverso', () => {
    expect(validaFileFoto(file('image/gif', 1000, 'animata.gif'))).toEqual({
      titolo: 'Formato non supportato',
      testo: 'Scegli un JPG, un PNG o una foto HEIC.',
    })
  })

  it.each(['image/jpeg', 'image/png', 'image/heic', 'image/heif'])('accetta %s', (tipo) => {
    expect(validaFileFoto(file(tipo))).toBeNull()
  })

  it('con il tipo vuoto guarda l’estensione', () => {
    expect(validaFileFoto(file('', 1000, 'IMG_0001.HEIC'))).toBeNull()
    expect(validaFileFoto(file('', 1000, 'scatto.heif'))).toBeNull()
    expect(validaFileFoto(file('', 1000, 'documento.pdf'))?.titolo).toBe('Formato non supportato')
  })
})

describe('ritaglioCentrato (R27)', () => {
  it('orizzontale: taglia i lati', () => {
    expect(ritaglioCentrato(1200, 800)).toEqual({ x: 200, y: 0, lato: 800 })
  })

  it('verticale: taglia sopra e sotto', () => {
    expect(ritaglioCentrato(600, 1000)).toEqual({ x: 0, y: 200, lato: 600 })
  })

  it('quadrata: intera', () => {
    expect(ritaglioCentrato(500, 500)).toEqual({ x: 0, y: 0, lato: 500 })
  })
})
