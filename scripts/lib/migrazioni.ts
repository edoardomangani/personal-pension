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

export interface StatoTabella {
  tabella: string
  rls: boolean
  /** Policy per `authenticated`: espressioni `using` e `with check` come le riscrive Postgres. */
  policy: { qual: string | null; withCheck: string | null }[]
  /** Privilegi che `anonymous` ha sulla tabella. */
  privilegiAnonymous: string[]
  /** `column_default` di `user_id`, null se la colonna manca o non ha default. */
  defaultUserId: string | null
}

const UTENTE_JWT = 'auth.user_id()'

/** Mancanze di sicurezza (R1, R2) per tabella, in italiano; lista vuota se è tutto a posto. */
export function mancanzeSicurezza(tabelle: StatoTabella[]): string[] {
  const mancanze: string[] = []
  for (const t of tabelle) {
    if (!t.rls) mancanze.push(`${t.tabella}: RLS non attiva`)
    const proprietario = t.policy.some(
      (p) => p.qual?.includes(UTENTE_JWT) && p.withCheck?.includes(UTENTE_JWT),
    )
    if (!proprietario) {
      mancanze.push(`${t.tabella}: manca la policy per proprietario su authenticated`)
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
