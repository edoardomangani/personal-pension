import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storicoDeducibilita } from '../calc/deducibilita'
import { crescita, daVersare, ultimoValore, versatoAl } from '../calc/posizione'
import { proiezione } from '../calc/proiezione'
import { rendimentoAnnuo } from '../calc/xirr'
import {
  eliminaBusta as eliminaBustaDb,
  elencaBuste,
  salvaBusta as salvaBustaDb,
} from '../data/buste'
import { erroreDaEccezione, type ErroreDati } from '../data/errori'
import {
  elencaEstratti,
  eliminaEstratto as eliminaEstrattoDb,
  salvaEstratto as salvaEstrattoDb,
} from '../data/estratti'
import {
  elencaFondi,
  eliminaFondo as eliminaFondoDb,
  salvaFondo as salvaFondoDb,
} from '../data/fondi'
import { leggiImpostazioni, salvaImpostazioni as salvaImpostazioniDb } from '../data/impostazioni'
import type { Bozza, BozzaBusta } from '../data/mappe'
import {
  elencaMovimenti,
  eliminaMovimento as eliminaMovimentoDb,
  salvaMovimento as salvaMovimentoDb,
} from '../data/movimenti'
import {
  IMPOSTAZIONI_PREDEFINITE,
  type Archivio,
  type BustaPaga,
  type EstrattoConto,
  type Fondo,
  type Impostazioni,
  type Movimento,
} from '../types/dominio'
import { useSessioneStore } from './sessione'

export type StatoArchivio = 'vuoto' | 'caricamento' | 'pronto'

const due = (n: number) => String(n).padStart(2, '0')

// Unico punto in cui serve l'orologio: da qui in poi la data è una stringa ISO.
function oggiLocale(): string {
  const d = new Date()
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`
}

function sostituisciOAggiungi<T extends { id: string }>(elenco: T[], voce: T): T[] {
  return elenco.some((v) => v.id === voce.id)
    ? elenco.map((v) => (v.id === voce.id ? voce : v))
    : [...elenco, voce]
}

export const useArchivioStore = defineStore('archivio', () => {
  const fondi = ref<Fondo[]>([])
  const buste = ref<BustaPaga[]>([])
  const movimenti = ref<Movimento[]>([])
  const estratti = ref<EstrattoConto[]>([])
  const impostazioni = ref<Impostazioni>({ ...IMPOSTAZIONI_PREDEFINITE })
  const stato = ref<StatoArchivio>('vuoto')
  const errore = ref<ErroreDati | null>(null)
  const oggi = ref(oggiLocale())

  // `reset()` lo incrementa: una risposta (lettura o scrittura) arrivata dopo non tocca più la memoria.
  let generazione = 0
  // Ogni `carica()` lo incrementa: vale solo l'ultimo partito. Separato da `generazione`
  // perché un nuovo carico non deve scartare le scritture in volo.
  let ultimoCarica = 0
  // Un `carica()` ha applicato i dati dall'ultimo `reset()`: decide lo stato dopo un errore.
  let datiApplicati = false

  function seAncora(partenza: number, applica: () => void): void {
    if (partenza === generazione) applica()
  }

  const archivio = computed<Archivio>(() => ({
    fondi: fondi.value,
    buste: buste.value,
    movimenti: movimenti.value,
    estratti: estratti.value,
    impostazioni: impostazioni.value,
  }))

  const versato = computed(() => versatoAl(archivio.value, oggi.value))
  const daVersareTotale = computed(() => daVersare(archivio.value))
  const crescitaPosizione = computed(() => crescita(archivio.value))
  const ultimo = computed(() => ultimoValore(archivio.value))
  const rendimento = computed(() => rendimentoAnnuo(archivio.value, oggi.value))
  const deducibilita = computed(() => storicoDeducibilita(archivio.value, oggi.value))
  const futuro = computed(() => proiezione(archivio.value, oggi.value))

  /**
   * Non rifiuta: l'esito è in `stato` ed `errore`. Con un errore restano i dati di prima.
   * Fra più chiamate sovrapposte vale solo l'ultima partita.
   */
  async function carica(): Promise<void> {
    const partenza = generazione
    const chiamata = ++ultimoCarica
    const corrente = () => partenza === generazione && chiamata === ultimoCarica
    stato.value = 'caricamento'
    errore.value = null
    try {
      const [f, b, m, e, i] = await Promise.all([
        elencaFondi(),
        elencaBuste(),
        elencaMovimenti(),
        elencaEstratti(),
        leggiImpostazioni(),
      ])
      if (!corrente()) return
      fondi.value = f
      buste.value = b
      movimenti.value = m
      estratti.value = e
      impostazioni.value = i
      oggi.value = oggiLocale()
      stato.value = 'pronto'
      datiApplicati = true
    } catch (eccezione) {
      const e = erroreDaEccezione(eccezione)
      // Prima di `esci()`: una chiamata superata non chiude la sessione.
      if (!corrente()) return
      if (e.tipo === 'sessione') {
        await useSessioneStore().esci()
        return
      }
      errore.value = e
      stato.value = datiApplicati ? 'pronto' : 'vuoto'
    }
  }

  /**
   * Esegue la scrittura; rifiuta sempre con un `ErroreDati`. Con la sessione scaduta esce
   * solo se non c'è stato un `reset()` dalla partenza: non deve far uscire l'utente nuovo.
   */
  async function scrivi<T>(partenza: number, operazione: () => Promise<T>): Promise<T> {
    try {
      return await operazione()
    } catch (eccezione) {
      const e = erroreDaEccezione(eccezione)
      if (e.tipo === 'sessione' && partenza === generazione) await useSessioneStore().esci()
      throw e
    }
  }

  // Le RPC danno solo l'id e il collegamento cambia anche altre buste: si rilegge tutto il lato TFR.
  // Non rifiuta: la scrittura è già riuscita, e rifiutare farebbe ripetere la RPC al chiamante.
  async function rileggiBusteEMovimenti(partenza: number): Promise<void> {
    try {
      const [b, m] = await Promise.all([elencaBuste(), elencaMovimenti()])
      seAncora(partenza, () => {
        buste.value = b
        movimenti.value = m
      })
    } catch (eccezione) {
      const e = erroreDaEccezione(eccezione)
      if (partenza !== generazione) return
      if (e.tipo === 'sessione') {
        await useSessioneStore().esci()
        return
      }
      errore.value = e
    }
  }

  async function salvaFondo(bozza: Bozza<Fondo>): Promise<Fondo> {
    const partenza = generazione
    const salvato = await scrivi(partenza, () => salvaFondoDb(bozza))
    seAncora(partenza, () => (fondi.value = sostituisciOAggiungi(fondi.value, salvato)))
    return salvato
  }

  async function eliminaFondo(id: string): Promise<void> {
    const partenza = generazione
    await scrivi(partenza, () => eliminaFondoDb(id))
    seAncora(partenza, () => (fondi.value = fondi.value.filter((f) => f.id !== id)))
  }

  async function salvaBusta(bozza: BozzaBusta): Promise<string> {
    const partenza = generazione
    const id = await scrivi(partenza, () => salvaBustaDb(bozza))
    await rileggiBusteEMovimenti(partenza)
    return id
  }

  async function eliminaBusta(id: string): Promise<void> {
    const partenza = generazione
    await scrivi(partenza, () => eliminaBustaDb(id))
    await rileggiBusteEMovimenti(partenza)
  }

  async function salvaMovimento(
    bozza: Bozza<Movimento>,
    busteIds: readonly string[],
  ): Promise<string> {
    const partenza = generazione
    const id = await scrivi(partenza, () => salvaMovimentoDb(bozza, busteIds))
    await rileggiBusteEMovimenti(partenza)
    return id
  }

  async function eliminaMovimento(id: string): Promise<void> {
    const partenza = generazione
    await scrivi(partenza, () => eliminaMovimentoDb(id))
    await rileggiBusteEMovimenti(partenza)
  }

  async function salvaEstratto(bozza: Bozza<EstrattoConto>): Promise<EstrattoConto> {
    const partenza = generazione
    const salvato = await scrivi(partenza, () => salvaEstrattoDb(bozza))
    seAncora(partenza, () => (estratti.value = sostituisciOAggiungi(estratti.value, salvato)))
    return salvato
  }

  async function eliminaEstratto(id: string): Promise<void> {
    const partenza = generazione
    await scrivi(partenza, () => eliminaEstrattoDb(id))
    seAncora(partenza, () => (estratti.value = estratti.value.filter((e) => e.id !== id)))
  }

  async function salvaImpostazioni(nuove: Impostazioni): Promise<Impostazioni> {
    const partenza = generazione
    const salvate = await scrivi(partenza, () => salvaImpostazioniDb(nuove))
    seAncora(partenza, () => (impostazioni.value = salvate))
    return salvate
  }

  function reset(): void {
    generazione++
    datiApplicati = false
    fondi.value = []
    buste.value = []
    movimenti.value = []
    estratti.value = []
    // Copia: i predefiniti sono congelati.
    impostazioni.value = { ...IMPOSTAZIONI_PREDEFINITE }
    stato.value = 'vuoto'
    errore.value = null
    oggi.value = oggiLocale()
  }

  return {
    fondi,
    buste,
    movimenti,
    estratti,
    impostazioni,
    stato,
    errore,
    oggi,
    archivio,
    versato,
    daVersare: daVersareTotale,
    crescita: crescitaPosizione,
    ultimoValore: ultimo,
    rendimento,
    deducibilita,
    proiezione: futuro,
    carica,
    salvaFondo,
    eliminaFondo,
    salvaBusta,
    eliminaBusta,
    salvaMovimento,
    eliminaMovimento,
    salvaEstratto,
    eliminaEstratto,
    salvaImpostazioni,
    reset,
  }
})
