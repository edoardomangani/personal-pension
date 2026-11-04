import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { elencaBuste } from './buste'
import { impostaClientDati } from './client'
import { eErroreDati } from './errori'
import { elencaEstratti } from './estratti'
import { elencaFondi } from './fondi'
import { elencaMovimenti } from './movimenti'

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

const URL_DI = (f: ReturnType<typeof conFetch>, i = 0) => String(f.mock.calls[i]?.[0])

async function rifiuto(promessa: Promise<unknown>) {
  const errore: unknown = await promessa.catch((e: unknown) => e)
  return eErroreDati(errore) ? errore.tipo : null
}

afterEach(() => impostaClientDati(null))

describe('letture', () => {
  it('fondi: query senza filtro per utente', async () => {
    const f = conFetch(async () => rispostaJson([{ id: 'f1', nome: 'Amundi' }]))
    await expect(elencaFondi()).resolves.toEqual([{ id: 'f1', nome: 'Amundi' }])
    expect(URL_DI(f)).toContain('/fondi?')
    expect(URL_DI(f)).not.toContain('user_id')
  })

  it('buste: importi in centesimi, righe sulla testata giusta, competenza YYYY-MM', async () => {
    const f = conFetch(async () =>
      rispostaJson([
        {
          id: 'b1',
          fondo_id: 'f1',
          competenza: '2025-08-01',
          data: '2025-09-10',
          movimento_id: null,
          note: '',
          busta_righe: [{ tipo: 'TFR', importo: 177.8 }],
        },
        {
          id: 'b2',
          fondo_id: 'f1',
          competenza: '2025-09-01',
          data: '2025-10-10',
          movimento_id: 'm1',
          note: 'tredicesima',
          busta_righe: [
            { tipo: 'TFR', importo: 200.15 },
            { tipo: 'Datore', importo: 30 },
          ],
        },
      ]),
    )
    const buste = await elencaBuste()
    expect(buste).toEqual([
      {
        id: 'b1',
        fondoId: 'f1',
        competenza: '2025-08',
        data: '2025-09-10',
        movimentoId: null,
        note: '',
        righe: [{ tipo: 'TFR', importo: 17780 }],
      },
      {
        id: 'b2',
        fondoId: 'f1',
        competenza: '2025-09',
        data: '2025-10-10',
        movimentoId: 'm1',
        note: 'tredicesima',
        righe: [
          { tipo: 'TFR', importo: 20015 },
          { tipo: 'Datore', importo: 3000 },
        ],
      },
    ])
    expect(decodeURIComponent(URL_DI(f))).toContain('busta_righe(tipo,importo)')
  })

  it('movimenti con righe incorporate', async () => {
    conFetch(async () =>
      rispostaJson([
        {
          id: 'm1',
          fondo_id: 'f1',
          data: '2026-01-15',
          note: '',
          movimento_righe: [{ tipo: 'TFR', importo: 706.81 }],
        },
        {
          id: 'm2',
          fondo_id: 'f1',
          data: '2026-02-01',
          note: 'quota',
          movimento_righe: [{ tipo: 'Spesa', importo: 15 }],
        },
      ]),
    )
    const movimenti = await elencaMovimenti()
    expect(movimenti.map((m) => [m.id, m.righe])).toEqual([
      ['m1', [{ tipo: 'TFR', importo: 70681 }]],
      ['m2', [{ tipo: 'Spesa', importo: 1500 }]],
    ])
  })

  it('estratti: valore in centesimi', async () => {
    conFetch(async () =>
      rispostaJson([{ id: 'e1', fondo_id: 'f1', data: '2026-11-03', valore: 1641.45, note: '' }]),
    )
    await expect(elencaEstratti()).resolves.toEqual([
      { id: 'e1', fondoId: 'f1', data: '2026-11-03', valore: 164145, note: '' },
    ])
  })

  it('risposta 401 → ErroreDati sessione', async () => {
    conFetch(async () =>
      rispostaJson({ code: 'PGRST303', message: 'JWT expired', details: null, hint: null }, 401),
    )
    expect(await rifiuto(elencaBuste())).toBe('sessione')
  })

  it('fetch che lancia → rete', async () => {
    conFetch(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await rifiuto(elencaMovimenti())).toBe('rete')
  })

  it('tipo di riga sconosciuto → ErroreDati altro', async () => {
    conFetch(async () =>
      rispostaJson([
        { id: 'm1', fondo_id: 'f1', data: '2026-01-15', note: '', movimento_righe: [{ tipo: 'Boh', importo: 1 }] },
      ]),
    )
    expect(await rifiuto(elencaMovimenti())).toBe('altro')
  })
})
