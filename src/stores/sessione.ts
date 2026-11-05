import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ErroreDati, MESSAGGI, erroreDaEccezione } from '../data/errori'
import {
  accedi as accediDb,
  aggiornaNome as aggiornaNomeDb,
  cambiaPassword as cambiaPasswordDb,
  esci as esciDb,
  registrati as registratiDb,
  sessioneCorrente,
  verificaCodice as verificaCodiceDb,
  verificaPassword,
  type Utente,
} from '../data/sessione'
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

  /** Non apre la sessione: con la verifica obbligatoria la apre `verificaCodice`. */
  async function registrati(dati: {
    nome: string
    email: string
    password: string
  }): Promise<void> {
    await registratiDb({ ...dati, nome: dati.nome.trim(), email: dati.email.trim() })
  }

  /** Codice giusto → sessione aperta; un codice sbagliato rifiuta e non tocca niente. */
  async function verificaCodice(email: string, codice: string): Promise<Utente> {
    const nuovo = await verificaCodiceDb(email.trim(), codice.trim())
    // È un cambio di account: niente dati di chi c'era prima.
    svuotaStore()
    utente.value = nuovo
    errore.value = null
    pronto.value = true
    return nuovo
  }

  async function aggiornaNome(nome: string): Promise<void> {
    const pulito = nome.trim()
    await aggiornaNomeDb(pulito)
    if (utente.value !== null)
      utente.value = { ...utente.value, nome: pulito === '' ? null : pulito }
  }

  async function cambiaPassword(attuale: string, nuova: string): Promise<void> {
    await cambiaPasswordDb(attuale, nuova)
  }

  /**
   * Conferma della cancellazione (R6): con la password un nuovo accesso, per un account solo
   * Google l'email scritta. Rifiuta con un `ErroreDati` se la conferma non va.
   */
  async function confermaCancellazione(conferma: string, conPassword: boolean): Promise<void> {
    const attuale = utente.value
    if (attuale === null) throw new ErroreDati('sessione', MESSAGGI.sessione)
    if (conPassword) {
      await verificaPassword(attuale.email, conferma)
      return
    }
    if (conferma.trim().toLowerCase() !== attuale.email.trim().toLowerCase()) {
      throw new ErroreDati('vincolo', "L'email non è quella del tuo account.")
    }
  }

  return {
    utente,
    pronto,
    errore,
    ripristina,
    accedi,
    esci,
    registrati,
    verificaCodice,
    aggiornaNome,
    cambiaPassword,
    confermaCancellazione,
  }
})
