import { useRoute, useRouter } from 'vue-router'

export type UseIndietroReturn = {
  indietro: () => Promise<void>
}

// Freccia delle testate secondarie: indietro nella cronologia dell'app, o alla madre se si è entrati da fuori.
export function useIndietro(): UseIndietroReturn {
  const router = useRouter()
  const route = useRoute()

  async function indietro(): Promise<void> {
    // Vue Router scrive `back` nello stato della cronologia solo per le navigazioni interne.
    if (router.options.history.state.back) {
      router.back()
      return
    }
    await router.replace(route.meta.madre ?? '/')
  }

  return { indietro }
}
