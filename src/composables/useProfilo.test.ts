import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessioneStore } from '@/stores/sessione'
import { emailSecondariaDi, inizialiDi, rigaPrincipaleDi, salutoDi, useProfilo } from './useProfilo'
import { utenteDiProva } from '@/test/utenti'

const EMAIL = 'edoardo@esempio.it'

describe('regole del profilo (R6, R9, R10)', () => {
  it('con nome: iniziali delle prime due parole, nome sopra ed email sotto', () => {
    const utente = { email: EMAIL, nome: 'Edoardo Mangani' }
    expect(inizialiDi(utente)).toBe('EM')
    expect(rigaPrincipaleDi(utente)).toBe('Edoardo Mangani')
    expect(emailSecondariaDi(utente)).toBe(EMAIL)
    expect(salutoDi(utente)).toBe('Ciao Edoardo')
  })

  it('oltre due parole contano solo le prime due, in maiuscolo', () => {
    expect(inizialiDi({ email: EMAIL, nome: 'anna maria rossi' })).toBe('AM')
  })

  it('nome di una sola parola: una iniziale', () => {
    const utente = { email: EMAIL, nome: 'Edoardo' }
    expect(inizialiDi(utente)).toBe('E')
    expect(salutoDi(utente)).toBe('Ciao Edoardo')
  })

  it('senza nome: prima lettera dell’email maiuscola, email come riga principale e niente sotto', () => {
    const utente = { email: EMAIL }
    expect(inizialiDi(utente)).toBe('E')
    expect(rigaPrincipaleDi(utente)).toBe(EMAIL)
    expect(emailSecondariaDi(utente)).toBeNull()
    expect(salutoDi(utente)).toBe('Ciao')
  })

  it('un nome vuoto o di soli spazi vale come assente', () => {
    for (const nome of ['', '   ', null]) {
      const utente = { email: EMAIL, nome }
      expect(inizialiDi(utente)).toBe('E')
      expect(rigaPrincipaleDi(utente)).toBe(EMAIL)
      expect(emailSecondariaDi(utente)).toBeNull()
      expect(salutoDi(utente)).toBe('Ciao')
    }
  })

  it('senza sessione: icona al posto delle iniziali, «Account» e «Ciao»', () => {
    expect(inizialiDi(null)).toBeNull()
    expect(rigaPrincipaleDi(null)).toBe('Account')
    expect(emailSecondariaDi(null)).toBeNull()
    expect(salutoDi(null)).toBe('Ciao')
  })
})

describe('useProfilo sullo store della sessione', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('con utente null dà lo stato senza sessione', () => {
    const { rigaPrincipale, emailSecondaria, iniziali, saluto } = useProfilo()
    expect(rigaPrincipale.value).toBe('Account')
    expect(emailSecondaria.value).toBeNull()
    expect(iniziali.value).toBeNull()
    expect(saluto.value).toBe('Ciao')
  })

  it('R28: la foto segue lo store', () => {
    const profilo = useProfilo()
    const sessione = useSessioneStore()
    expect(profilo.foto.value).toBeNull()
    sessione.foto = 'data:image/jpeg;base64,AAAA'
    expect(profilo.foto.value).toBe('data:image/jpeg;base64,AAAA')
    sessione.foto = null
    expect(profilo.foto.value).toBeNull()
  })

  it('segue l’utente dello store', () => {
    const profilo = useProfilo()
    useSessioneStore().utente = utenteDiProva({ email: EMAIL })
    expect(profilo.rigaPrincipale.value).toBe(EMAIL)
    expect(profilo.emailSecondaria.value).toBeNull()
    expect(profilo.iniziali.value).toBe('E')
    expect(profilo.saluto.value).toBe('Ciao')
  })

  it('R7: col nome dello store saluta per nome, iniziali e email sotto', () => {
    const profilo = useProfilo()
    useSessioneStore().utente = utenteDiProva({ email: EMAIL, nome: 'Giulia Conti' })
    expect(profilo.saluto.value).toBe('Ciao Giulia')
    expect(profilo.iniziali.value).toBe('GC')
    expect(profilo.rigaPrincipale.value).toBe('Giulia Conti')
    expect(profilo.emailSecondaria.value).toBe(EMAIL)
  })
})
