import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from './App.vue'
import VistaVuota from './views/VistaVuota.vue'
import { rotte, router } from './router'

describe('router', () => {
  it('ha la rotta / che risolve a VistaVuota', () => {
    expect(rotte.some((r) => r.path === '/')).toBe(true)
    const risolta = router.resolve('/')
    expect(risolta.matched[0]?.components?.default).toBe(VistaVuota)
  })

  it('usa la history hash', () => {
    expect(router.options.history.base).toContain('#')
    expect(router.resolve('/').href).toBe('#/')
  })

  it('montando App su / mostra il titolo', async () => {
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
    expect(wrapper.get('h1').text()).toBe('Piano pensione')
  })
})
