import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { esci as esciDb } from '@/data/sessione'
import { rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { SidebarProvider } from '@/components/ui/sidebar'
import NavUtente from './NavUtente.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(esciDb).mockReset()
})

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

// Il menu va in un portal: si monta nel documento e si cerca in document.body.
function montaPiede(router: Router) {
  const Contenitore = defineComponent({
    setup: () => () => h(SidebarProvider, null, () => h(NavUtente)),
  })
  return mount(Contenitore, { global: { plugins: [router] }, attachTo: document.body })
}

// jsdom non ha PointerEvent: il trigger di Reka si apre anche con Invio.
async function apri(wrapper: ReturnType<typeof montaPiede>): Promise<void> {
  await wrapper.get('button[aria-haspopup="menu"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

function menu(): HTMLElement | null {
  return document.body.querySelector('[role="menu"]')
}

describe('NavUtente (R14)', () => {
  it('con utente { email }: il trigger mostra l’email e apre il menu sopra', async () => {
    useSessioneStore().utente = { id: 'u1', email: 'edoardo@esempio.it' }
    const wrapper = montaPiede(await routerSu('/'))

    const trigger = wrapper.get('button[aria-haspopup="menu"]')
    expect(trigger.text()).toContain('edoardo@esempio.it')
    expect(menu()).toBeNull()

    await apri(wrapper)
    expect(menu()).not.toBeNull()
    expect(menu()?.getAttribute('data-side')).toBe('top')
  })

  it('il menu ha Account (link a /account) ed Esci', async () => {
    useSessioneStore().utente = { id: 'u1', email: 'edoardo@esempio.it' }
    const wrapper = montaPiede(await routerSu('/'))
    await apri(wrapper)

    const voci = Array.from(menu()?.querySelectorAll('[role="menuitem"]') ?? [])
    expect(voci.map((voce) => voce.textContent?.trim())).toEqual(['Account', 'Esci'])
    expect(voci[0]?.tagName).toBe('A')
    expect(voci[0]?.getAttribute('href')).toBe('/account')
  })

  it('Esci chiama sessione.esci una volta e porta a /', async () => {
    useSessioneStore().utente = { id: 'u1', email: 'edoardo@esempio.it' }
    vi.mocked(esciDb).mockResolvedValue(undefined)
    const router = await routerSu('/movimenti')
    const wrapper = montaPiede(router)
    await apri(wrapper)

    const esci = Array.from(menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).find(
      (voce) => voce.textContent?.trim() === 'Esci',
    )
    if (!esci) throw new Error('manca Esci')
    esci.click()
    await flushPromises()

    expect(esciDb).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/')
    expect(useSessioneStore().utente).toBeNull()
  })

  it('senza sessione: «Account» nel trigger e in testa al menu, con l’icona', async () => {
    const wrapper = montaPiede(await routerSu('/'))

    const trigger = wrapper.get('button[aria-haspopup="menu"]')
    expect(trigger.text()).toBe('Account')
    // La regola [&>svg]:size-4 del pulsante vale solo sui figli diretti: l'icona nell'avatar resta a 18.
    const icona = trigger.get('[data-slot="avatar-fallback"] svg')
    expect(icona.classes()).toContain('size-4.5')
    expect(icona.classes()).not.toContain('size-4')
    expect(icona.element.parentElement).not.toBe(trigger.element)

    await apri(wrapper)
    const testa = menu()?.querySelector('[data-slot="dropdown-menu-label"]')
    expect(testa?.textContent?.trim()).toBe('Account')
  })
})
