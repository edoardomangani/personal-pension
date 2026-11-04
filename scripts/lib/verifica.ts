import type { TipoErroreDati } from '../../src/data/errori'
import { TABELLE_UTENTE, type TabellaUtente } from './importa'

/** Esito di un controllo: `null` = ok, altrimenti la mancanza in italiano. */
export type Mancanza = string | null

export interface Controllo {
  nome: string
  mancanza: Mancanza
}

/** Risposta HTTP ridotta a quello che serve: `corpo` è il JSON letto, o null se non lo è. */
export interface RispostaHttp {
  status: number
  corpo: unknown
}

const CODICE_PERMESSO = '42501'

function campoTesto(corpo: unknown, campo: 'code' | 'message'): string | null {
  if (typeof corpo !== 'object' || corpo === null) return null
  const valore =
    campo === 'code'
      ? 'code' in corpo
        ? corpo.code
        : null
      : 'message' in corpo
        ? corpo.message
        : null
  return typeof valore === 'string' ? valore : null
}

// Senza `Authorization` la Data API di Neon risponde 400 con questo messaggio, prima del DB.
const SENZA_CREDENZIALI = 'missing authentication credentials'

/** Rifiuto di autenticazione o di permesso: la richiesta non ha toccato i dati. */
function eRifiuto(r: RispostaHttp): boolean {
  if (r.status === 401 || r.status === 403) return true
  if (campoTesto(r.corpo, 'code') === CODICE_PERMESSO) return true
  return r.status === 400 && (campoTesto(r.corpo, 'message') ?? '').startsWith(SENZA_CREDENZIALI)
}

/** R1: senza utente una lettura passa solo se è rifiutata o non restituisce righe. */
export function esitoLetturaAnonima(tabella: string, r: RispostaHttp): Mancanza {
  if (eRifiuto(r)) return null
  if (r.status === 200 && Array.isArray(r.corpo)) {
    return r.corpo.length === 0
      ? null
      : `senza token ${tabella} restituisce ${r.corpo.length} righe`
  }
  return `senza token ${tabella} risponde ${r.status}, atteso un rifiuto o zero righe`
}

/** R1: senza utente una scrittura passa solo se è rifiutata. */
export function esitoScritturaAnonima(destinazione: string, r: RispostaHttp): Mancanza {
  if (eRifiuto(r)) return null
  if (r.status >= 200 && r.status < 300) return `senza token la scrittura su ${destinazione} riesce`
  return `senza token la scrittura su ${destinazione} risponde ${r.status} (codice ${campoTesto(r.corpo, 'code') ?? 'assente'}), atteso un rifiuto`
}

export type TentativoAltrui = { tipo: 'riuscito' } | { tipo: 'rifiutato'; errore: TipoErroreDati }

/** R13: solo un rifiuto del DB (`vincolo`, `altro`) dimostra l'isolamento; `rete` e `sessione` no. */
export function esitoScritturaAltrui(descrizione: string, t: TentativoAltrui): Mancanza {
  if (t.tipo === 'riuscito') return `l'utente 2 riesce a ${descrizione}`
  if (t.errore === 'vincolo' || t.errore === 'altro') return null
  return `${descrizione}: rifiuto di tipo ${t.errore}, che non dimostra l'isolamento`
}

/** R13: l'utente 2 deve vedere zero righe in ogni tabella. */
export function mancanzeConteggi(conteggi: Record<TabellaUtente, number>): string[] {
  return TABELLE_UTENTE.filter((t) => conteggi[t] !== 0).map(
    (t) => `l'utente 2 vede ${conteggi[t]} righe in ${t}`,
  )
}

export interface Riepilogo {
  righe: string[]
  exitCode: 0 | 1
}

export function riepilogo(controlli: readonly Controllo[]): Riepilogo {
  const verde = controlli.every((c) => c.mancanza === null)
  return {
    righe: [
      ...controlli.map((c) =>
        c.mancanza === null ? `ok  ${c.nome}` : `NO  ${c.nome}: ${c.mancanza}`,
      ),
      verde ? 'DATI: VERDE' : 'DATI: ROSSO',
    ],
    exitCode: verde ? 0 : 1,
  }
}
