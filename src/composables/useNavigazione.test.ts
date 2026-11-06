import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  PhCalculator,
  PhCoins,
  PhMountains,
  PhPiggyBank,
  PhSlidersHorizontal,
  PhSquaresFour,
} from '@phosphor-icons/vue'
import { rotte } from '@/router'
import { useNavigazione, type UseNavigazioneReturn } from './useNavigazione'

async function navigazioneSu(percorso: string): Promise<UseNavigazioneReturn> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()

  let risultato: UseNavigazioneReturn | undefined
  const Sonda = defineComponent({
    setup() {
      risultato = useNavigazione()
      return () => null
    },
  })
  mount(Sonda, { global: { plugins: [router] } })
  if (!risultato) throw new Error('useNavigazione non è stato chiamato')
  return risultato
}

describe('useNavigazione', () => {
  it('su /valori dà 4 voci mobili e 6 desktop, con solo «Valori» attiva', async () => {
    const { vociMobili, vociDesktop } = await navigazioneSu('/valori')

    expect(vociMobili.value.map((v) => [v.titolo, v.percorso, v.icona])).toEqual([
      ['Home', '/', PhSquaresFour],
      ['Movimenti', '/movimenti', PhCoins],
      ['Valori', '/valori', PhPiggyBank],
      ['Futuro', '/futuro', PhMountains],
    ])
    expect(vociDesktop.value.map((v) => [v.titolo, v.percorso, v.icona])).toEqual([
      ['Home', '/', PhSquaresFour],
      ['Movimenti', '/movimenti', PhCoins],
      ['Valori', '/valori', PhPiggyBank],
      ['Futuro', '/futuro', PhMountains],
      ['Fisco', '/fisco', PhCalculator],
      ['Impostazioni', '/impostazioni', PhSlidersHorizontal],
    ])
    expect(vociMobili.value.filter((v) => v.attiva).map((v) => v.chiave)).toEqual(['valori'])
    expect(vociDesktop.value.filter((v) => v.attiva).map((v) => v.chiave)).toEqual(['valori'])
  })

  it('su / è attiva «Home»', async () => {
    const { vociDesktop } = await navigazioneSu('/')
    expect(vociDesktop.value.filter((v) => v.attiva).map((v) => [v.chiave, v.titolo])).toEqual([
      ['home', 'Home'],
    ])
  })

  it('su /profilo e /account nessuna voce è attiva', async () => {
    for (const percorso of ['/profilo', '/account']) {
      const { vociMobili, vociDesktop } = await navigazioneSu(percorso)
      expect(vociMobili.value.some((v) => v.attiva)).toBe(false)
      expect(vociDesktop.value.some((v) => v.attiva)).toBe(false)
    }
  })
})
