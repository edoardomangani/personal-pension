import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, createWebHashHistory, type Router } from 'vue-router'
import { ErroreDati } from '@/data/errori'
import { accedi, accediConGoogle, reinviaCodice } from '@/data/sessione'
import { rotte, spostaSearchNelFrammento, urlApp } from '@/router'
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
    ['cancellato', 'Account cancellato', "L'account e tutti i dati del piano non ci sono più."],
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
