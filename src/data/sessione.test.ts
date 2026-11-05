import { afterEach, describe, expect, it, vi } from 'vitest'
import { impostaAuthDati, type AuthDati, type RispostaAuth, type UtenteAuth } from './client'
import { MESSAGGI, eErroreDati } from './errori'
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
  type Utente,
} from './sessione'

const MESSAGGIO_CREDENZIALI = 'Email o password non corretti.'
const UTENTE: UtenteAuth = {
  id: 'u1',
  email: 'edoardo@esempio.it',
  name: 'Edoardo Mangani',
  emailVerified: true,
  createdAt: '2026-09-12T10:00:00.000Z',
}

type Metodi = {
  getSession: AuthDati['getSession']
  signInEmail: AuthDati['signIn']['email']
  signInSocial: AuthDati['signIn']['social']
  signUpEmail: AuthDati['signUp']['email']
  signOut: AuthDati['signOut']
  verifyEmail: AuthDati['emailOtp']['verifyEmail']
  sendVerificationOtp: AuthDati['emailOtp']['sendVerificationOtp']
  sendVerificationEmail: AuthDati['sendVerificationEmail']
  requestPasswordReset: AuthDati['requestPasswordReset']
  resetPassword: AuthDati['resetPassword']
  changePassword: AuthDati['changePassword']
  updateUser: AuthDati['updateUser']
  listAccounts: AuthDati['listAccounts']
}

const ok = <T>(data: T): Promise<RispostaAuth<T>> => Promise.resolve({ data, error: null })
const fatto = () => ok<unknown>({ status: true })

function authFinto(parziale: Partial<Metodi> = {}) {
  const finto = {
    getSession: vi.fn(parziale.getSession ?? (() => ok({ user: UTENTE }))),
    signIn: {
      email: vi.fn(parziale.signInEmail ?? (() => ok({ user: UTENTE }))),
      social: vi.fn(parziale.signInSocial ?? fatto),
    },
    signUp: { email: vi.fn(parziale.signUpEmail ?? (() => ok({ user: UTENTE }))) },
    signOut: vi.fn(parziale.signOut ?? (() => ok<unknown>({ success: true }))),
    emailOtp: {
      verifyEmail: vi.fn(parziale.verifyEmail ?? (() => ok({ user: UTENTE }))),
      sendVerificationOtp: vi.fn(parziale.sendVerificationOtp ?? fatto),
    },
    sendVerificationEmail: vi.fn(parziale.sendVerificationEmail ?? fatto),
    requestPasswordReset: vi.fn(parziale.requestPasswordReset ?? fatto),
    resetPassword: vi.fn(parziale.resetPassword ?? fatto),
    changePassword: vi.fn(parziale.changePassword ?? fatto),
    updateUser: vi.fn(parziale.updateUser ?? fatto),
    listAccounts: vi.fn(
      parziale.listAccounts ?? (() => ok([{ providerId: 'credential' }])),
    ),
  }
  impostaAuthDati(finto)
  return finto
}

const UTENTE_MAPPATO: Utente = {
  id: 'u1',
  email: 'edoardo@esempio.it',
  nome: 'Edoardo Mangani',
  emailVerificata: true,
  registratoIl: giornoLocale('2026-09-12T10:00:00.000Z'),
}

const MESSAGGIO_CODICE = 'Il codice non è giusto o è scaduto: controlla o fattene mandare un altro.'
const MESSAGGIO_TROPPI = 'Troppi tentativi: aspetta un minuto e riprova.'

async function rifiuto(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? { tipo: errore.tipo, messaggio: errore.messaggio } : null
}

async function codiceDi(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? errore.codice : null
}

const errore = (status: number, code?: string) =>
  Promise.resolve({ data: null, error: { status, code } })

/** La data locale attesa, con la stessa regola del modulo: il risultato dipende dal fuso. */
function giornoLocale(iso: string): string {
  const d = new Date(iso)
  const due = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`
}

afterEach(() => impostaAuthDati(null))

describe('sessione', () => {
  it('sessione presente → utente mappato (R1/R2)', async () => {
    authFinto({
      getSession: () =>
        ok({
          user: { ...UTENTE, name: 'Giulia Conti', createdAt: '2026-09-12T22:30:00Z' },
        }),
    })
    await expect(sessioneCorrente()).resolves.toEqual({
      id: 'u1',
      email: 'edoardo@esempio.it',
      nome: 'Giulia Conti',
      emailVerificata: true,
      registratoIl: giornoLocale('2026-09-12T22:30:00Z'),
    })
  })

  it('createdAt come Date, nome vuoto ed email da verificare', async () => {
    const createdAt = new Date('2026-11-04T09:00:00Z')
    authFinto({
      getSession: () => ok({ user: { ...UTENTE, name: '  ', emailVerified: false, createdAt } }),
    })
    await expect(sessioneCorrente()).resolves.toMatchObject({
      nome: null,
      emailVerificata: false,
      registratoIl: giornoLocale('2026-11-04T09:00:00Z'),
    })
  })

  it('nessuna sessione → null', async () => {
    authFinto({ getSession: async () => ({ data: null, error: null }) })
    await expect(sessioneCorrente()).resolves.toBeNull()
  })

  it('accedi con credenziali errate → sessione con messaggio dedicato', async () => {
    authFinto({
      signInEmail: async () => ({
        data: null,
        error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
      }),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toEqual({
      tipo: 'sessione',
      messaggio: MESSAGGIO_CREDENZIALI,
    })
  })

  it("accedi con l'errore lanciato dall'adapter (status in .error) → sessione", async () => {
    authFinto({
      signInEmail: () =>
        Promise.reject(Object.assign(new Error('Invalid'), { status: 400, error: { status: 401 } })),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toMatchObject({ tipo: 'sessione' })
  })

  it("accedi con 403 EMAIL_NOT_VERIFIED → sessione con codice 'email-da-verificare' (R3)", async () => {
    authFinto({
      signInEmail: async () => ({
        data: null,
        error: { status: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' },
      }),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toMatchObject({ tipo: 'sessione' })
    await expect(codiceDi(accedi('a@b.it', 'x'))).resolves.toBe('email-da-verificare')
  })

  it('accedi con un altro 403 → altro', async () => {
    authFinto({
      signInEmail: async () => ({ data: null, error: { status: 403, code: 'ALTRO' } }),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toEqual({
      tipo: 'altro',
      messaggio: MESSAGGI.altro,
    })
  })

  it("accedi con EMAIL_NOT_VERIFIED lanciato dall'adapter (in .error) → sessione", async () => {
    authFinto({
      signInEmail: () =>
        Promise.reject(
          Object.assign(new Error('Forbidden'), {
            status: 400,
            error: { status: 403, code: 'EMAIL_NOT_VERIFIED' },
          }),
        ),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toMatchObject({ tipo: 'sessione' })
    await expect(codiceDi(accedi('a@b.it', 'x'))).resolves.toBe('email-da-verificare')
  })

  it('accedi con EMAIL_NOT_VERIFIED lanciato da Better Fetch (sul valore) → sessione', async () => {
    authFinto({
      signInEmail: () =>
        Promise.reject(
          Object.assign(new Error('Forbidden'), { status: 403, code: 'EMAIL_NOT_VERIFIED' }),
        ),
    })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toMatchObject({ tipo: 'sessione' })
    await expect(codiceDi(accedi('a@b.it', 'x'))).resolves.toBe('email-da-verificare')
  })

  it('sessione con 403 EMAIL_NOT_VERIFIED → sessione scaduta', async () => {
    authFinto({
      getSession: async () => ({ data: null, error: { status: 403, code: 'EMAIL_NOT_VERIFIED' } }),
    })
    await expect(rifiuto(sessioneCorrente())).resolves.toEqual({
      tipo: 'sessione',
      messaggio: MESSAGGI.sessione,
    })
  })

  it('sessione con 500 → altro', async () => {
    authFinto({ getSession: async () => ({ data: null, error: { status: 500 } }) })
    await expect(rifiuto(sessioneCorrente())).resolves.toEqual({
      tipo: 'altro',
      messaggio: MESSAGGI.altro,
    })
  })

  it('accedi riuscito → utente', async () => {
    const finto = authFinto()
    await expect(accedi('edoardo@esempio.it', 'segreta')).resolves.toEqual(UTENTE_MAPPATO)
    expect(finto.signIn.email).toHaveBeenCalledWith({
      email: 'edoardo@esempio.it',
      password: 'segreta',
    })
  })

  it('fetch che lancia TypeError → rete', async () => {
    authFinto({ getSession: () => Promise.reject(new TypeError('Failed to fetch')) })
    await expect(rifiuto(sessioneCorrente())).resolves.toMatchObject({ tipo: 'rete' })
  })

  it('esci chiama signOut', async () => {
    const finto = authFinto()
    await esci()
    expect(finto.signOut).toHaveBeenCalledOnce()
  })

  it('esci con 401 → sessione scaduta', async () => {
    authFinto({ signOut: async () => ({ data: null, error: { status: 401 } }) })
    await expect(rifiuto(esci())).resolves.toEqual({
      tipo: 'sessione',
      messaggio: MESSAGGI.sessione,
    })
  })

  it('esci con 403 → sessione scaduta', async () => {
    authFinto({ signOut: async () => ({ data: null, error: { status: 403 } }) })
    await expect(rifiuto(esci())).resolves.toEqual({
      tipo: 'sessione',
      messaggio: MESSAGGI.sessione,
    })
  })

  it('sessione con status 0 → rete', async () => {
    authFinto({ getSession: async () => ({ data: null, error: { status: 0 } }) })
    await expect(rifiuto(sessioneCorrente())).resolves.toEqual({
      tipo: 'rete',
      messaggio: MESSAGGI.rete,
    })
  })

  it('accedi senza dati né errore → altro', async () => {
    authFinto({ signInEmail: async () => ({ data: null, error: null }) })
    await expect(rifiuto(accedi('a@b.it', 'x'))).resolves.toEqual({
      tipo: 'altro',
      messaggio: MESSAGGI.altro,
    })
  })
})

describe('registrazione e verifica', () => {
  it('registrati manda nome, email e password a signUp', async () => {
    const finto = authFinto()
    await registrati({ nome: 'Giulia Conti', email: 'g@esempio.it', password: 'segreta123' })
    expect(finto.signUp.email).toHaveBeenCalledWith({
      name: 'Giulia Conti',
      email: 'g@esempio.it',
      password: 'segreta123',
    })
  })

  it.each(['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'])(
    'signUp 422 %s → vincolo email già registrata (R3)',
    async (code) => {
      authFinto({ signUpEmail: () => errore(422, code) })
      await expect(
        rifiuto(registrati({ nome: 'G', email: 'g@esempio.it', password: 'segreta123' })),
      ).resolves.toEqual({
        tipo: 'vincolo',
        messaggio: 'Esiste già un account con questa email: accedi o reimposta la password.',
      })
    },
  )

  it('verificaCodice riuscito → utente mappato', async () => {
    const finto = authFinto({ verifyEmail: () => ok({ user: UTENTE, token: 't' }) })
    await expect(verificaCodice('edoardo@esempio.it', '123456')).resolves.toEqual(UTENTE_MAPPATO)
    expect(finto.emailOtp.verifyEmail).toHaveBeenCalledWith({
      email: 'edoardo@esempio.it',
      otp: '123456',
    })
  })

  it.each([
    [400, 'INVALID_OTP'],
    [400, 'OTP_EXPIRED'],
    [403, 'TOO_MANY_ATTEMPTS'],
  ])('verifyEmail %i %s → vincolo col messaggio del codice (R3)', async (status, code) => {
    authFinto({ verifyEmail: () => errore(status, code) })
    await expect(rifiuto(verificaCodice('a@b.it', '000000'))).resolves.toEqual({
      tipo: 'vincolo',
      messaggio: MESSAGGIO_CODICE,
    })
  })

  it('verifyEmail senza user o senza token → altro, nessun utente', async () => {
    authFinto({ verifyEmail: () => ok({}) })
    await expect(rifiuto(verificaCodice('a@b.it', '123456'))).resolves.toMatchObject({
      tipo: 'altro',
    })
    authFinto({ verifyEmail: () => ok({ user: UTENTE, token: null }) })
    await expect(rifiuto(verificaCodice('a@b.it', '123456'))).resolves.toMatchObject({
      tipo: 'altro',
    })
  })

  it('reinviaCodice chiede il codice di verifica', async () => {
    const finto = authFinto()
    await reinviaCodice('a@b.it')
    expect(finto.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: 'a@b.it',
      type: 'email-verification',
    })
  })

  it.each([
    ['reinviaCodice', () => reinviaCodice('a@b.it'), 'sendVerificationOtp'],
    ['accedi', () => accedi('a@b.it', 'x'), 'signInEmail'],
    ['richiediReset', () => richiediReset('a@b.it', 'http://x/#/nuova-password'), 'requestPasswordReset'],
    ['getSession', () => sessioneCorrente(), 'getSession'],
  ] as const)('%s con 429 → altro «Troppi tentativi…» (R3)', async (_nome, chiamata, metodo) => {
    authFinto({ [metodo]: () => errore(429) })
    await expect(rifiuto(chiamata())).resolves.toEqual({ tipo: 'altro', messaggio: MESSAGGIO_TROPPI })
  })
})

describe('Google e password', () => {
  it('accediConGoogle passa il provider e il ritorno', async () => {
    const finto = authFinto()
    await accediConGoogle('http://localhost:5173/#/')
    expect(finto.signIn.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: 'http://localhost:5173/#/',
    })
  })

  it('richiediReset passa il link di ritorno', async () => {
    const finto = authFinto()
    await richiediReset('a@b.it', 'http://localhost:5173/#/nuova-password')
    expect(finto.requestPasswordReset).toHaveBeenCalledWith({
      email: 'a@b.it',
      redirectTo: 'http://localhost:5173/#/nuova-password',
    })
  })

  it('reimpostaPassword con INVALID_TOKEN → vincolo «Il link è scaduto.»', async () => {
    const finto = authFinto({ resetPassword: () => errore(400, 'INVALID_TOKEN') })
    await expect(rifiuto(reimpostaPassword('tok', 'nuova12345'))).resolves.toEqual({
      tipo: 'vincolo',
      messaggio: 'Il link è scaduto.',
    })
    expect(finto.resetPassword).toHaveBeenCalledWith({ newPassword: 'nuova12345', token: 'tok' })
  })

  it('cambiaPassword chiude le altre sessioni (R2)', async () => {
    const finto = authFinto()
    await cambiaPassword('a', 'b')
    expect(finto.changePassword).toHaveBeenCalledWith({
      currentPassword: 'a',
      newPassword: 'b',
      revokeOtherSessions: true,
    })
  })

  it('changePassword 400 INVALID_PASSWORD → vincolo; 401 resta sessione scaduta', async () => {
    authFinto({ changePassword: () => errore(400, 'INVALID_PASSWORD') })
    await expect(rifiuto(cambiaPassword('a', 'b'))).resolves.toEqual({
      tipo: 'vincolo',
      messaggio: 'La password attuale non è corretta.',
    })
    authFinto({ changePassword: () => errore(401) })
    await expect(rifiuto(cambiaPassword('a', 'b'))).resolves.toEqual({
      tipo: 'sessione',
      messaggio: MESSAGGI.sessione,
    })
  })

  it('aggiornaNome chiama updateUser; 401 → sessione scaduta', async () => {
    const finto = authFinto()
    await aggiornaNome('Giulia Conti')
    expect(finto.updateUser).toHaveBeenCalledWith({ name: 'Giulia Conti' })
    authFinto({ updateUser: () => errore(401) })
    await expect(rifiuto(aggiornaNome('G'))).resolves.toMatchObject({ tipo: 'sessione' })
  })

  it('metodiDiAccesso da listAccounts (R2)', async () => {
    authFinto({ listAccounts: () => ok([{ providerId: 'credential' }, { providerId: 'google' }]) })
    await expect(metodiDiAccesso()).resolves.toEqual({ password: true, google: true })
    authFinto({ listAccounts: () => ok([{ providerId: 'google' }]) })
    await expect(metodiDiAccesso()).resolves.toEqual({ password: false, google: true })
  })

  it('verificaPassword con 401 → vincolo «Password non corretta.»', async () => {
    const finto = authFinto({ signInEmail: () => errore(401, 'INVALID_EMAIL_OR_PASSWORD') })
    await expect(rifiuto(verificaPassword('a@b.it', 'sbagliata'))).resolves.toEqual({
      tipo: 'vincolo',
      messaggio: 'Password non corretta.',
    })
    expect(finto.signIn.email).toHaveBeenCalledWith({ email: 'a@b.it', password: 'sbagliata' })
  })
})
