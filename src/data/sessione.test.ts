import { afterEach, describe, expect, it, vi } from 'vitest'
import { impostaAuthDati, type AuthDati, type RispostaAuth, type UtenteAuth } from './client'
import { MESSAGGI, eErroreDati } from './errori'
import { accedi, esci, sessioneCorrente } from './sessione'

const MESSAGGIO_CREDENZIALI = 'Email o password non corretti.'
const UTENTE: UtenteAuth = { id: 'u1', email: 'edoardo@esempio.it' }

function authFinto(parziale: Partial<{
  getSession: AuthDati['getSession']
  signInEmail: AuthDati['signIn']['email']
  signOut: AuthDati['signOut']
}> = {}) {
  const ok = <T>(data: T): Promise<RispostaAuth<T>> => Promise.resolve({ data, error: null })
  const finto = {
    getSession: vi.fn(parziale.getSession ?? (() => ok({ user: UTENTE }))),
    signIn: { email: vi.fn(parziale.signInEmail ?? (() => ok({ user: UTENTE }))) },
    signOut: vi.fn(parziale.signOut ?? (() => ok<unknown>({ success: true }))),
  }
  impostaAuthDati(finto)
  return finto
}

async function rifiuto(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? { tipo: errore.tipo, messaggio: errore.messaggio } : null
}

afterEach(() => impostaAuthDati(null))

describe('sessione', () => {
  it('sessione presente → utente con id ed email', async () => {
    authFinto({
      getSession: async () => ({ data: { user: { ...UTENTE, name: 'Edoardo' } }, error: null }),
    })
    await expect(sessioneCorrente()).resolves.toEqual(UTENTE)
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

  it('accedi con 403 EMAIL_NOT_VERIFIED → sessione con il messaggio della verifica', async () => {
    authFinto({
      signInEmail: async () => ({
        data: null,
        error: { status: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' },
      }),
    })
    const errore = await rifiuto(accedi('a@b.it', 'x'))
    expect(errore).toMatchObject({ tipo: 'sessione', messaggio: expect.stringContaining('confermare') })
    expect(errore?.messaggio).not.toBe(MESSAGGIO_CREDENZIALI)
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
    const errore = await rifiuto(accedi('a@b.it', 'x'))
    expect(errore).toMatchObject({ tipo: 'sessione', messaggio: expect.stringContaining('confermare') })
    expect(errore?.messaggio).not.toBe(MESSAGGIO_CREDENZIALI)
  })

  it('accedi con EMAIL_NOT_VERIFIED lanciato da Better Fetch (sul valore) → sessione', async () => {
    authFinto({
      signInEmail: () =>
        Promise.reject(
          Object.assign(new Error('Forbidden'), { status: 403, code: 'EMAIL_NOT_VERIFIED' }),
        ),
    })
    const errore = await rifiuto(accedi('a@b.it', 'x'))
    expect(errore).toMatchObject({ tipo: 'sessione', messaggio: expect.stringContaining('confermare') })
    expect(errore?.messaggio).not.toBe(MESSAGGIO_CREDENZIALI)
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
    await expect(accedi('edoardo@esempio.it', 'segreta')).resolves.toEqual(UTENTE)
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
})
