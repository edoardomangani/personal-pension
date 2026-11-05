import { enableAutoUnmount, mount, type DOMWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import AppMobileHeader from '@/components/AppMobileHeader.vue'
import { SidebarProvider } from '@/components/ui/sidebar'
import { rotte } from '@/router'
import DrawerPreview from './DrawerPreview.vue'
import FormsSection from './FormsSection.vue'
import FoundationsSection from './FoundationsSection.vue'
import MovementRowSample, { type MovementSampleRow } from './MovementRowSample.vue'
import MovementDaySample from './MovementDaySample.vue'
import RottaCampione from './RottaCampione.vue'
import ShellSection from './ShellSection.vue'
import SheetSampleBody from './SheetSampleBody.vue'
import StructureSection from './StructureSection.vue'

enableAutoUnmount(afterEach)

// I campioni della shell leggono sessione e data di oggi dagli store.
beforeEach(() => {
  setActivePinia(createPinia())
})

// Tooltip e menu misurano con ResizeObserver, che jsdom non ha.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
)

// La vetrina vera sta su /dev/ui: i campioni devono vedere la loro rotta, non questa.
async function routerSuVetrina(): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push('/dev/ui')
  await router.isReady()
  return router
}

describe('MovementDaySample (R6)', () => {
  const props = { rows: [], density: 'desktop', day: '17/07/2026' } as const

  it('senza totale rende solo il giorno, a sinistra', () => {
    const testata = mount(MovementDaySample, { props }).get('div > div')
    expect(testata.findAll('span').map((s) => s.text())).toEqual(['17/07/2026'])
  })

  it('con il totale lo mostra accanto al giorno', () => {
    const testata = mount(MovementDaySample, { props: { ...props, total: '+519,95 €' } }).get(
      'div > div',
    )
    expect(testata.findAll('span').map((s) => s.text())).toEqual(['17/07/2026', '+519,95 €'])
  })
})

describe('raggi dei tile (DS-04 R1)', () => {
  const riga: MovementSampleRow = {
    code: 'prova',
    label: 'TFR di giugno',
    meta: 'Busta paga',
    amount: '+100,00 €',
    icon: markRaw(defineComponent({ render: () => h('svg') })),
    tile: 'bg-secondary',
    ink: 'text-income',
  }

  function tile(density: 'mobile' | 'desktop'): string[] {
    return mount(MovementRowSample, { props: { row: riga, density } })
      .get('span.grid')
      .classes()
  }

  it('sul telefono il tile da 36 ha rounded-tile e icona da 18', () => {
    const classi = tile('mobile')
    expect(classi).toEqual(expect.arrayContaining(['size-9', 'rounded-tile', '[&>svg]:size-4.5']))
    expect(classi).not.toContain('rounded-xl')
  })

  it('su desktop il tile da 32 ha rounded-lg', () => {
    const classi = tile('desktop')
    expect(classi).toEqual(expect.arrayContaining(['size-8', 'rounded-lg']))
    expect(classi.some((c) => c.startsWith('rounded-['))).toBe(false)
  })

  it('le righe restano alte 56 e 52', () => {
    expect(
      mount(MovementRowSample, { props: { row: riga, density: 'mobile' } }).classes(),
    ).toContain('min-h-14')
    expect(
      mount(MovementRowSample, { props: { row: riga, density: 'desktop' } }).classes(),
    ).toContain('min-h-13')
  })

  it('il tile della crescita ha rounded-tile e icona size-4.5', () => {
    const campione = mount(FoundationsSection).get('[data-specimen="ACC-income-tile"]')
    const quadro = campione.get('span.grid')
    expect(quadro.classes()).toEqual(expect.arrayContaining(['size-9', 'rounded-tile']))
    expect(quadro.classes()).not.toContain('rounded-xl')
    expect(quadro.get('svg').classes()).toContain('size-4.5')
  })

  it('lo skeleton della riga ha il tile da 36 con rounded-tile', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: rotte })
    const wrapper = mount(StructureSection, { global: { plugins: [router] } })
    const quadro = wrapper.get('[data-specimen="IND-skeleton-row"] .size-9')
    expect(quadro.classes()).toContain('rounded-tile')
    expect(quadro.classes()).not.toContain('rounded-xl')
  })
})

describe('StructureSection: lista dei movimenti (R5)', () => {
  it('mostra la busta di giugno nella sua giornata, prima di quella del 9 luglio', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: rotte })
    const wrapper = mount(StructureSection, { global: { plugins: [router] } })
    const lista = wrapper.get('[data-specimen="MOV-list-desktop"]')
    // Sul DOMWrapper findAllComponents è tipizzato any: si cerca sul montaggio e si tiene solo lo specimen.
    const giorni = wrapper
      .findAllComponents(MovementDaySample)
      .filter((g) => lista.element.contains(g.element))
    expect(giorni).toHaveLength(2)
    expect(giorni.map((g) => g.get('span').text())).toEqual(['17/07/2026', '09/07/2026'])
    expect(giorni[0]?.text()).toContain('TFR di giugno')
    expect(giorni[1]?.text()).not.toContain('TFR di giugno')
    expect(wrapper.text()).not.toContain('TFR di settembre')
  })
})

describe('FormsSection: righe del modulo (R4)', () => {
  // Selettore del campo a cui punta l'etichetta.
  function campoDi(gruppo: Pick<DOMWrapper<Element>, 'findAll'>, etichetta: string): string {
    const label = gruppo.findAll('label').find((l) => l.text() === etichetta)
    expect(label, `etichetta «${etichetta}»`).toBeDefined()
    return `[id="${label?.attributes('for') ?? ''}"]`
  }

  it('ha «Volontario» come importo e lo switch «Registrane un altro» spento in fondo', () => {
    const wrapper = mount(FormsSection, { attachTo: document.body })
    const righe = wrapper.get('[data-specimen="FRM-rows-desktop"]')

    const volontario = righe.get<HTMLInputElement>(campoDi(righe, 'Volontario'))
    expect(volontario.element.tagName).toBe('INPUT')
    expect(volontario.attributes('type') ?? 'text').toBe('text')
    expect(volontario.element.value).toBe('50,00')

    const etichette = righe.findAll('label').map((l) => l.text())
    expect(etichette.indexOf('Volontario')).toBe(etichette.indexOf('Importo TFR') + 1)
    expect(etichette.at(-1)).toBe('Registrane un altro')
    const interruttore = righe.get(campoDi(righe, 'Registrane un altro'))
    expect(interruttore.attributes('role')).toBe('switch')
    expect(interruttore.attributes('aria-checked')).toBe('false')

    expect(wrapper.text()).not.toContain('Versamento volontario')
  })
})

describe('SheetSampleBody: id unici (R7)', () => {
  it('drawer statico e sheet aperto insieme non hanno id doppi', () => {
    const Insieme = defineComponent({
      setup: () => () =>
        h('div', [
          h(DrawerPreview, { kind: 'form', title: 'Nuovo movimento' }),
          h('section', { 'data-istanza': 'sheet' }, [h(SheetSampleBody, { kind: 'form' })]),
        ]),
    })
    const wrapper = mount(Insieme, { attachTo: document.body })

    const ids = wrapper.findAll('[id]').map((el) => el.attributes('id'))
    expect(ids.length).toBeGreaterThanOrEqual(4)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])

    for (const istanza of [wrapper.get('[role="dialog"]'), wrapper.get('[data-istanza="sheet"]')]) {
      const etichette = istanza.findAll('label[for]')
      expect(etichette).toHaveLength(2)
      for (const label of etichette) {
        expect(istanza.find(`[id="${label.attributes('for') ?? ''}"]`).exists()).toBe(true)
      }
    }
  })
})

describe('RottaCampione (R16)', () => {
  function testataSu(router: Router, percorso: string) {
    const Campione = defineComponent({
      setup: () => () => h(RottaCampione, { percorso }, () => h(AppMobileHeader)),
    })
    return mount(Campione, { global: { plugins: [router] } })
  }

  it('su /fisco la testata è la secondaria con «Indietro» e «Fisco»', async () => {
    const router = await routerSuVetrina()
    const testata = testataSu(router, '/fisco')
    expect(testata.find('button[aria-label="Indietro"]').exists()).toBe(true)
    expect(testata.get('h1').text()).toBe('Fisco')
    expect(router.currentRoute.value.path).toBe('/dev/ui')
  })

  it('su / la testata è la principale col saluto', async () => {
    const router = await routerSuVetrina()
    const testata = testataSu(router, '/')
    expect(testata.get('h1').text()).toContain('Ciao')
    expect(testata.find('button[aria-label="Indietro"]').exists()).toBe(false)
  })
})

describe('ShellSection: la shell nuova (R16)', () => {
  async function montaShell() {
    const router = await routerSuVetrina()
    // Sidebar, piede e Profilo vogliono il contesto che in app dà la shell.
    const Sezione = defineComponent({
      setup: () => () => h(SidebarProvider, null, () => h(ShellSection)),
    })
    return mount(Sezione, { global: { plugins: [router] }, attachTo: document.body })
  }

  it('mostra testate, barre, piede e Profilo ciascuno sulla sua rotta', async () => {
    const wrapper = await montaShell()
    const campione = (codice: string) => wrapper.get(`[data-specimen="${codice}"]`)

    expect(campione('SHL-header-mobile').text()).toContain('Ciao')
    expect(campione('SHL-header-secondaria-mobile').find('[aria-label="Indietro"]').exists()).toBe(
      true,
    )
    expect(campione('SHL-topbar-desktop').text()).toContain('Registra')
    expect(campione('SHL-topbar-desktop-senza-registra').text()).not.toContain('Registra')
    expect(campione('SHL-topbar-desktop-azione').text()).toContain('Modifiche non salvate')
    expect(campione('SHL-topbar-desktop-azione').text()).toContain('Salva')
    const azioneMobile = campione('SHL-header-secondaria-azione-mobile')
    expect(azioneMobile.get('h1').text()).toBe('Account')
    expect(azioneMobile.get('[data-modifiche] .sr-only').text()).toBe('Modifiche non salvate')
    expect(campione('SHL-sidebar-desktop').get('nav').text()).not.toContain('Registra')
    const menu = campione('SHL-menu-utente-desktop').text()
    expect(menu).toContain('Account')
    expect(menu).toContain('Esci')
    expect(campione('SHL-profilo-mobile').find('[aria-label="Cambia foto"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Panoramica')
  })
})
