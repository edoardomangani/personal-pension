import { BetterAuthVanillaAdapter, createClient } from '@neon/neon-js'
import {
  authDaSdk,
  impostaAuthDati,
  impostaClientDati,
  type ClientDati,
} from '../../src/data/client'

export interface Configurazione {
  authUrl: string
  dataApiUrl: string
}

// Better Auth rifiuta i POST senza Origin: è un dominio già ammesso sul branch collaudo.
export const ORIGINE = 'http://localhost:4174'

/** Node non ha cookie: la sessione del sign-in va rimandata a mano, se no `get-session` non dà il JWT. */
export function adapterConCookie() {
  const cookie = new Map<string, string>()
  return BetterAuthVanillaAdapter({
    fetchOptions: {
      onRequest: (ctx) => {
        ctx.headers.set('Origin', ORIGINE)
        if (cookie.size > 0) {
          ctx.headers.set('Cookie', [...cookie].map(([k, v]) => `${k}=${v}`).join('; '))
        }
      },
      onSuccess: (ctx) => {
        for (const riga of ctx.response.headers.getSetCookie()) {
          const coppia = riga.split(';', 1)[0] ?? ''
          const uguale = coppia.indexOf('=')
          if (uguale > 0) cookie.set(coppia.slice(0, uguale), coppia.slice(uguale + 1))
        }
      },
    },
  })
}

/** Un client nuovo per ogni utente, iniettato in `src/data/`. */
export function nuovoClient(c: Configurazione): ClientDati {
  const creato = createClient({
    auth: { url: c.authUrl, adapter: adapterConCookie() },
    dataApi: { url: c.dataApiUrl },
  })
  impostaClientDati(creato)
  impostaAuthDati(authDaSdk(creato.auth))
  return creato
}
