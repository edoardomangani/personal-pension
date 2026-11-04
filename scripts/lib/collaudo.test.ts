// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { controllaRuoloCollaudo, identificatore, istruzioniSvuotamento } from './collaudo'

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

  it('un solo truncate con cascade sulle tabelle di public, più il registro', () => {
    expect(istruzioniSvuotamento(tabelle, true)).toEqual([
      'truncate table "public"."fondi", "public"."movimenti" cascade',
      'delete from migrazioni.applicate',
    ])
  })

  it('nessuna istruzione nomina neon_auth né è un drop', () => {
    const istruzioni = istruzioniSvuotamento(tabelle, true)
    expect(istruzioni.some((i) => i.includes('neon_auth'))).toBe(false)
    expect(istruzioni.some((i) => /\bdrop\b/i.test(i))).toBe(false)
  })

  it('senza registro non tocca migrazioni; senza tabelle niente truncate', () => {
    expect(istruzioniSvuotamento([], false)).toEqual([])
    expect(istruzioniSvuotamento([], true)).toEqual(['delete from migrazioni.applicate'])
  })

  it('quota gli identificatori', () => {
    expect(identificatore('strano"nome')).toBe('"strano""nome"')
  })
})
