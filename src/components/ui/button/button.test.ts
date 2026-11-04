import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { Button } from '.'

function classi(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.classes()
}

describe('Button', () => {
  it('di default è un <button> pieno di taglia normale', () => {
    const wrapper = mount(Button, { slots: { default: 'Salva' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(classi(wrapper)).toEqual(
      expect.arrayContaining(['bg-primary', 'text-primary-foreground', 'h-9', 'px-4']),
    )
    expect(wrapper.text()).toBe('Salva')
  })

  it('outline ha bordo sottile e fondo della card', () => {
    const wrapper = mount(Button, { props: { variant: 'outline' } })
    expect(classi(wrapper)).toEqual(
      expect.arrayContaining(['border-[0.75px]', 'border-border', 'bg-card', 'shadow-glass']),
    )
    expect(classi(wrapper)).not.toContain('bg-primary')
  })

  it('ghost resta senza fondo e con il testo tenue', () => {
    const wrapper = mount(Button, { props: { variant: 'ghost' } })
    expect(classi(wrapper)).toEqual(
      expect.arrayContaining(['text-muted-foreground', 'hover:bg-accent']),
    )
    expect(classi(wrapper)).not.toContain('bg-primary')
  })

  it('icon è quadrato da 36px', () => {
    const wrapper = mount(Button, { props: { size: 'icon' } })
    expect(classi(wrapper)).toContain('size-9')
    expect(classi(wrapper)).not.toContain('h-9')
    expect(classi(wrapper)).not.toContain('px-4')
  })

  it('as rende l’elemento richiesto', () => {
    const wrapper = mount(Button, { props: { as: 'a' }, attrs: { href: '#/movimenti' } })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('#/movimenti')
    expect(classi(wrapper)).toContain('bg-primary')
  })

  it('asChild passa le classi al figlio senza aggiungere elementi', () => {
    const wrapper = mount(Button, {
      props: { asChild: true, variant: 'outline' },
      slots: { default: () => h('a', { href: '#/' }, 'Panoramica') },
    })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(classi(wrapper)).toContain('bg-card')
  })

  it('la class passata si fonde con quelle della variante', () => {
    const wrapper = mount(Button, { props: { class: 'px-8 w-full' } })
    expect(classi(wrapper)).toEqual(expect.arrayContaining(['px-8', 'w-full', 'bg-primary']))
    expect(classi(wrapper)).not.toContain('px-4')
  })
})
