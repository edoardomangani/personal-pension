// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  QUERY_ROUTINE,
  controllaRuoloCollaudo,
  identificatore,
  istruzioniSvuotamento,
  messaggioSvuotamento,
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
