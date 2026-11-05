import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { reinviaCodice, verificaCodice } from '@/data/sessione'
import { rotte } from '@/router'
import { utenteDiProva } from '@/test/utenti'
import VistaVerifica from './VistaVerifica.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  esci: vi.fn(),
  verificaCodice: vi.fn(),
  reinviaCodice: vi.fn(),
  metodiDiAccesso: vi.fn(async () => ({ password: true, google: false })),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn(async () => null) }))

const EMAIL = 'giulia@esempio.it'

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

afterEach(() => vi.useRealTimers())

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

async function apri(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = await routerSu(`/verifica?email=${EMAIL}`)
  const wrapper = mount(VistaVerifica, { global: { plugins: [router] } })
  return { wrapper, router }
}

async function scrivi(wrapper: VueWrapper, codice: string): Promise<void> {
  await wrapper.get('#verifica-codice').setValue(codice)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('VistaVerifica (R15)', () => {
  it('senza email → /registrati', async () => {
    const router = await routerSu('/verifica')
    expect(router.currentRoute.value.path).toBe('/registrati')
  })

  it('mostra l’email della query', async () => {
    const { wrapper } = await apri()
    expect(wrapper.text()).toContain(EMAIL)
  })

  it('codice giusto → replace su /', async () => {
    vi.mocked(verificaCodice).mockResolvedValueOnce(utenteDiProva({ email: EMAIL }))
    const { wrapper, router } = await apri()
    const replace = vi.spyOn(router, 'replace')
    await scrivi(wrapper, '123456')
    expect(verificaCodice).toHaveBeenCalledWith(EMAIL, '123456')
    expect(replace).toHaveBeenCalledWith('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('codice non di 6 cifre → errore di R29, nessuna chiamata', async () => {
    const { wrapper } = await apri()
    await scrivi(wrapper, '12a456')
    expect(wrapper.text()).toContain('Il codice ha 6 cifre.')
    expect(verificaCodice).not.toHaveBeenCalled()
  })

  it('codice errato → messaggio sotto il campo', async () => {
    vi.mocked(verificaCodice).mockRejectedValueOnce(
      new ErroreDati(
        'vincolo',
        'Il codice non è giusto o è scaduto: controlla o fattene mandare un altro.',
      ),
    )
    const { wrapper, router } = await apri()
    await scrivi(wrapper, '000000')
    const riga = wrapper.get('#verifica-codice').element.closest('[data-slot="field"]')
    expect(riga?.textContent).toContain('Il codice non è giusto o è scaduto')
    expect(router.currentRoute.value.path).toBe('/verifica')
  })

  it('reinvio → avviso e conto alla rovescia da 60 a 0', async () => {
    vi.useFakeTimers()
    vi.mocked(reinviaCodice).mockResolvedValueOnce(undefined)
    const { wrapper } = await apri()
    await wrapper.get('[data-reinvia]').trigger('click')
    await flushPromises()
    expect(reinviaCodice).toHaveBeenCalledWith(EMAIL)
    expect(wrapper.get('[data-avviso]').text()).toContain('Codice inviato di nuovo')
    const bottone = wrapper.get<HTMLButtonElement>('[data-reinvia]')
    expect(bottone.text()).toBe('Reinvia tra 60 secondi')
    expect(bottone.element.disabled).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)
    expect(bottone.text()).toBe('Reinvia tra 59 secondi')
    await vi.advanceTimersByTimeAsync(59_000)
    expect(bottone.text()).toBe('Mandami un altro codice')
    expect(bottone.element.disabled).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('smontata durante il conto alla rovescia → nessun timer resta', async () => {
    vi.useFakeTimers()
    vi.mocked(reinviaCodice).mockResolvedValueOnce(undefined)
    const { wrapper } = await apri()
    await wrapper.get('[data-reinvia]').trigger('click')
    await flushPromises()
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('«Email sbagliata?» porta a /registrati', async () => {
    const { wrapper } = await apri()
    expect(wrapper.find('a[href="/registrati"]').text()).toContain('Crea di nuovo l’account')
  })
})

describe('VistaVerifica: area di tocco (R2)', () => {
  it.each(['Crea di nuovo l’account', 'Torna all’accesso'])(
    '«%s» ha relative e touch-target',
    async (testo) => {
      const { wrapper } = await apri()
      const link = wrapper.findAll('a').find((a) => a.text() === testo)
      expect(link?.classes()).toEqual(expect.arrayContaining(['relative', 'touch-target']))
    },
  )

  function contenitoreDeiLink(wrapper: VueWrapper): Element | null | undefined {
    return wrapper.get('a[href="/accedi"]').element.parentElement
  }

  it('i due link stanno nel contenitore dei link, con gap-6 (R1)', async () => {
    const { wrapper } = await apri()
    const contenitore = contenitoreDeiLink(wrapper)
    const paragrafo = wrapper.get('a[href="/registrati"]').element.parentElement
    expect(paragrafo?.tagName).toBe('P')
    expect(paragrafo?.parentElement).toBe(contenitore)
    expect(contenitore?.classList.contains('gap-6')).toBe(true)
  })

  it('il bottone di reinvio resta fuori dal contenitore dei link, nella colonna gap-4 (R1)', async () => {
    const { wrapper } = await apri()
    const contenitore = contenitoreDeiLink(wrapper)
    const bottone = wrapper.get('[data-reinvia]').element
    expect(contenitore?.contains(bottone)).toBe(false)
    expect(bottone.parentElement?.classList.contains('gap-4')).toBe(true)
    expect(bottone.parentElement).toBe(contenitore?.parentElement)
  })

  it('l’errore di reinvio resta fuori dal contenitore dei link (R1)', async () => {
    vi.mocked(reinviaCodice).mockRejectedValueOnce(
      new ErroreDati('rete', 'Non riesco a raggiungere il server.'),
    )
    const { wrapper } = await apri()
    await wrapper.get('[data-reinvia]').trigger('click')
    await flushPromises()
    const errore = wrapper
      .findAll('[role="alert"]')
      .find((nodo) => nodo.text() === 'Non riesco a raggiungere il server.')
    expect(errore).toBeDefined()
    const contenitore = contenitoreDeiLink(wrapper)
    expect(contenitore?.contains(errore?.element ?? null)).toBe(false)
    expect(errore?.element.parentElement).toBe(contenitore?.parentElement)
  })

  it.each([
    ['/registrati', 'Crea di nuovo l’account'],
    ['/accedi', 'Torna all’accesso'],
  ])('il link verso %s resta «%s» (R4)', async (destinazione, testo) => {
    const { wrapper } = await apri()
    expect(wrapper.get(`a[href="${destinazione}"]`).text()).toBe(testo)
  })
})
