import { computed, type ComputedRef } from 'vue'
import { useSessioneStore } from '@/stores/sessione'

/** Ciò che serve della persona: `Utente` vi è assegnabile. */
export type DatiProfilo = { email: string; nome?: string | null }

export type UseProfiloReturn = {
  rigaPrincipale: ComputedRef<string>
  emailSecondaria: ComputedRef<string | null>
  iniziali: ComputedRef<string | null>
  saluto: ComputedRef<string>
}

const RIGA_SENZA_SESSIONE = 'Account'

function paroleDelNome(utente: DatiProfilo | null): string[] {
  return (utente?.nome ?? '').trim().split(/\s+/).filter(Boolean)
}

// Array.from non spezza i caratteri fuori dal piano base.
const primaLettera = (parola: string): string =>
  (Array.from(parola)[0] ?? '').toLocaleUpperCase('it-IT')

export function rigaPrincipaleDi(utente: DatiProfilo | null): string {
  if (!utente) return RIGA_SENZA_SESSIONE
  const parole = paroleDelNome(utente)
  return parole.length > 0 ? parole.join(' ') : utente.email
}

/** L'email va sotto solo se sopra c'è il nome. */
export function emailSecondariaDi(utente: DatiProfilo | null): string | null {
  return utente && paroleDelNome(utente).length > 0 ? utente.email : null
}

/** `null` senza sessione: l'avatar mostra l'icona. */
export function inizialiDi(utente: DatiProfilo | null): string | null {
  if (!utente) return null
  const parole = paroleDelNome(utente)
  if (parole.length > 0) return parole.slice(0, 2).map(primaLettera).join('')
  return primaLettera(utente.email.trim()) || null
}

export function salutoDi(utente: DatiProfilo | null): string {
  const [primoNome] = paroleDelNome(utente)
  return primoNome ? `Ciao ${primoNome}` : 'Ciao'
}

export function useProfilo(): UseProfiloReturn {
  const sessione = useSessioneStore()

  return {
    rigaPrincipale: computed(() => rigaPrincipaleDi(sessione.utente)),
    emailSecondaria: computed(() => emailSecondariaDi(sessione.utente)),
    iniziali: computed(() => inizialiDi(sessione.utente)),
    saluto: computed(() => salutoDi(sessione.utente)),
  }
}
