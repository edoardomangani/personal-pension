import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { insetGroupClass } from '@/components/forms/inset'
import { esci as esciDb } from '@/data/sessione'
import { rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import VistaProfilo from './VistaProfilo.vue'
import { utenteDiProva } from '@/test/utenti'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(esciDb).mockReset()
})

// Gli overlay di Reka misurano con ResizeObserver, che jsdom non ha.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
)

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

async function montaProfilo(router?: Router) {
  return mount(VistaProfilo, {
    global: { plugins: [router ?? (await routerSu('/profilo'))] },
    attachTo: document.body,
  })
}

describe('VistaProfilo (R10)', () => {
  it('con utente { email }: riga principale = email, nessuna seconda riga', async () => {
    useSessioneStore().utente = utenteDiProva()
    const wrapper = await montaProfilo()

    const righe = wrapper.get('section').findAll('p')
    expect(righe.map((p) => p.text())).toEqual(['edoardo@esempio.it'])
    expect(righe[0]?.classes()).toContain('text-lg')
    expect(wrapper.get('[data-slot="avatar-fallback"]').text()).toBe('E')
  })

  it('link Account, Impostazioni e Fisco nell’ordine, ed Esci è un button', async () => {
    useSessioneStore().utente = utenteDiProva()
    const wrapper = await montaProfilo()

    const link = wrapper.get('nav').findAll('a')
    expect(link.map((a) => [a.text(), a.attributes('href')])).toEqual([
      ['Account', '/account'],
      ['Impostazioni', '/impostazioni'],
      ['Fisco', '/fisco'],
    ])
    const esci = wrapper.findAll('button').find((b) => b.text() === 'Esci')
    expect(esci?.element.tagName).toBe('BUTTON')
  })

  it('senza sessione: «Account» e l’icona al posto delle iniziali', async () => {
    const wrapper = await montaProfilo()

    const testa = wrapper.get('section')
    expect(testa.findAll('p').map((p) => p.text())).toEqual(['Account'])
    const icona = testa.get('[data-slot="avatar-fallback"] svg')
    expect(icona.classes()).toContain('size-4.5')
    expect(icona.classes()).not.toContain('size-8')
  })
})

describe('Gruppi di «Profilo» (DS-03-C1 R5, R6)', () => {
  it('il nav e il contenitore di «Esci» sono la card di vetro condivisa', async () => {
    const wrapper = await montaProfilo()
    const classiGruppo = insetGroupClass.split(' ')

    expect(wrapper.get('nav[aria-label="Profilo"]').classes()).toEqual(
      expect.arrayContaining(classiGruppo),
    )
    const esci = wrapper.findAll('button').find((b) => b.text() === 'Esci')
    expect(esci?.element.parentElement?.classList.value.split(' ')).toEqual(
      expect.arrayContaining(classiGruppo),
    )
  })

  it('le righe tengono il filo che parte dal testo', async () => {
    const wrapper = await montaProfilo()
    const righe = [
      ...wrapper.get('nav').findAll('a'),
      ...wrapper.findAll('button').filter((b) => b.text() === 'Esci'),
    ]
    expect(righe).toHaveLength(4)
    for (const riga of righe) expect(riga.classes()).toContain('not-first:before:left-16')
  })
})

describe('Cambia foto (R18, R24)', () => {
  it('è attivo con aria-label «Cambia foto» e apre «Foto del profilo»', async () => {
    const wrapper = await montaProfilo()
    const pulsante = wrapper.get('button[aria-label="Cambia foto"]')
    expect(pulsante.attributes('aria-disabled')).toBeUndefined()
    expect(document.body.textContent).not.toContain('Foto del profilo')

    await pulsante.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Foto del profilo')
    expect(document.body.textContent).not.toContain('In arrivo')
  })
})

describe('Esci in Profilo (R11)', () => {
  it('due clic rapidi: una sola chiamata a sessione.esci, poi /accedi', async () => {
    useSessioneStore().utente = utenteDiProva()
    vi.mocked(esciDb).mockResolvedValue(undefined)
    const router = await routerSu('/profilo')
    const wrapper = await montaProfilo(router)

    const esci = wrapper.findAll('button').find((b) => b.text() === 'Esci')
    if (!esci) throw new Error('manca Esci')
    esci.element.click()
    esci.element.click()
    await flushPromises()

    expect(esciDb).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/accedi')
    expect(useSessioneStore().utente).toBeNull()
  })
})

describe('Margini di «Profilo» (DS-03-C2 R5)', () => {
  it('radice senza padding esterno (DS-03-C2 R5)', async () => {
    const wrapper = await montaProfilo()
    const radice = wrapper.get('nav[aria-label="Profilo"]').element.parentElement
    const classi = [...(radice?.classList ?? [])]
    expect(classi).toContain('max-w-140')
    expect(classi.some((c) => /^(lg:)?p[xytb]?-/.test(c))).toBe(false)
  })
})

describe('Tile di «Profilo» (DS-03-C2 R6)', () => {
  it('tile delle righe con raggio 12 (DS-03-C2 R6)', async () => {
    const wrapper = await montaProfilo()
    const tile = [
      ...wrapper.get('nav').findAll('a'),
      ...wrapper.findAll('button').filter((b) => b.text() === 'Esci'),
    ].map((riga) => riga.get('span'))
    expect(tile).toHaveLength(4)
    for (const t of tile) {
      expect(t.classes()).toContain('rounded-tile')
      expect(t.classes()).not.toContain('rounded-xl')
    }
  })
})
