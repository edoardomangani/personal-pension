import { describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { validaAccesso, type BozzaAccesso } from '@/calc/validaAccesso'
import { ErroreDati } from '@/data/errori'
import { inSospeso } from '@/test/promesse'
import { useModulo } from './useModulo'

function modulo(invia: (b: BozzaAccesso) => Promise<void> = async () => {}) {
  const bozza = reactive<BozzaAccesso>({ email: '', password: '' })
  const m = useModulo({
    bozza: () => bozza,
    valida: validaAccesso,
    invia,
    campoDi: (e) => (e.tipo === 'sessione' ? 'password' : undefined),
  })
  return { bozza, ...m }
}

describe('useModulo (R29)', () => {
  it('nessun errore prima dell’invio, anche scrivendo', async () => {
    const { bozza, errori } = modulo()
    bozza.email = 'non-email'
    await nextTick()
    expect(errori.value).toEqual({})
  })

  it('all’invio mostra gli errori e non chiama invia', async () => {
    const invia = vi.fn(async () => {})
    const m = modulo(invia)
    await expect(m.invia()).resolves.toBe(false)
    expect(m.errori.value.email).toBe('Scrivi un indirizzo email valido.')
    expect(m.errori.value.password).toBe('Scrivi la password.')
    expect(invia).not.toHaveBeenCalled()
  })

  it('dopo un invio fallito ricontrolla a ogni modifica', async () => {
    const m = modulo()
    await m.invia()
    m.bozza.email = 'giulia@esempio.it'
    await nextTick()
    expect(m.errori.value.email).toBeUndefined()
    expect(m.errori.value.password).toBe('Scrivi la password.')
  })

  it('doppio invio → una sola chiamata, inCorso nel frattempo', async () => {
    const risposta = inSospeso<void>()
    const invia = vi.fn(() => risposta.promessa)
    const m = modulo(invia)
    m.bozza.email = 'giulia@esempio.it'
    m.bozza.password = 'segreta'
    const prima = m.invia()
    const seconda = m.invia()
    expect(m.inCorso.value).toBe(true)
    risposta.risolvi()
    await expect(prima).resolves.toBe(true)
    await expect(seconda).resolves.toBe(false)
    expect(invia).toHaveBeenCalledOnce()
    expect(m.inCorso.value).toBe(false)
  })

  it('errore del server sul campo indicato', async () => {
    const m = modulo(async () => {
      throw new ErroreDati('sessione', 'Email o password non corretti.')
    })
    m.bozza.email = 'giulia@esempio.it'
    m.bozza.password = 'sbagliata'
    await expect(m.invia()).resolves.toBe(false)
    expect(m.errori.value.password).toBe('Email o password non corretti.')
    expect(m.erroreGenerale.value).toBeNull()
  })

  it('errore del server senza campo → messaggio generale', async () => {
    const m = modulo(async () => {
      throw new ErroreDati('rete', 'Rete giù')
    })
    m.bozza.email = 'giulia@esempio.it'
    m.bozza.password = 'segreta'
    await m.invia()
    expect(m.erroreGenerale.value).toBe('Rete giù')
    expect(m.errori.value).toEqual({})
  })
})
