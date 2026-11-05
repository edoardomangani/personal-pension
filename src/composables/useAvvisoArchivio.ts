import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useRete } from '@/composables/useRete'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'

/**
 * L'archivio nella shell: primo caricamento solo da confermato, errore con Riprova,
 * ricontrollo della sessione e ricarica al ritorno della rete.
 */
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
  // Durante il ricontrollo al ritorno della rete l'errore di sessione è quello di prima dell'offline.
  const automatico = ref(false)
  // Finché è in volo, il primo carico lo lancia lei: il watch della conferma non ne parte un altro.
  let sequenza: Promise<void> | null = null

  const provvisorio = computed(() => sessione.utente !== null && !sessione.confermata)

  // Gli errori di sessione li gestisce il guard; offline c'è solo il banner.
  const errore = computed(() => {
    const tipo = archivio.errore?.tipo
    if (tipo === 'rete' || tipo === 'altro') return true
    const tipoSessione = sessione.errore?.tipo
    return provvisorio.value && (tipoSessione === 'rete' || tipoSessione === 'altro')
  })
  const visibile = computed(
    () => online.value && ((errore.value && !automatico.value) || inCorso.value),
  )

  async function caricaSeVuoto(): Promise<void> {
    if (archivio.stato === 'vuoto' && archivio.errore === null) await archivio.carica()
  }

  /** Ripristino della sessione e, se confermata, primo carico; le chiamate sovrapposte la condividono. */
  function ricontrolla(): Promise<void> {
    sequenza ??= (async () => {
      try {
        await sessione.ripristina()
        if (sessione.confermata) await caricaSeVuoto()
      } finally {
        sequenza = null
      }
    })()
    return sequenza
  }

  async function riprova(): Promise<void> {
    if (inCorso.value) return
    inCorso.value = true
    try {
      if (sequenza !== null || provvisorio.value) await ricontrolla()
      else await archivio.carica()
    } finally {
      inCorso.value = false
    }
  }

  // Senza utente confermato (la vetrina, o la sessione ancora da verificare) niente carico.
  watch(
    () => (sessione.confermata ? sessione.utente?.id : undefined),
    (id) => {
      if (id !== undefined && sequenza === null) void caricaSeVuoto()
    },
    { immediate: true },
  )

  // Solo al passaggio offline → online: da provvisorio si ricontrolla la sessione,
  // altrimenti si ricarica solo se l'ultimo carico è fallito per la rete.
  watch(online, async (ora, prima) => {
    if (!ora || prima) return
    if (provvisorio.value) {
      automatico.value = true
      try {
        await ricontrolla()
      } finally {
        automatico.value = false
      }
    } else if (archivio.errore?.tipo === 'rete') void archivio.carica()
  })

  return { visibile, inCorso, riprova }
}
