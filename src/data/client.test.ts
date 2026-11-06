import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authDaSdk, clientDati, impostaClientDati, type AuthSdk, type RispostaAuth } from './client'
import { eErroreDati } from './errori'

afterEach(() => {
  impostaClientDati(null)
  vi.unstubAllEnvs()
})

describe('clientDati', () => {
  it('restituisce il client iniettato', () => {
    const iniettato = new NeonPostgrestClient({
      dataApiUrl: 'https://esempio.test/rest/v1',
      options: { global: { fetch: vi.fn<typeof fetch>() } },
    })
    impostaClientDati(iniettato)
    expect(clientDati()).toBe(iniettato)
  })

  it('senza client e senza VITE_NEON_DATABASE_URL dà un errore in italiano', () => {
    impostaClientDati(null)
    vi.stubEnv('VITE_NEON_DATABASE_URL', '')
    let errore: unknown = null
    try {
      clientDati()
    } catch (e) {
      errore = e
    }
    expect(eErroreDati(errore) && errore.messaggio).toContain('VITE_NEON_DATABASE_URL')
  })
})

function rispostaFinta() {
  return { data: null, error: null }
}

function sdkFinto() {
  const fetchFinto = vi
    .fn<
      (
        percorso: string,
        opzioni: Parameters<AuthSdk['$fetch']>[1],
      ) => Promise<ReturnType<typeof rispostaFinta>>
    >()
    .mockResolvedValue(rispostaFinta())
  return {
    getSession: vi.fn<AuthSdk['getSession']>().mockResolvedValue(rispostaFinta()),
    signIn: {
      email: vi.fn<AuthSdk['signIn']['email']>().mockResolvedValue(rispostaFinta()),
      social: vi.fn<AuthSdk['signIn']['social']>().mockResolvedValue(rispostaFinta()),
    },
    signUp: { email: vi.fn<AuthSdk['signUp']['email']>().mockResolvedValue(rispostaFinta()) },
    signOut: vi.fn<AuthSdk['signOut']>().mockResolvedValue(rispostaFinta()),
    sendVerificationEmail: vi
      .fn<AuthSdk['sendVerificationEmail']>()
      .mockResolvedValue(rispostaFinta()),
    requestPasswordReset: vi
      .fn<AuthSdk['requestPasswordReset']>()
      .mockResolvedValue(rispostaFinta()),
    resetPassword: vi.fn<AuthSdk['resetPassword']>().mockResolvedValue(rispostaFinta()),
    changePassword: vi.fn<AuthSdk['changePassword']>().mockResolvedValue(rispostaFinta()),
    updateUser: vi.fn<AuthSdk['updateUser']>().mockResolvedValue(rispostaFinta()),
    listAccounts: vi.fn<AuthSdk['listAccounts']>().mockResolvedValue(rispostaFinta()),
    // $fetch è generico: lo spia un vi.fn non generico dietro una funzione che lo inoltra.
    $fetch: <T>(
      percorso: string,
      opzioni: Parameters<AuthSdk['$fetch']>[1],
    ): Promise<RispostaAuth<T>> => fetchFinto(percorso, opzioni),
    fetchFinto,
  }
}

type SdkFinto = ReturnType<typeof sdkFinto>

interface CasoInoltro {
  metodo: string
  argomento: object | undefined
  chiama: (auth: ReturnType<typeof authDaSdk>) => Promise<unknown>
  delFinto: (sdk: SdkFinto) => ReturnType<typeof vi.fn>
}

function caso<A extends object>(
  metodo: string,
  argomento: A,
  chiama: (auth: ReturnType<typeof authDaSdk>, argomento: A) => Promise<unknown>,
  delFinto: (sdk: SdkFinto) => ReturnType<typeof vi.fn>,
): CasoInoltro {
  return { metodo, argomento, chiama: (auth) => chiama(auth, argomento), delFinto }
}

const casi: CasoInoltro[] = [
  { metodo: 'getSession', argomento: undefined, chiama: (a) => a.getSession(), delFinto: (s) => s.getSession },
  caso(
    'signIn.email',
    { email: 'a@b.it', password: 'segreta123' },
    (a, x) => a.signIn.email(x),
    (s) => s.signIn.email,
  ),
  caso(
    'signIn.social',
    { provider: 'google', callbackURL: 'https://esempio.test/' },
    (a, x) => a.signIn.social(x),
    (s) => s.signIn.social,
  ),
  caso(
    'signUp.email',
    { name: 'Edo', email: 'a@b.it', password: 'segreta123' },
    (a, x) => a.signUp.email(x),
    (s) => s.signUp.email,
  ),
  { metodo: 'signOut', argomento: undefined, chiama: (a) => a.signOut(), delFinto: (s) => s.signOut },
  caso(
    'sendVerificationEmail',
    { email: 'a@b.it', callbackURL: 'https://esempio.test/' },
    (a, x) => a.sendVerificationEmail(x),
    (s) => s.sendVerificationEmail,
  ),
  caso(
    'requestPasswordReset',
    { email: 'a@b.it', redirectTo: 'https://esempio.test/' },
    (a, x) => a.requestPasswordReset(x),
    (s) => s.requestPasswordReset,
  ),
  caso(
    'resetPassword',
    { newPassword: 'nuova12345', token: 'tok' },
    (a, x) => a.resetPassword(x),
    (s) => s.resetPassword,
  ),
  caso(
    'changePassword',
    { currentPassword: 'vecchia123', newPassword: 'nuova12345', revokeOtherSessions: true },
    (a, x) => a.changePassword(x),
    (s) => s.changePassword,
  ),
  caso('updateUser', { name: 'Edo' }, (a, x) => a.updateUser(x), (s) => s.updateUser),
  {
    metodo: 'listAccounts',
    argomento: undefined,
    chiama: (a) => a.listAccounts(),
    delFinto: (s) => s.listAccounts,
  },
]

describe('authDaSdk', () => {
  it('emailOtp.verifyEmail → $fetch POST su /email-otp/verify-email', async () => {
    const sdk = sdkFinto()
    const dati = { email: 'a@b.it', otp: '123456' }
    const risultato = await authDaSdk(sdk).emailOtp.verifyEmail(dati)
    expect(sdk.fetchFinto).toHaveBeenCalledTimes(1)
    expect(sdk.fetchFinto).toHaveBeenCalledWith('/email-otp/verify-email', {
      method: 'POST',
      body: { email: 'a@b.it', otp: '123456' },
    })
    expect(risultato).toBe(await sdk.fetchFinto.mock.results[0]?.value)
  })

  it('emailOtp.sendVerificationOtp → $fetch POST su /email-otp/send-verification-otp', async () => {
    const sdk = sdkFinto()
    const dati = { email: 'a@b.it', type: 'email-verification' as const }
    const risultato = await authDaSdk(sdk).emailOtp.sendVerificationOtp(dati)
    expect(sdk.fetchFinto).toHaveBeenCalledTimes(1)
    expect(sdk.fetchFinto).toHaveBeenCalledWith('/email-otp/send-verification-otp', {
      method: 'POST',
      body: { email: 'a@b.it', type: 'email-verification' },
    })
    expect(risultato).toBe(await sdk.fetchFinto.mock.results[0]?.value)
  })

  it.each(casi)('$metodo passa gli argomenti all’SDK e ne restituisce la risposta', async (c) => {
    const sdk = sdkFinto()
    const metodo = c.delFinto(sdk)
    const risultato = await c.chiama(authDaSdk(sdk))
    expect(metodo).toHaveBeenCalledTimes(1)
    if (c.argomento !== undefined) {
      expect(metodo.mock.calls[0]?.[0]).toBe(c.argomento)
    }
    expect(risultato).toBe(await metodo.mock.results[0]?.value)
  })
})
