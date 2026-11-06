import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useBloccoZoom } from './useBloccoZoom'

function conTouch(punti: number): void {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: punti, configurable: true })
}

// jsdom non ha i gesti di WebKit né una TouchList costruibile: eventi cancellabili a mano.
function gesto(tipo: string, dita?: number): Event {
  const evento = new Event(tipo, { bubbles: true, cancelable: true })
  if (dita !== undefined) {
    Object.defineProperty(evento, 'touches', { value: Array.from({ length: dita }) })
  }
  document.body.dispatchEvent(evento)
  return evento
}

const Sonda = defineComponent({
  setup() {
    useBloccoZoom()
    return () => h('button', { type: 'button' }, 'Tocca')
  },
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
  vi.restoreAllMocks()
})

describe('useBloccoZoom (DS-05 R10)', () => {
  it('con touch annulla i gesti di WebKit e il pizzico a due dita', () => {
    conTouch(5)
    const sonda = mount(Sonda, { attachTo: document.body })
    expect(gesto('gesturestart').defaultPrevented).toBe(true)
    expect(gesto('gesturechange').defaultPrevented).toBe(true)
    expect(gesto('touchmove', 2).defaultPrevented).toBe(true)
    sonda.unmount()
  })

  it('con touch lascia lo scorrimento a un dito e i tocchi sui bottoni', async () => {
    conTouch(5)
    const clic = vi.fn()
    const sonda = mount(Sonda, { attachTo: document.body })
    sonda.element.addEventListener('click', clic)
    expect(gesto('touchmove', 1).defaultPrevented).toBe(false)
    await sonda.trigger('click')
    expect(clic).toHaveBeenCalledOnce()
    sonda.unmount()
  })

  it('registra i listener non passivi, altrimenti iOS ignora preventDefault', () => {
    conTouch(5)
    const aggiungi = vi.spyOn(document, 'addEventListener')
    const sonda = mount(Sonda)
    for (const tipo of ['gesturestart', 'gesturechange', 'touchmove']) {
      expect(aggiungi).toHaveBeenCalledWith(tipo, expect.any(Function), { passive: false })
    }
    sonda.unmount()
  })

  it('senza touch non annulla nulla', () => {
    conTouch(0)
    const sonda = mount(Sonda)
    expect(gesto('gesturestart').defaultPrevented).toBe(false)
    expect(gesto('touchmove', 2).defaultPrevented).toBe(false)
    sonda.unmount()
  })

  it('dopo lo smontaggio non annulla più nulla', () => {
    conTouch(5)
    mount(Sonda).unmount()
    expect(gesto('gesturestart').defaultPrevented).toBe(false)
    expect(gesto('gesturechange').defaultPrevented).toBe(false)
    expect(gesto('touchmove', 2).defaultPrevented).toBe(false)
  })
})

describe('useBloccoZoom (DS-05 R10 montaggio)', () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), '..')
  const leggi = (file: string) => readFileSync(join(src, file), 'utf8')

  it('App.vue lo monta una volta, per tutte le rotte', () => {
    expect(leggi('App.vue').match(/^useBloccoZoom\(\)$/gm)).toHaveLength(1)
  })

  it('la regola html di app.css toglie doppio tocco e pizzico', () => {
    const html = leggi('styles/app.css').match(/^  html \{[^}]*\}/m)?.[0] ?? ''
    expect(html).toContain('touch-action: pan-x pan-y;')
  })
})
