import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { elencaFondi } from '@/data/fondi'
import { esci as esciDb, metodiDiAccesso, sessioneCorrente } from '@/data/sessione'
import { guardAccesso, rotte } from '@/router'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'
import { utenteDiProva } from '@/test/utenti'
import { useSessioneScaduta } from './useSessioneScaduta'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
  metodiDiAccesso: vi.fn(),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn() }))
vi.mock('@/data/fondi', () => ({ elencaFondi: vi.fn() }))
vi.mock('@/data/buste', () => ({ elencaBuste: vi.fn() }))
vi.mock('@/data/movimenti', () => ({ elencaMovimenti: vi.fn() }))
vi.mock('@/data/estratti', () => ({ elencaEstratti: vi.fn() }))
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(sessioneCorrente).mockResolvedValue(utenteDiProva())
  vi.mocked(metodiDiAccesso).mockResolvedValue({ password: true, google: false })
  vi.mocked(esciDb).mockResolvedValue(undefined)
  vi.mocked(elencaFondi).mockResolvedValue([{ id: 'f1', nome: 'Amundi Seconda Pensione' }])
})

async function montaSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  router.beforeEach(guardAccesso)
  await router.push(percorso)
  await router.isReady()
  const Sonda = defineComponent({
    setup() {
      useSessioneScaduta()
      return () => null
    },
  })
  mount(Sonda, { global: { plugins: [router] } })
  return router
}

describe('useSessioneScaduta (R10)', () => {
  it('errore sessione dall’archivio su /valori → /accedi?da=/valori&avviso=sessione', async () => {
    const router = await montaSu('/valori')
    vi.mocked(elencaFondi).mockRejectedValueOnce(new ErroreDati('sessione', 'Sessione scaduta.'))
    await useArchivioStore().carica()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/accedi?da=/valori&avviso=sessione')
    expect(useSessioneStore().utente).toBeNull()
    expect(useSessioneStore().motivoUscita).toBeNull()
  })

  it('un’uscita voluta non porta l’avviso', async () => {
    const router = await montaSu('/valori')
    await useSessioneStore().esci()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/valori')
  })
})
