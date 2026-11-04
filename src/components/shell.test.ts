import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type Component } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { TooltipProvider } from 'reka-ui'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { rotte } from '@/router'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppBottomBar from './AppBottomBar.vue'
import AppLayout from './AppLayout.vue'
import AppLogo from './AppLogo.vue'
import AppMobileHeader from './AppMobileHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
import AppLogoIcon from './AppLogoIcon.vue'
import NewMovementButton from './NewMovementButton.vue'

enableAutoUnmount(afterEach)

// Il tooltip aperto misura la freccia con ResizeObserver, che jsdom non ha.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
)

// TooltipRoot vuole un TooltipProvider antenato: in app lo dà SidebarProvider.
function conTooltip(componente: Component, props: Record<string, unknown> = {}): Component {
  return defineComponent({
    setup: () => () => h(TooltipProvider, null, () => h(componente, props)),
  })
}

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

// jsdom non ha PointerEvent: l'evento si costruisce a mano col solo pointerType.
function tocco(el: Element): void {
  const evento = new Event('pointerdown', { bubbles: true })
  Object.defineProperty(evento, 'pointerType', { value: 'touch' })
  el.dispatchEvent(evento)
}

function tooltipAperto(): boolean {
  return document.body.textContent?.includes('In arrivo') ?? false
}

describe('NewMovementButton (R6)', () => {
  it('il + tondo è aria-disabled con aria-label «Nuovo movimento»', () => {
    const wrapper = mount(conTooltip(NewMovementButton, { variant: 'round' }), {
      attachTo: document.body,
    })
    const pulsante = wrapper.get('button')
    expect(pulsante.attributes('aria-disabled')).toBe('true')
    expect(pulsante.attributes('aria-label')).toBe('Nuovo movimento')
    expect(tooltipAperto()).toBe(false)
  })

  it('mostra «In arrivo» dopo un tocco', async () => {
    const wrapper = mount(conTooltip(NewMovementButton, { variant: 'round' }), {
      attachTo: document.body,
    })
    const pulsante = wrapper.get('button')
    tocco(pulsante.element)
    await pulsante.trigger('click')
    await nextTick()
    await flushPromises()
    expect(tooltipAperto()).toBe(true)
  })

  it('mostra «In arrivo» al focus da tastiera', async () => {
    const wrapper = mount(conTooltip(NewMovementButton, { variant: 'round' }), {
      attachTo: document.body,
    })
    const pulsante = wrapper.get('button').element
    pulsante.focus()
    await nextTick()
    await flushPromises()
    expect(tooltipAperto()).toBe(true)
  })

  it('la pillola mostra il testo passato ed è aria-disabled', () => {
    const wrapper = mount(conTooltip(NewMovementButton, { testo: 'Registra' }), {
      attachTo: document.body,
    })
    const pulsante = wrapper.get('button')
    expect(pulsante.text()).toBe('Registra')
    expect(pulsante.attributes('aria-disabled')).toBe('true')
  })
})

describe('marchio (DS-02 R2-R4)', () => {
  it('AppLogoIcon è il segno in svg, senza testo', () => {
    const svg = mount(AppLogoIcon).get('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 256 256')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('fill')).toBe('currentColor')
    expect(svg.get('path').attributes('d')).toBe(
      'M60 102 L130 102 A26 26 0 0 1 130 154 L60 154 A26 26 0 0 1 60 102 Z',
    )
    const punto = svg.get('circle')
    expect([punto.attributes('cx'), punto.attributes('cy'), punto.attributes('r')]).toEqual([
      '196',
      '128',
      '26',
    ])
    expect(svg.text()).toBe('')
  })

  it('AppLogo ha il segno da 24 e il nome «Next»', () => {
    const wrapper = mount(AppLogo)
    expect(wrapper.text()).toBe('Next')
    expect(wrapper.getComponent(AppLogoIcon).classes()).toContain('size-6')
  })
})

describe('AppBottomBar (R5)', () => {
  it('ha 4 link e il + fra il secondo e il terzo', async () => {
    const router = await routerSu('/valori')
    const wrapper = mount(conTooltip(AppBottomBar), { global: { plugins: [router] } })
    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Navigazione principale')

    const ordine = nav
      .findAll('a, button')
      .map((el) => (el.element.tagName === 'A' ? el.text() : el.attributes('aria-label')))
    expect(ordine).toEqual(['Panoramica', 'Movimenti', 'Nuovo movimento', 'Valori', 'Futuro'])
  })

  it('la voce attiva ha aria-current="page" e le altre no', async () => {
    const router = await routerSu('/valori')
    const wrapper = mount(conTooltip(AppBottomBar), { global: { plugins: [router] } })
    const correnti = wrapper.findAll('a[aria-current="page"]').map((a) => a.text())
    expect(correnti).toEqual(['Valori'])
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe('/valori')
  })
})

describe('AppSidebar (R5, R6)', () => {
  function montaSidebar(router: Router) {
    const Contenitore = defineComponent({
      setup: () => () => h(SidebarProvider, null, () => h(AppSidebar)),
    })
    return mount(Contenitore, { global: { plugins: [router] } })
  }

  it('ha «Registra» disabilitato e 6 link nella navigazione', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const registra = wrapper.get('button')
    expect(registra.text()).toBe('Registra')
    expect(registra.attributes('aria-disabled')).toBe('true')

    const link = wrapper.get('nav').findAll('a')
    expect(link.map((a) => a.text())).toEqual([
      'Panoramica',
      'Movimenti',
      'Valori',
      'Futuro',
      'Fisco',
      'Impostazioni',
    ])
  })

  it('la voce attiva ha aria-current="page" e data-active', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const attiva = wrapper.get('nav a[aria-current="page"]')
    expect(attiva.text()).toBe('Fisco')
    expect(attiva.attributes('data-active')).toBe('true')
    expect(wrapper.findAll('nav a[aria-current="page"]')).toHaveLength(1)
  })

  it('il marchio porta a Panoramica', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const marchio = wrapper.findAll('a').find((a) => a.text() === 'Next')
    expect(marchio?.attributes('href')).toBe('/')
  })
})

describe('testate (R7)', () => {
  it('mostrano il titolo della rotta su telefono e desktop', async () => {
    const router = await routerSu('/futuro')
    expect(mount(AppMobileHeader, { global: { plugins: [router] } }).text()).toBe('Futuro')
    expect(mount(AppTopBar, { global: { plugins: [router] } }).text()).toBe('Futuro')
  })
})

describe('AppLayout (R3)', () => {
  it('la regione delle notifiche si chiama «Notifiche»', async () => {
    const wrapper = mount(AppLayout, {
      global: { plugins: [await routerSu('/')] },
      attachTo: document.body,
    })
    await flushPromises()
    const etichetta = wrapper.get('section[aria-live]').attributes('aria-label')
    expect(etichetta).toMatch(/^Notifiche/)
    expect(etichetta).not.toContain('Notifications')
  })
})
