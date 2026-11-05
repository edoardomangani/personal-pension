import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ErroreCaricamento from './ErroreCaricamento.vue'

describe('ErroreCaricamento (PWA-01 R15)', () => {
  it('è un alert con Riprova fratello del blocco di testo, ed emette riprova al clic (T20)', async () => {
    const wrapper = mount(ErroreCaricamento)
    expect(wrapper.attributes('role')).toBe('alert')
    const bottone = wrapper.get('button')
    expect(bottone.text()).toBe('Riprova')
    const testo = wrapper.get('[data-slot="alert-title"]').element.parentElement
    expect(bottone.element.parentElement).toBe(testo?.parentElement)
    expect(testo?.contains(bottone.element)).toBe(false)
    await bottone.trigger('click')
    expect(wrapper.emitted('riprova')).toHaveLength(1)
  })

  it('senza props mostra i testi di partenza', () => {
    const wrapper = mount(ErroreCaricamento)
    expect(wrapper.get('[data-slot="alert-title"]').text()).toBe('Non riesco a caricare i dati')
    expect(wrapper.get('[data-slot="alert-description"]').text()).toBe(
      'Controlla la connessione e riprova.',
    )
  })

  it('mostra i testi passati per prop', () => {
    const wrapper = mount(ErroreCaricamento, {
      props: { titolo: 'Movimenti non caricati', descrizione: 'Riprova tra poco.' },
    })
    expect(wrapper.get('[data-slot="alert-title"]').text()).toBe('Movimenti non caricati')
    expect(wrapper.get('[data-slot="alert-description"]').text()).toBe('Riprova tra poco.')
  })

  it('con inCorso Riprova è disattivato e non emette', async () => {
    const wrapper = mount(ErroreCaricamento, { props: { inCorso: true } })
    const bottone = wrapper.get('button')
    expect(bottone.attributes('disabled')).toBeDefined()
    await bottone.trigger('click')
    expect(wrapper.emitted('riprova')).toBeUndefined()
  })
})
