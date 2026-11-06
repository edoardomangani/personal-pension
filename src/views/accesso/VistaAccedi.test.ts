import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  type DOMWrapper,
  type VueWrapper,
} from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, createWebHashHistory, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { accedi, accediConGoogle, reinviaCodice, sessioneCorrente } from '@/data/sessione'
import { rotte, spostaSearchNelFrammento, urlApp } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { inSospeso } from '@/test/promesse'
import { utenteDiProva } from '@/test/utenti'
import VistaAccedi from './VistaAccedi.vue'

vi.mock('@/data/sessione', () => ({
  CODICE_EMAIL_DA_VERIFICARE: 'email-da-verificare',
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
  reinviaCodice: vi.fn(),
  accediConGoogle: vi.fn(),
  metodiDiAccesso: vi.fn(async () => ({ password: true, google: false })),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn(async () => null) }))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(accedi).mockResolvedValue(utenteDiProva())
})

async function apri(percorso: string): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  const wrapper = mount(VistaAccedi, { global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, router }
}

/** Come all'avvio vero: jsdom all'indirizzo che manda Better Auth, poi la history hash. */
async function apriDaIndirizzo(
  indirizzo: string,
): Promise<{ wrapper: VueWrapper; router: Router }> {
  window.history.replaceState(null, '', indirizzo)
  spostaSearchNelFrammento()
  const history = createWebHashHistory()
  const router = createRouter({ history, routes: rotte })
  await router.push(history.location)
  await router.isReady()
  const wrapper = mount(VistaAccedi, { global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, router }
}

async function compila(wrapper: VueWrapper, email: string, password: string): Promise<void> {
  await wrapper.get('#accedi-email').setValue(email)
  await wrapper.get('#accedi-password').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('VistaAccedi (R13)', () => {
  it('?avviso=boh non mostra nessun avviso', async () => {
    const { wrapper } = await apri('/accedi?avviso=boh')
    expect(wrapper.find('[data-avviso]').exists()).toBe(false)
  })

  it.each([
    ['sessione', 'Sessione scaduta', 'Accedi di nuovo per tornare dove eri.'],
    ['password', 'Password aggiornata', 'Accedi con la nuova password.'],
    ['cancellato', 'Account cancellato', 'L’account e tutti i dati del piano non ci sono più.'],
  ])('?avviso=%s mostra «%s»', async (avviso, titolo, testo) => {
    const { wrapper } = await apri(`/accedi?avviso=${avviso}`)
    const alert = wrapper.get('[data-avviso]')
    expect(alert.text()).toContain(titolo)
    expect(alert.text()).toContain(testo)
  })

  it('?error= dal ritorno di Google mostra l’avviso di Google', async () => {
    const { wrapper } = await apri('/accedi?error=access_denied')
    expect(wrapper.get('[data-avviso]').text()).toContain('Accesso con Google non riuscito')
  })

  it('il focus va al primo campo vuoto', async () => {
    await apri('/accedi')
    expect(document.activeElement?.id).toBe('accedi-email')
  })
})

describe('VistaAccedi: invio', () => {
  it('campi vuoti → errori di R29, nessuna chiamata', async () => {
    const { wrapper } = await apri('/accedi')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Scrivi un indirizzo email valido.')
    expect(wrapper.text()).toContain('Scrivi la password.')
    expect(accedi).not.toHaveBeenCalled()
  })

  it('credenziali errate → messaggio sotto la password, nessun avviso di sessione', async () => {
    vi.mocked(accedi).mockRejectedValueOnce(
      new ErroreDati('sessione', 'Email o password non corretti.'),
    )
    const { wrapper, router } = await apri('/accedi')
    await compila(wrapper, 'giulia@esempio.it', 'sbagliata')
    const riga = wrapper.get('#accedi-password').element.closest('[data-slot="field"]')
    expect(riga?.textContent).toContain('Email o password non corretti.')
    expect(router.currentRoute.value.path).toBe('/accedi')
    expect(document.activeElement?.id).toBe('accedi-password')
  })

  it('email da verificare → nuovo codice e /verifica?email=', async () => {
    vi.mocked(accedi).mockRejectedValueOnce(
      new ErroreDati('sessione', 'Da verificare.', 'email-da-verificare'),
    )
    vi.mocked(reinviaCodice).mockResolvedValueOnce(undefined)
    const { wrapper, router } = await apri('/accedi')
    await compila(wrapper, ' giulia@esempio.it ', 'segreta')
    expect(reinviaCodice).toHaveBeenCalledWith('giulia@esempio.it')
    expect(router.currentRoute.value.path).toBe('/verifica')
    expect(router.currentRoute.value.query.email).toBe('giulia@esempio.it')
  })

  it('accesso riuscito → la rotta di da', async () => {
    const { wrapper, router } = await apri('/accedi?da=/valori&avviso=sessione')
    await compila(wrapper, 'giulia@esempio.it', 'segreta')
    expect(accedi).toHaveBeenCalledWith('giulia@esempio.it', 'segreta')
    expect(router.currentRoute.value.path).toBe('/valori')
  })

  it('accesso riuscito con da=//evil.com → /', async () => {
    const { wrapper, router } = await apri('/accedi?da=//evil.com')
    await compila(wrapper, 'giulia@esempio.it', 'segreta')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('errore di rete → messaggio sotto il modulo, campi compilati', async () => {
    vi.mocked(accedi).mockRejectedValueOnce(new ErroreDati('rete', 'Rete giù'))
    const { wrapper } = await apri('/accedi')
    await compila(wrapper, 'giulia@esempio.it', 'segreta')
    expect(wrapper.get('form [role="alert"]').text()).toBe('Rete giù')
    expect(wrapper.get<HTMLInputElement>('#accedi-email').element.value).toBe('giulia@esempio.it')
  })
})

describe('VistaAccedi: Google (R19)', () => {
  it('passa il ritorno su / e quello d’errore su /accedi', async () => {
    vi.mocked(accediConGoogle).mockResolvedValueOnce(undefined)
    const { wrapper } = await apri('/accedi')
    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(accediConGoogle).toHaveBeenCalledWith(urlApp('/'), urlApp('/accedi'))
  })
})

describe('VistaAccedi: confini', () => {
  it('non importa il livello dati', async () => {
    const sorgente = (await import('./VistaAccedi.vue?raw')).default
    expect(sorgente).not.toMatch(/from ['"]@\/data\//)
  })
})

describe('VistaAccedi dagli indirizzi reali (ACC-01-C1 R7)', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('/?error=access_denied#/accedi → avviso di Google', async () => {
    const { wrapper } = await apriDaIndirizzo('/?error=access_denied#/accedi')
    expect(wrapper.get('[data-avviso]').text()).toContain('Accesso con Google non riuscito')
  })
})

describe('VistaAccedi: area di tocco (R2)', () => {
  it.each(['Hai dimenticato la password?', 'Registrati'])(
    '«%s» ha relative e touch-target',
    async (testo) => {
      const { wrapper } = await apri('/accedi')
      const link = wrapper.findAll('a').find((a) => a.text() === testo)
      expect(link?.classes()).toEqual(expect.arrayContaining(['relative', 'touch-target']))
    },
  )
})

describe('VistaAccedi: posizione del link (ACC-02)', () => {
  async function linkPassword(): Promise<{ wrapper: VueWrapper; link: DOMWrapper<Element> }> {
    const { wrapper } = await apri('/accedi')
    const link = wrapper.findAll('a').find((a) => a.text() === 'Hai dimenticato la password?')
    if (!link) throw new Error('link «Hai dimenticato la password?» assente')
    return { wrapper, link }
  }

  it('R1: gruppo e link stanno in un contenitore con gap-4, non gap-3', async () => {
    const { wrapper, link } = await linkPassword()
    const contenitore = link.element.parentElement
    const gruppo = wrapper.get('#accedi-email').element.closest('fieldset')
    expect(gruppo?.parentElement).toBe(contenitore)
    expect(contenitore?.classList.contains('gap-4')).toBe(true)
    expect(contenitore?.classList.contains('gap-3')).toBe(false)
  })

  it('R2: il link ha px-1 e self-end', async () => {
    const { link } = await linkPassword()
    expect(link.classes()).toEqual(expect.arrayContaining(['px-1', 'self-end']))
  })

  it('R4: con la history hash il link termina con #/password-dimenticata', async () => {
    const { wrapper } = await apriDaIndirizzo('/#/accedi')
    window.history.replaceState(null, '', '/')
    const link = wrapper.findAll('a').find((a) => a.text() === 'Hai dimenticato la password?')
    expect(link?.attributes('href')).toMatch(/#\/password-dimenticata$/)
  })
})

/** Come all'avvio vero: il ripristino fallisce con l'errore dato, poi si monta la vista. */
async function ripristinoFallito(eccezione: unknown): Promise<void> {
  vi.mocked(sessioneCorrente).mockRejectedValueOnce(eccezione)
  await useSessioneStore().ripristina()
}

const reteGiu = () => new TypeError('Failed to fetch')

describe('VistaAccedi: avviso di rete (R4, R5)', () => {
  it('errore di rete → «Non riesco a collegarmi» con Riprova', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper } = await apri('/accedi')
    const alert = wrapper.get('[data-avviso="rete"]')
    expect(alert.text()).toContain('Non riesco a collegarmi')
    expect(alert.text()).toContain('Controlla la connessione e riprova.')
    expect(alert.find('button').text()).toBe('Riprova')
  })

  it.each([
    ['sessione', new ErroreDati('sessione', 'Sessione scaduta')],
    ['altro', new ErroreDati('altro', 'Qualcosa non va')],
  ])('errore di tipo %s → nessun avviso', async (_tipo, errore) => {
    await ripristinoFallito(errore)
    const { wrapper } = await apri('/accedi')
    expect(wrapper.find('[data-avviso]').exists()).toBe(false)
  })

  it('rete e ?avviso=sessione → solo l’avviso di rete', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper } = await apri('/accedi?avviso=sessione')
    const avvisi = wrapper.findAll('[data-avviso]')
    expect(avvisi).toHaveLength(1)
    expect(avvisi[0]?.attributes('data-avviso')).toBe('rete')
    expect(wrapper.text()).not.toContain('Sessione scaduta')
  })

  it('rete e ?error= → solo l’avviso di Google', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper } = await apri('/accedi?error=access_denied')
    const avvisi = wrapper.findAll('[data-avviso]')
    expect(avvisi).toHaveLength(1)
    expect(avvisi[0]?.text()).toContain('Accesso con Google non riuscito')
    expect(wrapper.find('[data-avviso="rete"]').exists()).toBe(false)
  })
})

function bottoneRiprova(wrapper: VueWrapper) {
  return wrapper.get('[data-avviso="rete"] button')
}

describe('VistaAccedi: Riprova (R6, R7)', () => {
  it('sessione ritrovata → la rotta di da', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper, router } = await apri('/accedi?da=/valori')
    vi.mocked(sessioneCorrente).mockClear()
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(utenteDiProva())
    await bottoneRiprova(wrapper).trigger('click')
    await flushPromises()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/valori')
  })

  it('sessione ritrovata con da=//evil.com → /', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper, router } = await apri('/accedi?da=//evil.com')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(utenteDiProva())
    await bottoneRiprova(wrapper).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('ancora senza rete → resta su /accedi, avviso e bottone attivo', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper, router } = await apri('/accedi')
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(reteGiu())
    await bottoneRiprova(wrapper).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/accedi')
    expect(wrapper.get('[data-avviso="rete"]').text()).toContain('Non riesco a collegarmi')
    expect(bottoneRiprova(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('rete tornata senza sessione → resta su /accedi con «Sessione scaduta»', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper, router } = await apri('/accedi?avviso=sessione')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(null)
    await bottoneRiprova(wrapper).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/accedi')
    expect(wrapper.find('[data-avviso="rete"]').exists()).toBe(false)
    expect(wrapper.get('[data-avviso]').text()).toContain('Sessione scaduta')
  })

  it('in attesa il bottone è spento e un secondo clic non rifà la chiamata', async () => {
    await ripristinoFallito(reteGiu())
    const { wrapper } = await apri('/accedi')
    vi.mocked(sessioneCorrente).mockClear()
    let risolvi: (valore: null) => void = () => {}
    vi.mocked(sessioneCorrente).mockReturnValueOnce(
      new Promise((resolve) => {
        risolvi = resolve
      }),
    )
    await bottoneRiprova(wrapper).trigger('click')
    expect(bottoneRiprova(wrapper).attributes('disabled')).toBeDefined()
    await bottoneRiprova(wrapper).trigger('click')
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    risolvi(null)
    await flushPromises()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
  })
})

describe('VistaAccedi: ritorno della rete (PWA-01-C1 R14)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Avviso di rete e vista aperta offline; restituisce come far tornare la rete. */
  async function apriOffline(percorso: string) {
    await ripristinoFallito(reteGiu())
    vi.mocked(sessioneCorrente).mockClear()
    const getter = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const aperta = await apri(percorso)
    const torna = async () => {
      getter.mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
      await flushPromises()
    }
    return { ...aperta, torna }
  }

  it('T29: sessione valida al ritorno della rete → un ripristino e la rotta di da', async () => {
    const { router, torna } = await apriOffline('/accedi?da=/movimenti')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(utenteDiProva())
    await torna()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/movimenti')
  })

  it('T30: senza sessione al ritorno della rete → resta su /accedi senza avviso di rete', async () => {
    const { wrapper, router, torna } = await apriOffline('/accedi?da=/movimenti')
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(null)
    await torna()
    expect(router.currentRoute.value.path).toBe('/accedi')
    expect(wrapper.find('[data-avviso="rete"]').exists()).toBe(false)
  })

  it('T31: con Riprova in corso il ritorno della rete non rifà la chiamata', async () => {
    const { wrapper, torna } = await apriOffline('/accedi')
    const sessioneInVolo = inSospeso<null>()
    vi.mocked(sessioneCorrente).mockReturnValueOnce(sessioneInVolo.promessa)
    await bottoneRiprova(wrapper).trigger('click')
    await torna()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(bottoneRiprova(wrapper).attributes('disabled')).toBeDefined()
    sessioneInVolo.risolvi(null)
    await flushPromises()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
  })

  it('con l’avviso di Google il ritorno della rete non chiama sessioneCorrente', async () => {
    const { wrapper, torna } = await apriOffline('/accedi?error=access_denied')
    await torna()
    expect(sessioneCorrente).not.toHaveBeenCalled()
    expect(wrapper.get('[data-avviso]').text()).toContain('Accesso con Google non riuscito')
  })
})
