import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientDati, impostaClientDati } from './client'
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
