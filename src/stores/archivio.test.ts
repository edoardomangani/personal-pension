import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { elencaBuste, eliminaBusta, salvaBusta } from '../data/buste'
import { ErroreDati } from '../data/errori'
import { storicoDeducibilita } from '../calc/deducibilita'
import { crescita, ultimoValore } from '../calc/posizione'
import { proiezione } from '../calc/proiezione'
import { rendimentoAnnuo } from '../calc/xirr'
import { elencaEstratti, eliminaEstratto, salvaEstratto } from '../data/estratti'
import { elencaFondi, eliminaFondo, salvaFondo } from '../data/fondi'
import { leggiImpostazioni, salvaImpostazioni } from '../data/impostazioni'
import type { Bozza, BozzaBusta } from '../data/mappe'
import { elencaMovimenti, eliminaMovimento, salvaMovimento } from '../data/movimenti'
import { esci } from '../data/sessione'
import { inSospeso } from '../test/promesse'
import { archivioDalSeed } from '../test/seed'
import {
  IMPOSTAZIONI_PREDEFINITE,
  type EstrattoConto,
  type Fondo,
  type Movimento,
} from '../types/dominio'
import { useArchivioStore } from './archivio'
import { useSessioneStore } from './sessione'

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
// `esci()` della sessione chiama il logout remoto: niente rete nei test.
vi.mock('../data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
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

  it('con sessione scaduta esce una volta e non imposta errore', async () => {
    vi.mocked(elencaFondi).mockRejectedValueOnce(new ErroreDati('sessione', 'Sessione scaduta.'))
    const s = useArchivioStore()
    await expect(s.carica()).resolves.toBeUndefined()
    expect(esci).toHaveBeenCalledOnce()
    expect(s.errore).toBeNull()
    expect(s.stato).toBe('vuoto')
  })

  it('con sessione scaduta dopo un reset non esce', async () => {
    const fondi = inSospeso<ReturnType<typeof archivioDalSeed>['fondi']>()
    vi.mocked(elencaFondi).mockReturnValueOnce(fondi.promessa)
    const s = useArchivioStore()
    const carico = s.carica()
    s.reset()
    fondi.rifiuta(new ErroreDati('sessione', 'Sessione scaduta.'))
    await carico
    expect(esci).not.toHaveBeenCalled()
    expect(s.errore).toBeNull()
    expect(s.stato).toBe('vuoto')
    expect(s.fondi).toEqual([])
  })
})

type FondiFinti = ReturnType<typeof archivioDalSeed>['fondi']

const RETE = () => new ErroreDati('rete', 'Non riesco a raggiungere il server.')

describe('archivio: controllaFondo', () => {
  it('con fondi → true', async () => {
    const s = useArchivioStore()
    await expect(s.controllaFondo()).resolves.toBe(true)
    expect(s.haFondo).toBe(true)
  })

  it('senza fondi → false', async () => {
    vi.mocked(elencaFondi).mockResolvedValueOnce([])
    const s = useArchivioStore()
    await expect(s.controllaFondo()).resolves.toBe(false)
    expect(s.haFondo).toBe(false)
  })

  it('con un errore → null, senza uscire', async () => {
    vi.mocked(elencaFondi).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    const s = useArchivioStore()
    await expect(s.controllaFondo()).resolves.toBeNull()
    expect(s.haFondo).toBeNull()
    expect(esci).not.toHaveBeenCalled()
  })

  it('due richieste sovrapposte → una sola lettura; poi resta in memoria', async () => {
    const s = useArchivioStore()
    const [prima, seconda] = await Promise.all([s.controllaFondo(), s.controllaFondo()])
    expect([prima, seconda]).toEqual([true, true])
    await s.controllaFondo()
    expect(elencaFondi).toHaveBeenCalledOnce()
  })

  it('salvaFondo → haFondo true', async () => {
    vi.mocked(elencaFondi).mockResolvedValueOnce([])
    const s = useArchivioStore()
    await s.controllaFondo()
    vi.mocked(salvaFondo).mockResolvedValueOnce({ id: 'f1', nome: FONDO })
    await s.salvaFondo({ nome: FONDO })
    expect(s.haFondo).toBe(true)
  })

  it('reset → haFondo null', async () => {
    const s = useArchivioStore()
    await s.controllaFondo()
    s.reset()
    expect(s.haFondo).toBeNull()
  })
})

describe('archivio: carica concorrenti', () => {
  it('T1: la prima che risolve dopo la seconda non sovrascrive i dati', async () => {
    const estratti = inSospeso<EstrattoConto[]>()
    vi.mocked(elencaEstratti).mockReturnValueOnce(estratti.promessa)
    const s = useArchivioStore()
    const prima = s.carica()
    await s.carica()
    estratti.risolvi([])
    await expect(prima).resolves.toBeUndefined()
    expect(s.ultimoValore).toEqual({ data: '2026-11-03', valore: 164145 })
    expect(s.stato).toBe('pronto')
    expect(s.errore).toBeNull()
  })

  it('T3: la prima che fallisce dopo il successo della seconda non imposta errore', async () => {
    const fondi = inSospeso<FondiFinti>()
    vi.mocked(elencaFondi).mockReturnValueOnce(fondi.promessa)
    const s = useArchivioStore()
    const prima = s.carica()
    await s.carica()
    fondi.rifiuta(RETE())
    await prima
    expect(s.errore).toBeNull()
    expect(s.stato).toBe('pronto')
    expect(s.versato).toBe(159191)
  })

  it('T4: la prima che riesce con la seconda in volo non cambia memoria né stato', async () => {
    const primi = inSospeso<FondiFinti>()
    const secondi = inSospeso<FondiFinti>()
    vi.mocked(elencaFondi).mockReturnValueOnce(primi.promessa).mockReturnValueOnce(secondi.promessa)
    const s = useArchivioStore()
    const prima = s.carica()
    const seconda = s.carica()
    primi.risolvi(archivioDalSeed().fondi)
    await prima
    expect(s.stato).toBe('caricamento')
    expect(s.fondi).toEqual([])
    secondi.risolvi(archivioDalSeed().fondi)
    await seconda
    expect(s.stato).toBe('pronto')
    expect(s.fondi).toEqual(archivioDalSeed().fondi)
  })

  it('T5: la prima che fallisce con sessione non chiama esci()', async () => {
    const fondi = inSospeso<FondiFinti>()
    vi.mocked(elencaFondi).mockReturnValueOnce(fondi.promessa)
    const s = useArchivioStore()
    const prima = s.carica()
    await s.carica()
    fondi.rifiuta(new ErroreDati('sessione', 'Sessione scaduta.'))
    await prima
    expect(esci).not.toHaveBeenCalled()
    expect(s.stato).toBe('pronto')
    expect(s.versato).toBe(159191)
  })
})

describe('archivio: stato dopo errore di carica', () => {
  it('T2: la corrente che fallisce dopo il successo della prima resta pronto con errore', async () => {
    const s = useArchivioStore()
    await s.carica()
    const primi = inSospeso<FondiFinti>()
    const secondi = inSospeso<FondiFinti>()
    vi.mocked(elencaFondi).mockReturnValueOnce(primi.promessa).mockReturnValueOnce(secondi.promessa)
    const prima = s.carica()
    const seconda = s.carica()
    primi.risolvi(archivioDalSeed().fondi)
    await prima
    secondi.rifiuta(RETE())
    await seconda
    expect(s.stato).toBe('pronto')
    expect(s.errore?.tipo).toBe('rete')
    expect(s.versato).toBe(159191)
  })

  it('T6: due carichi falliti dallo store vuoto lasciano lo stato vuoto', async () => {
    vi.mocked(elencaFondi).mockRejectedValueOnce(RETE()).mockRejectedValueOnce(RETE())
    const s = useArchivioStore()
    const prima = s.carica()
    await s.carica()
    await prima
    expect(s.stato).toBe('vuoto')
    expect(s.errore?.tipo).toBe('rete')
  })

  it('T7: un piano caricato senza righe resta pronto dopo un errore', async () => {
    vi.mocked(elencaFondi).mockResolvedValueOnce([])
    vi.mocked(elencaBuste).mockResolvedValueOnce([])
    vi.mocked(elencaMovimenti).mockResolvedValueOnce([])
    vi.mocked(elencaEstratti).mockResolvedValueOnce([])
    vi.mocked(leggiImpostazioni).mockResolvedValueOnce({ ...IMPOSTAZIONI_PREDEFINITE })
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(elencaFondi).mockRejectedValueOnce(RETE())
    await s.carica()
    expect(s.stato).toBe('pronto')
    expect(s.errore?.tipo).toBe('rete')
  })

  it('T8: dopo un reset un carico fallito lascia lo stato vuoto', async () => {
    const s = useArchivioStore()
    await s.carica()
    s.reset()
    vi.mocked(elencaFondi).mockRejectedValueOnce(RETE())
    await s.carica()
    expect(s.stato).toBe('vuoto')
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

  it('C5 T2: salvaEstratto in volo che fallisce con rete dopo un reset rifiuta senza uscire', async () => {
    const s = useArchivioStore()
    await s.carica()
    const scaduta = vi.spyOn(useSessioneStore(), 'sessioneScaduta')
    const risposta = inSospeso<EstrattoConto>()
    vi.mocked(salvaEstratto).mockReturnValueOnce(risposta.promessa)
    const scrittura = s.salvaEstratto({ fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' })
    s.reset()
    risposta.rifiuta(RETE())
    await expect(scrittura).rejects.toMatchObject({ tipo: 'rete' })
    expect(scaduta).not.toHaveBeenCalled()
    expect(esci).not.toHaveBeenCalled()
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
    expect(s.errore).toBeNull()
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

  it('T9: carica() in volo non scarta salvaEstratto', async () => {
    const s = useArchivioStore()
    await s.carica()
    const risposta = inSospeso<EstrattoConto>()
    vi.mocked(salvaEstratto).mockReturnValueOnce(risposta.promessa)
    const scrittura = s.salvaEstratto({ fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' })
    const fondi = inSospeso<FondiFinti>()
    vi.mocked(elencaFondi).mockReturnValueOnce(fondi.promessa)
    void s.carica()
    risposta.risolvi({ id: 'e-nuovo', fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' })
    await scrittura
    expect(s.estratti.some((e) => e.id === 'e-nuovo')).toBe(true)
  })

  it('una scrittura che fallisce rifiuta con ErroreDati', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(salvaEstratto).mockRejectedValueOnce(new ErroreDati('vincolo', 'Valore non valido'))
    await expect(
      s.salvaEstratto({ fondoId: FONDO, data: '2026-11-04', valore: 1, note: '' }),
    ).rejects.toMatchObject({ tipo: 'vincolo', messaggio: 'Valore non valido' })
  })

  it('C5 T8: salvaFondo senza id aggiunge, con id sostituisce', async () => {
    const s = useArchivioStore()
    await s.carica()
    const quanti = s.fondi.length
    vi.mocked(salvaFondo).mockResolvedValueOnce({ id: 'f-nuovo', nome: 'Fondo nuovo' })
    await expect(s.salvaFondo({ nome: 'Fondo nuovo' })).resolves.toEqual({
      id: 'f-nuovo',
      nome: 'Fondo nuovo',
    })
    expect(s.fondi).toHaveLength(quanti + 1)
    expect(s.fondi.at(-1)?.id).toBe('f-nuovo')

    const delSeed: Fondo = { id: FONDO, nome: 'Nome cambiato' }
    vi.mocked(salvaFondo).mockResolvedValueOnce(delSeed)
    await expect(s.salvaFondo(delSeed)).resolves.toEqual(delSeed)
    expect(s.fondi).toHaveLength(quanti + 1)
    expect(s.fondi.find((f) => f.id === delSeed.id)?.nome).toBe('Nome cambiato')
  })

  it('C5 T9: eliminaFondo toglie quel fondo e lascia gli altri', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(salvaFondo).mockResolvedValueOnce({ id: 'f-nuovo', nome: 'Fondo nuovo' })
    await s.salvaFondo({ nome: 'Fondo nuovo' })
    const altri = s.fondi.filter((f) => f.id !== 'f-nuovo')
    vi.mocked(eliminaFondo).mockResolvedValueOnce(undefined)
    await s.eliminaFondo('f-nuovo')
    expect(eliminaFondo).toHaveBeenCalledWith('f-nuovo')
    expect(s.fondi).toEqual(altri)
  })

  it('C5 T10: eliminaEstratto toglie quell’estratto e lascia gli altri', async () => {
    const s = useArchivioStore()
    await s.carica()
    const quanti = s.estratti.length
    const id = 'val-2025-11-04'
    expect(s.estratti.some((e) => e.id === id)).toBe(true)
    vi.mocked(eliminaEstratto).mockResolvedValueOnce(undefined)
    await s.eliminaEstratto(id)
    expect(s.estratti).toHaveLength(quanti - 1)
    expect(s.estratti.some((e) => e.id === id)).toBe(false)
  })

  it('C5 T11: salvaImpostazioni tiene l’oggetto restituito, non quello passato', async () => {
    const s = useArchivioStore()
    await s.carica()
    const passate = { ...s.impostazioni, aliquota: 23 }
    const restituite = { ...passate, aliquota: 27 }
    vi.mocked(salvaImpostazioni).mockResolvedValueOnce(restituite)
    await expect(s.salvaImpostazioni(passate)).resolves.toEqual(restituite)
    expect(s.impostazioni).toEqual(restituite)
  })
})

describe('archivio: derivati', () => {
  it('C5 T12: sono le funzioni di src/calc/ sui dati e sulla data dello store', async () => {
    const s = useArchivioStore()
    await s.carica()
    expect(s.crescita).toEqual(crescita(s.archivio))
    expect(s.rendimento).toEqual(rendimentoAnnuo(s.archivio, s.oggi))
    expect(s.deducibilita).toEqual(storicoDeducibilita(s.archivio, s.oggi))
    expect(s.proiezione).toEqual(proiezione(s.archivio, s.oggi))
    expect(s.ultimoValore).toEqual({ data: '2026-11-03', valore: 164145 })
    expect(s.ultimoValore).toEqual(ultimoValore(s.archivio))
  })
})

const BOZZA_MOVIMENTO: Bozza<Movimento> = {
  fondoId: FONDO,
  data: '2026-11-04',
  righe: [{ tipo: 'TFR', importo: 100 }],
  note: '',
}

const BOZZA_BUSTA: BozzaBusta = {
  fondoId: FONDO,
  data: '2026-11-04',
  competenza: '2026-11',
  righe: [{ tipo: 'TFR', importo: 100 }],
  note: '',
}

describe('archivio: rilettura fallita', () => {
  it("T1: salvaMovimento riuscito con elencaBuste in errore risolve con l'id e imposta errore", async () => {
    const s = useArchivioStore()
    await s.carica()
    const bustePrima = s.buste
    const movimentiPrima = s.movimenti
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockRejectedValueOnce(RETE())
    await expect(s.salvaMovimento(BOZZA_MOVIMENTO, [])).resolves.toBe('m-nuovo')
    expect(salvaMovimento).toHaveBeenCalledOnce()
    expect(s.errore?.tipo).toBe('rete')
    expect(s.buste).toBe(bustePrima)
    expect(s.movimenti).toBe(movimentiPrima)
    expect(s.stato).toBe('pronto')
  })

  it("T2: salvaBusta riuscito con elencaMovimenti che lancia TypeError risolve con l'id", async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(salvaBusta).mockResolvedValueOnce('b-nuova')
    vi.mocked(elencaMovimenti).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(s.salvaBusta(BOZZA_BUSTA)).resolves.toBe('b-nuova')
    expect(salvaBusta).toHaveBeenCalledOnce()
    expect(s.errore?.tipo).toBe('rete')
  })

  it('T3: eliminaMovimento riuscito con elencaBuste in errore risolve', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(eliminaMovimento).mockResolvedValueOnce(undefined)
    vi.mocked(elencaBuste).mockRejectedValueOnce(RETE())
    await expect(s.eliminaMovimento('m-1')).resolves.toBeUndefined()
    expect(s.errore?.tipo).toBe('rete')
  })

  it('T4: eliminaBusta riuscito con elencaMovimenti in errore risolve', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(eliminaBusta).mockResolvedValueOnce(undefined)
    vi.mocked(elencaMovimenti).mockRejectedValueOnce(RETE())
    await expect(s.eliminaBusta('b-1')).resolves.toBeUndefined()
    expect(s.errore?.tipo).toBe('rete')
  })

  it('T7: una RPC che fallisce rifiuta e non rilegge', async () => {
    const s = useArchivioStore()
    await s.carica()
    vi.mocked(elencaBuste).mockClear()
    vi.mocked(elencaMovimenti).mockClear()
    vi.mocked(salvaMovimento).mockRejectedValueOnce(new ErroreDati('vincolo', 'Righe non valide'))
    await expect(s.salvaMovimento(BOZZA_MOVIMENTO, [])).rejects.toMatchObject({ tipo: 'vincolo' })
    expect(elencaBuste).not.toHaveBeenCalled()
    expect(elencaMovimenti).not.toHaveBeenCalled()
  })

  it('R7: rilettura riuscita non azzera errore', async () => {
    const s = useArchivioStore()
    await s.carica()
    // Un secondo carico fallito lascia i dati del seed e imposta errore.
    vi.mocked(elencaFondi).mockRejectedValueOnce(RETE())
    await s.carica()
    expect(s.errore?.tipo).toBe('rete')
    const errorePrima = s.errore
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockImplementationOnce(async () =>
      archivioDalSeed().buste.map((b) =>
        b.id === 'tfr-2026-04' ? { ...b, movimentoId: 'm-nuovo' } : b,
      ),
    )
    await s.salvaMovimento(BOZZA_MOVIMENTO, ['tfr-2026-04'])
    expect(s.buste.find((b) => b.id === 'tfr-2026-04')?.movimentoId).toBe('m-nuovo')
    expect(s.errore).toEqual(errorePrima)
  })
})

describe('archivio: rilettura e sessione', () => {
  it("T5: sessione scaduta nella rilettura esce una volta e risolve con l'id", async () => {
    const s = useArchivioStore()
    await s.carica()
    const scaduta = vi.spyOn(useSessioneStore(), 'sessioneScaduta')
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockRejectedValueOnce(new ErroreDati('sessione', 'Sessione scaduta.'))
    await expect(s.salvaMovimento(BOZZA_MOVIMENTO, [])).resolves.toBe('m-nuovo')
    expect(scaduta).toHaveBeenCalledOnce()
    expect(s.errore).toBeNull()
    expect(s.movimenti).toEqual([])
  })

  it('T6: un reset con la rilettura in volo, poi fallita, non imposta errore', async () => {
    const s = useArchivioStore()
    await s.carica()
    const buste = inSospeso<ReturnType<typeof archivioDalSeed>['buste']>()
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockReturnValueOnce(buste.promessa)
    const scrittura = s.salvaMovimento(BOZZA_MOVIMENTO, [])
    // La rilettura parte dopo la RPC: si attende che elencaBuste sia stata chiamata.
    await vi.waitFor(() => expect(elencaBuste).toHaveBeenCalledTimes(2))
    s.reset()
    buste.rifiuta(RETE())
    await expect(scrittura).resolves.toBe('m-nuovo')
    expect(s.errore).toBeNull()
    expect(s.buste).toEqual([])
    expect(s.movimenti).toEqual([])
  })

  it('T7: un reset con la rilettura in volo, poi fallita con sessione, non esce', async () => {
    const s = useArchivioStore()
    await s.carica()
    const scaduta = vi.spyOn(useSessioneStore(), 'sessioneScaduta')
    const buste = inSospeso<ReturnType<typeof archivioDalSeed>['buste']>()
    vi.mocked(salvaMovimento).mockResolvedValueOnce('m-nuovo')
    vi.mocked(elencaBuste).mockReturnValueOnce(buste.promessa)
    const scrittura = s.salvaMovimento(BOZZA_MOVIMENTO, [])
    await vi.waitFor(() => expect(elencaBuste).toHaveBeenCalledTimes(2))
    s.reset()
    buste.rifiuta(new ErroreDati('sessione', 'Sessione scaduta.'))
    await expect(scrittura).resolves.toBe('m-nuovo')
    expect(scaduta).not.toHaveBeenCalled()
    expect(s.errore).toBeNull()
    expect(s.buste).toEqual([])
    expect(s.movimenti).toEqual([])
  })
})
