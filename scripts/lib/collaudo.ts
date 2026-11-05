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
