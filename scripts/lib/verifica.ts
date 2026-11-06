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

export type TentativoAltrui =
  { tipo: 'riuscito' } | { tipo: 'rifiutato'; errore: TipoErroreDati; messaggio: string }

/** R13: solo un rifiuto del DB (`vincolo`, `altro`) dimostra l'isolamento; `rete` e `sessione` no. */
export function esitoScritturaAltrui(descrizione: string, t: TentativoAltrui): Mancanza {
  if (t.tipo === 'riuscito') return `l'utente 2 riesce a ${descrizione}`
  if (t.errore === 'vincolo' || t.errore === 'altro') return null
  return `${descrizione}: rifiuto di tipo ${t.errore}, che non dimostra l'isolamento`
}

// Testi delle `raise exception` di db/migrations/002_rpc.sql (salva_movimento).
export const MESSAGGIO_BUSTA_ASSENTE = 'La busta paga non esiste'
export const MESSAGGIO_BUSTA_COLLEGATA = 'La busta paga è già in un altro movimento'
// Testo della `raise exception` di db/migrations/001_schema.sql (controlla_busta_movimento).
export const MESSAGGIO_ALTRO_FONDO = 'Il movimento è di un altro fondo'

/** R7: passa solo un rifiuto `vincolo` con esattamente il messaggio atteso. */
export function esitoRifiutoAtteso(
  descrizione: string,
  t: TentativoAltrui,
  messaggioAtteso: string,
): Mancanza {
  if (t.tipo === 'riuscito') return `riesce a ${descrizione}`
  if (t.errore !== 'vincolo') {
    return `${descrizione}: rifiuto di tipo ${t.errore} («${t.messaggio}»), atteso vincolo «${messaggioAtteso}»`
  }
  if (t.messaggio !== messaggioAtteso) {
    return `${descrizione}: rifiuto con «${t.messaggio}», atteso «${messaggioAtteso}»`
  }
  return null
}

export interface StatoCollegamento {
  movimenti: number
  righe: number
  movimentoId: string | null
}

/** R8: conteggi e collegamento della busta uguali prima e dopo il tentativo. */
export function esitoStatoInvariato(prima: StatoCollegamento, dopo: StatoCollegamento): Mancanza {
  const differenze: string[] = []
  if (prima.movimenti !== dopo.movimenti) {
    differenze.push(`movimenti da ${prima.movimenti} a ${dopo.movimenti}`)
  }
  if (prima.righe !== dopo.righe) {
    differenze.push(`movimento_righe da ${prima.righe} a ${dopo.righe}`)
  }
  if (prima.movimentoId !== dopo.movimentoId) {
    differenze.push(
      `collegamento della busta da ${prima.movimentoId ?? 'nessuno'} a ${dopo.movimentoId ?? 'nessuno'}`,
    )
  }
  return differenze.length === 0 ? null : differenze.join('; ')
}

/** R6: la busta usata dall'utente 2 esiste ancora e resta da versare. */
export function esitoBustaAncoraDaVersare(
  bustaId: string,
  busta: { movimentoId: string | null } | undefined,
): Mancanza {
  if (busta === undefined) return `la busta ${bustaId} non si trova più`
  if (busta.movimentoId !== null) {
    return `la busta ${bustaId} è collegata al movimento ${busta.movimentoId}`
  }
  return null
}

/** R1 riuscita per errore: la busta ha perso il collegamento originale e nessuno lo ripristina. */
export function mancanzaCollegamentoPerso(
  bustaId: string,
  movimentoOriginale: string | null,
): string {
  return `la busta ${bustaId} era collegata al movimento ${movimentoOriginale ?? 'nessuno'} e ora non lo è più: rifai npm run db:collaudo`
}

/** R13: l'utente 2 deve vedere zero righe in ogni tabella. */
export function mancanzeConteggi(conteggi: Record<TabellaUtente, number>): string[] {
  return TABELLE_UTENTE.filter((t) => conteggi[t] !== 0).map(
    (t) => `l'utente 2 vede ${conteggi[t]} righe in ${t}`,
  )
}

/** Tabelle in cui un utente cancellato non deve lasciare righe: quelle del seed più la foto. */
export const TABELLE_ACCOUNT = [...TABELLE_UTENTE, 'foto_profilo'] as const

export type TabellaAccount = (typeof TABELLE_ACCOUNT)[number]

/** Email dell'utente usa-e-getta, sul dominio di `COLLAUDO2_EMAIL`. */
export function emailUsaEGetta(emailCollaudo2: string, adesso: number): string {
  const chiocciola = emailCollaudo2.lastIndexOf('@')
  const dominio = chiocciola < 0 ? '' : emailCollaudo2.slice(chiocciola + 1)
  if (dominio === '') throw new Error(`COLLAUDO2_EMAIL senza dominio: «${emailCollaudo2}»`)
  return `collaudo-cancella-${adesso}@${dominio}`
}

/** Dopo `cancella_account()`: nessuna riga in `public` e nessuna riga in `neon_auth."user"`. */
export function mancanzeResidui(
  conteggi: Record<TabellaAccount, number>,
  utenteAncoraInAuth: boolean,
): string[] {
  const mancanze = TABELLE_ACCOUNT.filter((t) => conteggi[t] !== 0).map(
    (t) => `restano ${conteggi[t]} righe in ${t}`,
  )
  if (utenteAncoraInAuth) mancanze.push('la riga in neon_auth."user" c\'è ancora')
  return mancanze
}

/** L'utente 2 non deve vedere la foto dell'utente 1. */
export function esitoFotoAltrui(righeVisibili: number): Mancanza {
  return righeVisibili === 0 ? null : `l'utente 2 vede ${righeVisibili} foto non sue`
}

export type EsitoAccesso =
  | { tipo: 'riuscito' }
  | { tipo: 'rifiutato'; errore: TipoErroreDati; messaggio: string; codice?: string }

/** Un utente non verificato non deve entrare: prova che la verifica email è obbligatoria. */
export function esitoAccessoNonVerificato(esito: EsitoAccesso): Mancanza {
  if (esito.tipo === 'riuscito') return 'la verifica email non è obbligatoria: l’accesso riesce'
  if (esito.errore === 'sessione' && esito.codice === 'email-da-verificare') return null
  return `accesso rifiutato con ${esito.errore} «${esito.messaggio}» (codice ${esito.codice ?? 'assente'}), atteso email-da-verificare`
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
