import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { richiediReset } from '@/data/sessione'
import { rotte, urlApp } from '@/router'
import VistaPasswordDimenticata from './VistaPasswordDimenticata.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  esci: vi.fn(),
  richiediReset: vi.fn(),
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(richiediReset).mockResolvedValue(undefined)
})

async function apri(): Promise<VueWrapper> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push('/password-dimenticata')
  await router.isReady()
  return mount(VistaPasswordDimenticata, { global: { plugins: [router] } })
}

async function manda(wrapper: VueWrapper, email: string): Promise<void> {
  await wrapper.get('#reset-email').setValue(email)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('VistaPasswordDimenticata (R16)', () => {
  it('email non valida → errore di R29, nessuna chiamata', async () => {
    const wrapper = await apri()
    await manda(wrapper, 'non-email')
    expect(wrapper.text()).toContain('Scrivi un indirizzo email valido.')
    expect(richiediReset).not.toHaveBeenCalled()
  })

  it('chiede il link verso #/nuova-password e mostra «Controlla la posta»', async () => {
    const wrapper = await apri()
    expect(wrapper.find('[data-avviso]').exists()).toBe(false)
    await manda(wrapper, ' giulia@esempio.it ')
    expect(richiediReset).toHaveBeenCalledWith('giulia@esempio.it', urlApp('/nuova-password'))
    expect(wrapper.get('[data-avviso]').text()).toContain('Controlla la posta')
  })

  it('l’avviso è lo stesso con un’email senza account', async () => {
    const conAccount = await apri()
    await manda(conAccount, 'giulia@esempio.it')
    const testoConAccount = conAccount.get('[data-avviso]').text()
    conAccount.unmount()

    const senzaAccount = await apri()
    await manda(senzaAccount, 'nessuno@esempio.it')
    expect(senzaAccount.get('[data-avviso]').text()).toBe(testoConAccount)
  })

  it('errore di rete → messaggio sotto il modulo, nessun avviso', async () => {
    vi.mocked(richiediReset).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    const wrapper = await apri()
    await manda(wrapper, 'giulia@esempio.it')
    expect(wrapper.find('[data-avviso]').exists()).toBe(false)
    expect(wrapper.get('form [role="alert"]').text()).toBe('Rete giù')
  })
})
