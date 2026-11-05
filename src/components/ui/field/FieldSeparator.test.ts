import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FieldSeparator from './FieldSeparator.vue'

describe('FieldSeparator (R5, R6)', () => {
  it('con etichetta: due tratti ai lati, niente fondo e niente margini negativi', () => {
    const wrapper = mount(FieldSeparator, { slots: { default: 'oppure con la tua email' } })
    const etichetta = wrapper.get('[data-slot="field-separator-content"]')
    expect(etichetta.text()).toBe('oppure con la tua email')
    expect(etichetta.classes()).not.toContain('bg-background')
    expect(wrapper.findAll('[data-slot="separator"]')).toHaveLength(2)
    expect(wrapper.classes()).not.toContain('-my-2')
  })

  it('senza etichetta: una linea sola', () => {
    const wrapper = mount(FieldSeparator)
    expect(wrapper.findAll('[data-slot="separator"]')).toHaveLength(1)
    expect(wrapper.find('[data-slot="field-separator-content"]').exists()).toBe(false)
  })
})
