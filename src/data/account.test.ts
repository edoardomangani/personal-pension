import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancellaAccount } from './account'
import { impostaClientDati } from './client'
import { eErroreDati } from './errori'

function conFetch(finto: typeof fetch) {
  const f = vi.fn(finto)
  impostaClientDati(
    new NeonPostgrestClient({
      dataApiUrl: 'https://esempio.test/rest/v1',
      options: { global: { fetch: f } },
    }),
  )
  return f
}

async function tipoDelRifiuto(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? errore.tipo : null
}

afterEach(() => impostaClientDati(null))

describe('cancellaAccount', () => {
  it('POST rpc/cancella_account', async () => {
    const f = conFetch(async () => new Response(null, { status: 204 }))
    await cancellaAccount()
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0]?.[0])).toContain('/rpc/cancella_account')
    expect(f.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('401 → ErroreDati sessione', async () => {
    conFetch(
      async () =>
        new Response(JSON.stringify({ code: 'PGRST301', message: 'JWT expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    )
    await expect(tipoDelRifiuto(cancellaAccount())).resolves.toBe('sessione')
  })

  it('fetch che lancia → ErroreDati rete', async () => {
    conFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(tipoDelRifiuto(cancellaAccount())).resolves.toBe('rete')
  })
})
