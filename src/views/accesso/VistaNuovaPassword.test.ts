import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { reimpostaPassword } from '@/data/sessione'
import { rotte } from '@/router'
import VistaNuovaPassword from './VistaNuovaPassword.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  esci: vi.fn(),
  reimpostaPassword: vi.fn(),
  richiediReset: vi.fn(),
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(reimpostaPassword).mockResolvedValue(undefined)
})

async function apri(percorso: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  const wrapper = mount(VistaNuovaPassword, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function salva(wrapper: VueWrapper, password: string, conferma: string): Promise<void> {
  await wrapper.get('#nuova-password').setValue(password)
  await wrapper.get('#nuova-password-conferma').setValue(conferma)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

const titolo = (wrapper: VueWrapper) => wrapper.get('h1').text()

describe('VistaNuovaPassword (R17)', () => {
  it('con token mostra «Scegli una nuova password» senza la riga dell’account', async () => {
    const { wrapper } = await apri('/nuova-password?token=abc')
    expect(titolo(wrapper)).toBe('Scegli una nuova password')
    expect(wrapper.text()).not.toContain("Per l'account")
  })

  it('?error=INVALID_TOKEN → «Il link è scaduto»', async () => {
    const { wrapper } = await apri('/nuova-password?error=INVALID_TOKEN')
    expect(titolo(wrapper)).toBe('Il link è scaduto')
  })

  it('senza token → «Il link è scaduto»', async () => {
    const { wrapper } = await apri('/nuova-password')
    expect(titolo(wrapper)).toBe('Il link è scaduto')
  })

  it('errori di R29 sotto i campi, nessuna chiamata', async () => {
    const { wrapper } = await apri('/nuova-password?token=abc')
    await salva(wrapper, '1234567', 'x')
    expect(wrapper.text()).toContain('Almeno 8 caratteri.')
    expect(wrapper.text()).toContain('Le password non coincidono.')
    expect(reimpostaPassword).not.toHaveBeenCalled()
  })

  it('salvataggio → /accedi?avviso=password', async () => {
    const { wrapper, router } = await apri('/nuova-password?token=abc')
    await salva(wrapper, 'nuova12345', 'nuova12345')
    expect(reimpostaPassword).toHaveBeenCalledWith('abc', 'nuova12345')
    expect(router.currentRoute.value.fullPath).toBe('/accedi?avviso=password')
  })

  it('token rifiutato dal server → «Il link è scaduto»', async () => {
    vi.mocked(reimpostaPassword).mockRejectedValueOnce(
      new ErroreDati('vincolo', 'Il link è scaduto.'),
    )
    const { wrapper, router } = await apri('/nuova-password?token=vecchio')
    await salva(wrapper, 'nuova12345', 'nuova12345')
    expect(titolo(wrapper)).toBe('Il link è scaduto')
    expect(router.currentRoute.value.path).toBe('/nuova-password')
  })
})
