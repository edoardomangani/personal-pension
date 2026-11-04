import { ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessioneStore } from '@/stores/sessione'

export type UseEsciReturn = {
  esci: () => Promise<void>
  inCorso: Ref<boolean>
}

// Esci di «Profilo» e del menu del piede: una sola chiamata anche con tocchi ravvicinati, poi Home.
export function useEsci(): UseEsciReturn {
  const router = useRouter()
  const sessione = useSessioneStore()
  const inCorso = ref(false)

  async function esci(): Promise<void> {
    if (inCorso.value) return
    inCorso.value = true
    try {
      // `sessione.esci()` non rifiuta; su `/` il replace risolve con una navigazione duplicata, non un errore.
      await sessione.esci()
      await router.replace('/')
    } finally {
      inCorso.value = false
    }
  }

  return { esci, inCorso }
}
