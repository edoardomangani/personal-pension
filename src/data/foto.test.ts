import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { impostaClientDati } from './client'
import { eErroreDati } from './errori'
import { eliminaFoto, leggiFoto, salvaFoto } from './foto'

const FOTO = 'data:image/jpeg;base64,AAAA'

function rispostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

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

type FetchFinto = ReturnType<typeof conFetch>

const URL_DI = (f: FetchFinto, i = 0) => decodeURIComponent(String(f.mock.calls[i]?.[0]))
const METODO_DI = (f: FetchFinto, i = 0) => f.mock.calls[i]?.[1]?.method
const CORPO_DI = (f: FetchFinto, i = 0): unknown => {
  const corpo = f.mock.calls[i]?.[1]?.body
  return typeof corpo === 'string' ? JSON.parse(corpo) : null
}

afterEach(() => impostaClientDati(null))

describe('foto del profilo', () => {
  it('leggiFoto: una riga → il data URL', async () => {
    const f = conFetch(async () => rispostaJson({ immagine: FOTO }))
    await expect(leggiFoto()).resolves.toBe(FOTO)
    expect(METODO_DI(f)).toBe('GET')
    expect(URL_DI(f)).toContain('/foto_profilo?select=immagine')
  })

  it('leggiFoto: nessuna riga → null', async () => {
    conFetch(async () => new Response(null, { status: 204 }))
    await expect(leggiFoto()).resolves.toBeNull()
  })

  it('salvaFoto: upsert con on_conflict=user_id, senza user_id nel corpo', async () => {
    const f = conFetch(async () => new Response(null, { status: 201 }))
    await salvaFoto(FOTO)
    expect(METODO_DI(f)).toBe('POST')
    expect(URL_DI(f)).toContain('/foto_profilo?')
    expect(URL_DI(f)).toContain('on_conflict=user_id')
    expect(CORPO_DI(f)).toEqual({ immagine: FOTO })
  })

  it('eliminaFoto: DELETE su foto_profilo', async () => {
    const f = conFetch(async () => new Response(null, { status: 204 }))
    await eliminaFoto()
    expect(METODO_DI(f)).toBe('DELETE')
    expect(URL_DI(f)).toContain('/foto_profilo?')
  })

  it('errore 23514 al salvataggio → ErroreDati vincolo', async () => {
    conFetch(async () => rispostaJson({ code: '23514', message: 'check violation' }, 400))
    const errore: unknown = await salvaFoto('data:image/png;base64,AA').catch((e: unknown) => e)
    expect(eErroreDati(errore) && errore.tipo).toBe('vincolo')
  })

  it('fetch che lancia → ErroreDati rete', async () => {
    conFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const errore: unknown = await leggiFoto().catch((e: unknown) => e)
    expect(eErroreDati(errore) && errore.tipo).toBe('rete')
  })
})
