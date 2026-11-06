import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancellaAccount } from '../data/account'
import { elencaBuste } from '../data/buste'
import { ErroreDati } from '../data/errori'
import { elencaEstratti } from '../data/estratti'
import { elencaFondi } from '../data/fondi'
import { eliminaFoto, leggiFoto, salvaFoto } from '../data/foto'
import { leggiImpostazioni } from '../data/impostazioni'
import { elencaMovimenti, salvaMovimento } from '../data/movimenti'
import {
  accedi,
  accediConGoogle,
  aggiornaNome,
  cambiaPassword,
  esci,
  metodiDiAccesso,
  registrati,
  reimpostaPassword,
  reinviaCodice,
  richiediReset,
  sessioneCorrente,
  verificaCodice,
  verificaPassword,
} from '../data/sessione'
import { CHIAVE_ULTIMO_UTENTE, leggiUltimoUtente, salvaUltimoUtente } from '../data/ultimoUtente'
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
  metodiDiAccesso: vi.fn(),
  reinviaCodice: vi.fn(),
  accediConGoogle: vi.fn(),
  richiediReset: vi.fn(),
  reimpostaPassword: vi.fn(),
}))
vi.mock('../data/foto', () => ({ leggiFoto: vi.fn(), salvaFoto: vi.fn(), eliminaFoto: vi.fn() }))
vi.mock('../data/account', () => ({ cancellaAccount: vi.fn() }))
vi.mock('../data/fondi', () => ({ elencaFondi: vi.fn() }))
vi.mock('../data/buste', () => ({ elencaBuste: vi.fn() }))
vi.mock('../data/movimenti', () => ({ elencaMovimenti: vi.fn(), salvaMovimento: vi.fn() }))
vi.mock('../data/estratti', () => ({ elencaEstratti: vi.fn() }))
vi.mock('../data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }))

const PRIMO = utenteDiProva({ id: 'u1', email: 'primo@esempio.it' })
const SECONDO = utenteDiProva({ id: 'u2', email: 'secondo@esempio.it' })
const GIULIA = utenteDiProva({ id: 'u3', email: 'giulia.conti@esempio.it', nome: 'Giulia Conti' })
const SESSIONE_SCADUTA = new ErroreDati('sessione', 'La sessione è scaduta. Accedi di nuovo.')
const FOTO = 'data:image/jpeg;base64,AAAA'
const ENTRAMBI = { password: true, google: true }

/** Lascia arrivare le letture di foto e metodi partite senza await. */
const lettureFinite = () => new Promise<void>((risolvi) => setTimeout(risolvi, 0))

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
  vi.mocked(leggiFoto).mockResolvedValue(null)
  vi.mocked(metodiDiAccesso).mockResolvedValue(ENTRAMBI)
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

  it('T10: ripristina() con un errore di rete senza ultimo noto → utente null, errore impostato', async () => {
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
    const rete = new ErroreDati('rete', 'Rete giù')
    vi.mocked(aggiornaNome).mockRejectedValueOnce(rete)
    await expect(sessione.aggiornaNome('Giulia')).rejects.toBe(rete)
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.motivoUscita).toBeNull()
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
      messaggio: 'L’email non è quella del tuo account.',
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

describe('foto, metodi e cancellazione (R5, R6)', () => {
  it('accedi → foto e metodi caricati una volta ciascuno', async () => {
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    await lettureFinite()
    expect(sessione.foto).toBe(FOTO)
    expect(sessione.metodi).toEqual(ENTRAMBI)
    expect(leggiFoto).toHaveBeenCalledOnce()
    expect(metodiDiAccesso).toHaveBeenCalledOnce()
  })

  it('ripristina e verificaCodice riusciti caricano foto e metodi', async () => {
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(PRIMO)
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const sessione = useSessioneStore()
    await sessione.ripristina()
    await lettureFinite()
    expect(sessione.foto).toBe(FOTO)
    vi.mocked(verificaCodice).mockResolvedValueOnce(GIULIA)
    await sessione.verificaCodice(GIULIA.email, '123456')
    expect(sessione.foto).toBeNull()
    await lettureFinite()
    expect(sessione.metodi).toEqual(ENTRAMBI)
    expect(leggiFoto).toHaveBeenCalledTimes(2)
  })

  it('esci() dopo utente, foto, metodi e archivio → tutto null o vuoto', async () => {
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const { sessione, archivio } = await accessoConArchivio()
    await lettureFinite()
    expect(sessione.foto).toBe(FOTO)
    expect(leggiUltimoUtente()).toEqual(PRIMO)
    await sessione.esci()
    expect(sessione.utente).toBeNull()
    expect(sessione.foto).toBeNull()
    expect(sessione.metodi).toBeNull()
    expect(eVuoto(archivio)).toBe(true)
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  it('lettura che arriva dopo esci() → ignorata', async () => {
    const lettura = inSospeso<string | null>()
    const conti = inSospeso<{ password: boolean; google: boolean }>()
    vi.mocked(leggiFoto).mockReturnValueOnce(lettura.promessa)
    vi.mocked(metodiDiAccesso).mockReturnValueOnce(conti.promessa)
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    await sessione.esci()
    lettura.risolvi(FOTO)
    conti.risolvi(ENTRAMBI)
    await lettureFinite()
    expect(sessione.foto).toBeNull()
    expect(sessione.metodi).toBeNull()
  })

  it('lettura del primo utente che arriva dopo il cambio di account → ignorata', async () => {
    const lettura = inSospeso<string | null>()
    vi.mocked(leggiFoto).mockReturnValueOnce(lettura.promessa).mockResolvedValueOnce(null)
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(accedi).mockResolvedValueOnce(SECONDO)
    await sessione.accedi(SECONDO.email, 'altra')
    lettura.risolvi(FOTO)
    await lettureFinite()
    expect(sessione.utente).toEqual(SECONDO)
    expect(sessione.foto).toBeNull()
  })

  it('errore di lettura → foto e metodi null, accesso riuscito', async () => {
    vi.mocked(leggiFoto).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    vi.mocked(metodiDiAccesso).mockRejectedValueOnce(new ErroreDati('altro', 'Errore'))
    const sessione = useSessioneStore()
    await expect(sessione.accedi(PRIMO.email, 'segreta')).resolves.toEqual(PRIMO)
    await lettureFinite()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.foto).toBeNull()
    expect(sessione.metodi).toBeNull()
  })

  it('salvaFoto e rimuoviFoto aggiornano la foto senza rileggerla', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    await lettureFinite()
    vi.mocked(salvaFoto).mockResolvedValueOnce(undefined)
    await sessione.salvaFoto(FOTO)
    expect(salvaFoto).toHaveBeenCalledWith(FOTO)
    expect(sessione.foto).toBe(FOTO)
    vi.mocked(eliminaFoto).mockResolvedValueOnce(undefined)
    await sessione.rimuoviFoto()
    expect(sessione.foto).toBeNull()
    expect(leggiFoto).toHaveBeenCalledOnce()
  })

  it('salvaFoto che fallisce lascia la foto di prima', async () => {
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    await lettureFinite()
    vi.mocked(salvaFoto).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    await expect(sessione.salvaFoto('data:image/jpeg;base64,BBBB')).rejects.toMatchObject({
      tipo: 'rete',
    })
    expect(sessione.foto).toBe(FOTO)
  })

  it('cancellaAccount con password errata → «Password non corretta.», RPC non chiamata', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    await sessione.accedi(GIULIA.email, 'segreta')
    vi.mocked(verificaPassword).mockRejectedValueOnce(
      new ErroreDati('vincolo', 'Password non corretta.'),
    )
    await expect(sessione.cancellaAccount('sbagliata', true)).rejects.toMatchObject({
      messaggio: 'Password non corretta.',
    })
    expect(cancellaAccount).not.toHaveBeenCalled()
    expect(sessione.utente).toEqual(GIULIA)
  })

  it('cancellaAccount Google con spazi e maiuscole → RPC chiamata, poi esci e store vuoti', async () => {
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const sessione = useSessioneStore()
    const archivio = useArchivioStore()
    await sessione.accedi(GIULIA.email, 'segreta')
    await archivio.carica()
    await lettureFinite()
    vi.mocked(cancellaAccount).mockResolvedValueOnce(undefined)
    await sessione.cancellaAccount(' Giulia.Conti@Esempio.it ', false)
    expect(cancellaAccount).toHaveBeenCalledOnce()
    expect(esci).toHaveBeenCalledOnce()
    expect(sessione.utente).toBeNull()
    expect(sessione.foto).toBeNull()
    expect(sessione.metodi).toBeNull()
    expect(eVuoto(archivio)).toBe(true)
  })

  it('cancellaAccount con signOut remoto che fallisce → risolve comunque, fuori', async () => {
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    const sessione = useSessioneStore()
    await sessione.accedi(GIULIA.email, 'segreta')
    vi.mocked(cancellaAccount).mockResolvedValueOnce(undefined)
    vi.mocked(esci).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await expect(sessione.cancellaAccount(GIULIA.email, false)).resolves.toBeUndefined()
    expect(sessione.utente).toBeNull()
  })

  it('RPC che rifiuta → rifiuta con lo stesso errore e l’utente resta dentro', async () => {
    vi.mocked(accedi).mockResolvedValueOnce(GIULIA)
    const sessione = useSessioneStore()
    await sessione.accedi(GIULIA.email, 'segreta')
    const rete = new ErroreDati('rete', 'Rete giù')
    vi.mocked(cancellaAccount).mockRejectedValueOnce(rete)
    await expect(sessione.cancellaAccount(GIULIA.email, false)).rejects.toBe(rete)
    expect(esci).not.toHaveBeenCalled()
    expect(sessione.utente).toEqual(GIULIA)
  })
})

describe('passaggi diretti al livello dati', () => {
  const casi = [
    {
      nome: 'reinviaCodice',
      finta: reinviaCodice,
      chiama: (s: ReturnType<typeof useSessioneStore>) => s.reinviaCodice('g@esempio.it'),
      argomenti: ['g@esempio.it'],
    },
    {
      nome: 'accediConGoogle',
      finta: accediConGoogle,
      chiama: (s: ReturnType<typeof useSessioneStore>) =>
        s.accediConGoogle('https://app.it/#/', 'https://app.it/#/accedi'),
      argomenti: ['https://app.it/#/', 'https://app.it/#/accedi'],
    },
    {
      nome: 'richiediReset',
      finta: richiediReset,
      chiama: (s: ReturnType<typeof useSessioneStore>) =>
        s.richiediReset('g@esempio.it', 'https://app.it/#/nuova-password'),
      argomenti: ['g@esempio.it', 'https://app.it/#/nuova-password'],
    },
    {
      nome: 'reimpostaPassword',
      finta: reimpostaPassword,
      chiama: (s: ReturnType<typeof useSessioneStore>) => s.reimpostaPassword('tok', 'nuova12345'),
      argomenti: ['tok', 'nuova12345'],
    },
  ]

  for (const caso of casi) {
    it(`${caso.nome} chiama il livello dati con gli stessi argomenti`, async () => {
      vi.mocked(caso.finta).mockResolvedValueOnce(undefined)
      await caso.chiama(useSessioneStore())
      expect(caso.finta).toHaveBeenCalledWith(...caso.argomenti)
    })

    it(`${caso.nome} propaga l'errore senza motivo d'uscita`, async () => {
      const sessione = useSessioneStore()
      await sessione.accedi(PRIMO.email, 'segreta')
      vi.mocked(caso.finta).mockRejectedValueOnce(SESSIONE_SCADUTA)
      await expect(caso.chiama(sessione)).rejects.toBe(SESSIONE_SCADUTA)
      expect(sessione.motivoUscita).toBeNull()
      expect(sessione.utente).toEqual(PRIMO)
      expect(esci).not.toHaveBeenCalled()
    })
  }
})

describe('sessione scaduta (R10)', () => {
  it('errore sessione dall’archivio → motivo «sessione» e uscita', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(elencaFondi).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await archivio.carica()
    expect(sessione.motivoUscita).toBe('sessione')
    expect(sessione.utente).toBeNull()
    expect(esci).toHaveBeenCalledOnce()
  })

  it('aggiornaNome con errore sessione → motivo «sessione», uscita e stesso errore', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(aggiornaNome).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await expect(sessione.aggiornaNome('Giulia')).rejects.toBe(SESSIONE_SCADUTA)
    expect(sessione.motivoUscita).toBe('sessione')
    expect(sessione.utente).toBeNull()
  })

  it('credenziali errate in accedi → nessun motivo', async () => {
    const sessione = useSessioneStore()
    vi.mocked(accedi).mockRejectedValueOnce(
      new ErroreDati('sessione', 'Email o password non corretti.'),
    )
    await expect(sessione.accedi('a@b.it', 'x')).rejects.toMatchObject({ tipo: 'sessione' })
    expect(sessione.motivoUscita).toBeNull()
    expect(esci).not.toHaveBeenCalled()
  })

  it('un accesso riuscito azzera il motivo', async () => {
    const sessione = useSessioneStore()
    await sessione.sessioneScaduta()
    expect(sessione.motivoUscita).toBe('sessione')
    await sessione.accedi(PRIMO.email, 'segreta')
    expect(sessione.motivoUscita).toBeNull()
  })

  it('il reset dell’uscita azzera haFondo', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    expect(archivio.haFondo).toBe(true)
    await sessione.esci()
    expect(archivio.haFondo).toBeNull()
  })
})

describe('ultimo utente noto (R2, R3, R7)', () => {
  it('T5: accedi() e verificaCodice() riusciti salvano l’utente nuovo', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    expect(leggiUltimoUtente()).toEqual(PRIMO)
    vi.mocked(verificaCodice).mockResolvedValueOnce(GIULIA)
    await sessione.verificaCodice(GIULIA.email, '123456')
    expect(leggiUltimoUtente()).toEqual(GIULIA)
    expect(sessione.confermata).toBe(true)
  })

  it('T6: aggiornaNome riuscito salva il nome nuovo', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(aggiornaNome).mockResolvedValueOnce(undefined)
    await sessione.aggiornaNome('Nuovo')
    expect(leggiUltimoUtente()).toEqual({ ...PRIMO, nome: 'Nuovo' })
  })

  it('T7: esci() con signOut che rifiuta per la rete → chiave assente, store vuoti', async () => {
    const { sessione, archivio } = await accessoConArchivio()
    vi.mocked(esci).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    await sessione.esci()
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
    expect(sessione.utente).toBeNull()
    expect(sessione.confermata).toBe(false)
    expect(eVuoto(archivio)).toBe(true)
  })

  it('T7: cancellaAccount → chiave assente', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(cancellaAccount).mockResolvedValueOnce(undefined)
    await sessione.cancellaAccount(PRIMO.email, false)
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  it('T8: ultimo noto A, accedi() che rifiuta → chiave assente', async () => {
    salvaUltimoUtente(PRIMO)
    vi.mocked(accedi).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    await expect(useSessioneStore().accedi(SECONDO.email, 'x')).rejects.toMatchObject({
      tipo: 'rete',
    })
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  it('verificaCodice sbagliato → ultimo noto invariato', async () => {
    const sessione = useSessioneStore()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(verificaCodice).mockRejectedValueOnce(new ErroreDati('vincolo', 'Codice errato.'))
    await expect(sessione.verificaCodice(GIULIA.email, '000000')).rejects.toMatchObject({
      tipo: 'vincolo',
    })
    expect(leggiUltimoUtente()).toEqual(PRIMO)
  })
})

const RETE = new ErroreDati('rete', 'Rete giù')

/** Ultimo noto `noto` e un ripristino senza rete: lo store resta con l'utente provvisorio. */
async function daProvvisorio(noto = PRIMO) {
  salvaUltimoUtente(noto)
  vi.mocked(sessioneCorrente).mockRejectedValueOnce(RETE)
  const sessione = useSessioneStore()
  await sessione.ripristina()
  return sessione
}

describe('utente provvisorio e confermato (R4, R5, R6)', () => {
  it('T4: ripristina() riuscito → confermato, salvato, foto e metodi letti', async () => {
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(PRIMO)
    vi.mocked(leggiFoto).mockResolvedValueOnce(FOTO)
    const sessione = useSessioneStore()
    await sessione.ripristina()
    await lettureFinite()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.confermata).toBe(true)
    expect(leggiUltimoUtente()).toEqual(PRIMO)
    expect(sessione.foto).toBe(FOTO)
    expect(sessione.metodi).toEqual(ENTRAMBI)
  })

  it('T9: ultimo noto e fetch che lancia → provvisorio, errore rete, profilo non letto', async () => {
    salvaUltimoUtente(PRIMO)
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const sessione = useSessioneStore()
    await sessione.ripristina()
    await lettureFinite()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.confermata).toBe(false)
    expect(sessione.errore?.tipo).toBe('rete')
    expect(sessione.pronto).toBe(true)
    expect(leggiFoto).not.toHaveBeenCalled()
    expect(metodiDiAccesso).not.toHaveBeenCalled()
  })

  it('T11: provvisorio A, poi il server conferma A → confermato senza svuotare l’archivio', async () => {
    const sessione = await daProvvisorio()
    const reset = vi.spyOn(useArchivioStore(), 'reset')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(PRIMO)
    await sessione.ripristina()
    expect(sessione.confermata).toBe(true)
    expect(sessione.errore).toBeNull()
    expect(reset).not.toHaveBeenCalled()
  })

  it('T12: provvisorio A, poi il server dà B → store svuotati, B confermato e salvato', async () => {
    const sessione = await daProvvisorio()
    const reset = vi.spyOn(useArchivioStore(), 'reset')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(SECONDO)
    await sessione.ripristina()
    expect(reset).toHaveBeenCalledOnce()
    expect(sessione.utente).toEqual(SECONDO)
    expect(sessione.confermata).toBe(true)
    expect(leggiUltimoUtente()).toEqual(SECONDO)
  })

  it('T13: provvisorio A, poi il server dice nessuna sessione → sessione scaduta', async () => {
    const sessione = await daProvvisorio()
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(null)
    await sessione.ripristina()
    expect(sessione.motivoUscita).toBe('sessione')
    expect(sessione.utente).toBeNull()
    expect(sessione.confermata).toBe(false)
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  it('T14: provvisorio A, poi un 401 → sessione scaduta', async () => {
    const sessione = await daProvvisorio()
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(SESSIONE_SCADUTA)
    await sessione.ripristina()
    expect(sessione.motivoUscita).toBe('sessione')
    expect(sessione.utente).toBeNull()
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
  })

  it('T15: nessun provvisorio, nessuna sessione con chiave presente → chiave cancellata, nessun motivo', async () => {
    salvaUltimoUtente(PRIMO)
    const sessione = useSessioneStore()
    await sessione.ripristina()
    expect(sessione.utente).toBeNull()
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
    expect(sessione.motivoUscita).toBeNull()
    expect(esci).not.toHaveBeenCalled()
  })

  it('T16: provvisorio A, poi errore altro → resta A provvisorio con l’errore', async () => {
    const sessione = await daProvvisorio()
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(new ErroreDati('altro', 'Errore'))
    await sessione.ripristina()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.confermata).toBe(false)
    expect(sessione.errore?.tipo).toBe('altro')
  })

  it('errore altro senza provvisorio → utente null anche con un ultimo noto', async () => {
    salvaUltimoUtente(PRIMO)
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(new ErroreDati('altro', 'Errore'))
    const sessione = useSessioneStore()
    await sessione.ripristina()
    expect(sessione.utente).toBeNull()
    expect(sessione.errore?.tipo).toBe('altro')
  })

  it('T17: provvisorio, ripristini dopo errori di rete tornano al server; i sovrapposti una volta', async () => {
    const sessione = await daProvvisorio()
    expect(sessioneCorrente).toHaveBeenCalledOnce()
    const risposta = inSospeso<null>()
    vi.mocked(sessioneCorrente).mockReturnValueOnce(risposta.promessa)
    const prima = sessione.ripristina()
    const seconda = sessione.ripristina()
    risposta.rifiuta(RETE)
    await Promise.all([prima, seconda])
    expect(sessioneCorrente).toHaveBeenCalledTimes(2)
    expect(sessione.utente).toEqual(PRIMO)
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(RETE)
    await sessione.ripristina()
    expect(sessioneCorrente).toHaveBeenCalledTimes(3)
    expect(sessione.confermata).toBe(false)
  })

  it('confermato da accedi(), poi ripristina() → resta confermato senza tornare al server', async () => {
    vi.mocked(sessioneCorrente).mockRejectedValue(RETE)
    const sessione = useSessioneStore()
    await sessione.ripristina()
    await sessione.accedi(PRIMO.email, 'segreta')
    vi.mocked(sessioneCorrente).mockClear()
    await sessione.ripristina()
    expect(sessioneCorrente).not.toHaveBeenCalled()
    expect(sessione.utente).toEqual(PRIMO)
    expect(sessione.confermata).toBe(true)
    expect(sessione.errore).toBeNull()
  })

  it('provvisorio che esce → chiave assente e store vuoti', async () => {
    const sessione = await daProvvisorio()
    vi.mocked(esci).mockRejectedValueOnce(RETE)
    await sessione.esci()
    expect(sessione.utente).toBeNull()
    expect(localStorage.getItem(CHIAVE_ULTIMO_UTENTE)).toBeNull()
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
