import { NeonPostgrestClient } from '@neon/neon-js'
import { afterEach, describe, expect, it } from 'vitest'
import { IMPOSTAZIONI_PREDEFINITE } from '../types/dominio'
import { impostaClientDati } from './client'
import { leggiImpostazioni } from './impostazioni'

// Con maybeSingle l'SDK chiede un array e lo riduce: vuoto → null, una riga → la riga.
function conRighe(righe: unknown[]) {
  impostaClientDati(
    new NeonPostgrestClient({
      dataApiUrl: 'https://esempio.test/rest/v1',
      options: {
        global: {
          fetch: async () =>
            new Response(JSON.stringify(righe), {
              status: 200,
              headers: { 'content-type': 'application/json; charset=utf-8' },
            }),
        },
      },
    }),
  )
}

afterEach(() => impostaClientDati(null))

describe('leggiImpostazioni (R7)', () => {
  it('nessuna riga → default', async () => {
    conRighe([])
    const impostazioni = await leggiImpostazioni()
    expect(impostazioni.etaPensione).toBe(67)
    expect(impostazioni.limiteDeducibile).toBe(516457)
    expect(impostazioni).toEqual(IMPOSTAZIONI_PREDEFINITE)
  })

  it('il default è una copia modificabile, non l’oggetto congelato', async () => {
    conRighe([])
    const impostazioni = await leggiImpostazioni()
    expect(impostazioni).not.toBe(IMPOSTAZIONI_PREDEFINITE)
    expect(Object.isFrozen(impostazioni)).toBe(false)
  })

  it('riga presente → percentuali come numeri, importi in centesimi, null conservati', async () => {
    conRighe([
      {
        anno_nascita: 1994,
        eta_pensione: 67,
        rendimento: 3.5,
        inflazione: 2,
        crescita: 1.5,
        tfr_mensile: null,
        datore_mensile: null,
        personale_mensile: 50.5,
        volontario_mensile: 0,
        aliquota: 35,
        limite_deducibile: 5164.57,
      },
    ])
    await expect(leggiImpostazioni()).resolves.toEqual({
      annoNascita: 1994,
      etaPensione: 67,
      rendimento: 3.5,
      inflazione: 2,
      crescita: 1.5,
      tfrMensile: null,
      datoreMensile: null,
      personaleMensile: 5050,
      volontarioMensile: 0,
      aliquota: 35,
      limiteDeducibile: 516457,
    })
  })
})
