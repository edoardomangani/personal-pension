import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { salvaFondo } from '@/data/fondi'
import { salvaImpostazioni } from '@/data/impostazioni'
import { esci } from '@/data/sessione'
import { rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { utenteDiProva } from '@/test/utenti'
import { IMPOSTAZIONI_PREDEFINITE, type Impostazioni } from '@/types/dominio'
import VistaBenvenuto from './VistaBenvenuto.vue'

vi.mock('@/data/sessione', () => ({ sessioneCorrente: vi.fn(), esci: vi.fn() }))
vi.mock('@/data/fondi', () => ({ salvaFondo: vi.fn() }))
vi.mock('@/data/impostazioni', () => ({ salvaImpostazioni: vi.fn() }))

const FONDO = { id: 'f1', nome: 'Amundi Seconda Pensione' }
const EMAIL = 'giulia.conti@esempio.it'

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 5, 12))
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(salvaFondo).mockResolvedValue(FONDO)
  vi.mocked(salvaImpostazioni).mockImplementation(async (i: Impostazioni) => i)
  vi.mocked(esci).mockResolvedValue(undefined)
  useSessioneStore().utente = utenteDiProva({ email: EMAIL })
})

afterEach(() => vi.useRealTimers())

async function apri(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push('/benvenuto')
  await router.isReady()
  const wrapper = mount(VistaBenvenuto, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function compila(wrapper: VueWrapper, fondo: string, anno: string, eta = '67') {
  await wrapper.get('#benvenuto-fondo').setValue(fondo)
  await wrapper.get('#benvenuto-anno').setValue(anno)
  await wrapper.get('#benvenuto-eta').setValue(eta)
}

async function inizia(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('VistaBenvenuto (R18)', () => {
  it('età predefinita 67 e nessuna frase senza anno', async () => {
    const { wrapper } = await apri()
    expect(wrapper.get<HTMLInputElement>('#benvenuto-eta').element.value).toBe('67')
    expect(wrapper.text()).not.toContain('vai in pensione')
  })

  it('1994 e 67 → «Con questi dati vai in pensione nel 2061.»', async () => {
    const { wrapper } = await apri()
    await compila(wrapper, '', '1994')
    expect(wrapper.text()).toContain('Con questi dati vai in pensione nel 2061.')
    await wrapper.get('#benvenuto-anno').setValue('19')
    expect(wrapper.text()).not.toContain('vai in pensione')
  })

  it('«Inizia» salva fondo e impostazioni con annoNascita 1994, etaPensione 67, poi Home', async () => {
    const { wrapper, router } = await apri()
    await compila(wrapper, ' Amundi Seconda Pensione ', '1994')
    await inizia(wrapper)
    expect(salvaFondo).toHaveBeenCalledWith({ nome: 'Amundi Seconda Pensione' })
    expect(salvaImpostazioni).toHaveBeenCalledWith({
      ...IMPOSTAZIONI_PREDEFINITE,
      annoNascita: 1994,
      etaPensione: 67,
    })
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('errori di R29 sui campi, nessun salvataggio', async () => {
    const { wrapper } = await apri()
    await compila(wrapper, '', '1939', '81')
    await inizia(wrapper)
    expect(wrapper.text()).toContain('Scrivi il nome del tuo fondo pensione.')
    expect(wrapper.text()).toContain("Scrivi l'anno con quattro cifre, es. 1994.")
    expect(wrapper.text()).toContain("Un'età fra 40 e 80 anni.")
    expect(salvaFondo).not.toHaveBeenCalled()
  })

  it('impostazioni fallite → al nuovo invio il fondo non si ricrea', async () => {
    vi.mocked(salvaImpostazioni).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    const { wrapper, router } = await apri()
    await compila(wrapper, 'Amundi Seconda Pensione', '1994')
    await inizia(wrapper)
    expect(wrapper.get('form [role="alert"]').text()).toBe('Rete giù')
    expect(router.currentRoute.value.path).toBe('/benvenuto')

    await inizia(wrapper)
    expect(salvaFondo).toHaveBeenCalledOnce()
    expect(salvaImpostazioni).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('piede «Account <email> · Esci» che porta ad Accedi', async () => {
    const { wrapper, router } = await apri()
    expect(wrapper.text()).toContain(`Account ${EMAIL}`)
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(esci).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/accedi')
  })
})
