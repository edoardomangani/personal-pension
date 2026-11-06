import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, type Component } from 'vue'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from 'reka-ui'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { Toaster as SonnerToaster } from 'vue-sonner'
import { formatoGiorno } from '@/calc/formato'
import { rotte } from '@/router'
import { ErroreDati, type TipoErroreDati } from '@/data/errori'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'
import { AvatarImage } from '@/components/ui/avatar'
import { Toaster } from '@/components/ui/sonner'
import { buttonVariants } from '@/components/ui/button'
import { SidebarProvider, sidebarMenuButtonVariants } from '@/components/ui/sidebar'
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
import { utenteDiProva } from '@/test/utenti'
import { fornisciAzioneTestata, type AzioneTestata } from '@/composables/useAzioneTestata'

enableAutoUnmount(afterEach)

// Testate e layout leggono la sessione e la data di oggi dagli store.
beforeEach(() => {
  setActivePinia(createPinia())
  // Con un utente la shell lancia il primo carico: niente chiamate a src/data/.
  vi.spyOn(useArchivioStore(), 'carica').mockResolvedValue()
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

// Forma di AppLayout senza safe area: nella cornice non c'è.
const PADDING_SOTTO_CORNICE = 'pb-(--bottom-bar-clearance)'

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

  it('Registra a opacità piena da disattivato (DS-03-C2 R2)', () => {
    const wrapper = mount(conTooltip(NewMovementButton, { testo: 'Registra' }), {
      attachTo: document.body,
    })
    const pulsante = wrapper.get('button')
    expect(pulsante.attributes('aria-disabled')).toBe('true')
    expect(pulsante.classes()).toContain('aria-disabled:opacity-100')
    expect(pulsante.classes()).not.toContain('aria-disabled:opacity-50')
  })

  it('gli altri disattivati restano al 50% (DS-03-C2 R2)', () => {
    expect(buttonVariants().split(' ')).toContain('aria-disabled:opacity-50')
  })
})

describe('voci della sidebar (DS-03-C2 R3)', () => {
  it('voci della sidebar con gap-3 (DS-03-C2 R3)', () => {
    const classi = sidebarMenuButtonVariants().split(' ')
    expect(classi).toContain('gap-3')
    expect(classi).not.toContain('gap-2.5')
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
    const involucro = /<div\s+class="([^"]*)"\s*>\s*<VistaProfilo \/>/.exec(campione ?? '')?.[1]
    const classi = involucro?.split(/\s+/) ?? []
    expect(classi).toEqual(expect.arrayContaining(['px-4', 'pt-3', PADDING_SOTTO_CORNICE]))
    expect(classi.some((c) => c.startsWith('lg:'))).toBe(false)
    expect(classi.filter((c) => c.startsWith('pb-'))).toEqual([PADDING_SOTTO_CORNICE])
  })

  it('SHL-phone-mobile rimette sotto la barra lo stesso padding della shell', () => {
    const campione = /code="SHL-phone-mobile"[^>]*>([\s\S]*?)<\/Specimen>/.exec(
      sorgenteShellSection,
    )?.[1]
    const involucro = /<div\s+class="([^"]*)"\s*>\s*<Skeleton/.exec(campione ?? '')?.[1]
    const classi = involucro?.split(/\s+/) ?? []
    expect(classi).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-3', 'px-4', 'pt-7', PADDING_SOTTO_CORNICE]),
    )
    expect(classi.filter((c) => c.startsWith('pb-'))).toEqual([PADDING_SOTTO_CORNICE])
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

describe('safe area di testata e barra dai token (DS-04 R5)', () => {
  it('la testata mobile ha pt-(--header-mobile-pad-top) e pb-3', async () => {
    const header = mount(AppMobileHeader, {
      global: { plugins: [await routerSu('/valori')] },
    }).get('header')
    expect(header.classes()).toEqual(
      expect.arrayContaining(['px-4', 'pt-(--header-mobile-pad-top)', 'pb-3']),
    )
    expect(header.classes().some((c) => c.includes('-['))).toBe(false)
  })

  it('la barra in basso ha px-1.5 pt-1 pb-(--bottom-bar-pad-bottom)', async () => {
    const wrapper = mount(conTooltip(AppBottomBar), {
      global: { plugins: [await routerSu('/valori')] },
    })
    const nav = wrapper.get('nav')
    expect(nav.classes()).toEqual(
      expect.arrayContaining(['px-1.5', 'pt-1', 'pb-(--bottom-bar-pad-bottom)']),
    )
    expect(nav.classes().some((c) => c.includes('-['))).toBe(false)
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
    useSessioneStore().utente = utenteDiProva()
    const wrapper = montaTestata(await routerSu('/'))
    await flushPromises()
    expect(wrapper.get('a').text()).toBe('E')
  })

  // AvatarImage monta l'img solo dopo il load, che jsdom non manda: si guarda il componente.
  it('R28: con la foto nello store l’avatar usa AvatarImage con quella src', async () => {
    const sessione = useSessioneStore()
    sessione.utente = utenteDiProva()
    sessione.foto = 'data:image/jpeg;base64,AAAA'
    const wrapper = montaTestata(await routerSu('/'))
    await flushPromises()
    expect(wrapper.getComponent(AvatarImage).props('src')).toBe('data:image/jpeg;base64,AAAA')
    // Finché la foto non carica, restano le iniziali.
    expect(wrapper.get('[data-slot="avatar-fallback"]').text()).toBe('E')
  })

  it('R28: senza foto niente AvatarImage, le iniziali', async () => {
    useSessioneStore().utente = utenteDiProva()
    const wrapper = montaTestata(await routerSu('/'))
    await flushPromises()
    expect(wrapper.findComponent(AvatarImage).exists()).toBe(false)
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

  it('il toast legge margini e larghezza dalle variabili che cambiano a lg (ACC-01-C6-C1 T1-T3)', async () => {
    const wrapper = mount(AppLayout, {
      global: { plugins: [await routerSu('/')] },
      attachTo: document.body,
    })
    await flushPromises()
    const toaster = wrapper.getComponent(Toaster)
    expect(toaster.props('offset')).toEqual({
      bottom: 'var(--toast-offset-bottom)',
      right: 'var(--toast-offset-x)',
    })
    expect(toaster.props('mobileOffset')).toEqual({
      bottom: 'calc(var(--bottom-bar-height) + 20px)',
      left: '16px',
      right: '16px',
    })
    const lista = wrapper.get('section[aria-live] ol').element as HTMLElement
    expect(lista.style.getPropertyValue('--width')).toBe('var(--toast-width)')
    // Il singolo toast eredita --width dalla lista: lo riporta al 100% di questa.
    expect(wrapper.getComponent(SonnerToaster).props('toastOptions')).toMatchObject({
      style: { '--width': '100%' },
    })
  })

  it('larghezza e lati del toast cambiano a lg nel blocco di --toast-offset-bottom (ACC-01-C6-C1 T4)', () => {
    // Niente `new URL`: sotto jsdom è quello di jsdom e fileURLToPath lo rifiuta.
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'app.css'),
      'utf8',
    )
    const blocco =
      /--toast-offset-bottom:[^;]*;([\s\S]*?)@media \(width >= 64rem\)\s*\{([\s\S]*?)\}/.exec(css)
    expect(blocco).not.toBeNull()
    const [, fuori = '', dentro = ''] = blocco ?? []
    expect(fuori).toMatch(/--toast-offset-x:\s*16px;/)
    expect(fuori).toMatch(/--toast-width:\s*calc\(100%\s*-\s*2\s*\*\s*var\(--toast-offset-x\)\);/)
    expect(fuori).not.toMatch(/calc\(100%\s*-\s*32px\)/)
    expect(dentro).toMatch(/--toast-offset-bottom:\s*24px;/)
    expect(dentro).toMatch(/--toast-offset-x:\s*24px;/)
    expect(dentro).toMatch(/--toast-width:\s*320px;/)
  })

  it('padding del contenuto nella shell (DS-03-C2 R4, DS-03-C2-C2 R1)', async () => {
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
    for (const classe of ['px-4', 'pt-3', 'lg:px-12', 'lg:pt-6', 'lg:pb-(--content-pad-bottom)']) {
      expect(esterno?.classList.contains(classe)).toBe(true)
    }

    // Sotto lg: barra + 36px dalla scala + safe area, dalla variabile di app.css (DS-04 R5).
    const classiEsterno = [...(esterno?.classList ?? [])]
    expect(classiEsterno).toContain('pb-(--content-pad-bottom-mobile)')
    expect(classiEsterno.some((c) => c.includes('-['))).toBe(false)
  })
})

describe('banner offline (PWA-01 R12-R13)', () => {
  // useOnline legge navigator.onLine alla creazione: lo stub va messo prima del mount.
  function conRete(online: boolean): void {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function layoutSu(percorso: string) {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p data-slot-prova>contenuto</p>' },
      global: { plugins: [await routerSu(percorso)] },
      attachTo: document.body,
    })
    await flushPromises()
    return wrapper
  }

  it.each(['/', '/fisco'])(
    'offline su %s il banner è dentro la testata mobile (T11)',
    async (percorso) => {
      conRete(false)
      const wrapper = await layoutSu(percorso)
      const banner = wrapper.findComponent(AppMobileHeader).get('header [role="status"]')
      expect(banner.text()).toContain('Sei offline')
      expect(banner.text()).toContain('I dati si aggiornano quando torna la rete.')
      expect(banner.classes()).toContain('mt-3')
    },
  )

  it('da lg è il primo figlio del contenuto, fuori dalla barra in alto (T12)', async () => {
    conRete(false)
    const wrapper = await layoutSu('/')
    const interno = wrapper.get('[data-contenuto] > div.max-w-content').element
    const primo = interno.firstElementChild
    expect(primo?.getAttribute('role')).toBe('status')
    expect(primo?.textContent).toContain('Sei offline')
    expect(primo?.classList.contains('max-lg:hidden')).toBe(true)
    expect(wrapper.findComponent(AppTopBar).find('[role="status"]').exists()).toBe(false)
  })

  it('online nessun banner (T13)', async () => {
    conRete(true)
    const wrapper = await layoutSu('/')
    expect(wrapper.text()).not.toContain('Sei offline')
    expect(wrapper.get('[data-contenuto] > div.max-w-content').element.firstElementChild).toBe(
      wrapper.get('[data-slot-prova]').element,
    )
  })
})

describe('errore di caricamento (PWA-01 R14-R18)', () => {
  function conRete(online: boolean): void {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function conErrore(tipo: TipoErroreDati): ReturnType<typeof useArchivioStore> {
    const archivio = useArchivioStore()
    archivio.errore = new ErroreDati(tipo, 'messaggio')
    return archivio
  }

  async function layoutSu(percorso: string) {
    const wrapper = mount(AppLayout, {
      slots: { default: '<p data-slot-prova>contenuto</p>' },
      global: { plugins: [await routerSu(percorso)] },
      attachTo: document.body,
    })
    await flushPromises()
    return wrapper
  }

  const avviso = (wrapper: VueWrapper) => wrapper.find('[role="alert"]')

  it('offline con errore di rete c’è solo il banner (T14)', async () => {
    conRete(false)
    conErrore('rete')
    const wrapper = await layoutSu('/')
    expect(wrapper.text()).toContain('Sei offline')
    expect(avviso(wrapper).exists()).toBe(false)
  })

  it.each(['rete', 'altro'] as const)(
    'online con errore %s: avviso primo nel contenuto e Riprova chiama carica una volta (T15)',
    async (tipo) => {
      conRete(true)
      const archivio = conErrore(tipo)
      const carica = vi.spyOn(archivio, 'carica').mockResolvedValue()
      const wrapper = await layoutSu('/')
      const alert = avviso(wrapper)
      expect(alert.text()).toContain('Non riesco a caricare i dati')
      expect(alert.text()).toContain('Controlla la connessione e riprova.')
      const interno = wrapper.get('[data-contenuto] > div.max-w-content').element
      expect(interno.firstElementChild).toBe(alert.element)
      expect(alert.classes()).not.toContain('max-lg:hidden')
      await alert.get('button').trigger('click')
      expect(carica).toHaveBeenCalledTimes(1)
    },
  )

  it('con errore di sessione nessun avviso (T16)', async () => {
    conRete(true)
    conErrore('sessione')
    const wrapper = await layoutSu('/')
    expect(avviso(wrapper).exists()).toBe(false)
  })

  it.each([
    ['riuscita', null, false],
    ['fallita', 'rete', true],
  ] as const)(
    'durante Riprova il bottone è spento e l’avviso resta; carica %s (T17)',
    async (_esito, erroreDopo, restaAvviso) => {
      conRete(true)
      const archivio = conErrore('rete')
      let finisci: () => void = () => {}
      vi.spyOn(archivio, 'carica').mockImplementation(() => {
        archivio.errore = null
        archivio.stato = 'caricamento'
        return new Promise<void>((risolvi) => {
          finisci = () => {
            archivio.errore = erroreDopo === null ? null : new ErroreDati(erroreDopo, 'messaggio')
            archivio.stato = erroreDopo === null ? 'pronto' : 'vuoto'
            risolvi()
          }
        })
      })
      const wrapper = await layoutSu('/')
      await avviso(wrapper).get('button').trigger('click')
      expect(avviso(wrapper).exists()).toBe(true)
      expect(avviso(wrapper).get('button').attributes('disabled')).toBeDefined()

      finisci()
      await flushPromises()
      expect(avviso(wrapper).exists()).toBe(restaAvviso)
      if (restaAvviso) {
        expect(avviso(wrapper).get('button').attributes('disabled')).toBeUndefined()
      }
    },
  )

  it('con utente e archivio vuoto parte un carica()', async () => {
    conRete(true)
    useSessioneStore().utente = utenteDiProva()
    useSessioneStore().confermata = true
    const carica = vi.mocked(useArchivioStore().carica)
    await layoutSu('/')
    expect(carica).toHaveBeenCalledTimes(1)
  })

  it('senza utente (vetrina) nessun carica()', async () => {
    conRete(true)
    const carica = vi.mocked(useArchivioStore().carica)
    await layoutSu('/dev/ui')
    expect(carica).not.toHaveBeenCalled()
  })

  it('in errore di rete, al ritorno della rete carica() parte una volta (T18)', async () => {
    const getter = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const archivio = conErrore('rete')
    const carica = vi.mocked(archivio.carica)
    await layoutSu('/')
    expect(carica).not.toHaveBeenCalled()

    getter.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(carica).toHaveBeenCalledTimes(1)
  })

  it('senza errore, al ritorno della rete nessun carica() (T19)', async () => {
    const getter = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const carica = vi.mocked(useArchivioStore().carica)
    await layoutSu('/')

    getter.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(carica).not.toHaveBeenCalled()
  })
})

describe('pannello di destra (ACC-01 R20)', () => {
  async function contenutoSu(percorso: string) {
    const wrapper = mount(AppLayout, {
      global: { plugins: [await routerSu(percorso)] },
      attachTo: document.body,
    })
    await flushPromises()
    return wrapper.get('[data-contenuto]').element.parentElement
  }

  it('su /account il contenuto, testata compresa, lascia lg:pr-100', async () => {
    const contenuto = await contenutoSu('/account')
    expect(contenuto?.classList.contains('lg:pr-100')).toBe(true)
    expect(contenuto?.querySelector('header')).not.toBeNull()
  })

  it('su / no', async () => {
    const contenuto = await contenutoSu('/')
    expect(contenuto?.classList.contains('lg:pr-100')).toBe(false)
  })
})

describe('VistaSegnaposto (DS-03-C2 R5)', () => {
  it('segnaposto senza padding esterno (DS-03-C2 R5)', () => {
    const radice = mount(VistaSegnaposto).get('[data-segnaposto]')
    expect(radice.classes().some((c) => /^p[xytb]?-/.test(c))).toBe(false)
  })
})

describe('azione della testata (ACC-01 R21)', () => {
  function azioneDiProva(): AzioneTestata {
    return reactive({
      etichetta: 'Salva',
      attiva: false,
      inCorso: false,
      modificato: false,
      esegui: vi.fn(),
    })
  }

  // Fa la parte di AppLayout: fornisce il contenitore e ci mette l'azione.
  function conAzione(componente: Component, azione: AzioneTestata): Component {
    return defineComponent({
      setup() {
        fornisciAzioneTestata().value = () => azione
        return () => h(TooltipProvider, null, () => h(componente))
      },
    })
  }

  it('testata mobile su /account: «Salva» spento, poi acceso col pallino', async () => {
    const azione = azioneDiProva()
    const wrapper = mount(conAzione(AppMobileHeader, azione), {
      global: { plugins: [await routerSu('/account')] },
    })
    const salva = wrapper.findAll('button').find((b) => b.text() === 'Salva')
    expect(salva?.attributes('disabled')).toBeDefined()
    expect(salva?.classes()).toContain('h-8')
    expect(wrapper.find('[data-modifiche] .bg-warning').exists()).toBe(false)

    azione.attiva = true
    azione.modificato = true
    await nextTick()
    expect(salva?.attributes('disabled')).toBeUndefined()
    const stato = wrapper.get('[data-modifiche]')
    expect(stato.attributes('role')).toBe('status')
    expect(stato.find('.bg-warning').exists()).toBe(true)
    expect(stato.get('.sr-only').text()).toBe('Modifiche non salvate')
    expect(wrapper.find('span.size-9').exists()).toBe(false)
  })

  it('con l’invio in corso «Salva» resta spento con lo spinner', async () => {
    const azione = azioneDiProva()
    azione.attiva = true
    azione.inCorso = true
    const wrapper = mount(conAzione(AppMobileHeader, azione), {
      global: { plugins: [await routerSu('/account')] },
    })
    const salva = wrapper.findAll('button').find((b) => b.text() === 'Salva')
    expect(salva?.attributes('disabled')).toBeDefined()
    expect(salva?.find('svg.animate-spin').exists()).toBe(true)
  })

  it('barra desktop: «Modifiche non salvate» e «Salva», il clic chiama esegui', async () => {
    const azione = azioneDiProva()
    azione.attiva = true
    azione.modificato = true
    const wrapper = mount(conAzione(AppTopBar, azione), {
      global: { plugins: [await routerSu('/account')] },
    })
    const stato = wrapper.get('[data-modifiche]')
    expect(stato.text()).toBe('Modifiche non salvate')
    expect(stato.find('.sr-only').exists()).toBe(false)
    const salva = wrapper.get('button')
    expect(salva.text()).toBe('Salva')
    expect(salva.classes()).toContain('h-9')
    await salva.trigger('click')
    expect(azione.esegui).toHaveBeenCalledOnce()
  })

  it('senza provider /fisco resta con lo spazio vuoto e /futuro senza bottoni', async () => {
    const mobile = mount(AppMobileHeader, { global: { plugins: [await routerSu('/fisco')] } })
    expect(mobile.find('span.size-9[aria-hidden="true"]').exists()).toBe(true)
    expect(mobile.findAll('button').map((b) => b.attributes('aria-label'))).toEqual(['Indietro'])

    const barra = mount(conTooltip(AppTopBar), { global: { plugins: [await routerSu('/futuro')] } })
    expect(barra.find('button').exists()).toBe(false)
    expect(barra.find('[data-modifiche]').exists()).toBe(false)
  })
})
