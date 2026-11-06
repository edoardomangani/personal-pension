import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'

export type UseShellHeadingReturn = {
  titolo: ComputedRef<string>
}

// Ogni pagina mostra il titolo della propria rotta, Home compresa.
export function useShellHeading(): UseShellHeadingReturn {
  const route = useRoute()

  const titolo = computed(() => route.meta.titolo ?? '')

  return { titolo }
}
