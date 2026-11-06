import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import ResponsiveSheet from './ResponsiveSheet.vue'

// In jsdom la media query è sempre falsa: il ramo desktop si sceglie a mano.
const finestra = vi.hoisted(() => ({ desktop: false }))
vi.mock('@/composables/useIsDesktop', () => ({ useIsDesktop: () => ref(finestra.desktop) }))

enableAutoUnmount(afterEach)

afterEach(() => {
  finestra.desktop = false
})

// Il contenuto va in un portal: si cerca in document.body.
async function classiDelContenuto(slot: string): Promise<string[]> {
  mount(ResponsiveSheet, {
    props: { open: true, title: 'Prova' },
    slots: { default: '<p>corpo</p>' },
    attachTo: document.body,
  })
  await flushPromises()
  const contenuto = document.querySelector(`[data-slot="${slot}"]`)
  if (!contenuto) throw new Error(`manca ${slot}`)
  return [...contenuto.classList]
}

describe('ResponsiveSheet sotto lg (R3)', () => {
  it('il pannello dal basso ha da sé max(24px, safe area) in fondo (T4)', async () => {
    const classi = await classiDelContenuto('drawer-content')
    expect(classi).toContain(
      'data-[swipe-direction=down]:pb-[max(24px,env(safe-area-inset-bottom))]',
    )
    expect(classi.some((c) => c.endsWith('pb-[env(safe-area-inset-bottom)]'))).toBe(false)
    expect(classi.some((c) => c.startsWith('pb-'))).toBe(false)
  })
})

describe('ResponsiveSheet da lg (R9)', () => {
  it('il dialog è ancorato in alto, senza traslazione verticale, con altezza massima (T9)', async () => {
    finestra.desktop = true
    const classi = await classiDelContenuto('dialog-content')
    expect(classi).toContain('lg:top-40')
    expect(classi).toContain('lg:translate-y-0')
    expect(classi).toContain('lg:max-h-(--dialog-max-height)')
    expect(classi).toContain('translate-x-[-50%]')
    expect(classi).not.toContain('max-h-[85dvh]')
    expect(classi.filter((c) => c.startsWith('lg:translate-y-'))).toEqual(['lg:translate-y-0'])
  })
})
