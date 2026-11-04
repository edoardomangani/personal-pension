import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import App from './App.vue'
import VistaSegnaposto from './views/VistaSegnaposto.vue'
import { router } from './router'

async function vaiA(percorso: string): Promise<void> {
  await router.push(percorso)
  await router.isReady()
}

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('router', () => {
  it('usa la history hash', () => {
    expect(router.options.history.base).toContain('#')
    expect(router.resolve('/').href).toBe('#/')
  })

  it('ha le sei rotte della navigazione con il loro titolo', () => {
    const titoli = ['/', '/movimenti', '/valori', '/futuro', '/fisco', '/impostazioni'].map(
      (percorso) => router.resolve(percorso).meta.titolo,
    )
    expect(titoli).toEqual(['Home', 'Movimenti', 'Valori', 'Futuro', 'Fisco', 'Impostazioni'])
  })

  it('ogni rotta della shell dichiara testata, madre e Registra (R4)', () => {
    const meta = [
      '/',
      '/movimenti',
      '/valori',
      '/futuro',
      '/profilo',
      '/account',
      '/fisco',
      '/impostazioni',
    ].map((percorso) => {
      const { titolo, testata, madre, registra } = router.resolve(percorso).meta
      return [percorso, titolo, testata, madre, registra ?? false]
    })
    expect(meta).toEqual([
      ['/', 'Home', 'principale', undefined, true],
      ['/movimenti', 'Movimenti', 'principale', undefined, true],
      ['/valori', 'Valori', 'principale', undefined, true],
      ['/futuro', 'Futuro', 'principale', undefined, false],
      ['/profilo', 'Profilo', 'secondaria', '/', false],
      ['/account', 'Account', 'secondaria', '/profilo', false],
      ['/fisco', 'Fisco', 'secondaria', '/profilo', false],
      ['/impostazioni', 'Impostazioni', 'secondaria', '/profilo', false],
    ])
  })

  it('/profilo e /account risolvono al segnaposto', () => {
    for (const percorso of ['/profilo', '/account']) {
      expect(router.resolve(percorso).matched[0]?.components?.default).toBe(VistaSegnaposto)
    }
  })

  it('/futuro risolve al segnaposto con titolo «Futuro»', async () => {
    await vaiA('/futuro')
    const corrente = router.currentRoute.value
    expect(corrente.matched[0]?.components?.default).toBe(VistaSegnaposto)
    expect(corrente.meta.titolo).toBe('Futuro')
  })

  it('una rotta sconosciuta come /nessuna rimanda a /', async () => {
    await vaiA('/futuro')
    await vaiA('/nessuna')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('imposta il titolo del documento dopo la navigazione', async () => {
    await vaiA('/valori')
    expect(document.title).toBe('Valori · Next')
    await vaiA('/')
    expect(document.title).toBe('Home · Next')
  })
})

describe('App', () => {
  it('su /valori mostra «Valori» nelle testate e il segnaposto', async () => {
    await vaiA('/valori')
    const wrapper = mount(App, { global: { plugins: [router] } })
    const testate = wrapper.findAll('header').map((h) => h.text())
    expect(testate).toEqual(['Valori', 'Valori'])
    expect(wrapper.find('[data-segnaposto]').exists()).toBe(true)
  })
})

describe('vetrina /dev/ui (R8)', () => {
  it('in sviluppo la rotta dev.ui esiste con titolo «Vetrina dei componenti»', () => {
    const vetrina = router.resolve('/dev/ui')
    expect(vetrina.name).toBe('dev.ui')
    expect(vetrina.meta.titolo).toBe('Vetrina dei componenti')
  })

  it('fuori dallo sviluppo la rotta non esiste e /dev/ui torna a /', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { router: routerBuild, rotte } = await import('./router')

    expect(rotte.some((rotta) => rotta.name === 'dev.ui')).toBe(false)
    expect(routerBuild.hasRoute('dev.ui')).toBe(false)
    await routerBuild.push('/dev/ui')
    expect(routerBuild.currentRoute.value.path).toBe('/')
  })

  it('App su /dev/ui mostra la vetrina con la barra in basso', async () => {
    // jsdom non ha IntersectionObserver: basta che si colleghi e si scolleghi.
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        disconnect = disconnect
      },
    )
    // Moduli ricaricati insieme: dopo un resetModules la vista caricata con import() userebbe
    // contesti (sidebar, tooltip) diversi da quelli dell'App importata in testa.
    vi.resetModules()
    const { router: routerFresco } = await import('./router')
    const { default: AppFresca } = await import('./App.vue')
    await routerFresco.push('/dev/ui')
    await routerFresco.isReady()
    const wrapper = mount(AppFresca, { global: { plugins: [routerFresco] } })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Design system')
    expect(wrapper.find('[data-specimen="SHL-bottombar-mobile"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="BTN-new-movement-mobile"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="FRM-rows-desktop"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="MOV-list-desktop"]').exists()).toBe(true)
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
