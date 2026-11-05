import {
  computed,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  type ComputedRef,
  type InjectionKey,
  type ShallowRef,
} from 'vue'

/** L'azione di una pagina nelle testate (es. «Salva» in Account). */
export interface AzioneTestata {
  etichetta: string
  attiva: boolean
  inCorso: boolean
  /** Modifiche non salvate: pallino e «Modifiche non salvate». */
  modificato: boolean
  esegui: () => void
}

/** Il getter della vista: chi lo legge dentro un computed ne segue le dipendenze. */
type Contenitore = ShallowRef<(() => AzioneTestata) | null>

const CHIAVE: InjectionKey<Contenitore> = Symbol('azioneTestata')

// Le testate sono sorelle della vista, non antenate: l'azione passa dal layout che le contiene tutte.
export function fornisciAzioneTestata(): Contenitore {
  const contenitore: Contenitore = shallowRef(null)
  provide(CHIAVE, contenitore)
  return contenitore
}

/** Per le testate: l'azione della pagina corrente, o null (anche senza layout). */
export function useAzioneTestata(): ComputedRef<AzioneTestata | null> {
  const contenitore = inject(CHIAVE, null)
  return computed(() => contenitore?.value?.() ?? null)
}

/** Per le viste: mette l'azione nelle testate finché la vista resta montata. */
export function registraAzioneTestata(azione: () => AzioneTestata): void {
  const contenitore = inject(CHIAVE, null)
  if (contenitore === null) return
  contenitore.value = azione
  onUnmounted(() => {
    // La vista successiva può aver già messo la sua.
    if (contenitore.value === azione) contenitore.value = null
  })
}
