import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { elencaBuste } from '../data/buste'
import { ErroreDati } from '../data/errori'
import { elencaEstratti } from '../data/estratti'
import { elencaFondi } from '../data/fondi'
import { leggiImpostazioni } from '../data/impostazioni'
import { elencaMovimenti, salvaMovimento } from '../data/movimenti'
import {
  accedi,
  aggiornaNome,
  cambiaPassword,
  esci,
  registrati,
  sessioneCorrente,
  verificaCodice,
  verificaPassword,
} from '../data/sessione'
import { inSospeso } from '../test/promesse'
import { archivioDalSeed } from '../test/seed'
import { utenteDiProva } from '../test/utenti'
import { useArchivioStore } from './archivio'
import { useSessioneStore } from './sessione'

vi.mock('../data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
  registrati: vi.fn(),
  verificaCodice: vi.fn(),
  aggiornaNome: vi.fn(),
  cambiaPassword: vi.fn(),
  verificaPassword: vi.fn(),
}))
vi.mock('../data/fondi', () => ({ elencaFondi: vi.fn() }))
vi.mock('../data/buste', () => ({ elencaBuste: vi.fn() }))
vi.mock('../data/movimenti', () => ({ elencaMovimenti: vi.fn(), salvaMovimento: vi.fn() }))
vi.mock('../data/estratti', () => ({ elencaEstratti: vi.fn() }))
vi.mock('../data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }))

const PRIMO = utenteDiProva({ id: 'u1', email: 'primo@esempio.it' })
const SECONDO = utenteDiProva({ id: 'u2', email: 'secondo@esempio.it' })
const GIULIA = utenteDiProva({ id: 'u3', email: 'giulia.conti@esempio.it', nome: 'Giulia Conti' })
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

  it('C5 T1: salvaMovimento del primo utente che riceve sessione dopo il cambio di account non fa uscire il secondo', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    const rpc = inSospeso<string>()
    vi.mocked(salvaMovimento).mockReturnValueOnce(rpc.promessa)
    const scrittura = archivio.salvaMovimento(
      {
        fondoId: 'Amundi Seconda Pensione',
        data: '2026-11-04',
        righe: [{ tipo: 'TFR', importo: 100 }],
        note: '',
      },
      [],
    )
    vi.mocked(accedi).mockResolvedValueOnce(SECONDO)
    await sessione.accedi(SECONDO.email, 'altra')
    rpc.rifiuta(SESSIONE_SCADUTA)
    await expect(scrittura).rejects.toMatchObject({ tipo: 'sessione' })
    expect(esci).not.toHaveBeenCalled()
    expect(sessione.utente).toEqual(SECONDO)
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

  it('C5 T4: ripristina() dopo un errore riprova e imposta l’utente', async () => {
    vi.mocked(sessioneCorrente)
      .mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
      .mockResolvedValueOnce(PRIMO)
    const sessione = useSessioneStore()
    await sessione.ripristina()
    expect(sessione.errore?.tipo).toBe('rete')
    await sessione.ripristina()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.errore).toBeNull()
    expect(sessione.pronto).toBe(true)
    expect(sessioneCorrente).toHaveBeenCalledTimes(2)
  })

  it('C5 T5: due ripristina() concorrenti che falliscono condividono una chiamata e risolvono', async () => {
    const risposta = inSospeso<null>()
    vi.mocked(sessioneCorrente).mockReturnValueOnce(risposta.promessa)
    const sessione = useSessioneStore()
    const prima = sessione.ripristina()
    const seconda = sessione.ripristina()
    risposta.rifiuta(new ErroreDati('rete', 'Rete giù'))
    await expect(Promise.all([prima, seconda])).resolves.toEqual([undefined, undefined])
    expect(sessioneCorrente).toHaveBeenCalledOnce()
    await sessione.ripristina()
    expect(sessioneCorrente).toHaveBeenCalledTimes(2)
  })

  it('C5 T7: ripristina() riuscito senza sessione non richiama sessioneCorrente', async () => {
    const sessione = useSessioneStore()
    await sessione.ripristina()
    await sessione.ripristina()
    expect(sessione.utente).toBeNull()
    expect(sessioneCorrente).toHaveBeenCalledOnce()
  })
})

describe('account (R5, R6, R15)', () => {
  it('registrati non apre la sessione', async () => {
    const sessione = useSessioneStore()
    vi.mocked(registrati).mockResolvedValueOnce(undefined)
    await sessione.registrati({
      nome: ' Giulia Conti ',
      email: 'g@esempio.it',
      password: 'segreta123',
    })
    expect(registrati).toHaveBeenCalledWith({
      nome: 'Giulia Conti',
      email: 'g@esempio.it',
      password: 'segreta123',
    })
    expect(sessione.utente).toBeNull()
  })

  it('verificaCodice giusto → utente impostato e store svuotati', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(verificaCodice).mockResolvedValueOnce(GIULIA)
    await expect(sessione.verificaCodice(GIULIA.email, '123456')).resolves.toEqual(GIULIA)
    expect(verificaCodice).toHaveBeenCalledWith(GIULIA.email, '123456')
    expect(sessione.utente).toEqual(GIULIA)
    expect(sessione.pronto).toBe(true)
    expect(eVuoto(archivio)).toBe(true)
  })

  it('verificaCodice sbagliato → rifiuta, utente e archivio invariati', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(verificaCodice).mockRejectedValueOnce(
      new ErroreDati('vincolo', 'Il codice non è giusto o è scaduto.'),
    )
    await expect(sessione.verificaCodice(GIULIA.email, '000000')).rejects.toMatchObject({
      tipo: 'vincolo',
    })
    expect(sessione.utente).toEqual(PRIMO)
    expect(archivio.movimenti.length).toBeGreaterThan(0)
  })

  it('aggiornaNome aggiorna il nome in memoria senza rileggere la sessione', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(aggiornaNome).mockResolvedValueOnce(undefined)
    await sessione.aggiornaNome('  Giulia Conti ')
    expect(aggiornaNome).toHaveBeenCalledWith('Giulia Conti')
    expect(sessione.utente).toEqual({ ...PRIMO, nome: 'Giulia Conti' })
    expect(sessioneCorrente).not.toHaveBeenCalled()
  })

  it('aggiornaNome che fallisce lascia il nome di prima', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(aggiornaNome).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await expect(sessione.aggiornaNome('Giulia')).rejects.toBe(SESSIONE_SCADUTA)
    expect(sessione.utente).toEqual(PRIMO)
  })

  it('cambiaPassword passa al livello dati', async () => {
    const sessione = useSessioneStore()
    vi.mocked(cambiaPassword).mockResolvedValueOnce(undefined)
    await sessione.cambiaPassword('vecchia', 'nuova12345')
    expect(cambiaPassword).toHaveBeenCalledWith('vecchia', 'nuova12345')
  })

  it('conferma con password errata → «Password non corretta.»', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    await sessione.accedi(GIULIA.email, 'segreta')
    vi.mocked(verificaPassword).mockRejectedValueOnce(
      new ErroreDati('vincolo', 'Password non corretta.'),
    )
    await expect(sessione.confermaCancellazione('sbagliata', true)).rejects.toMatchObject({
      tipo: 'vincolo',
      messaggio: 'Password non corretta.',
    })
    expect(verificaPassword).toHaveBeenCalledWith(GIULIA.email, 'sbagliata')
  })

  it('conferma con password giusta → risolve', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    await sessione.accedi(GIULIA.email, 'segreta')
    vi.mocked(verificaPassword).mockResolvedValueOnce(undefined)
    await expect(sessione.confermaCancellazione('segreta', true)).resolves.toBeUndefined()
  })

  it('conferma Google con l’email scritta con spazi e maiuscole → risolve', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    await sessione.accedi(GIULIA.email, 'segreta')
    await expect(
      sessione.confermaCancellazione(' Giulia.Conti@Esempio.it ', false),
    ).resolves.toBeUndefined()
    expect(verificaPassword).not.toHaveBeenCalled()
  })

  it('conferma Google con un’altra email → rifiuta', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    await sessione.accedi(GIULIA.email, 'segreta')
    await expect(sessione.confermaCancellazione('altra@esempio.it', false)).rejects.toMatchObject({
      tipo: 'vincolo',
      messaggio: "L'email non è quella del tuo account.",
    })
  })

  it('conferma senza sessione → sessione scaduta', async () => {
    const sessione = useSessioneStore()
    await expect(sessione.confermaCancellazione('x', true)).rejects.toMatchObject({
      tipo: 'sessione',
    })
    expect(verificaPassword).not.toHaveBeenCalled()
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
