import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Alert } from '.'

// gap-y-* o gap-* senza asse, anche dopo un prefisso di variante; gap-x-* resta fuori
const daSpazioVerticale = (classe: string): boolean => /(^|:)gap-(?!x-)/.test(classe)

describe('Alert', () => {
  it.each([
    ['gap-y-1', true],
    ['gap-2', true],
    ['has-[>svg]:gap-y-1', true],
    ['md:gap-2', true],
    ['gap-x-3', false],
    ['has-[>svg]:gap-x-3', false],
  ])('%s dà spazio verticale: %s', (classe, atteso) => {
    expect(daSpazioVerticale(classe)).toBe(atteso)
  })

  it('default ha raggio 14px e nessuno spazio fra titolo e descrizione', () => {
    const classi = mount(Alert).classes()
    expect(classi).toContain('rounded-xl')
    expect(classi).not.toContain('rounded-2xl')
    expect(classi.some(daSpazioVerticale)).toBe(false)
  })

  it('destructive ha raggio 14px, il fondo rosso tenue e nessuno spazio fra titolo e descrizione', () => {
    const classi = mount(Alert, { props: { variant: 'destructive' } }).classes()
    expect(classi).toEqual(expect.arrayContaining(['rounded-xl', 'bg-destructive/8']))
    expect(classi).not.toContain('rounded-2xl')
    expect(classi.some(daSpazioVerticale)).toBe(false)
  })
})
