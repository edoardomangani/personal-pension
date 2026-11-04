// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  daApplicare,
  hashContenuto,
  mancanzeFunzioni,
  mancanzeSicurezza,
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
  const sicura: StatoTabella = {
    tabella: 'fondi',
    rls: true,
    policy: [{ qual: '(user_id = auth.user_id())', withCheck: '(user_id = auth.user_id())' }],
    privilegiAnonymous: [],
    defaultUserId: 'auth.user_id()',
  }

  it('tabella a posto → nessuna mancanza', () => {
    expect(mancanzeSicurezza([sicura])).toEqual([])
  })

  it('elenca RLS, policy, privilegi di anonymous e default mancanti', () => {
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

  it('una policy senza with check non basta', () => {
    const mancanze = mancanzeSicurezza([
      { ...sicura, policy: [{ qual: '(user_id = auth.user_id())', withCheck: null }] },
    ])
    expect(mancanze).toEqual(['fondi: manca la policy per proprietario su authenticated'])
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
})
