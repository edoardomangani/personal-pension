import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, type Component } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from 'reka-ui'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { formatoGiorno } from '@/calc/formato'
import { rotte } from '@/router'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppBottomBar from './AppBottomBar.vue'
import AppLayout from './AppLayout.vue'
import AppLogo from './AppLogo.vue'
import AppMobileHeader from './AppMobileHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
import AppLogoIcon from './AppLogoIcon.vue'
import NewMovementButton from './NewMovementButton.vue'
import sorgenteShellSection from './dev/ShellSection.vue?raw'
import VistaSegnaposto from '@/views/VistaSegnaposto.vue'

enableAutoUnmount(afterEach)

// Testate e layout leggono la sessione e la data di oggi dagli store.
beforeEach(() => {
  setActivePinia(createPinia())
})

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

// Pigra: si ferma al primo </Specimen>, non a un campione successivo.
function campioneLogo(sorgente: string): string | null {
  return /code="SHL-logo"[^>]*>([\s\S]*?)<\/Specimen>/.exec(sorgente)?.[1] ?? null
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

  it('AppLogo porta il layout nella radice', () => {
    const wrapper = mount(AppLogo)
    expect(wrapper.element.nodeType).toBe(Node.ELEMENT_NODE)
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['flex', 'h-8', 'items-center', 'gap-2.5']),
    )
    expect(wrapper.text()).toBe('Next')
    expect(wrapper.getComponent(AppLogoIcon).classes()).toContain('size-6')
    expect(wrapper.get('span').classes()).toEqual(
      expect.arrayContaining(['tracking-[-0.02em]', 'text-lg', 'font-semibold']),
    )
  })

  it('SHL-logo monta AppLogo senza involucro', () => {
    const campione = campioneLogo(sorgenteShellSection)
    expect(campione).not.toBeNull()
    expect(campione).toContain('<AppLogo />')
    expect(campione).not.toMatch(/h-8|gap-2\.5/)
  })

  it('SHL-profilo-mobile rimette il padding della shell a ogni larghezza', () => {
    const campione = /code="SHL-profilo-mobile"[^>]*>([\s\S]*?)<\/Specimen>/.exec(
      sorgenteShellSection,
    )?.[1]
    const involucro = /<div class="([^"]*)">\s*<VistaProfilo \/>/.exec(campione ?? '')?.[1]
    const classi = involucro?.split(/\s+/) ?? []
    expect(classi).toEqual(expect.arrayContaining(['px-4', 'pt-3']))
    expect(classi.some((c) => c.startsWith('lg:'))).toBe(false)
  })

  it('SHL-logo: la cattura si ferma al campione', () => {
    const logoNelSuccessivo = campioneLogo(
      '<Specimen code="SHL-logo"><AppLogoIcon /></Specimen><Specimen code="X"><AppLogo /></Specimen>',
    )
    expect(logoNelSuccessivo).toBe('<AppLogoIcon />')
    expect(logoNelSuccessivo).not.toContain('<AppLogo />')

    const conInvolucro = campioneLogo(
      '<Specimen code="SHL-logo"><div class="flex h-8 gap-2.5"><AppLogo /></div></Specimen>',
    )
    expect(conInvolucro).toMatch(/h-8|gap-2\.5/)

    expect(campioneLogo('<Specimen code="SHL-segno-24"><AppLogo /></Specimen>')).toBeNull()
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
    expect(ordine).toEqual(['Home', 'Movimenti', 'Nuovo movimento', 'Valori', 'Futuro'])
  })

  it('su /profilo resta intera e nessuna voce è accesa', async () => {
    const router = await routerSu('/profilo')
    const wrapper = mount(conTooltip(AppBottomBar), { global: { plugins: [router] } })
    const ordine = wrapper
      .get('nav')
      .findAll('a, button')
      .map((el) => (el.element.tagName === 'A' ? el.text() : el.attributes('aria-label')))
    expect(ordine).toEqual(['Home', 'Movimenti', 'Nuovo movimento', 'Valori', 'Futuro'])
    expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
  })

  it('la voce attiva ha aria-current="page" e le altre no', async () => {
    const router = await routerSu('/valori')
    const wrapper = mount(conTooltip(AppBottomBar), { global: { plugins: [router] } })
    const correnti = wrapper.findAll('a[aria-current="page"]').map((a) => a.text())
    expect(correnti).toEqual(['Valori'])
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toBe('/valori')
  })
})

describe('AppSidebar (R5, R13)', () => {
  function montaSidebar(router: Router) {
    const Contenitore = defineComponent({
      setup: () => () => h(SidebarProvider, null, () => h(AppSidebar)),
    })
    return mount(Contenitore, { global: { plugins: [router] }, attachTo: document.body })
  }

  it('non ha «Registra» e ha 6 link nella navigazione (R13)', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    expect(wrapper.text()).not.toContain('Registra')
    expect(wrapper.get('nav').find('button').exists()).toBe(false)

    const link = wrapper.get('nav').findAll('a')
    expect(link.map((a) => a.text())).toEqual([
      'Home',
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

  it('su /account nessuna voce è accesa (R13)', async () => {
    const wrapper = montaSidebar(await routerSu('/account'))
    expect(wrapper.get('nav').findAll('a')).toHaveLength(6)
    expect(wrapper.findAll('[aria-current]')).toHaveLength(0)
  })

  it('il piede mostra «Account» e un pulsante che apre il menu (R14)', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const piede = wrapper.get('[data-sidebar="footer"]')
    const pulsante = piede.get('button[aria-haspopup="menu"]')
    expect(pulsante.text()).toBe('Account')
    await pulsante.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(document.body.querySelector('[role="menu"]')?.textContent).toContain('Esci')
  })

  it('il marchio porta a Home', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const marchio = wrapper.findAll('a').find((a) => a.text() === 'Next')
    expect(marchio?.attributes('href')).toBe('/')
  })

  it('il link del marchio non ricopia il layout del logo', async () => {
    const wrapper = montaSidebar(await routerSu('/fisco'))
    const marchio = wrapper.get('[data-sidebar="header"] a')
    expect(marchio.text()).toBe('Next')
    expect(marchio.attributes('href')).toBe('/')
    expect(marchio.classes()).toEqual(expect.arrayContaining(['rounded-lg', 'px-1']))
    expect(marchio.classes()).not.toContain('h-8')
    expect(marchio.classes()).not.toContain('gap-2.5')
  })
})

describe('testata mobile (R5-R7)', () => {
  function montaTestata(router: Router) {
    return mount(AppMobileHeader, { global: { plugins: [router] } })
  }

  it('su /valori: h1 «Valori», avatar verso /profilo, niente data né freccia (R5)', async () => {
    const wrapper = montaTestata(await routerSu('/valori'))
    expect(wrapper.get('h1').text()).toBe('Valori')
    const avatar = wrapper.get('a')
    expect(avatar.attributes('href')).toBe('/profilo')
    expect(avatar.attributes('aria-label')).toBe('Profilo: account e impostazioni')
    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Indietro"]').exists()).toBe(false)
  })

  it('su / senza nome: «Ciao» e la data di oggi (R6)', async () => {
    const wrapper = montaTestata(await routerSu('/'))
    expect(wrapper.get('h1').text()).toBe('Ciao')
    expect(wrapper.get('p').text()).toBe(formatoGiorno(useArchivioStore().oggi))
    expect(wrapper.get('p').text()).not.toBe('')
  })

  it('su / con utente { email }: l’avatar mostra l’iniziale dell’email', async () => {
    useSessioneStore().utente = { id: 'u1', email: 'edoardo@esempio.it' }
    const wrapper = montaTestata(await routerSu('/'))
    await flushPromises()
    expect(wrapper.get('a').text()).toBe('E')
  })

  it('su / senza sessione: l’icona dell’avatar è a 18px (DS-03-C1 R3)', async () => {
    const wrapper = montaTestata(await routerSu('/'))
    await flushPromises()
    expect(wrapper.get('[data-slot="avatar-fallback"] svg').classes()).toContain('size-4.5')
  })

  it('su /fisco: «Indietro», titolo «Fisco», nessun avatar (R7)', async () => {
    const wrapper = montaTestata(await routerSu('/fisco'))
    expect(wrapper.find('button[aria-label="Indietro"]').exists()).toBe(true)
    expect(wrapper.get('h1').text()).toBe('Fisco')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('la freccia su /fisco aperto direttamente porta a /profilo (R8)', async () => {
    const router = await routerSu('/fisco')
    const wrapper = montaTestata(router)
    await wrapper.get('button[aria-label="Indietro"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/profilo')
  })
})

describe('testata desktop (R12)', () => {
  function montaTopBar(router: Router) {
    return mount(conTooltip(AppTopBar), { global: { plugins: [router] } })
  }

  it('su /movimenti: h1 «Movimenti» e «Registra» disattivato', async () => {
    const wrapper = montaTopBar(await routerSu('/movimenti'))
    expect(wrapper.get('h1').text()).toBe('Movimenti')
    const registra = wrapper.get('button')
    expect(registra.text()).toBe('Registra')
    expect(registra.attributes('aria-disabled')).toBe('true')
  })

  it('in Home il titolo è «Home», non il saluto, e «Registra» c’è', async () => {
    const wrapper = montaTopBar(await routerSu('/'))
    expect(wrapper.get('h1').text()).toBe('Home')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('su /futuro «Registra» non c’è e nemmeno la freccia indietro', async () => {
    const wrapper = montaTopBar(await routerSu('/futuro'))
    expect(wrapper.get('h1').text()).toBe('Futuro')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Registra')
  })
})

describe('AppLayout (R3)', () => {
  it('su / monta la testata mobile e quella desktop', async () => {
    const wrapper = mount(AppLayout, {
      global: { plugins: [await routerSu('/')] },
      attachTo: document.body,
    })
    await flushPromises()
    expect(wrapper.findComponent(AppMobileHeader).exists()).toBe(true)
    expect(wrapper.findComponent(AppTopBar).text()).toContain('Registra')
  })

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

  it('padding del contenuto nella shell (DS-03-C2 R4)', async () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p data-slot-prova>contenuto</p>' },
      global: { plugins: [await routerSu('/')] },
      attachTo: document.body,
    })
    await flushPromises()
    const interno = wrapper.get('[data-slot-prova]').element.parentElement
    expect(interno?.classList.contains('max-w-content')).toBe(true)
    const classiInterno = [...(interno?.classList ?? [])]
    expect(classiInterno.some((c) => /^(lg:)?p[xtb]?-/.test(c))).toBe(false)

    const esterno = interno?.closest('[data-contenuto]')
    expect(esterno).not.toBeNull()
    expect(esterno).not.toBe(interno)
    for (const classe of ['px-4', 'pt-3', 'lg:px-12', 'lg:pt-6', 'lg:pb-12']) {
      expect(esterno?.classList.contains(classe)).toBe(true)
    }
  })
})

describe('VistaSegnaposto (DS-03-C2 R5)', () => {
  it('segnaposto senza padding esterno (DS-03-C2 R5)', () => {
    const radice = mount(VistaSegnaposto).get('[data-segnaposto]')
    expect(radice.classes().some((c) => /^p[xytb]?-/.test(c))).toBe(false)
  })
})
