import { ref, shallowRef, watch, type Ref } from 'vue'
import { eValida, type ErroriDi } from '@/calc/validaAccesso'
import { erroreDaEccezione, type ErroreDati } from '@/data/errori'

export interface OpzioniModulo<Bozza> {
  /** La bozza della vista (un `reactive`): il modulo la osserva, non la possiede. */
  bozza: () => Bozza
  valida: (bozza: Bozza) => ErroriDi<Bozza>
  /** Rifiuta con l'errore da mostrare; un esito gestito dalla vista (es. navigazione) risolve. */
  invia: (bozza: Bozza) => Promise<void>
  /** Il campo su cui mostrare un errore del server; `undefined` → messaggio sotto il modulo. */
  campoDi?: (errore: ErroreDati) => keyof Bozza | undefined
  /** Un esito del server che la vista tratta a parte (es. una navigazione): true se l'ha gestito. */
  gestisci?: (errore: ErroreDati) => Promise<boolean>
}

export interface UseModuloReturn<Bozza> {
  errori: Ref<ErroriDi<Bozza>>
  erroreGenerale: Ref<string | null>
  inCorso: Ref<boolean>
  /** Risolve true se l'invio è riuscito o l'esito l'ha gestito la vista. Non rifiuta. */
  invia: () => Promise<boolean>
}

/**
 * R29 e § UX: validatore all'invio, poi a ogni modifica dopo il primo invio fallito;
 * un solo invio in volo. Il focus sul campo sbagliato lo fa la vista.
 */
export function useModulo<Bozza extends object>(
  opzioni: OpzioniModulo<Bozza>,
): UseModuloReturn<Bozza> {
  // shallowRef: gli errori si sostituiscono sempre per intero.
  const errori = shallowRef<ErroriDi<Bozza>>({})
  const erroreGenerale = ref<string | null>(null)
  const inCorso = ref(false)
  let tentato = false

  watch(
    opzioni.bozza,
    (bozza) => {
      if (tentato) errori.value = opzioni.valida(bozza)
    },
    { deep: true },
  )

  async function invia(): Promise<boolean> {
    if (inCorso.value) return false
    const bozza = opzioni.bozza()
    const trovati = opzioni.valida(bozza)
    errori.value = trovati
    erroreGenerale.value = null
    if (!eValida(trovati)) {
      tentato = true
      return false
    }
    inCorso.value = true
    try {
      await opzioni.invia(bozza)
      return true
    } catch (eccezione) {
      const errore = erroreDaEccezione(eccezione)
      if (await opzioni.gestisci?.(errore)) return true
      tentato = true
      const campo = opzioni.campoDi?.(errore)
      if (campo === undefined) erroreGenerale.value = errore.messaggio
      else errori.value = { ...errori.value, [campo]: errore.messaggio }
      return false
    } finally {
      inCorso.value = false
    }
  }

  return { errori, erroreGenerale, inCorso, invia }
}

/** Il primo campo, nell'ordine della pagina, che ha un errore: lì va il focus. */
export function primoCampoConErrore<Bozza>(
  ordine: readonly (keyof Bozza)[],
  errori: ErroriDi<Bozza>,
): keyof Bozza | undefined {
  return ordine.find((campo) => errori[campo] !== undefined)
}

/** Il messaggio in italiano di un errore qualunque, per chi non passa da un modulo. */
export function messaggioDi(eccezione: unknown): string {
  return erroreDaEccezione(eccezione).messaggio
}
