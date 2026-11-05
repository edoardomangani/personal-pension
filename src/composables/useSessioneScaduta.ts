import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessioneStore } from '@/stores/sessione'

/**
 * R10: quando lo store segna la sessione scaduta, torna ad Accedi con la rotta dov'eri e
 * l'avviso. Va montato una volta sola, in `App.vue`.
 */
export function useSessioneScaduta(): void {
  const router = useRouter()
  const sessione = useSessioneStore()

  watch(
    () => sessione.motivoUscita,
    async (motivo) => {
      if (motivo !== 'sessione') return
      sessione.azzeraMotivoUscita()
      const corrente = router.currentRoute.value
      // Su una pagina di accesso non c'è una rotta a cui tornare.
      const da = corrente.meta.accesso === true ? undefined : corrente.fullPath
      await router.replace({
        path: '/accedi',
        query: da === undefined || da === '/' ? { avviso: 'sessione' } : { da, avviso: 'sessione' },
      })
    },
  )
}
