import { defineStore } from 'pinia'
import { ref } from 'vue'
import { erroreDaEccezione, type ErroreDati } from '../data/errori'
import { accedi as accediDb, esci as esciDb, sessioneCorrente, type Utente } from '../data/sessione'
import { useArchivioStore } from './archivio'

export const useSessioneStore = defineStore('sessione', () => {
  const utente = ref<Utente | null>(null)
  const pronto = ref(false)
  const errore = ref<ErroreDati | null>(null)
  let ripristino: Promise<void> | null = null

  // Ogni store con dati dell'utente va svuotato qui.
  function svuotaStore(): void {
    useArchivioStore().reset()
  }

  /**
   * Non rifiuta; `pronto` diventa true con ogni esito. Idempotente dopo un successo,
   * un errore si riprova; le chiamate sovrapposte condividono quella in volo.
   */
  function ripristina(): Promise<void> {
    ripristino ??= (async () => {
      try {
        utente.value = await sessioneCorrente()
        errore.value = null
      } catch (eccezione) {
        utente.value = null
        errore.value = erroreDaEccezione(eccezione)
        // Siamo dopo l'await: `ripristino` è questa promessa, e finché è in volo nessuno la sostituisce.
        ripristino = null
      } finally {
        pronto.value = true
      }
    })()
    return ripristino
  }

  /** Rifiuta con un `ErroreDati`: il modulo di login lo mostra. */
  async function accedi(email: string, password: string): Promise<Utente> {
    // Il cambio di account non deve vedere i dati di quello prima.
    svuotaStore()
    utente.value = null
    const nuovo = await accediDb(email, password)
    utente.value = nuovo
    errore.value = null
    pronto.value = true
    return nuovo
  }

  /** Svuota sempre gli store, anche se il logout remoto non riesce. */
  async function esci(): Promise<void> {
    svuotaStore()
    utente.value = null
    try {
      await esciDb()
    } catch {
      // Sessione già scaduta o rete giù: in memoria non resta niente, ed è quello che conta.
    }
  }

  return { utente, pronto, errore, ripristina, accedi, esci }
})
