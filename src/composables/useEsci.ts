import { ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessioneStore } from '@/stores/sessione'

export type UseEsciReturn = {
  esci: () => Promise<void>
  inCorso: Ref<boolean>
}

// Esci di «Profilo», del menu del piede e dell'onboarding: una sola chiamata anche con tocchi ravvicinati, poi Accedi (R11).
export function useEsci(): UseEsciReturn {
  const router = useRouter()
  const sessione = useSessioneStore()
  const inCorso = ref(false)

  async function esci(): Promise<void> {
    if (inCorso.value) return
    inCorso.value = true
    try {
      // `sessione.esci()` non rifiuta; senza `da` né avviso: è un'uscita voluta.
      await sessione.esci()
      await router.replace('/accedi')
    } finally {
      inCorso.value = false
    }
  }

  return { esci, inCorso }
}
