import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from './App.vue'
import VistaProfilo from './views/VistaProfilo.vue'
import VistaSegnaposto from './views/VistaSegnaposto.vue'
import { router, titoloDocumento } from './router'

async function vaiA(percorso: string): Promise<void> {
  await router.push(percorso)
  await router.isReady()
}

enableAutoUnmount(afterEach)

afterEach(() => {
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

  it('/profilo risolve a VistaProfilo, /account al segnaposto', () => {
    expect(router.resolve('/profilo').matched[0]?.components?.default).toBe(VistaProfilo)
    expect(router.resolve('/account').matched[0]?.components?.default).toBe(VistaSegnaposto)
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

  it('titoloDocumento compone il titolo della scheda', () => {
    expect(titoloDocumento(undefined)).toBe('Next')
    expect(titoloDocumento('Valori')).toBe('Valori · Next')
  })
})

describe('App', () => {
  it('su /valori mostra «Valori» nelle testate e il segnaposto', async () => {
    await vaiA('/valori')
    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
    const titoli = wrapper.findAll('header h1').map((h) => h.text())
    expect(titoli).toEqual(['Valori', 'Valori'])
    expect(wrapper.find('[data-segnaposto]').exists()).toBe(true)
  })
})

describe('vetrina /dev/ui (R8)', () => {
  it('in sviluppo la rotta dev.ui esiste con titolo «Vetrina dei componenti»', () => {
    const vetrina = router.resolve('/dev/ui')
    expect(vetrina.name).toBe('dev.ui')
    expect(vetrina.meta.titolo).toBe('Vetrina dei componenti')
  })

  // Timeout suo: la prima volta trasforma tutta la vetrina, e nel livello 3 gira accanto a eslint e vue-tsc.
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
    await vaiA('/dev/ui')
    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
    await flushPromises()

    expect(wrapper.find('[data-specimen="SHL-bottombar-mobile"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="BTN-new-movement-mobile"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="FRM-rows-desktop"]').exists()).toBe(true)
    expect(wrapper.find('[data-specimen="MOV-list-desktop"]').exists()).toBe(true)
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalled()
  }, 20_000)
  it('un solo titolo e nessun margine proprio (DS-03-C2 R8 R9)', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        disconnect = vi.fn()
      },
    )
    await vaiA('/dev/ui')
    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
    await flushPromises()

    // Gli h1 dentro i campioni della shell sono titoli di altre pagine finte.
    const h1 = wrapper.findAll('h1')
    expect(h1.map((h) => h.text())).not.toContain('Design system')
    const titoli = h1.filter((h) => !h.element.closest('[data-specimen]')).map((h) => h.text())
    expect(titoli.length).toBeGreaterThan(0)
    expect(titoli.every((t) => t === 'Vetrina dei componenti')).toBe(true)

    const sezioni = wrapper.find('nav[aria-label="Indice della vetrina"] + div')
    expect(sezioni.exists()).toBe(true)
    expect(sezioni.classes()).not.toContain('px-4')
    expect(sezioni.classes()).not.toContain('py-8')
    expect(sezioni.classes()).toContain('lg:pl-10')
    wrapper.unmount()
  }, 20_000)
})
