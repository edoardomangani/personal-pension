import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Il guard del router chiede sessione e fondi: un utente col suo fondo, senza rete.
vi.mock('./data/sessione', () => ({
  sessioneCorrente: vi.fn(async () => ({
    id: 'u1',
    email: 'edoardo@esempio.it',
    nome: null,
    emailVerificata: true,
    registratoIl: '2026-09-12',
  })),
  metodiDiAccesso: vi.fn(async () => ({ password: true, google: false })),
}))
vi.mock('./data/foto', () => ({ leggiFoto: vi.fn(async () => null) }))
vi.mock('./data/fondi', () => ({
  elencaFondi: vi.fn(async () => [{ id: 'f1', nome: 'Amundi Seconda Pensione' }]),
}))

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('vetrina /dev/ui (R8) nella build', () => {
  // Timeout suo: il primo import del router trasforma a freddo le viste, e nel livello 3 gira accanto a eslint e vue-tsc.
  it('in produzione la rotta non esiste e /dev/ui torna a /', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    vi.resetModules()
    const { router: routerBuild, rotte } = await import('./router')

    expect(rotte.some((rotta) => rotta.name === 'dev.ui')).toBe(false)
    expect(routerBuild.hasRoute('dev.ui')).toBe(false)
    await routerBuild.push('/dev/ui')
    expect(routerBuild.currentRoute.value.path).toBe('/')
  }, 20_000)

  it('nel modo collaudo la rotta esiste e /dev/ui resta su /dev/ui', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'collaudo')
    vi.resetModules()
    const { router: routerBuild, rotte } = await import('./router')

    expect(rotte.some((rotta) => rotta.name === 'dev.ui')).toBe(true)
    expect(routerBuild.hasRoute('dev.ui')).toBe(true)
    await routerBuild.push('/dev/ui')
    expect(routerBuild.currentRoute.value.path).toBe('/dev/ui')
  }, 20_000)
})
