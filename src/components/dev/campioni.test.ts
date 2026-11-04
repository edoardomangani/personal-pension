import { enableAutoUnmount, mount, type DOMWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { rotte } from '@/router'
import DrawerPreview from './DrawerPreview.vue'
import FormsSection from './FormsSection.vue'
import MovementDaySample from './MovementDaySample.vue'
import SheetSampleBody from './SheetSampleBody.vue'
import StructureSection from './StructureSection.vue'

enableAutoUnmount(afterEach)

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

describe('StructureSection: lista dei movimenti (R5)', () => {
  it('mostra la busta di giugno nella sua giornata, prima di quella del 9 luglio', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: rotte })
    const wrapper = mount(StructureSection, { global: { plugins: [router] } })
    const lista = wrapper.get('[data-specimen="MOV-list-desktop"]')
    const giorni = lista.findAll('.flex.flex-col.gap-2')
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
