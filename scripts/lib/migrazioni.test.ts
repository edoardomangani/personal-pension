// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  daApplicare,
  hashContenuto,
  mancanzeFunzioni,
  mancanzeSicurezza,
  type PolicyTabella,
  type StatoFunzione,
  type StatoTabella,
} from './migrazioni'

const f = (nome: string, hash = 'h-' + nome) => ({ nome, hash })

describe('daApplicare', () => {
  it('ordina per nome anche se i file arrivano al contrario', () => {
    const lista = daApplicare([f('002_rpc.sql'), f('001_schema.sql')], [])
    expect(lista.map((m) => m.nome)).toEqual(['001_schema.sql', '002_rpc.sql'])
  })

  it('ignora i file che non sono migration .sql numerate', () => {
    const lista = daApplicare([f('001_schema.sql'), f('LEGGIMI.md'), f('bozza.sql')], [])
    expect(lista.map((m) => m.nome)).toEqual(['001_schema.sql'])
  })

  it('salta le migration già registrate con lo stesso hash', () => {
    const lista = daApplicare([f('001_schema.sql'), f('002_rpc.sql')], [f('001_schema.sql')])
    expect(lista.map((m) => m.nome)).toEqual(['002_rpc.sql'])
  })

  it('tutte già applicate → lista vuota', () => {
    expect(daApplicare([f('001_schema.sql')], [f('001_schema.sql')])).toEqual([])
  })

  it('registrata senza file → errore', () => {
    expect(() => daApplicare([f('002_rpc.sql')], [f('001_schema.sql')])).toThrow(/non esiste più/)
  })

  it('registrata con hash diverso → errore', () => {
    expect(() =>
      daApplicare([f('001_schema.sql', 'nuovo')], [f('001_schema.sql', 'vecchio')]),
    ).toThrow(/è cambiata/)
  })
})

describe('hashContenuto', () => {
  it('sha256 esadecimale', () => {
    expect(hashContenuto('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
})

describe('mancanzeSicurezza', () => {
  const filtro = '(user_id = auth.user_id())'
  const policy = (p: Partial<PolicyTabella> & Pick<PolicyTabella, 'nome'>): PolicyTabella => ({
    permissiva: true,
    comando: 'ALL',
    qual: null,
    withCheck: null,
    ...p,
  })
  const proprietario = policy({ nome: 'fondi_proprietario', qual: filtro, withCheck: filtro })
  const sicura: StatoTabella = {
    tabella: 'fondi',
    rls: true,
    policy: [proprietario],
    privilegiAnonymous: [],
    defaultUserId: 'auth.user_id()',
  }
  const conAnche = (altra: PolicyTabella) =>
    mancanzeSicurezza([{ ...sicura, policy: [proprietario, altra] }])

  it('T1: policy ALL per proprietario → nessuna mancanza', () => {
    expect(mancanzeSicurezza([sicura])).toEqual([])
  })

  it('T2: una ALL permissiva aperta accanto a quella per proprietario → mancanza', () => {
    expect(conAnche(policy({ nome: 'fondi_aperta', qual: 'true', withCheck: 'true' }))).toEqual([
      'fondi: la policy fondi_aperta non filtra per auth.user_id()',
    ])
  })

  it('T3: SELECT permissiva aperta → mancanza', () => {
    expect(conAnche(policy({ nome: 'fondi_lettura', comando: 'SELECT', qual: 'true' }))).toEqual([
      'fondi: la policy fondi_lettura non filtra per auth.user_id()',
    ])
  })

  it('T4: SELECT con auth.user_id() in qual e with check null → nessuna mancanza', () => {
    expect(conAnche(policy({ nome: 'fondi_lettura', comando: 'SELECT', qual: filtro }))).toEqual([])
  })

  it('T5: INSERT con qual null e auth.user_id() in with check → nessuna mancanza', () => {
    expect(
      conAnche(policy({ nome: 'fondi_inserimento', comando: 'INSERT', withCheck: filtro })),
    ).toEqual([])
  })

  it('T6: DELETE permissiva aperta → mancanza', () => {
    expect(conAnche(policy({ nome: 'fondi_cancella', comando: 'DELETE', qual: 'true' }))).toEqual([
      'fondi: la policy fondi_cancella non filtra per auth.user_id()',
    ])
  })

  it('T7: ALL restrittiva aperta → nessuna mancanza', () => {
    expect(conAnche(policy({ nome: 'fondi_limite', permissiva: false, qual: 'true' }))).toEqual([])
  })

  it('T8: solo una restrittiva per proprietario non basta', () => {
    const restrittiva = { ...proprietario, permissiva: false }
    expect(mancanzeSicurezza([{ ...sicura, policy: [restrittiva] }])).toEqual([
      'fondi: manca la policy per proprietario su authenticated',
    ])
  })

  it('T9: ALL senza with check → mancanza della policy e del proprietario', () => {
    const senzaCheck = { ...proprietario, withCheck: null }
    expect(mancanzeSicurezza([{ ...sicura, policy: [senzaCheck] }])).toEqual([
      'fondi: manca la policy per proprietario su authenticated',
      'fondi: la policy fondi_proprietario non filtra per auth.user_id()',
    ])
  })

  it('T10: elenca RLS, policy, privilegi di anonymous e default mancanti', () => {
    const mancanze = mancanzeSicurezza([
      {
        tabella: 'fondi',
        rls: false,
        policy: [],
        privilegiAnonymous: ['SELECT'],
        defaultUserId: null,
      },
    ])
    expect(mancanze).toHaveLength(4)
    expect(mancanze.every((m) => m.startsWith('fondi:'))).toBe(true)
  })
})

describe('mancanzeFunzioni', () => {
  const sicura: StatoFunzione = {
    funzione: 'salva_busta',
    securityDefiner: false,
    eseguibileDaAnonymous: false,
  }

  it('funzione a posto → nessuna mancanza', () => {
    expect(mancanzeFunzioni([sicura])).toEqual([])
  })

  it('anonymous con execute → mancanza', () => {
    expect(mancanzeFunzioni([{ ...sicura, eseguibileDaAnonymous: true }])).toEqual([
      'salva_busta: anonymous può eseguirla',
    ])
  })

  it('security definer → mancanza', () => {
    expect(mancanzeFunzioni([{ ...sicura, securityDefiner: true }])).toEqual([
      'salva_busta: è security definer',
    ])
  })

  it('security definer ammessa per nome → nessuna mancanza', () => {
    expect(
      mancanzeFunzioni([{ ...sicura, funzione: 'cancella_account()', securityDefiner: true }]),
    ).toEqual([])
  })

  it('altra security definer → mancanza', () => {
    expect(
      mancanzeFunzioni([{ ...sicura, funzione: 'cancella_tutto()', securityDefiner: true }]),
    ).toEqual(['cancella_tutto(): è security definer'])
  })

  it('cancella_account() eseguibile da anonymous → mancanza', () => {
    expect(
      mancanzeFunzioni([
        {
          funzione: 'cancella_account()',
          securityDefiner: true,
          eseguibileDaAnonymous: true,
        },
      ]),
    ).toEqual(['cancella_account(): anonymous può eseguirla'])
  })
})

describe('003_account.sql', () => {
  const sql = readFileSync(new URL('../../db/migrations/003_account.sql', import.meta.url), 'utf8')

  it('foto_profilo con RLS, policy per proprietario e grant ad authenticated', () => {
    expect(sql).toMatch(/user_id\s+text primary key default auth\.user_id\(\)/)
    expect(sql).toContain('alter table foto_profilo enable row level security')
    expect(sql).toMatch(
      /create policy foto_profilo_proprietario on foto_profilo for all to authenticated\s+using \(user_id = auth\.user_id\(\)\) with check \(user_id = auth\.user_id\(\)\)/,
    )
    expect(sql).toContain('grant select, insert, update, delete on foto_profilo to authenticated')
    expect(sql).not.toMatch(/to anonymous/)
  })

  it('cancella_account() eseguibile solo da authenticated', () => {
    expect(sql).toContain('revoke execute on function cancella_account() from public, anonymous')
    expect(sql).toContain('grant execute on function cancella_account() to authenticated')
  })

  it("ogni delete filtra sull'utente della sessione", () => {
    const cancellazioni = sql.match(/delete from [^;]+;/g) ?? []
    expect(cancellazioni).toHaveLength(7)
    for (const d of cancellazioni) {
      expect(d).toMatch(/where (user_id|id::text) = v_utente;$/)
    }
    expect(sql).toContain('v_utente text := auth.user_id()')
  })
})

describe('004_account_controlli.sql', () => {
  const sql = readFileSync(
    new URL('../../db/migrations/004_account_controlli.sql', import.meta.url),
    'utf8',
  )
  const primoDelete = sql.indexOf('delete from ')
  const deleteUtente = sql.indexOf('delete from neon_auth."user"')

  it('il trigger aggiorna aggiornata_il a ogni update di foto_profilo', () => {
    expect(sql).toMatch(
      /create trigger foto_profilo_aggiornata_il before update on foto_profilo\s+for each row execute function foto_profilo_aggiornata_il\(\)/,
    )
    expect(sql).toMatch(/new\.aggiornata_il :?= now\(\)/)
  })

  it('drop trigger if exists prima del create trigger', () => {
    const drop = sql.indexOf('drop trigger if exists foto_profilo_aggiornata_il on foto_profilo')
    expect(drop).toBeGreaterThanOrEqual(0)
    expect(drop).toBeLessThan(sql.indexOf('create trigger'))
  })

  it('la funzione trigger è security invoker con search_path fissato', () => {
    const blocco = sql.match(
      /create or replace function foto_profilo_aggiornata_il\(\)[\s\S]*?end \$\$;/,
    )?.[0]
    expect(blocco).toBeDefined()
    expect(blocco).not.toMatch(/security definer/)
    expect(blocco).toMatch(/set search_path = public, pg_temp/)
  })

  it('cancella_account() resta security definer e ogni delete filtra sull’utente della sessione', () => {
    expect(sql).toMatch(
      /create or replace function cancella_account\(\) returns void\s+language plpgsql security definer set search_path = public, pg_temp/,
    )
    const cancellazioni = sql.match(/delete from [^;]+;/g) ?? []
    expect(cancellazioni).toHaveLength(7)
    for (const d of cancellazioni) {
      expect(d).toMatch(/where (user_id|id::text) = v_utente;$/)
    }
    expect(sql).toContain('v_utente text := auth.user_id()')
  })

  it('la precondizione sul ruolo viene prima del primo delete', () => {
    for (const termine of ['rolbypassrls', 'relowner', 'relforcerowsecurity']) {
      const i = sql.indexOf(termine)
      expect(i, termine).toBeGreaterThanOrEqual(0)
      expect(i, termine).toBeLessThan(primoDelete)
    }
  })

  it('la precondizione chiede i privilegi ereditati (USAGE) sul proprietario delle tabelle', () => {
    const i = sql.indexOf("pg_has_role(current_user, c.relowner, 'USAGE')")
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(primoDelete)
    expect(sql).not.toContain("'MEMBER'")
  })

  it('senza sessione la funzione si ferma prima del primo delete', () => {
    const i = sql.search(/if v_utente is null then\s+raise exception 'Sessione mancante';/)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(primoDelete)
  })

  it('il controllo dei residui sulle sei tabelle viene prima di cancellare l’utente', () => {
    const tabelle = [
      'buste_paga',
      'movimenti',
      'estratti_conto',
      'fondi',
      'impostazioni',
      'foto_profilo',
    ]
    for (const t of tabelle) {
      const i = sql.indexOf(`exists (select 1 from ${t} where user_id = v_utente)`)
      expect(i, t).toBeGreaterThan(primoDelete)
      expect(i, t).toBeLessThan(deleteUtente)
    }
  })

  it('le eccezioni nuove usano errcode XX000', () => {
    const eccezioni = (sql.match(/raise exception [^;]+;/g) ?? []).filter(
      (r) => !r.includes("'Sessione mancante'"),
    )
    expect(eccezioni).toHaveLength(2)
    for (const r of eccezioni) {
      expect(r).toMatch(/using errcode = 'XX000';$/)
    }
  })

  it('cancella_account() eseguibile solo da authenticated', () => {
    expect(sql).toContain('revoke execute on function cancella_account() from public, anonymous')
    expect(sql).toContain('grant execute on function cancella_account() to authenticated')
    expect(sql).not.toMatch(/to anonymous/)
  })
})
