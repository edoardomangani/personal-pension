import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ErroreDati, MESSAGGI } from '@/data/errori'
import { eliminaFoto, salvaFoto } from '@/data/foto'
import { useSessioneStore } from '@/stores/sessione'
import { DATA_URL_DI_PROVA, fileDiProva, fingiFoto, ripristinaFoto } from '@/test/foto'
import { utenteDiProva } from '@/test/utenti'
import { useFotoProfilo } from './useFotoProfilo'

vi.mock('@/data/foto', () => ({
  leggiFoto: vi.fn(async () => null),
  salvaFoto: vi.fn(async () => {}),
  eliminaFoto: vi.fn(async () => {}),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useSessioneStore().utente = utenteDiProva()
})

afterEach(ripristinaFoto)

describe('useFotoProfilo — scelta (R26, R27)', () => {
  it('file troppo grande: avviso e nessuna decodifica', async () => {
    const finti = fingiFoto()
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva('enorme.jpg', 'image/jpeg', 5_242_881))
    expect(foto.avviso.value?.titolo).toBe('Foto troppo grande')
    expect(foto.stato.value).toBe('scelta')
    expect(finti.createImageBitmap).not.toHaveBeenCalled()
  })

  it('1200×800: ritaglio centrato su 256×256, JPEG 0,85, anteprima', async () => {
    const finti = fingiFoto({ larghezza: 1200, altezza: 800 })
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva())
    expect(finti.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      200,
      0,
      800,
      800,
      0,
      0,
      256,
      256,
    )
    expect(finti.toDataURL).toHaveBeenCalledTimes(1)
    expect(finti.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(finti.close).toHaveBeenCalled()
    expect(foto.stato.value).toBe('anteprima')
    expect(foto.nuova.value).toBe(DATA_URL_DI_PROVA)
    expect(foto.avviso.value).toBeNull()
  })

  it('oltre 200.000 caratteri a 0,85: seconda codifica a 0.7', async () => {
    const leggera = `data:image/jpeg;base64,${'B'.repeat(1000)}`
    const finti = fingiFoto({
      dataUrl: (qualita) =>
        qualita === 0.85 ? `data:image/jpeg;base64,${'A'.repeat(200_000)}` : leggera,
    })
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva())
    expect(finti.toDataURL).toHaveBeenNthCalledWith(2, 'image/jpeg', 0.7)
    expect(foto.nuova.value).toBe(leggera)
  })

  it('ancora troppo grande a 0,7: non riesco a leggerla', async () => {
    fingiFoto({ dataUrl: () => `data:image/jpeg;base64,${'A'.repeat(200_000)}` })
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva())
    expect(foto.avviso.value?.titolo).toBe('Non riesco a leggere questa foto')
    expect(foto.nuova.value).toBeNull()
  })

  it('decodifica che rifiuta: «Non riesco a leggere questa foto»', async () => {
    fingiFoto({ illeggibile: true })
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva('IMG_0001.HEIC', 'image/heic'))
    expect(foto.avviso.value).toEqual({
      titolo: 'Non riesco a leggere questa foto',
      testo: 'Prova con un JPG o un PNG.',
    })
    expect(foto.stato.value).toBe('scelta')
  })
})

describe('useFotoProfilo — salvataggio e rimozione', () => {
  it('usa(): salva la data URL ridotta e torna a scelta', async () => {
    fingiFoto()
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva())
    expect(await foto.usa()).toBe(true)
    expect(salvaFoto).toHaveBeenCalledWith(DATA_URL_DI_PROVA)
    expect(useSessioneStore().foto).toBe(DATA_URL_DI_PROVA)
    expect(foto.stato.value).toBe('scelta')
    expect(foto.nuova.value).toBeNull()
  })

  it('errore di rete: avviso, anteprima non persa', async () => {
    fingiFoto()
    vi.mocked(salvaFoto).mockRejectedValueOnce(new ErroreDati('rete', MESSAGGI.rete))
    const foto = useFotoProfilo()
    await foto.scegli(fileDiProva())
    expect(await foto.usa()).toBe(false)
    expect(foto.avviso.value?.testo).toBe(MESSAGGI.rete)
    expect(foto.stato.value).toBe('anteprima')
    expect(foto.nuova.value).toBe(DATA_URL_DI_PROVA)
  })

  it('rimuovi(): elimina e svuota la foto dello store', async () => {
    const sessione = useSessioneStore()
    sessione.foto = DATA_URL_DI_PROVA
    const foto = useFotoProfilo()
    expect(await foto.rimuovi()).toBe(true)
    expect(eliminaFoto).toHaveBeenCalled()
    expect(sessione.foto).toBeNull()
  })

  it('azzera() scarta una scelta ancora in decodifica', async () => {
    fingiFoto()
    const foto = useFotoProfilo()
    const scelta = foto.scegli(fileDiProva())
    foto.azzera()
    await scelta
    expect(foto.stato.value).toBe('scelta')
    expect(foto.nuova.value).toBeNull()
  })
})
