import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import App from './App.vue'
import VistaSegnaposto from './views/VistaSegnaposto.vue'
import { router } from './router'

async function vaiA(percorso: string): Promise<void> {
  await router.push(percorso)
  await router.isReady()
}

enableAutoUnmount(afterEach)

describe('router', () => {
  it('usa la history hash', () => {
    expect(router.options.history.base).toContain('#')
    expect(router.resolve('/').href).toBe('#/')
  })

  it('ha le sei rotte della navigazione con il loro titolo', () => {
    const titoli = ['/', '/movimenti', '/valori', '/futuro', '/fisco', '/impostazioni'].map(
      (percorso) => router.resolve(percorso).meta.titolo,
    )
    expect(titoli).toEqual(['Panoramica', 'Movimenti', 'Valori', 'Futuro', 'Fisco', 'Impostazioni'])
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
    expect(document.title).toBe('Valori · Piano pensione')
    await vaiA('/')
    expect(document.title).toBe('Panoramica · Piano pensione')
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
