import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { elencaFondi } from '@/data/fondi'
import { accedi as accediDb, metodiDiAccesso, sessioneCorrente } from '@/data/sessione'
import { salvaUltimoUtente } from '@/data/ultimoUtente'
import { guardAccesso, rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { utenteDiProva } from '@/test/utenti'
import { useConfermaSessione } from './useConfermaSessione'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
  metodiDiAccesso: vi.fn(),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn() }))
vi.mock('@/data/fondi', () => ({ elencaFondi: vi.fn() }))
// Il carico dell'archivio resta in volo: se fallisse a test finito, segnerebbe scaduta la sessione della pinia del test dopo.
const { inVolo } = vi.hoisted(() => ({ inVolo: () => new Promise<never>(() => {}) }))
vi.mock('@/data/buste', () => ({ elencaBuste: vi.fn(inVolo) }))
vi.mock('@/data/movimenti', () => ({ elencaMovimenti: vi.fn(inVolo) }))
vi.mock('@/data/estratti', () => ({ elencaEstratti: vi.fn(inVolo) }))
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn(inVolo) }))

const UTENTE = utenteDiProva()
const FONDO = { id: 'f1', nome: 'Amundi Seconda Pensione' }

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(metodiDiAccesso).mockResolvedValue({ password: true, google: false })
  vi.mocked(elencaFondi).mockResolvedValue([FONDO])
})

/** Router in memoria col guard e la sonda montata; prima conferma della sessione fallita per rete. */
async function montaProvvisorioSu(percorso: string): Promise<Router> {
  salvaUltimoUtente(UTENTE)
  vi.mocked(sessioneCorrente).mockRejectedValueOnce(new TypeError('Failed to fetch'))
  return montaSu(percorso)
}

async function montaSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  router.beforeEach(guardAccesso)
  await router.push(percorso)
  await router.isReady()
  const Sonda = defineComponent({
    setup() {
      useConfermaSessione()
      return () => null
    },
  })
  mount(Sonda, { global: { plugins: [router] } })
  return router
}

async function confermaCon(utente = UTENTE): Promise<void> {
  vi.mocked(sessioneCorrente).mockResolvedValueOnce(utente)
  await useSessioneStore().ripristina()
  await flushPromises()
}

describe('useConfermaSessione (PWA-01-C1 R9)', () => {
  it('T21: provvisorio su /movimenti, conferma senza fondo → /benvenuto', async () => {
    const router = await montaProvvisorioSu('/movimenti')
    expect(router.currentRoute.value.path).toBe('/movimenti')
    vi.mocked(elencaFondi).mockResolvedValue([])
    await confermaCon()
    expect(useSessioneStore().confermata).toBe(true)
    expect(router.currentRoute.value.path).toBe('/benvenuto')
  })

  it('T22: provvisorio su /movimenti, conferma con fondo → resta su /movimenti', async () => {
    const router = await montaProvvisorioSu('/movimenti')
    const replace = vi.spyOn(router, 'replace')
    await confermaCon()
    expect(elencaFondi).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/movimenti')
    expect(replace).not.toHaveBeenCalled()
  })

  it('provvisorio su /benvenuto, conferma con fondo → /', async () => {
    const router = await montaProvvisorioSu('/benvenuto')
    expect(router.currentRoute.value.path).toBe('/benvenuto')
    await confermaCon()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('accesso riuscito su /accedi senza provvisorio → nessun replace dal composable', async () => {
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(null)
    const router = await montaSu('/accedi')
    const replace = vi.spyOn(router, 'replace')
    vi.mocked(accediDb).mockResolvedValueOnce(UTENTE)
    await useSessioneStore().accedi(UTENTE.email, 'segreta')
    await flushPromises()
    expect(useSessioneStore().confermata).toBe(true)
    expect(replace).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/accedi')
  })

  it('conferma di un altro utente (R6a) → guard ripetuto sul nuovo', async () => {
    const router = await montaProvvisorioSu('/movimenti')
    const altro = utenteDiProva({ id: 'u2', email: 'altro@esempio.it' })
    vi.mocked(elencaFondi).mockResolvedValue([])
    await confermaCon(altro)
    expect(useSessioneStore().utente?.id).toBe('u2')
    expect(elencaFondi).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/benvenuto')
  })
})
