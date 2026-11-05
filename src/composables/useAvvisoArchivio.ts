import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useRete } from '@/composables/useRete'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'

/** L'archivio nella shell: primo caricamento, errore con Riprova, ricarica al ritorno della rete. */
export function useAvvisoArchivio(): {
  visibile: ComputedRef<boolean>
  inCorso: Readonly<Ref<boolean>>
  riprova: () => Promise<void>
} {
  const archivio = useArchivioStore()
  const sessione = useSessioneStore()
  const { online } = useRete()
  // `carica()` azzera l'errore appena parte: durante Riprova l'avviso resta per questo.
  const inCorso = ref(false)

  // Gli errori di sessione li gestisce il guard; offline c'è solo il banner.
  const errore = computed(() => {
    const tipo = archivio.errore?.tipo
    return tipo === 'rete' || tipo === 'altro'
  })
  const visibile = computed(() => online.value && (errore.value || inCorso.value))

  async function riprova(): Promise<void> {
    if (inCorso.value) return
    inCorso.value = true
    try {
      await archivio.carica()
    } finally {
      inCorso.value = false
    }
  }

  // Senza utente (la vetrina) niente carico: finirebbe in sessione scaduta.
  watch(
    () => sessione.utente?.id,
    (id) => {
      if (id !== undefined && archivio.stato === 'vuoto' && archivio.errore === null) {
        void archivio.carica()
      }
    },
    { immediate: true },
  )

  // Solo al passaggio offline → online, e solo se l'ultimo carico è fallito per la rete.
  watch(online, (ora, prima) => {
    if (ora && !prima && archivio.errore?.tipo === 'rete') void archivio.carica()
  })

  return { visibile, inCorso, riprova }
}
