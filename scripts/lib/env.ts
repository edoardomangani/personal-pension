import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

export type Variabili = Record<string, string>

export interface Argomenti {
  env: string | null
  prova: boolean
}

export function leggiArgomenti(argv: readonly string[]): Argomenti {
  return { env: valoreOpzione(argv, '--env'), prova: argv.includes('--prova') }
}

/** Valore di `--nome <valore>`; errore se l'opzione c'è ma il valore manca. */
export function valoreOpzione(argv: readonly string[], nome: string): string | null {
  const i = argv.indexOf(nome)
  if (i === -1) return null
  const valore = argv[i + 1]
  if (valore === undefined || valore.startsWith('--')) {
    throw new Error(`Manca il valore di ${nome}.`)
  }
  return valore
}

/** Restituisce il contenuto del file, o null se non esiste o non si legge. */
export type LeggiFile = (percorso: string) => string | null

function pulisci(dict: NodeJS.Dict<string>): Variabili {
  const out: Variabili = {}
  for (const [k, v] of Object.entries(dict)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

/**
 * Con `--env` vale solo quel file (niente ripiego su ambiente o `.env.local`, per non finire
 * sul branch sbagliato); senza, l'ambiente del processo vince su `.env.local`.
 */
export function fondiVariabili(opzioni: {
  fileEnv: string | null
  processo: NodeJS.Dict<string>
  envLocale: string
  leggiFile: LeggiFile
}): Variabili {
  if (opzioni.fileEnv !== null) {
    const contenuto = opzioni.leggiFile(opzioni.fileEnv)
    if (contenuto === null) {
      throw new Error(`Il file di variabili ${opzioni.fileEnv} non esiste o non si legge.`)
    }
    return pulisci(parseEnv(contenuto))
  }
  const locale = opzioni.leggiFile(opzioni.envLocale)
  return { ...(locale === null ? {} : pulisci(parseEnv(locale))), ...pulisci(opzioni.processo) }
}

export function richiedi(variabili: Variabili, nome: string): string {
  const valore = variabili[nome]
  if (valore === undefined || valore === '') {
    throw new Error(`Manca la variabile ${nome}: impostala nel file env o nell'ambiente.`)
  }
  return valore
}

export const leggiFileSeEsiste: LeggiFile = (percorso) => {
  try {
    return readFileSync(percorso, 'utf8')
  } catch {
    return null
  }
}

export function caricaVariabili(fileEnv: string | null, cartella = process.cwd()): Variabili {
  return fondiVariabili({
    fileEnv: fileEnv === null ? null : resolve(cartella, fileEnv),
    processo: process.env,
    envLocale: resolve(cartella, '.env.local'),
    leggiFile: leggiFileSeEsiste,
  })
}
