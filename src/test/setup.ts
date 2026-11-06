import { beforeEach } from 'vitest'

// jsdom conserva localStorage fra i test di un file: l'ultimo utente noto di un test non deve
// diventare un utente provvisorio nel successivo. I file con ambiente node non hanno `window`.
beforeEach(() => {
  if (typeof window !== 'undefined') window.localStorage.clear()
})
