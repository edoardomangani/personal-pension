import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('unisce le classi condizionali', () => {
    expect(cn('flex', false && 'hidden', { 'gap-2': true, 'gap-4': false })).toBe('flex gap-2')
  })

  it('risolve i conflitti tenendo l’ultima', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('tiene insieme la taglia del saldo e il colore del testo', () => {
    expect(cn('text-balance-md', 'text-foreground')).toBe('text-balance-md text-foreground')
    expect(cn('text-tab-label', 'text-muted-foreground')).toBe(
      'text-tab-label text-muted-foreground',
    )
  })
})
