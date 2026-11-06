import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import PasswordInput from './PasswordInput.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PasswordInput', () => {
  it('parte nascosta, come password', () => {
    const wrapper = mount(PasswordInput)
    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Mostra password')
  })

  it("il tocco sull'occhio mostra la password e cambia l'etichetta, il secondo la nasconde", async () => {
    const wrapper = mount(PasswordInput)
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Nascondi password')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Mostra password')
  })

  it("fonde la class passata con pr-10 e porta gli attributi sull'input", () => {
    const wrapper = mount(PasswordInput, {
      props: { class: 'text-left' },
      attrs: { id: 'password', placeholder: 'Password' },
    })
    const input = wrapper.get('input')
    expect(input.classes()).toContain('pr-10')
    expect(input.classes()).toContain('text-left')
    expect(input.attributes('id')).toBe('password')
    expect(input.attributes('placeholder')).toBe('Password')
    expect(wrapper.get('div').attributes('id')).toBeUndefined()
  })

  it('con autofocus prende il focus al montaggio; focus() lo dà a richiesta', () => {
    const conAutofocus = mount(PasswordInput, {
      props: { autofocus: true },
      attachTo: document.body,
    })
    expect(document.activeElement).toBe(conAutofocus.get('input').element)
    conAutofocus.unmount()

    const senza = mount(PasswordInput, { attachTo: document.body })
    expect(document.activeElement).not.toBe(senza.get('input').element)
    senza.vm.focus()
    expect(document.activeElement).toBe(senza.get('input').element)
  })
})
