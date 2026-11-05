import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cancellaAccount as cancellaAccountDb } from '../data/account'
import { ErroreDati, MESSAGGI, erroreDaEccezione } from '../data/errori'
import { eliminaFoto, leggiFoto, salvaFoto as salvaFotoDb } from '../data/foto'
import {
  accedi as accediDb,
  aggiornaNome as aggiornaNomeDb,
  cambiaPassword as cambiaPasswordDb,
  esci as esciDb,
  metodiDiAccesso,
  registrati as registratiDb,
  sessioneCorrente,
  verificaCodice as verificaCodiceDb,
  verificaPassword,
  type MetodiDiAccesso,
  type Utente,
} from '../data/sessione'
import { useArchivioStore } from './archivio'

export const useSessioneStore = defineStore('sessione', () => {
  const utente = ref<Utente | null>(null)
  const pronto = ref(false)
  const errore = ref<ErroreDati | null>(null)
  const foto = ref<string | null>(null)
  const metodi = ref<MetodiDiAccesso | null>(null)
  let ripristino: Promise<void> | null = null

  // Ogni store con dati dell'utente va svuotato qui.
  function svuotaStore(): void {
    useArchivioStore().reset()
    foto.value = null
    metodi.value = null
  }

  const eAncora = (id: string) => utente.value?.id === id

  /**
   * Foto e metodi in parallelo, senza ritardare l'accesso. Un esito che arriva dopo l'uscita
   * o un cambio di account si scarta; un errore lascia null.
   */
  function caricaProfilo(id: string): void {
    void leggiPer(id, leggiFoto, (letta) => (foto.value = letta))
    void leggiPer(id, metodiDiAccesso, (letti) => (metodi.value = letti))
  }

  async function leggiPer<T>(
    id: string,
    leggi: () => Promise<T>,
    scrivi: (valore: T) => void,
  ): Promise<void> {
    try {
      const valore = await leggi()
      if (eAncora(id)) scrivi(valore)
    } catch {
      // Senza foto o metodi l'app va avanti con le iniziali e le righe di Accesso generiche.
    }
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
        if (utente.value !== null) caricaProfilo(utente.value.id)
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
    caricaProfilo(nuovo.id)
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
    caricaProfilo(nuovo.id)
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

  /** Rifiuta con un `ErroreDati` se l'utente non è più quello per cui è partito il salvataggio. */
  async function salvaFoto(dataUrl: string): Promise<void> {
    const id = utente.value?.id
    if (id === undefined) throw new ErroreDati('sessione', MESSAGGI.sessione)
    await salvaFotoDb(dataUrl)
    if (eAncora(id)) foto.value = dataUrl
  }

  async function rimuoviFoto(): Promise<void> {
    const id = utente.value?.id
    if (id === undefined) throw new ErroreDati('sessione', MESSAGGI.sessione)
    await eliminaFoto()
    if (eAncora(id)) foto.value = null
  }

  /** R6: conferma, RPC, poi uscita locale. Se la RPC rifiuta, l'utente resta dentro. */
  async function cancellaAccount(conferma: string, conPassword: boolean): Promise<void> {
    await confermaCancellazione(conferma, conPassword)
    await cancellaAccountDb()
    await esci()
  }

  return {
    utente,
    pronto,
    errore,
    foto,
    metodi,
    ripristina,
    accedi,
    esci,
    registrati,
    verificaCodice,
    aggiornaNome,
    cambiaPassword,
    confermaCancellazione,
    salvaFoto,
    rimuoviFoto,
    cancellaAccount,
  }
})
