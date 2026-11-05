import { ref, type Ref } from 'vue'
import { urlApp } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { messaggioDi } from './useModulo'

export interface UseAccessoGoogleReturn {
  inCorso: Ref<boolean>
  errore: Ref<string | null>
  continua: () => Promise<void>
}

/** R19: «Continua con Google» di Accedi e Crea account. Riuscito, il browser lascia l'app. */
export function useAccessoGoogle(): UseAccessoGoogleReturn {
  const sessione = useSessioneStore()
  const inCorso = ref(false)
  const errore = ref<string | null>(null)

  async function continua(): Promise<void> {
    if (inCorso.value) return
    inCorso.value = true
    errore.value = null
    try {
      // Al ritorno decide il guard (Home o onboarding); un errore torna ad Accedi con `?error=`.
      await sessione.accediConGoogle(urlApp('/'), urlApp('/accedi'))
    } catch (eccezione) {
      errore.value = messaggioDi(eccezione)
      inCorso.value = false
    }
  }

  return { inCorso, errore, continua }
}
