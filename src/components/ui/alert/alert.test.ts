import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Alert } from '.'

describe('Alert', () => {
  it('default ha raggio 14px e nessuno spazio fra titolo e descrizione', () => {
    const classi = mount(Alert).classes()
    expect(classi).toContain('rounded-xl')
    expect(classi).not.toContain('rounded-2xl')
    expect(classi).not.toContain('gap-y-0.5')
  })

  it('destructive ha raggio 14px e il fondo rosso tenue', () => {
    const classi = mount(Alert, { props: { variant: 'destructive' } }).classes()
    expect(classi).toEqual(expect.arrayContaining(['rounded-xl', 'bg-destructive/8']))
    expect(classi).not.toContain('rounded-2xl')
    expect(classi).not.toContain('gap-y-0.5')
  })
})
