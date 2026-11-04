import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { elencaBuste } from '../data/buste'
import { ErroreDati } from '../data/errori'
import { elencaEstratti } from '../data/estratti'
import { elencaFondi } from '../data/fondi'
import { leggiImpostazioni } from '../data/impostazioni'
import { elencaMovimenti, salvaMovimento } from '../data/movimenti'
import { accedi, esci, sessioneCorrente } from '../data/sessione'
import { archivioDalSeed } from '../test/seed'
import { useArchivioStore } from './archivio'
import { useSessioneStore } from './sessione'

vi.mock('../data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
}))
vi.mock('../data/fondi', () => ({ elencaFondi: vi.fn() }))
vi.mock('../data/buste', () => ({ elencaBuste: vi.fn() }))
vi.mock('../data/movimenti', () => ({ elencaMovimenti: vi.fn(), salvaMovimento: vi.fn() }))
vi.mock('../data/estratti', () => ({ elencaEstratti: vi.fn() }))
vi.mock('../data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }))

const PRIMO = { id: 'u1', email: 'primo@esempio.it' }
const SECONDO = { id: 'u2', email: 'secondo@esempio.it' }
const SESSIONE_SCADUTA = new ErroreDati('sessione', 'La sessione è scaduta. Accedi di nuovo.')

function lettureDalSeed(): void {
  vi.mocked(elencaFondi).mockImplementation(async () => archivioDalSeed().fondi)
  vi.mocked(elencaBuste).mockImplementation(async () => archivioDalSeed().buste)
  vi.mocked(elencaMovimenti).mockImplementation(async () => archivioDalSeed().movimenti)
  vi.mocked(elencaEstratti).mockImplementation(async () => archivioDalSeed().estratti)
  vi.mocked(leggiImpostazioni).mockImplementation(async () => archivioDalSeed().impostazioni)
}

async function accessoConArchivio() {
  const sessione = useSessioneStore()
  const archivio = useArchivioStore()
  await sessione.accedi(PRIMO.email, 'segreta')
  await archivio.carica()
  return { sessione, archivio }
}

function eVuoto(archivio: ReturnType<typeof useArchivioStore>): boolean {
  return (
    archivio.stato === 'vuoto' &&
    archivio.fondi.length === 0 &&
    archivio.buste.length === 0 &&
    archivio.movimenti.length === 0 &&
    archivio.estratti.length === 0
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  lettureDalSeed()
  vi.mocked(accedi).mockResolvedValue(PRIMO)
  vi.mocked(esci).mockResolvedValue(undefined)
  vi.mocked(sessioneCorrente).mockResolvedValue(null)
})

describe('sessione (R8)', () => {
  it('esci() con archivio carico → archivio vuoto e utente null', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    expect(archivio.movimenti.length).toBeGreaterThan(0)
    await sessione.esci()
    expect(eVuoto(archivio)).toBe(true)
    expect(sessione.utente).toBeNull()
    expect(esci).toHaveBeenCalledOnce()
  })

  it('carica() che riceve sessione → esci() chiamato e store vuoti', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(elencaFondi).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await archivio.carica()
    expect(esci).toHaveBeenCalledOnce()
    expect(eVuoto(archivio)).toBe(true)
    expect(sessione.utente).toBeNull()
  })

  it('salvaMovimento che riceve sessione → esce, svuota e rifiuta con quell’errore', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(salvaMovimento).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await expect(
      archivio.salvaMovimento(
        {
          fondoId: 'Amundi Seconda Pensione',
          data: '2026-11-04',
          righe: [{ tipo: 'TFR', importo: 100 }],
          note: '',
        },
        [],
      ),
    ).rejects.toMatchObject({ tipo: 'sessione' })
    expect(esci).toHaveBeenCalledOnce()
    expect(eVuoto(archivio)).toBe(true)
    expect(sessione.utente).toBeNull()
  })

  it('signOut che fallisce → store comunque vuoti ed esci() risolve', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(esci).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    await expect(sessione.esci()).resolves.toBeUndefined()
    expect(eVuoto(archivio)).toBe(true)
    expect(sessione.utente).toBeNull()
  })

  it('accedi() con un secondo utente svuota l’archivio prima del nuovo carico', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(accedi).mockResolvedValueOnce(SECONDO)
    await sessione.accedi(SECONDO.email, 'altra')
    expect(sessione.utente).toEqual(SECONDO)
    expect(eVuoto(archivio)).toBe(true)
  })

  it('accedi() rifiuta con l’errore delle credenziali', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockRejectedValueOnce(
      new ErroreDati('sessione', 'Email o password non corretti.'),
    )
    await expect(sessione.accedi('a@b.it', 'x')).rejects.toMatchObject({ tipo: 'sessione' })
    expect(sessione.utente).toBeNull()
  })

  it('ripristina() senza sessione → utente null e pronto true', async () => {
    const sessione = useSessioneStore()
    await sessione.ripristina()
    expect(sessione.utente).toBeNull()
    expect(sessione.pronto).toBe(true)
  })

  it('ripristina() con sessione → utente; è idempotente', async () => {
    vi.mocked(sessioneCorrente).mockResolvedValue(PRIMO)
    const sessione = useSessioneStore()
    await Promise.all([sessione.ripristina(), sessione.ripristina()])
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessioneCorrente).toHaveBeenCalledOnce()
  })

  it('ripristina() con un errore → pronto true ed errore impostato', async () => {
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    const sessione = useSessioneStore()
    await sessione.ripristina()
    expect(sessione.pronto).toBe(true)
    expect(sessione.utente).toBeNull()
    expect(sessione.errore?.tipo).toBe('rete')
  })
})

describe('confini degli store', () => {
  it('nessun modulo di src/stores/ importa @neon/', () => {
    // Sorgenti come testo via Vite: in jsdom `import.meta.url` non è un file.
    const sorgenti = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    expect(Object.keys(sorgenti)).toContain('./archivio.ts')
    const colpevoli = Object.entries(sorgenti)
      .filter(([, testo]) => /(?:from\s+|import\s*\(\s*|import\s+)['"]@neon\//.test(testo))
      .map(([file]) => file)
    expect(colpevoli).toEqual([])
  })
})
