import { describe, expect, it } from 'vitest'
import { annoPensione } from './pensione'

describe('annoPensione', () => {
  it('anno di nascita più età della pensione', () => {
    expect(annoPensione(1994, 67)).toBe(2061)
    expect(annoPensione(1980, 40)).toBe(2020)
  })
})
