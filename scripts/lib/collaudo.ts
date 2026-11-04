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

export function identificatore(nome: string): string {
  return `"${nome.replaceAll('"', '""')}"`
}

/** Svuota solo le tabelle di `public` e il registro delle migration: mai `drop`, mai `neon_auth`. */
export function istruzioniSvuotamento(
  tabelle: readonly TabellaTrovata[],
  registroEsiste: boolean,
): string[] {
  const pubbliche = tabelle
    .filter((t) => t.schema === 'public')
    .map((t) => `${identificatore('public')}.${identificatore(t.nome)}`)
    .sort()
  const istruzioni: string[] = []
  // Un'unica istruzione: con cascade le FK tra le tabelle non contano l'ordine.
  if (pubbliche.length > 0) istruzioni.push(`truncate table ${pubbliche.join(', ')} cascade`)
  if (registroEsiste) istruzioni.push('delete from migrazioni.applicate')
  return istruzioni
}
