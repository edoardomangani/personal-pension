import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('vetrina /dev/ui (R8) nella build', () => {
  // Timeout suo: il primo import del router trasforma a freddo le viste, e nel livello 3 gira accanto a eslint e vue-tsc.
  it('fuori dallo sviluppo la rotta non esiste e /dev/ui torna a /', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { router: routerBuild, rotte } = await import('./router')

    expect(rotte.some((rotta) => rotta.name === 'dev.ui')).toBe(false)
    expect(routerBuild.hasRoute('dev.ui')).toBe(false)
    await routerBuild.push('/dev/ui')
    expect(routerBuild.currentRoute.value.path).toBe('/')
  }, 20_000)
})
