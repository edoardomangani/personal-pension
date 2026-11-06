import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Component, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { fornisciRete, useRete } from './useRete'

function reteDa(montaggio: (Sonda: Component) => void): Readonly<Ref<boolean>> {
  let online: Readonly<Ref<boolean>> | undefined
  const Sonda = defineComponent({
    setup() {
      online = useRete().online
      return () => null
    },
  })
  montaggio(Sonda)
  if (!online) throw new Error('useRete non è stato chiamato')
  return online
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRete (R11)', () => {
  it('parte da navigator.onLine falso e passa a vero con l’evento online (T10)', async () => {
    const getter = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const online = reteDa((Sonda) => mount(Sonda))
    expect(online.value).toBe(false)

    getter.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await nextTick()
    expect(online.value).toBe(true)
  })

  it('torna falso con l’evento offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const online = reteDa((Sonda) => mount(Sonda))
    expect(online.value).toBe(true)

    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(online.value).toBe(false)
  })

  it('lo stato fornito da un antenato vince su navigator', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const online = reteDa((Sonda) =>
      mount(
        defineComponent({
          setup() {
            fornisciRete(ref(false))
            return () => h(Sonda)
          },
        }),
      ),
    )
    expect(online.value).toBe(false)
  })
})
