import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import { eliminaBusta, salvaBusta } from './buste'
import { impostaClientDati } from './client'
import { eErroreDati } from './errori'
import { eliminaEstratto, salvaEstratto } from './estratti'
import { eliminaFondo, salvaFondo } from './fondi'
import { salvaImpostazioni } from './impostazioni'
import { eliminaMovimento, salvaMovimento } from './movimenti'

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
const TESTO_CORPO = (f: FetchFinto, i = 0) => String(f.mock.calls[i]?.[1]?.body ?? '')

async function rifiuto(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? { tipo: errore.tipo, messaggio: errore.messaggio } : null
}

const ESTRATTO_DB = { id: 'e1', fondo_id: 'f1', data: '2026-11-03', valore: 1641.45, note: '' }

afterEach(() => impostaClientDati(null))

describe('scritture dirette', () => {
  it('fondo senza id → POST, senza user_id, riletto dalla risposta', async () => {
    const f = conFetch(async () => rispostaJson({ id: 'f1', nome: 'Amundi' }, 201))
    await expect(salvaFondo({ nome: 'Amundi' })).resolves.toEqual({ id: 'f1', nome: 'Amundi' })
    expect(METODO_DI(f)).toBe('POST')
    expect(URL_DI(f)).toContain('/fondi?')
    expect(URL_DI(f)).not.toContain('id=eq.')
    expect(CORPO_DI(f)).toEqual({ nome: 'Amundi' })
  })

  it('fondo con id → PATCH filtrato per id', async () => {
    const f = conFetch(async () => rispostaJson({ id: 'f1', nome: 'Amundi SP' }))
    await salvaFondo({ id: 'f1', nome: 'Amundi SP' })
    expect(METODO_DI(f)).toBe('PATCH')
    expect(URL_DI(f)).toContain('id=eq.f1')
    expect(CORPO_DI(f)).toEqual({ nome: 'Amundi SP' })
  })

  it('estratto: valore 164145 centesimi → 1641.45 euro nel corpo, riletto in centesimi', async () => {
    const f = conFetch(async () => rispostaJson(ESTRATTO_DB, 201))
    const salvato = await salvaEstratto({
      fondoId: 'f1',
      data: '2026-11-03',
      valore: 164145,
      note: '',
    })
    expect(METODO_DI(f)).toBe('POST')
    expect(CORPO_DI(f)).toEqual({ fondo_id: 'f1', data: '2026-11-03', valore: 1641.45, note: '' })
    expect(TESTO_CORPO(f)).not.toContain('user_id')
    expect(salvato.valore).toBe(164145)
  })

  it('estratto con id → PATCH filtrato per id, senza id né user_id nel corpo', async () => {
    const f = conFetch(async () => rispostaJson(ESTRATTO_DB))
    await salvaEstratto({ id: 'e1', fondoId: 'f1', data: '2026-11-03', valore: 164145, note: '' })
    expect(METODO_DI(f)).toBe('PATCH')
    expect(URL_DI(f)).toContain('id=eq.e1')
    expect(TESTO_CORPO(f)).not.toContain('user_id')
    expect(CORPO_DI(f)).not.toHaveProperty('id')
  })

  it('impostazioni: upsert su user_id con importi in euro e null conservati', async () => {
    const f = conFetch(async () =>
      rispostaJson({
        anno_nascita: 1994,
        eta_pensione: 67,
        rendimento: 3,
        inflazione: 2,
        crescita: 1.5,
        tfr_mensile: null,
        datore_mensile: null,
        personale_mensile: null,
        volontario_mensile: 0,
        aliquota: 35,
        limite_deducibile: 5164.57,
      }),
    )
    const salvate = await salvaImpostazioni({ ...IMPOSTAZIONI_PREDEFINITE, annoNascita: 1994 })
    expect(METODO_DI(f)).toBe('POST')
    expect(URL_DI(f)).toContain('on_conflict=user_id')
    const corpo = CORPO_DI(f)
    expect(corpo).toMatchObject({
      anno_nascita: 1994,
      limite_deducibile: 5164.57,
      tfr_mensile: null,
      datore_mensile: null,
      personale_mensile: null,
    })
    expect(corpo).not.toHaveProperty('user_id')
    expect(salvate.limiteDeducibile).toBe(516457)
  })

  it('risposta 23505 → ErroreDati vincolo', async () => {
    conFetch(async () =>
      rispostaJson({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409),
    )
    await expect(rifiuto(salvaFondo({ nome: 'Amundi' }))).resolves.toMatchObject({
      tipo: 'vincolo',
    })
  })

  it('eliminazione → DELETE con id=eq.', async () => {
    const f = conFetch(async () => new Response(null, { status: 204 }))
    await eliminaFondo('f1')
    await eliminaEstratto('e1')
    expect(METODO_DI(f, 0)).toBe('DELETE')
    expect(URL_DI(f, 0)).toContain('/fondi?id=eq.f1')
    expect(METODO_DI(f, 1)).toBe('DELETE')
    expect(URL_DI(f, 1)).toContain('/estratti_conto?id=eq.e1')
  })
})

describe('scritture tramite RPC', () => {
  const movimento = {
    fondoId: 'f1',
    data: '2025-11-14',
    note: '',
    righe: [{ tipo: 'TFR' as const, importo: 70681 }],
  }

  it('salvaMovimento: riga 70681 → importo 706.81, buste passate, id restituito', async () => {
    const f = conFetch(async () => rispostaJson('m-nuovo'))
    await expect(salvaMovimento(movimento, ['b1', 'b2'])).resolves.toBe('m-nuovo')
    expect(METODO_DI(f)).toBe('POST')
    expect(URL_DI(f)).toContain('/rpc/salva_movimento')
    expect(CORPO_DI(f)).toEqual({
      p: {
        fondo_id: 'f1',
        data: '2025-11-14',
        note: '',
        righe: [{ tipo: 'TFR', importo: 706.81 }],
        buste: ['b1', 'b2'],
      },
    })
    expect(TESTO_CORPO(f)).not.toContain('user_id')
  })

  it('salvaMovimento con id: l’id va nel payload', async () => {
    const f = conFetch(async () => rispostaJson('m1'))
    await expect(salvaMovimento({ ...movimento, id: 'm1' }, [])).resolves.toBe('m1')
    expect(CORPO_DI(f)).toMatchObject({ p: { id: 'm1', buste: [] } })
  })

  it('salvaBusta: competenza 2025-08 → 2025-08-01, nessun user_id, id restituito', async () => {
    const f = conFetch(async () => rispostaJson('b-nuova'))
    const id = await salvaBusta({
      fondoId: 'f1',
      competenza: '2025-08',
      data: '2025-09-10',
      note: '',
      righe: [{ tipo: 'TFR', importo: 17780 }],
    })
    expect(id).toBe('b-nuova')
    expect(URL_DI(f)).toContain('/rpc/salva_busta')
    expect(CORPO_DI(f)).toEqual({
      p: {
        fondo_id: 'f1',
        competenza: '2025-08-01',
        data: '2025-09-10',
        note: '',
        righe: [{ tipo: 'TFR', importo: 177.8 }],
      },
    })
    expect(TESTO_CORPO(f)).not.toContain('user_id')
  })

  it('P0001 dal trigger → vincolo con il messaggio del trigger', async () => {
    conFetch(async () =>
      rispostaJson({ code: 'P0001', message: 'Il movimento è di un altro fondo' }, 400),
    )
    await expect(rifiuto(salvaMovimento(movimento, ['b1']))).resolves.toEqual({
      tipo: 'vincolo',
      messaggio: 'Il movimento è di un altro fondo',
    })
  })

  it('eliminaMovimento → rpc/elimina_movimento con { id }', async () => {
    const f = conFetch(async () => new Response(null, { status: 204 }))
    await eliminaMovimento('m1')
    expect(METODO_DI(f)).toBe('POST')
    expect(URL_DI(f)).toContain('/rpc/elimina_movimento')
    expect(CORPO_DI(f)).toEqual({ id: 'm1' })
  })

  it('eliminaBusta → DELETE con id=eq.', async () => {
    const f = conFetch(async () => new Response(null, { status: 204 }))
    await eliminaBusta('b1')
    expect(METODO_DI(f)).toBe('DELETE')
    expect(URL_DI(f)).toContain('/buste_paga?id=eq.b1')
  })
})
