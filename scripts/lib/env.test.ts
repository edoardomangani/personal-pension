// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { fondiVariabili, leggiArgomenti, richiedi, type LeggiFile } from './env'

const file = (contenuti: Record<string, string>): LeggiFile =>
  vi.fn((percorso: string) => contenuti[percorso] ?? null)

describe('leggiArgomenti', () => {
  it('legge --env e --prova', () => {
    expect(leggiArgomenti(['--env', 'x.env', '--prova'])).toEqual({ env: 'x.env', prova: true })
    expect(leggiArgomenti([])).toEqual({ env: null, prova: false })
  })

  it('--env senza valore → errore', () => {
    expect(() => leggiArgomenti(['--env'])).toThrow(/--env/)
  })
})

describe('fondiVariabili', () => {
  it('--env vince sull’ambiente e non lo mescola', () => {
    const variabili = fondiVariabili({
      fileEnv: 'collaudo.env',
      processo: { DATABASE_URL: 'dev', ALTRA: 'x' },
      envLocale: '.env.local',
      leggiFile: file({ 'collaudo.env': 'DATABASE_URL=collaudo\n' }),
    })
    expect(variabili).toEqual({ DATABASE_URL: 'collaudo' })
  })

  it('--env su file inesistente → errore, senza ripiegare su ambiente né .env.local', () => {
    const leggiFile = file({ '.env.local': 'DATABASE_URL=dev\n' })
    expect(() =>
      fondiVariabili({
        fileEnv: 'manca.env',
        processo: { DATABASE_URL: 'main' },
        envLocale: '.env.local',
        leggiFile,
      }),
    ).toThrow(/manca\.env/)
    expect(leggiFile).not.toHaveBeenCalledWith('.env.local')
  })

  it('senza --env l’ambiente vince su .env.local', () => {
    const variabili = fondiVariabili({
      fileEnv: null,
      processo: { DATABASE_URL: 'ambiente' },
      envLocale: '.env.local',
      leggiFile: file({ '.env.local': 'DATABASE_URL=locale\nSOLO_LOCALE=1\n' }),
    })
    expect(variabili).toEqual({ DATABASE_URL: 'ambiente', SOLO_LOCALE: '1' })
  })

  it('senza --env e senza .env.local usa l’ambiente', () => {
    const variabili = fondiVariabili({
      fileEnv: null,
      processo: { DATABASE_URL: 'ambiente' },
      envLocale: '.env.local',
      leggiFile: file({}),
    })
    expect(variabili).toEqual({ DATABASE_URL: 'ambiente' })
  })
})

describe('richiedi', () => {
  it('restituisce la variabile presente', () => {
    expect(richiedi({ DATABASE_URL: 'x' }, 'DATABASE_URL')).toBe('x')
  })

  it('variabile mancante o vuota → errore in italiano', () => {
    expect(() => richiedi({}, 'DATABASE_URL')).toThrow(/Manca la variabile DATABASE_URL/)
    expect(() => richiedi({ DATABASE_URL: '' }, 'DATABASE_URL')).toThrow(/DATABASE_URL/)
  })
})
