import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { guardAccesso } from '@/router'
import { useSessioneStore } from '@/stores/sessione'

/**
 * R9: quando l'utente provvisorio diventa confermato, ripete il guard sulla rotta corrente e,
 * se porta altrove, ci va con `replace`. Va montato una volta sola, in `App.vue`.
 */
export function useConfermaSessione(): void {
  const router = useRouter()
  const sessione = useSessioneStore()

  watch(
    () => sessione.utente !== null && !sessione.confermata,
    async (provvisorio, eraProvvisorio) => {
      // Solo il passaggio provvisorio → confermato: un'uscita o un accesso da zero non c'entrano.
      if (provvisorio || !eraProvvisorio || !sessione.confermata) return
      const corrente = router.currentRoute.value
      // Navigazione iniziale ancora in corso: decide il suo guard.
      if (corrente.matched.length === 0 || corrente.name === 'dev.ui') return
      const esito = await guardAccesso(corrente)
      // Nel frattempo si è navigati altrove: ha deciso il guard di quella navigazione.
      if (esito === true || router.currentRoute.value.fullPath !== corrente.fullPath) return
      await router.replace(esito)
    },
  )
}
