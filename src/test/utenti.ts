import type { Utente } from '../data/sessione'

/** Un utente dello store per i test; senza nome, come un account che non l'ha ancora scritto. */
export function utenteDiProva(parziale: Partial<Utente> = {}): Utente {
  return {
    id: 'u1',
    email: 'edoardo@esempio.it',
    nome: null,
    emailVerificata: true,
    registratoIl: '2026-09-12',
    ...parziale,
  }
}
