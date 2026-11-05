import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AlertTitle } from '@/components/ui/alert'
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

describe('ErroreCaricamento, titolo che va a capo (PWA-01-C2)', () => {
  it('il titolo non è limitato a una riga (T1)', () => {
    const titolo = mount(ErroreCaricamento).get('[data-slot="alert-title"]')
    expect(titolo.classes()).toContain('line-clamp-none')
    expect(titolo.classes()).not.toContain('line-clamp-1')
  })

  it('un titolo lungo per prop resta intero e senza limite di righe (T2)', () => {
    const lungo = 'Un titolo molto lungo che non sta in una riga'
    const titolo = mount(ErroreCaricamento, { props: { titolo: lungo } }).get(
      '[data-slot="alert-title"]',
    )
    expect(titolo.classes()).toContain('line-clamp-none')
    expect(titolo.classes()).not.toContain('line-clamp-1')
    expect(titolo.text()).toBe(lungo)
  })

  it('il titolo mantiene font-medium (T3)', () => {
    const titolo = mount(ErroreCaricamento).get('[data-slot="alert-title"]')
    expect(titolo.classes()).toContain('font-medium')
    expect(titolo.classes()).not.toContain('font-semibold')
  })

  it('AlertTitle senza classi in più resta su una riga (T4)', () => {
    const titolo = mount(AlertTitle, { slots: { default: 'Titolo' } })
    expect(titolo.classes()).toContain('line-clamp-1')
  })
})
