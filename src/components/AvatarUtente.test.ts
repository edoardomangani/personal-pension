import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import AvatarUtente from './AvatarUtente.vue'

enableAutoUnmount(afterEach)

// jsdom non carica mai un'immagine: senza il finto lo stato resta `loading` e il difetto non si vede.
let esito: 'load' | 'error' = 'load'

class ImmagineFinta extends EventTarget {
  complete = false
  naturalWidth = 0
  referrerPolicy = ''
  crossOrigin: string | null = null
  #src = ''

  get src(): string {
    return this.#src
  }

  set src(valore: string) {
    this.#src = valore
    const evento = esito
    if (evento === 'load') {
      this.complete = true
      this.naturalWidth = 64
    }
    // Asincrono: reka-ui aggancia i listener subito dopo aver assegnato `src`.
    queueMicrotask(() => this.dispatchEvent(new Event(evento)))
  }
}

beforeEach(() => {
  esito = 'load'
  vi.stubGlobal('Image', ImmagineFinta)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function monta(foto: string | null, iniziali: string | null) {
  const wrapper = mount(AvatarUtente, { props: { foto, iniziali } })
  await flushPromises()
  return wrapper
}

describe('AvatarUtente', () => {
  it('T5: con la foto caricata si vede l’img e non il fallback', async () => {
    const wrapper = await monta('https://x/a.png', 'EM')
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://x/a.png')
    expect(img.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.find('[data-slot="avatar-fallback"]').exists()).toBe(false)
  })

  it('T1 (R1): tolta la foto, subito le iniziali', async () => {
    const wrapper = await monta('https://x/a.png', 'EM')
    await wrapper.setProps({ foto: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[data-slot="avatar-fallback"]').text()).toBe('EM')
  })

  it('T2 (R1): tolta la foto senza iniziali, l’icona', async () => {
    const wrapper = await monta('https://x/a.png', null)
    await wrapper.setProps({ foto: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[data-slot="avatar-fallback"]').find('svg').exists()).toBe(true)
  })

  it('T3 (R2): aggiunta una foto che carica, si vede la foto', async () => {
    const wrapper = await monta(null, 'EM')
    expect(wrapper.get('[data-slot="avatar-fallback"]').text()).toBe('EM')
    await wrapper.setProps({ foto: 'https://x/b.png' })
    await flushPromises()
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://x/b.png')
    expect(img.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.find('[data-slot="avatar-fallback"]').exists()).toBe(false)
  })

  it('T4 (R2): una foto nuova che non carica lascia le iniziali', async () => {
    const wrapper = await monta('https://x/a.png', 'EM')
    esito = 'error'
    await wrapper.setProps({ foto: 'https://x/c.png' })
    await flushPromises()
    expect(wrapper.get('[data-slot="avatar-fallback"]').text()).toBe('EM')
    // Mai l'immagine vecchia sotto la nuova.
    expect(wrapper.findAll('img').every((img) => img.attributes('src') !== 'https://x/a.png')).toBe(
      true,
    )
  })
})
