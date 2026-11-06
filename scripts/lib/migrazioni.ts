import { createHash } from 'node:crypto'

export interface FileMigrazione {
  nome: string
  hash: string
}

export type RigaRegistro = FileMigrazione

const NOME_MIGRAZIONE = /^\d{3}_[A-Za-z0-9_-]+\.sql$/

export function hashContenuto(testo: string): string {
  return createHash('sha256').update(testo, 'utf8').digest('hex')
}

export function eMigrazione(nome: string): boolean {
  return NOME_MIGRAZIONE.test(nome)
}

/** File da applicare, in ordine di nome; errore se il registro non corrisponde ai file. */
export function daApplicare(file: FileMigrazione[], registro: RigaRegistro[]): FileMigrazione[] {
  const migrazioni = file.filter((f) => eMigrazione(f.nome))
  const perNome = new Map(migrazioni.map((f) => [f.nome, f]))

  for (const riga of registro) {
    const corrente = perNome.get(riga.nome)
    if (!corrente) {
      throw new Error(`La migration ${riga.nome} è registrata ma il file non esiste più.`)
    }
    if (corrente.hash !== riga.hash) {
      throw new Error(
        `La migration ${riga.nome} è cambiata dopo essere stata applicata: scrivine una nuova.`,
      )
    }
  }

  const registrati = new Set(registro.map((r) => r.nome))
  return migrazioni
    .filter((f) => !registrati.has(f.nome))
    .sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0))
}

/** Policy per `authenticated` o `public`: espressioni come le riscrive Postgres. */
export interface PolicyTabella {
  nome: string
  permissiva: boolean
  comando: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  qual: string | null
  withCheck: string | null
}

export interface StatoTabella {
  tabella: string
  rls: boolean
  policy: PolicyTabella[]
  /** Privilegi che `anonymous` ha sulla tabella. */
  privilegiAnonymous: string[]
  /** `column_default` di `user_id`, null se la colonna manca o non ha default. */
  defaultUserId: string | null
}

const UTENTE_JWT = 'auth.user_id()'

const filtra = (espressione: string | null): boolean => espressione?.includes(UTENTE_JWT) ?? false

/** Una policy filtra per proprietario nelle espressioni che il suo comando usa. */
function filtraPerProprietario(p: PolicyTabella): boolean {
  switch (p.comando) {
    case 'SELECT':
    case 'DELETE':
      return filtra(p.qual)
    case 'INSERT':
      return filtra(p.withCheck)
    case 'UPDATE':
    case 'ALL':
      return filtra(p.qual) && filtra(p.withCheck)
  }
}

/** Mancanze di sicurezza per tabella, in italiano; lista vuota se è tutto a posto. */
export function mancanzeSicurezza(tabelle: StatoTabella[]): string[] {
  const mancanze: string[] = []
  for (const t of tabelle) {
    if (!t.rls) mancanze.push(`${t.tabella}: RLS non attiva`)
    const permissive = t.policy.filter((p) => p.permissiva)
    const proprietario = permissive.some((p) => filtra(p.qual) && filtra(p.withCheck))
    if (!proprietario) {
      mancanze.push(`${t.tabella}: manca la policy per proprietario su authenticated`)
    }
    // Le permissive si sommano in OR: ne basta una aperta per esporre tutte le righe.
    for (const p of permissive) {
      if (!filtraPerProprietario(p)) {
        mancanze.push(`${t.tabella}: la policy ${p.nome} non filtra per auth.user_id()`)
      }
    }
    if (t.privilegiAnonymous.length > 0) {
      mancanze.push(`${t.tabella}: anonymous ha ${t.privilegiAnonymous.join(', ')}`)
    }
    if (!t.defaultUserId?.includes(UTENTE_JWT)) {
      mancanze.push(`${t.tabella}: user_id senza default auth.user_id()`)
    }
  }
  return mancanze
}

export interface StatoFunzione {
  funzione: string
  securityDefiner: boolean
  /** `anonymous` ha `execute` (anche tramite `PUBLIC`). */
  eseguibileDaAnonymous: boolean
}

/** Le sole `security definer` ammesse, per nome come `regprocedure`: cancellano anche fuori da `public`. */
export const FUNZIONI_DEFINER_AMMESSE: readonly string[] = ['cancella_account()']

/** Mancanze di sicurezza delle funzioni RPC: niente `security definer` fuori elenco, niente `execute` ad `anonymous`. */
export function mancanzeFunzioni(funzioni: StatoFunzione[]): string[] {
  const mancanze: string[] = []
  for (const f of funzioni) {
    if (f.securityDefiner && !FUNZIONI_DEFINER_AMMESSE.includes(f.funzione))
      mancanze.push(`${f.funzione}: è security definer`)
    if (f.eseguibileDaAnonymous) mancanze.push(`${f.funzione}: anonymous può eseguirla`)
  }
  return mancanze
}
