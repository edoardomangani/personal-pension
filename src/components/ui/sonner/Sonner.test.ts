import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { Toaster as SonnerToaster } from 'vue-sonner'
import Toaster from './Sonner.vue'
import sorgente from './Sonner.vue?raw'

enableAutoUnmount(afterEach)

function opzioni(props: InstanceType<typeof Toaster>['$props'] = {}) {
  const wrapper = mount(Toaster, { props, attachTo: document.body })
  return wrapper.getComponent(SonnerToaster).props('toastOptions')
}

describe('Toaster: padding e testo del toast (ACC-04)', () => {
  it('la lastra ha padding 12px 16px e resta al 100% della lista (T1)', () => {
    const toastOptions = opzioni()
    const classi = toastOptions?.class?.split(' ') ?? []
    expect(classi).toContain('py-3!')
    expect(classi).toContain('px-4!')
    expect(toastOptions?.style).toMatchObject({ '--width': '100%' })
  })

  it('il titolo è 14px su 20px (T2)', () => {
    const classi = opzioni()?.classes?.title?.split(' ') ?? []
    expect(classi).toContain('text-sm!')
    expect(classi).toContain('leading-5!')
  })

  it('le opzioni passate da fuori si sommano a quelle del componente (T3)', () => {
    const toastOptions = opzioni({
      toastOptions: {
        class: 'extra',
        classes: { title: 'altro', description: 'descr' },
        style: { color: 'red' },
      },
    })
    const classi = toastOptions?.class?.split(' ') ?? []
    expect(classi).toEqual(expect.arrayContaining(['extra', 'py-3!', 'px-4!']))
    const titolo = toastOptions?.classes?.title?.split(' ') ?? []
    expect(titolo).toEqual(expect.arrayContaining(['altro', 'text-sm!', 'leading-5!']))
    expect(toastOptions?.classes?.description).toBe('descr')
    expect(toastOptions?.style).toMatchObject({ color: 'red', '--width': '100%' })
  })

  it('padding e testo solo con i token, senza style (T4)', () => {
    expect(sorgente).not.toMatch(/\[[^\]]*\d+px\]/)
    expect(sorgente).not.toMatch(/style[^\n]*(padding|font-size|fontSize)/)
  })
})
