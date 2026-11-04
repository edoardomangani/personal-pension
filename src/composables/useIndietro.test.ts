import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { rotte } from '@/router'
import { useIndietro, type UseIndietroReturn } from './useIndietro'

function indietroCon(router: Router): UseIndietroReturn {
  let risultato: UseIndietroReturn | undefined
  const Sonda = defineComponent({
    setup() {
      risultato = useIndietro()
      return () => null
    },
  })
  mount(Sonda, { global: { plugins: [router] } })
  if (!risultato) throw new Error('useIndietro non è stato chiamato')
  return risultato
}

async function routerSu(...percorsi: string[]): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  for (const percorso of percorsi) await router.push(percorso)
  await router.isReady()
  return router
}

describe('useIndietro (R8)', () => {
  it('con cronologia (/ → /profilo) torna indietro: si è di nuovo su /', async () => {
    const router = await routerSu('/', '/profilo')
    // La cronologia in memoria non scrive `back`: lo si mette come farebbe quella del browser.
    router.options.history.state.back = '/'
    const back = vi.spyOn(router, 'back')
    const replace = vi.spyOn(router, 'replace')

    await indietroCon(router).indietro()
    await flushPromises()

    expect(back).toHaveBeenCalledOnce()
    expect(replace).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('senza cronologia (apertura diretta di /account) fa replace verso /profilo', async () => {
    const router = await routerSu('/account')
    const back = vi.spyOn(router, 'back')
    const replace = vi.spyOn(router, 'replace')

    await indietroCon(router).indietro()

    expect(back).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/profilo')
    expect(router.currentRoute.value.path).toBe('/profilo')
  })

  it('/fisco aperto direttamente porta a /profilo', async () => {
    const router = await routerSu('/fisco')
    const replace = vi.spyOn(router, 'replace')

    await indietroCon(router).indietro()

    expect(replace).toHaveBeenCalledWith('/profilo')
    expect(router.currentRoute.value.path).toBe('/profilo')
  })
})
