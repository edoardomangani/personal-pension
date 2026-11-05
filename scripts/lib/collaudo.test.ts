// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MESSAGGIO_GIA_GOOGLE,
  MESSAGGIO_SOLO_GOOGLE,
  QUERY_ROUTINE,
  configurazioneAuth,
  controllaRuoloCollaudo,
  identificatore,
  istruzioneSoloGoogle,
  istruzioniRicreaUtenti,
  istruzioniSvuotamento,
  messaggioErroreUtente,
  messaggioRicreati,
  messaggioSvuotamento,
  messaggioUtenteAssente,
  nomeVisualizzato,
  queryAccountUtente,
  statoSoloGoogle,
  utentiAggiuntivi,
  type UtenteAggiuntivo,
} from './collaudo'

describe('controllaRuoloCollaudo (R10)', () => {
  it.each(['dev_admin', 'neondb_owner'])('%s → errore che nomina il ruolo', (ruolo) => {
    expect(() => controllaRuoloCollaudo(ruolo)).toThrow(new RegExp(`«${ruolo}»`))
  })

  it('collaudo_admin passa', () => {
    expect(() => controllaRuoloCollaudo('collaudo_admin')).not.toThrow()
  })
})

describe('istruzioniSvuotamento', () => {
  const tabelle = [
    { schema: 'public', nome: 'movimenti' },
    { schema: 'public', nome: 'fondi' },
    { schema: 'neon_auth', nome: 'user' },
    { schema: 'neon_auth', nome: 'session' },
  ]
  const routine = [
    { schema: 'public', nome: 'salva_busta', argomenti: 'p jsonb' },
    { schema: 'public', nome: 'controlla_fondo_utente', argomenti: '' },
    { schema: 'neon_auth', nome: 'interna', argomenti: 'x text' },
  ]

  it('prima i drop routine in ordine, poi il truncate, poi il registro', () => {
    expect(istruzioniSvuotamento(tabelle, routine, true)).toEqual([
      'drop routine if exists "public"."controlla_fondo_utente"() cascade',
      'drop routine if exists "public"."salva_busta"(p jsonb) cascade',
      'truncate table "public"."fondi", "public"."movimenti" cascade',
      'delete from migrazioni.applicate',
    ])
  })

  it('una istruzione per firma con lo stesso nome', () => {
    const overload = [
      { schema: 'public', nome: 'f', argomenti: 'a text' },
      { schema: 'public', nome: 'f', argomenti: 'a integer' },
    ]
    expect(istruzioniSvuotamento([], overload, false)).toEqual([
      'drop routine if exists "public"."f"(a integer) cascade',
      'drop routine if exists "public"."f"(a text) cascade',
    ])
  })

  it('nessuna istruzione nomina neon_auth', () => {
    const istruzioni = istruzioniSvuotamento(tabelle, routine, true)
    expect(istruzioni.some((i) => i.includes('neon_auth'))).toBe(false)
  })

  it("l'unico drop è drop routine su public", () => {
    const istruzioni = istruzioniSvuotamento(tabelle, routine, true)
    const drop = istruzioni.filter((i) => /\bdrop\b/i.test(i))
    expect(drop).toHaveLength(2)
    for (const i of drop) expect(i.startsWith('drop routine if exists "public".')).toBe(true)
  })

  it('senza routine le istruzioni sono quelle di prima, senza drop', () => {
    expect(istruzioniSvuotamento(tabelle, [], true)).toEqual([
      'truncate table "public"."fondi", "public"."movimenti" cascade',
      'delete from migrazioni.applicate',
    ])
  })

  it('senza registro non tocca migrazioni; senza tabelle niente truncate', () => {
    expect(istruzioniSvuotamento([], [], false)).toEqual([])
    expect(istruzioniSvuotamento([], [], true)).toEqual(['delete from migrazioni.applicate'])
  })

  it('quota gli identificatori', () => {
    expect(identificatore('strano"nome')).toBe('"strano""nome"')
    expect(
      istruzioniSvuotamento([], [{ schema: 'public', nome: 'strano"nome', argomenti: '' }], false),
    ).toEqual(['drop routine if exists "public"."strano""nome"() cascade'])
  })
})

describe('query delle routine e messaggio di R8', () => {
  it.each([
    "n.nspname = 'public'",
    '= current_user',
    "prokind in ('f', 'p')",
    "d.classid = 'pg_proc'::regclass",
    "deptype = 'e'",
  ])('la query filtra con %s', (filtro) => {
    expect(QUERY_ROUTINE).toContain(filtro)
  })

  it('il messaggio riporta funzioni e tabelle', () => {
    expect(messaggioSvuotamento(9, 7)).toBe(
      'Tolte 9 funzioni e svuotate 7 tabelle di public e il registro delle migration.',
    )
  })
})

const VARIABILI = {
  COLLAUDO_EMAIL: 'u1@esempio.it',
  COLLAUDO2_EMAIL: 'u2@esempio.it',
  COLLAUDO3_EMAIL: 'collaudo-senza-fondo@esempio.it',
  COLLAUDO3_PASSWORD: 'password-di-u3-segreta',
  COLLAUDO4_EMAIL: 'collaudo-password@esempio.it',
  COLLAUDO4_PASSWORD: 'password-di-u4-segreta',
  COLLAUDO5_EMAIL: 'collaudo-google@esempio.it',
  COLLAUDO5_PASSWORD: 'password-di-u5-segreta',
  VITE_NEON_AUTH_URL: 'https://auth.esempio.it',
  VITE_NEON_DATA_API_URL: 'https://api.esempio.it',
}

function senza(nome: keyof typeof VARIABILI): Record<string, string> {
  const copia: Record<string, string> = { ...VARIABILI }
  delete copia[nome]
  return copia
}

describe('utentiAggiuntivi (R2, R3)', () => {
  it('R2: manca COLLAUDO4_PASSWORD → errore che la nomina', () => {
    expect(() => utentiAggiuntivi(senza('COLLAUDO4_PASSWORD'))).toThrow(
      'Manca la variabile COLLAUDO4_PASSWORD',
    )
  })

  it('R2: manca VITE_NEON_AUTH_URL → errore che la nomina', () => {
    expect(() => configurazioneAuth(senza('VITE_NEON_AUTH_URL'))).toThrow(
      'Manca la variabile VITE_NEON_AUTH_URL',
    )
  })

  it('R2: con tutte le variabili la configurazione di Neon Auth è completa', () => {
    expect(configurazioneAuth(VARIABILI)).toEqual({
      authUrl: 'https://auth.esempio.it',
      dataApiUrl: 'https://api.esempio.it',
    })
  })

  it('R3: email valide → U3, U4, U5 in ordine, con email e password', () => {
    expect(utentiAggiuntivi(VARIABILI)).toEqual([
      {
        sigla: 'U3',
        ruolo: 'senza fondo',
        email: 'collaudo-senza-fondo@esempio.it',
        password: 'password-di-u3-segreta',
      },
      {
        sigla: 'U4',
        ruolo: 'password',
        email: 'collaudo-password@esempio.it',
        password: 'password-di-u4-segreta',
      },
      {
        sigla: 'U5',
        ruolo: 'google',
        email: 'collaudo-google@esempio.it',
        password: 'password-di-u5-segreta',
      },
    ])
  })

  it('R3: senza prefisso collaudo- → errore che nomina variabile e prefisso', () => {
    expect(() =>
      utentiAggiuntivi({ ...VARIABILI, COLLAUDO3_EMAIL: 'senza-fondo@esempio.it' }),
    ).toThrow(/COLLAUDO3_EMAIL.*«collaudo-»/)
  })

  it("R3: prefisso dell'usa-e-getta → errore", () => {
    expect(() =>
      utentiAggiuntivi({ ...VARIABILI, COLLAUDO5_EMAIL: 'collaudo-cancella-1@esempio.it' }),
    ).toThrow(/COLLAUDO5_EMAIL.*collaudo-cancella-/)
  })

  it('R3: dominio diverso da COLLAUDO2_EMAIL → errore', () => {
    expect(() =>
      utentiAggiuntivi({ ...VARIABILI, COLLAUDO4_EMAIL: 'collaudo-password@altro.it' }),
    ).toThrow(/COLLAUDO4_EMAIL.*dominio/)
  })

  it('R3: doppione a meno delle maiuscole → errore', () => {
    expect(() =>
      utentiAggiuntivi({ ...VARIABILI, COLLAUDO4_EMAIL: 'Collaudo-Google@Esempio.it' }),
    ).toThrow(/COLLAUDO5_EMAIL.*COLLAUDO4_EMAIL/)
  })

  it('R3, R4: uguale a COLLAUDO_EMAIL → errore', () => {
    expect(() =>
      utentiAggiuntivi({
        ...VARIABILI,
        COLLAUDO_EMAIL: 'collaudo-x@esempio.it',
        COLLAUDO3_EMAIL: 'collaudo-x@esempio.it',
      }),
    ).toThrow(/COLLAUDO3_EMAIL.*COLLAUDO_EMAIL/)
  })

  it('R3: le email escono in minuscolo', () => {
    const utenti = utentiAggiuntivi({
      ...VARIABILI,
      COLLAUDO3_EMAIL: 'Collaudo-Senza-Fondo@ESEMPIO.it',
    })
    expect(utenti[0]?.email).toBe('collaudo-senza-fondo@esempio.it')
  })
})

describe('solo Google (R7)', () => {
  it("update su neon_auth.account filtrato per utente e credential, con l'id fra i parametri", () => {
    const { sql, parametri } = istruzioneSoloGoogle('id-u5')
    expect(sql).toMatch(/^update neon_auth\.account\b/)
    expect(sql).toContain(`where "userId" = $1 and "providerId" = 'credential'`)
    expect(sql).toContain(`"providerId" = 'google'`)
    expect(sql).toContain('password = null')
    expect(sql).toContain('"accountId" = $2')
    expect(sql).not.toContain('id-u5')
    expect(parametri).toEqual(['id-u5', 'collaudo-id-u5'])
  })

  it("la query dell'account cerca l'email solo come parametro", () => {
    const { sql, parametri } = queryAccountUtente('collaudo-google@esempio.it')
    expect(sql).toContain('where u.email = $1')
    expect(sql).not.toContain('@')
    expect(parametri).toEqual(['collaudo-google@esempio.it'])
  })
})

describe('stato di U5 (R8)', () => {
  it('R8: nessuna riga → assente, con il messaggio che rimanda a db:collaudo', () => {
    expect(statoSoloGoogle([])).toEqual({ tipo: 'assente' })
    expect(messaggioUtenteAssente('collaudo-google@esempio.it')).toBe(
      "Manca l'utente collaudo-google@esempio.it: lancia prima npm run db:collaudo",
    )
  })

  it('R8: una sola riga google → già solo Google, con il suo messaggio', () => {
    expect(statoSoloGoogle([{ idUtente: 'id-u5', provider: 'google' }])).toEqual({
      tipo: 'già google',
    })
    expect(MESSAGGIO_GIA_GOOGLE).toBe('U5 è già solo Google: nessuna modifica.')
  })

  it('R8: una sola riga credential → da convertire', () => {
    expect(statoSoloGoogle([{ idUtente: 'id-u5', provider: 'credential' }])).toEqual({
      tipo: 'da convertire',
      idUtente: 'id-u5',
    })
  })

  it('R8: utente senza account o con più accessi → errore senza modifiche', () => {
    expect(() => statoSoloGoogle([{ idUtente: 'id-u5', provider: null }])).toThrow(
      /nessuno.*db:collaudo/,
    )
    expect(() =>
      statoSoloGoogle([
        { idUtente: 'id-u5', provider: 'credential' },
        { idUtente: 'id-u5', provider: 'google' },
      ]),
    ).toThrow(/credential, google/)
  })
})

describe('messaggi (R6, R9)', () => {
  const utenti = utentiAggiuntivi(VARIABILI)
  const password = utenti.map((u) => u.password)

  it('R9: il riepilogo elenca i ruoli e nessuna password', () => {
    const riga = messaggioRicreati(utenti)
    expect(riga).toBe('Utenti aggiuntivi: ricreati 3 (senza fondo, password, google).')
    for (const p of password) expect(riga).not.toContain(p)
    expect(MESSAGGIO_SOLO_GOOGLE).toBe('U5 ora è solo Google.')
  })

  it("R6: l'errore nomina l'utente e il motivo, senza password", () => {
    const u4: UtenteAggiuntivo = {
      sigla: 'U4',
      ruolo: 'password',
      email: 'collaudo-password@esempio.it',
      password: 'password-di-u4-segreta',
    }
    const riga = messaggioErroreUtente(u4, new Error('email già registrata'))
    expect(riga).toBe('U4 (password, collaudo-password@esempio.it): email già registrata')
    for (const p of password) expect(riga).not.toContain(p)
  })
})

describe('ricreazione degli utenti aggiuntivi (R4)', () => {
  it('R4: istruzioni di ricreazione solo per U3, U4, U5', () => {
    const ricreazioni = istruzioniRicreaUtenti(utentiAggiuntivi(VARIABILI))
    expect(ricreazioni.map((r) => r.utente.sigla)).toEqual(['U3', 'U4', 'U5'])
    const parametri = ricreazioni.flatMap((r) => [
      ...r.cancella.parametri,
      ...r.verificaEmail.parametri,
    ])
    expect(new Set(parametri)).toEqual(
      new Set([
        'collaudo-senza-fondo@esempio.it',
        'collaudo-password@esempio.it',
        'collaudo-google@esempio.it',
      ]),
    )
    expect(parametri).not.toContain(VARIABILI.COLLAUDO_EMAIL)
    expect(parametri).not.toContain(VARIABILI.COLLAUDO2_EMAIL)
    for (const r of ricreazioni) {
      expect(r.cancella.sql).toBe('delete from neon_auth."user" where email = $1')
      expect(r.verificaEmail.sql).toBe(
        'update neon_auth."user" set "emailVerified" = true where email = $1',
      )
      expect(r.cancella.parametri).toEqual([r.utente.email])
      expect(r.verificaEmail.parametri).toEqual([r.utente.email])
    }
  })

  it("il nome visualizzato rende riconoscibile l'utente", () => {
    const u3: UtenteAggiuntivo = {
      sigla: 'U3',
      ruolo: 'senza fondo',
      email: 'collaudo-senza-fondo@esempio.it',
      password: 'password-di-u3-segreta',
    }
    expect(nomeVisualizzato(u3)).toBe('COLLAUDO U3 senza fondo')
  })
})
