import { ref, type Ref } from 'vue'
import {
  AVVISO_FOTO_ILLEGGIBILE,
  ritaglioCentrato,
  validaFileFoto,
  type AvvisoFoto,
} from '@/calc/foto'
import { erroreDaEccezione } from '@/data/errori'
import { useSessioneStore } from '@/stores/sessione'

export type StatoFoto = 'scelta' | 'anteprima' | 'invio'

export interface UseFotoProfiloReturn {
  stato: Ref<StatoFoto>
  avviso: Ref<AvvisoFoto | null>
  /** La foto scelta, già ridotta: è quella che si salva. */
  nuova: Ref<string | null>
  scegli: (file: File) => Promise<void>
  /** Risolve true se il salvataggio è riuscito. Non rifiuta. */
  usa: () => Promise<boolean>
  /** Risolve true se la rimozione è riuscita. Non rifiuta. */
  rimuovi: () => Promise<boolean>
  azzera: () => void
}

const LATO_FOTO = 256
const QUALITA = [0.85, 0.7] as const
// Il check della tabella: oltre, il salvataggio fallirebbe con un errore di vincolo.
const CARATTERI_MASSIMI = 200_000
const PREFISSO_JPEG = 'data:image/jpeg;base64,'

const AVVISO_SALVATAGGIO = 'Non sono riuscito a salvare la foto'
const AVVISO_RIMOZIONE = 'Non sono riuscito a rimuovere la foto'

/** R27: ritaglio quadrato centrato, 256×256, JPEG; null se il browser non sa leggerla. */
async function riduci(file: Blob): Promise<string | null> {
  let immagine: ImageBitmap
  try {
    immagine = await createImageBitmap(file)
  } catch {
    return null
  }
  try {
    const { x, y, lato } = ritaglioCentrato(immagine.width, immagine.height)
    const canvas = document.createElement('canvas')
    canvas.width = LATO_FOTO
    canvas.height = LATO_FOTO
    const contesto = canvas.getContext('2d')
    if (contesto === null) return null
    contesto.drawImage(immagine, x, y, lato, lato, 0, 0, LATO_FOTO, LATO_FOTO)
    for (const qualita of QUALITA) {
      const dataUrl = canvas.toDataURL('image/jpeg', qualita)
      // Un browser che non sa fare JPEG restituisce un PNG: il DB lo rifiuterebbe.
      if (!dataUrl.startsWith(PREFISSO_JPEG)) return null
      if (dataUrl.length <= CARATTERI_MASSIMI) return dataUrl
    }
    return null
  } finally {
    immagine.close()
  }
}

/** R25-R27: uno per sheet aperto, così ogni apertura riparte pulita. */
export function useFotoProfilo(): UseFotoProfiloReturn {
  const sessione = useSessioneStore()
  const stato = ref<StatoFoto>('scelta')
  const avviso = ref<AvvisoFoto | null>(null)
  const nuova = ref<string | null>(null)
  // Una scelta superata da un'altra (o da `azzera`) non deve scrivere il suo esito.
  let sceltaCorrente = 0

  async function scegli(file: File): Promise<void> {
    if (stato.value === 'invio') return
    const questa = ++sceltaCorrente
    avviso.value = null
    const nonValido = validaFileFoto({ tipo: file.type, dimensione: file.size, nome: file.name })
    if (nonValido !== null) {
      avviso.value = nonValido
      return
    }
    const ridotta = await riduci(file)
    if (questa !== sceltaCorrente) return
    if (ridotta === null) {
      avviso.value = AVVISO_FOTO_ILLEGGIBILE
      return
    }
    nuova.value = ridotta
    stato.value = 'anteprima'
  }

  async function invia(
    operazione: () => Promise<void>,
    titolo: string,
    statoDopoErrore: StatoFoto,
  ): Promise<boolean> {
    if (stato.value === 'invio') return false
    avviso.value = null
    stato.value = 'invio'
    try {
      await operazione()
      azzera()
      return true
    } catch (eccezione) {
      avviso.value = { titolo, testo: erroreDaEccezione(eccezione).messaggio }
      stato.value = statoDopoErrore
      return false
    }
  }

  async function usa(): Promise<boolean> {
    const dataUrl = nuova.value
    if (dataUrl === null) return false
    return invia(() => sessione.salvaFoto(dataUrl), AVVISO_SALVATAGGIO, 'anteprima')
  }

  async function rimuovi(): Promise<boolean> {
    return invia(() => sessione.rimuoviFoto(), AVVISO_RIMOZIONE, 'scelta')
  }

  function azzera(): void {
    sceltaCorrente++
    stato.value = 'scelta'
    avviso.value = null
    nuova.value = null
  }

  return { stato, avviso, nuova, scegli, usa, rimuovi, azzera }
}
