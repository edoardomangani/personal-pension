import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { registrati } from '@/data/sessione'
import { rotte } from '@/router'
import VistaRegistrati from './VistaRegistrati.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  esci: vi.fn(),
  registrati: vi.fn(),
  accediConGoogle: vi.fn(),
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(registrati).mockResolvedValue(undefined)
})

async function apri(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push('/registrati')
  await router.isReady()
  const wrapper = mount(VistaRegistrati, { global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, router }
}

async function compila(
  wrapper: VueWrapper,
  dati: { nome: string; email: string; password: string; conferma: string },
): Promise<void> {
  await wrapper.get('#registrati-nome').setValue(dati.nome)
  await wrapper.get('#registrati-email').setValue(dati.email)
  await wrapper.get('#registrati-password').setValue(dati.password)
  await wrapper.get('#registrati-conferma').setValue(dati.conferma)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function erroreSotto(wrapper: VueWrapper, id: string): string | undefined {
  return wrapper.get(id).element.closest('[data-slot="field"]')?.textContent ?? undefined
}

describe('VistaRegistrati (R14, R29)', () => {
  it('errori di R29 sul campo giusto, nessuna chiamata', async () => {
    const { wrapper } = await apri()
    await compila(wrapper, { nome: '   ', email: 'non-email', password: '1234567', conferma: 'x' })
    expect(erroreSotto(wrapper, '#registrati-nome')).toContain('Scrivi il tuo nome.')
    expect(erroreSotto(wrapper, '#registrati-email')).toContain('Scrivi un indirizzo email valido.')
    expect(erroreSotto(wrapper, '#registrati-password')).toContain('Almeno 8 caratteri.')
    expect(erroreSotto(wrapper, '#registrati-conferma')).toContain('Le password non coincidono.')
    expect(registrati).not.toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('registrati-nome')
  })

  it('email già registrata → errore sotto l’email', async () => {
    vi.mocked(registrati).mockRejectedValueOnce(
      new ErroreDati(
        'vincolo',
        'Esiste già un account con questa email: accedi o reimposta la password.',
      ),
    )
    const { wrapper, router } = await apri()
    await compila(wrapper, {
      nome: 'Giulia Conti',
      email: 'giulia@esempio.it',
      password: 'segreta123',
      conferma: 'segreta123',
    })
    expect(erroreSotto(wrapper, '#registrati-email')).toContain('Esiste già un account')
    expect(router.currentRoute.value.path).toBe('/registrati')
  })

  it('registrazione riuscita → /verifica?email=<email>', async () => {
    const { wrapper, router } = await apri()
    await compila(wrapper, {
      nome: 'Giulia Conti',
      email: ' giulia@esempio.it ',
      password: 'segreta123',
      conferma: 'segreta123',
    })
    expect(registrati).toHaveBeenCalledWith({
      nome: 'Giulia Conti',
      email: 'giulia@esempio.it',
      password: 'segreta123',
    })
    expect(router.currentRoute.value.path).toBe('/verifica')
    expect(router.currentRoute.value.query.email).toBe('giulia@esempio.it')
  })

  it('ha «Continua con Google» e il link ad Accedi', async () => {
    const { wrapper } = await apri()
    expect(wrapper.text()).toContain('Continua con Google')
    expect(wrapper.find('a[href="/accedi"]').exists()).toBe(true)
  })
})

describe('VistaRegistrati: area di tocco (R2)', () => {
  it('«Accedi» ha relative e touch-target', async () => {
    const { wrapper } = await apri()
    const link = wrapper.findAll('a').find((a) => a.text() === 'Accedi')
    expect(link?.classes()).toEqual(expect.arrayContaining(['relative', 'touch-target']))
  })
})
