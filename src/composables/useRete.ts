import { useOnline } from '@vueuse/core'
import { inject, provide, type InjectionKey, type Ref } from 'vue'

const CHIAVE: InjectionKey<Readonly<Ref<boolean>>> = Symbol('rete')

/** Solo per la vetrina: forza lo stato della rete ai discendenti. */
export function fornisciRete(online: Readonly<Ref<boolean>>): void {
  provide(CHIAVE, online)
}

/** `online` parte da `navigator.onLine` e segue gli eventi `online`/`offline` di `window`. */
export function useRete(): { online: Readonly<Ref<boolean>> } {
  return { online: inject(CHIAVE, null) ?? useOnline() }
}
