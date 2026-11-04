import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { elencaBuste } from '../data/buste'
import { ErroreDati } from '../data/errori'
import { elencaEstratti, salvaEstratto } from '../data/estratti'
import { elencaFondi } from '../data/fondi'
import { leggiImpostazioni } from '../data/impostazioni'
import { elencaMovimenti, salvaMovimento } from '../data/movimenti'
import { archivioDalSeed } from '../test/seed'
import { IMPOSTAZIONI_PREDEFINITE, type EstrattoConto } from '../types/dominio'
import { useArchivioStore } from './archivio'

const FONDO = 'Amundi Seconda Pensione'

vi.mock('../data/fondi', () => ({
  elencaFondi: vi.fn(),
  salvaFondo: vi.fn(),
  eliminaFondo: vi.fn(),
}))
vi.mock('../data/buste', () => ({
  elencaBuste: vi.fn(),
  salvaBusta: vi.fn(),
  eliminaBusta: vi.fn(),
}))
vi.mock('../data/movimenti', () => ({
  elencaMovimenti: vi.fn(),
  salvaMovimento: vi.fn(),
  eliminaMovimento: vi.fn(),
}))
vi.mock('../data/estratti', () => ({
  elencaEstratti: vi.fn(),
  salvaEstratto: vi.fn(),
  eliminaEstratto: vi.fn(),
}))
vi.mock('../data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
}))

/** Le letture finte rispondono con il seed, con oggetti nuovi a ogni chiamata. */
function lettureDalSeed(): void {
  vi.mocked(elencaFondi).mockImplementation(async () => archivioDalSeed().fondi)
  vi.mocked(elencaBuste).mockImplementation(async () => archivioDalSeed().buste)
  vi.mocked(elencaMovimenti).mockImplementation(async () => archivioDalSeed().movimenti)
  vi.mocked(elencaEstratti).mockImplementation(async () => archivioDalSeed().estratti)
  vi.mocked(leggiImpostazioni).mockImplementation(async () => archivioDalSeed().impostazioni)
}

/** Una promessa che si risolve quando lo decide il test. */
function inSospeso<T>() {
  let risolvi: (valore: T) => void = () => {}
  const promessa = new Promise<T>((r) => (risolvi = r))
  return { promessa, risolvi: (valore: T) => risolvi(valore) }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 4, 12))
  vi.clearAllMocks()
  lettureDalSeed()
})

afterEach(() => vi.useRealTimers())

describe('archivio: carica', () => {
  it('con i dati del seed calcola da versare e versato (R9)', async () => {
    const s = useArchivioStore()
    await s.carica()
    expect(s.stato).toBe('pronto')
    expect(s.oggi).toBe('2026-11-04')
    expect(s.daVersare.totale).toBe(106724)
    expect(s.versato).toBe(159191)
    expect(s.ultimoValore).toEqual({ data: '2026-11-03', valore: 164145 })
  })

  it('un errore di rete lascia i dati di prima e imposta errore', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(elencaMovimenti).mockRejectedValueOnce(
      new ErroreDati('rete', 'Non riesco a raggiungere il server.'),
    )
    await expect(s.carica()).resolves.toBeUndefined()
    expect(s.errore?.tipo).toBe('rete')
    expect(s.stato).toBe('pronto')
    expect(s.versato).toBe(159191)
  })

  it('un errore al primo carico lascia lo store vuoto', async () => {
    vi.mocked(elencaFondi).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const s = useArchivioStore()
    await s.carica()
    expect(s.stato).toBe('vuoto')
    expect(s.errore?.tipo).toBe('rete')
  })
})

describe('archivio: reset', () => {
  it('riporta archivio vuoto, impostazioni di default e stato vuoto', async () => {
    const s = useArchivioStore()
    await s.carica()
    s.reset()
    expect(s.archivio).toEqual({
      fondi: [],
      buste: [],
      movimenti: [],
      estratti: [],
      impostazioni: IMPOSTAZIONI_PREDEFINITE,
    })
    expect(s.impostazioni).not.toBe(IMPOSTAZIONI_PREDEFINITE)
    expect(s.stato).toBe('vuoto')
    expect(s.errore).toBeNull()
  })

  it('i derivati sullo store vuoto non lanciano', () => {
    const s = useArchivioStore()
    s.reset()
    expect(s.versato).toBe(0)
    expect(s.daVersare.totale).toBe(0)
    expect(s.crescita).toBeNull()
    expect(s.ultimoValore).toBeNull()
    expect(s.rendimento.valore).toBeNull()
    expect(s.deducibilita).toHaveLength(1)
    expect(s.proiezione.motivo).toBe('manca-nascita')
  })

  it('le impostazioni dopo il reset si possono modificare', () => {
    const s = useArchivioStore()
    s.reset()
    s.impostazioni.aliquota = 23
    expect(s.impostazioni.aliquota).toBe(23)
  })

  it('un reset mentre carica() è in volo lascia lo store vuoto', async () => {
    const fondi = inSospeso<ReturnType<typeof archivioDalSeed>['fondi']>()
    vi.mocked(elencaFondi).mockReturnValueOnce(fondi.promessa)
    const s = useArchivioStore()
    const carico = s.carica()
    s.reset()
    fondi.risolvi(archivioDalSeed().fondi)
    await carico
    expect(s.stato).toBe('vuoto')
    expect(s.fondi).toEqual([])
    expect(s.movimenti).toEqual([])
  })

  it('un reset mentre salvaMovimento è in volo lascia buste e movimenti vuoti', async () => {
    const s = useArchivioStore()
    await s.carica()
    const rpc = inSospeso<string>()
    vi.mocked(salvaMovimento).mockReturnValueOnce(rpc.promessa)
    const scrittura = s.salvaMovimento(
      { fondoId: FONDO, data: '2026-11-04', righe: [{ tipo: 'TFR', importo: 100 }], note: '' },
      [],
    )
    s.reset()
    rpc.risolvi('m-nuovo')
    await expect(scrittura).resolves.toBe('m-nuovo')
    expect(s.buste).toEqual([])
    expect(s.movimenti).toEqual([])
  })

  it('un reset mentre salvaEstratto è in volo lascia gli estratti vuoti', async () => {
    const s = useArchivioStore()
    await s.carica()
    const risposta = inSospeso<EstrattoConto>()
    vi.mocked(salvaEstratto).mockReturnValueOnce(risposta.promessa)
    const scrittura = s.salvaEstratto({ fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' })
    s.reset()
    risposta.risolvi({ id: 'e-nuovo', fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' })
    await scrittura
    expect(s.estratti).toEqual([])
  })
})

describe('archivio: scritture', () => {
  it('salvaMovimento rilegge buste e movimenti', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(elencaBuste).mockClear()
    vi.mocked(elencaMovimenti).mockClear()
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockImplementationOnce(async () =>
      archivioDalSeed().buste.map((b) =>
        b.id === 'tfr-2026-04' ? { ...b, movimentoId: 'm-nuovo' } : b,
      ),
    )
    await s.salvaMovimento(
      { fondoId: FONDO, data: '2026-11-04', righe: [{ tipo: 'TFR', importo: 100 }], note: '' },
      ['tfr-2026-04'],
    )
    expect(elencaBuste).toHaveBeenCalledOnce()
    expect(elencaMovimenti).toHaveBeenCalledOnce()
    expect(s.buste.find((b) => b.id === 'tfr-2026-04')?.movimentoId).toBe('m-nuovo')
  })

  it('salvaEstratto con id sostituisce, senza id aggiunge', async () => {
    const s = useArchivioStore()
    await s.carica()
    const quanti = s.estratti.length
    const primo: EstrattoConto = {
      id: 'val-2025-11-04',
      fondoId: FONDO,
      data: '2025-11-04',
      valore: 999,
      note: '',
    }

    vi.mocked(salvaEstratto).mockResolvedValueOnce(primo)
    await s.salvaEstratto(primo)
    expect(s.estratti).toHaveLength(quanti)
    expect(s.estratti.find((e) => e.id === primo.id)?.valore).toBe(999)

    const nuovo = { fondoId: FONDO, data: '2026-12-01', valore: 170000, note: '' }
    vi.mocked(salvaEstratto).mockResolvedValueOnce({ ...nuovo, id: 'e-nuovo' })
    await s.salvaEstratto(nuovo)
    expect(s.estratti).toHaveLength(quanti + 1)
    expect(s.estratti.at(-1)?.id).toBe('e-nuovo')
  })

  it('una scrittura che fallisce rifiuta con ErroreDati', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(salvaEstratto).mockRejectedValueOnce(new ErroreDati('vincolo', 'Valore non valido'))
    await expect(
      s.salvaEstratto({ fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' }),
    ).rejects.toMatchObject({ tipo: 'vincolo', messaggio: 'Valore non valido' })
  })
})
