export interface FileFoto {
  /** Tipo MIME dichiarato dal browser: può essere vuoto (HEIC su alcuni browser). */
  tipo: string
  /** Dimensione in byte. */
  dimensione: number
  nome: string
}

export interface AvvisoFoto {
  titolo: string
  testo: string
}

export interface Ritaglio {
  x: number
  y: number
  lato: number
}

export const FOTO_BYTE_MASSIMI = 5 * 1024 * 1024
export const FOTO_TIPI_ACCETTATI = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'] as const
export const FOTO_ACCEPT = FOTO_TIPI_ACCETTATI.join(',')

const ESTENSIONI_HEIC = /\.(heic|heif)$/i

export const AVVISO_FOTO_ILLEGGIBILE: AvvisoFoto = {
  titolo: 'Non riesco a leggere questa foto',
  testo: 'Prova con un JPG o un PNG.',
}

function tipoAccettato(file: FileFoto): boolean {
  if (file.tipo === '') return ESTENSIONI_HEIC.test(file.nome)
  return (FOTO_TIPI_ACCETTATI as readonly string[]).includes(file.tipo)
}

/** R26: `null` se il file va bene, altrimenti l'avviso da mostrare. */
export function validaFileFoto(file: FileFoto): AvvisoFoto | null {
  if (!tipoAccettato(file)) {
    return { titolo: 'Formato non supportato', testo: 'Scegli un JPG, un PNG o una foto HEIC.' }
  }
  if (file.dimensione > FOTO_BYTE_MASSIMI) {
    return { titolo: 'Foto troppo grande', testo: 'Scegline una sotto i 5 MB.' }
  }
  return null
}

/** R27: il quadrato più grande centrato nell'immagine. */
export function ritaglioCentrato(larghezza: number, altezza: number): Ritaglio {
  const lato = Math.min(larghezza, altezza)
  return {
    x: Math.floor((larghezza - lato) / 2),
    y: Math.floor((altezza - lato) / 2),
    lato,
  }
}
