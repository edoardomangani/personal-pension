import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { esci as esciDb } from '@/data/sessione'
import { rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { useEsci, type UseEsciReturn } from './useEsci'

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

function esciCon(router: Router): UseEsciReturn {
  let risultato: UseEsciReturn | undefined
  const Sonda = defineComponent({
    setup() {
      risultato = useEsci()
      return () => null
    },
  })
  mount(Sonda, { global: { plugins: [router] } })
  if (!risultato) throw new Error('useEsci non è stato chiamato')
  return risultato
}

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

/** Una promessa che si risolve o rifiuta quando lo decide il test. */
function inSospeso() {
  let risolvi: () => void = () => {}
  let rifiuta: (motivo: unknown) => void = () => {}
  const promessa = new Promise<void>((r, x) => {
    risolvi = r
    rifiuta = x
  })
  return { promessa, risolvi: () => risolvi(), rifiuta: (motivo: unknown) => rifiuta(motivo) }
}

describe('useEsci (R11)', () => {
  it('due chiamate ravvicinate fanno un solo logout e finiscono su / con replace', async () => {
    const remoto = inSospeso()
    vi.mocked(esciDb).mockReturnValue(remoto.promessa)
    const router = await routerSu('/profilo')
    const replace = vi.spyOn(router, 'replace')
    useSessioneStore().utente = { id: 'u1', email: 'edoardo@esempio.it' }
    const { esci, inCorso } = esciCon(router)

    const prima = esci()
    const seconda = esci()
    expect(inCorso.value).toBe(true)
    remoto.risolvi()
    await Promise.all([prima, seconda])
    await flushPromises()

    expect(esciDb).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/')
    expect(router.currentRoute.value.path).toBe('/')
    expect(useSessioneStore().utente).toBeNull()
    expect(inCorso.value).toBe(false)
  })

  it('se il logout remoto rifiuta l’esito è lo stesso', async () => {
    const remoto = inSospeso()
    vi.mocked(esciDb).mockReturnValue(remoto.promessa)
    const router = await routerSu('/account')
    const { esci, inCorso } = esciCon(router)

    const uscita = esci()
    remoto.rifiuta(new Error('rete giù'))
    await uscita
    await flushPromises()

    expect(esciDb).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/')
    expect(inCorso.value).toBe(false)
  })

  it('su / resta su / senza errori', async () => {
    vi.mocked(esciDb).mockResolvedValue(undefined)
    const router = await routerSu('/')
    const { esci } = esciCon(router)

    await expect(esci()).resolves.toBeUndefined()
    expect(router.currentRoute.value.path).toBe('/')
  })
})
