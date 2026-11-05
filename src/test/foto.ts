import { vi, type Mock } from 'vitest'

// jsdom non ha né canvas né createImageBitmap: i test della foto li fingono da qui.

export const DATA_URL_DI_PROVA = `data:image/jpeg;base64,${'A'.repeat(100)}`

export interface FintiFoto {
  createImageBitmap: Mock
  drawImage: Mock
  close: Mock
  toDataURL: Mock
}

export interface OpzioniFinti {
  larghezza?: number
  altezza?: number
  /** Il risultato di `toDataURL` per qualità. */
  dataUrl?: (qualita: number) => string
  /** La decodifica rifiuta, come HEIC fuori da Safari. */
  illeggibile?: boolean
}

const getContextOriginale = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
)
const toDataURLOriginale = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toDataURL')

export function fingiFoto(opzioni: OpzioniFinti = {}): FintiFoto {
  const close = vi.fn()
  const drawImage = vi.fn()
  const toDataURL = vi.fn((_tipo?: string, qualita?: number) =>
    opzioni.dataUrl ? opzioni.dataUrl(qualita ?? 0) : DATA_URL_DI_PROVA,
  )
  const createImageBitmap = vi.fn(async () => {
    if (opzioni.illeggibile)
      throw new DOMException('Formato non decodificabile', 'InvalidStateError')
    return { width: opzioni.larghezza ?? 1200, height: opzioni.altezza ?? 800, close }
  })
  vi.stubGlobal('createImageBitmap', createImageBitmap)
  // defineProperty e non spyOn: i sovraccarichi di getContext non accettano un contesto parziale.
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: () => ({ drawImage }),
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    writable: true,
    value: toDataURL,
  })
  return { createImageBitmap, drawImage, close, toDataURL }
}

export function ripristinaFoto(): void {
  vi.unstubAllGlobals()
  if (getContextOriginale)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', getContextOriginale)
  if (toDataURLOriginale)
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', toDataURLOriginale)
}

/** Un file con la dimensione voluta, senza allocarla davvero. */
export function fileDiProva(nome = 'ritratto.jpg', tipo = 'image/jpeg', dimensione = 1024): File {
  const file = new File(['x'], nome, { type: tipo })
  Object.defineProperty(file, 'size', { value: dimensione })
  return file
}
