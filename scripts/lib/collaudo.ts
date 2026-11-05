import type { Configurazione } from './auth'
import { richiedi, type Variabili } from './env'

/** Ruolo che esiste solo sul branch Neon `collaudo`: è la prova di non essere su `dev` o `main`. */
export const RUOLO_COLLAUDO = 'collaudo_admin'

/** R10: errore che nomina il ruolo trovato se non è quello del collaudo. */
export function controllaRuoloCollaudo(ruolo: string): void {
  if (ruolo !== RUOLO_COLLAUDO) {
    throw new Error(
      `Connesso come «${ruolo}», non come ${RUOLO_COLLAUDO}: db:collaudo gira solo sul branch collaudo. Nessuna modifica.`,
    )
  }
}

export interface TabellaTrovata {
  schema: string
  nome: string
}

/** Routine di `pg_proc`; `argomenti` è il testo di `pg_get_function_identity_arguments`. */
export interface FunzioneTrovata {
  schema: string
  nome: string
  argomenti: string
}

/** R1: routine di `public` del ruolo corrente, escluse quelle che appartengono a un'estensione. */
export const QUERY_ROUTINE = `select n.nspname as schema, p.proname as nome,
       pg_get_function_identity_arguments(p.oid) as argomenti
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prokind in ('f', 'p')
   and pg_get_userbyid(p.proowner) = current_user
   and not exists (select 1 from pg_depend d
                    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')`

export function messaggioSvuotamento(routine: number, tabelle: number): string {
  return `Tolte ${routine} funzioni e svuotate ${tabelle} tabelle di public e il registro delle migration.`
}

export function identificatore(nome: string): string {
  return `"${nome.replaceAll('"', '""')}"`
}

/**
 * Toglie le routine di `public` e svuota le sue tabelle e il registro delle migration:
 * l'unico `drop` è `drop routine` su `public`, mai `neon_auth`.
 */
export function istruzioniSvuotamento(
  tabelle: readonly TabellaTrovata[],
  routine: readonly FunzioneTrovata[],
  registroEsiste: boolean,
): string[] {
  // Gli argomenti restano non quotati: sono la firma che Postgres usa per distinguere gli overload.
  const drop = routine
    .filter((r) => r.schema === 'public')
    .map((r) => `${identificatore('public')}.${identificatore(r.nome)}(${r.argomenti})`)
    .sort()
    .map((firma) => `drop routine if exists ${firma} cascade`)
  const pubbliche = tabelle
    .filter((t) => t.schema === 'public')
    .map((t) => `${identificatore('public')}.${identificatore(t.nome)}`)
    .sort()
  const istruzioni: string[] = [...drop]
  // Un'unica istruzione: con cascade le FK tra le tabelle non contano l'ordine.
  if (pubbliche.length > 0) istruzioni.push(`truncate table ${pubbliche.join(', ')} cascade`)
  if (registroEsiste) istruzioni.push('delete from migrazioni.applicate')
  return istruzioni
}

export type RuoloAggiuntivo = 'senza fondo' | 'password' | 'google'

export interface UtenteAggiuntivo {
  sigla: 'U3' | 'U4' | 'U5'
  ruolo: RuoloAggiuntivo
  email: string
  password: string
}

/** Sempre U3, U4, U5 in quest'ordine. */
export type UtentiAggiuntivi = readonly [UtenteAggiuntivo, UtenteAggiuntivo, UtenteAggiuntivo]

const AGGIUNTIVI = [
  { sigla: 'U3', ruolo: 'senza fondo', numero: 3 },
  { sigla: 'U4', ruolo: 'password', numero: 4 },
  { sigla: 'U5', ruolo: 'google', numero: 5 },
] as const

const PREFISSO_AGGIUNTIVI = 'collaudo-'
// È il prefisso dell'usa-e-getta di db:verifica: quelle email le cancella lui.
const PREFISSO_USA_E_GETTA = 'collaudo-cancella-'

function partiEmail(email: string): { locale: string; dominio: string } {
  const chiocciola = email.lastIndexOf('@')
  if (chiocciola < 0) return { locale: email, dominio: '' }
  return { locale: email.slice(0, chiocciola), dominio: email.slice(chiocciola + 1) }
}

/**
 * R2, R3: U3, U4, U5 dalle variabili, in quest'ordine. Le email escono in minuscolo,
 * com'è salvato in Neon Auth, così la `delete` per email esatta le trova.
 */
export function utentiAggiuntivi(variabili: Variabili): UtentiAggiuntivi {
  const email1 = richiedi(variabili, 'COLLAUDO_EMAIL').toLowerCase()
  const email2 = richiedi(variabili, 'COLLAUDO2_EMAIL').toLowerCase()
  const dominio = partiEmail(email2).dominio
  if (dominio === '') throw new Error('COLLAUDO2_EMAIL non ha un dominio.')

  const usate = new Map<string, string>([
    [email1, 'COLLAUDO_EMAIL'],
    [email2, 'COLLAUDO2_EMAIL'],
  ])
  const leggi = ({ sigla, ruolo, numero }: (typeof AGGIUNTIVI)[number]): UtenteAggiuntivo => {
    const nome = `COLLAUDO${numero}_EMAIL`
    const email = richiedi(variabili, nome).toLowerCase()
    const password = richiedi(variabili, `COLLAUDO${numero}_PASSWORD`)
    const parti = partiEmail(email)
    if (!parti.locale.startsWith(PREFISSO_AGGIUNTIVI)) {
      throw new Error(`${nome} deve iniziare per «${PREFISSO_AGGIUNTIVI}».`)
    }
    if (parti.locale.startsWith(PREFISSO_USA_E_GETTA)) {
      throw new Error(
        `${nome} non può iniziare per «${PREFISSO_USA_E_GETTA}»: è il prefisso dell'usa-e-getta di db:verifica.`,
      )
    }
    if (parti.dominio !== dominio) {
      throw new Error(`${nome} deve avere lo stesso dominio di COLLAUDO2_EMAIL (${dominio}).`)
    }
    const doppione = usate.get(email)
    if (doppione !== undefined) throw new Error(`${nome} è uguale a ${doppione}.`)
    usate.set(email, nome)
    return { sigla, ruolo, email, password }
  }
  return [leggi(AGGIUNTIVI[0]), leggi(AGGIUNTIVI[1]), leggi(AGGIUNTIVI[2])]
}

/** R2: gli indirizzi di Neon Auth e della Data API per il sign-up, letti prima di connettersi. */
export function configurazioneAuth(variabili: Variabili): Configurazione {
  return {
    authUrl: richiedi(variabili, 'VITE_NEON_AUTH_URL'),
    dataApiUrl: richiedi(variabili, 'VITE_NEON_DATA_API_URL'),
  }
}

export interface Istruzione {
  sql: string
  parametri: string[]
}

/** R8: le righe di `account` dell'utente; con `left join` un utente senza account dà `provider` null. */
export function queryAccountUtente(email: string): Istruzione {
  return {
    sql: `select u.id::text as "idUtente", a."providerId" as provider
  from neon_auth."user" u
  left join neon_auth.account a on a."userId" = u.id
 where u.email = $1`,
    parametri: [email],
  }
}

export interface RigaAccount {
  idUtente: string
  provider: string | null
}

export type StatoSoloGoogle =
  { tipo: 'assente' } | { tipo: 'già google' } | { tipo: 'da convertire'; idUtente: string }

/** R8: decide dalle righe di `queryAccountUtente`; ogni altro stato è un errore da rifare con db:collaudo. */
export function statoSoloGoogle(righe: readonly RigaAccount[]): StatoSoloGoogle {
  const [riga, ...altre] = righe
  if (riga === undefined) return { tipo: 'assente' }
  if (altre.length === 0 && riga.provider === 'google') return { tipo: 'già google' }
  if (altre.length === 0 && riga.provider === 'credential') {
    return { tipo: 'da convertire', idUtente: riga.idUtente }
  }
  const trovati = righe.map((r) => r.provider ?? 'nessuno').join(', ')
  throw new Error(
    `Stato dell'account inatteso (accessi: ${trovati}): rilancia npm run db:collaudo. Nessuna modifica.`,
  )
}

/** R7: la riga `credential` diventa `google`, senza password e con un id finto riconoscibile. */
export function istruzioneSoloGoogle(idUtente: string): Istruzione {
  return {
    sql: `update neon_auth.account
   set "providerId" = 'google', "accountId" = $2, password = null, "updatedAt" = now()
 where "userId" = $1 and "providerId" = 'credential'`,
    parametri: [idUtente, `collaudo-${idUtente}`],
  }
}

/** R6: niente email né password; `db:collaudo: ` lo aggiunge chi stampa l'errore. */
export function messaggioErroreUtente(utente: UtenteAggiuntivo, errore: unknown): string {
  const motivo = errore instanceof Error ? errore.message : String(errore)
  return `${utente.sigla} (${utente.ruolo}): ${motivo}`
}

/** R9: niente password, solo i ruoli. */
export function messaggioRicreati(utenti: readonly UtenteAggiuntivo[]): string {
  return `Utenti aggiuntivi: ricreati ${utenti.length} (${utenti.map((u) => u.ruolo).join(', ')}).`
}

export function messaggioUtenteAssente(email: string): string {
  return `Manca l'utente ${email}: lancia prima npm run db:collaudo`
}

export const MESSAGGIO_GIA_GOOGLE = 'U5 è già solo Google: nessuna modifica.'
export const MESSAGGIO_SOLO_GOOGLE = 'U5 ora è solo Google.'

export interface RicreazioneUtente {
  utente: UtenteAggiuntivo
  cancella: Istruzione
  verificaEmail: Istruzione
}

/**
 * R4: le uniche scritture di db:collaudo in neon_auth, solo per U3, U4, U5 e con l'email
 * esatta come parametro. `account` e `session` vanno via con l'utente (FK on delete cascade).
 */
export function istruzioniRicreaUtenti(utenti: readonly UtenteAggiuntivo[]): RicreazioneUtente[] {
  return utenti.map((utente) => ({
    utente,
    cancella: { sql: 'delete from neon_auth."user" where email = $1', parametri: [utente.email] },
    verificaEmail: {
      sql: 'update neon_auth."user" set "emailVerified" = true where email = $1',
      parametri: [utente.email],
    },
  }))
}

export function nomeVisualizzato(utente: UtenteAggiuntivo): string {
  return `COLLAUDO ${utente.sigla} ${utente.ruolo}`
}
