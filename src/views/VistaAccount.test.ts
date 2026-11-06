import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from 'reka-ui'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { toast } from 'vue-sonner'
import { fornisciAzioneTestata, type AzioneTestata } from '@/composables/useAzioneTestata'
import { ErroreDati } from '@/data/errori'
import { cancellaAccount } from '@/data/account'
import { aggiornaNome, cambiaPassword, verificaPassword } from '@/data/sessione'
import type { MetodiDiAccesso } from '@/data/sessione'
import { rotte } from '@/router'
import { useSessioneStore } from '@/stores/sessione'
import { utenteDiProva } from '@/test/utenti'
import VistaAccount from './VistaAccount.vue'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  accedi: vi.fn(),
  esci: vi.fn(),
  aggiornaNome: vi.fn(),
  cambiaPassword: vi.fn(),
  verificaPassword: vi.fn(),
  metodiDiAccesso: vi.fn(async () => ({ password: true, google: false })),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn(async () => null) }))
vi.mock('@/data/account', () => ({ cancellaAccount: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Gli overlay di Reka misurano con ResizeObserver, che jsdom non ha.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
)

enableAutoUnmount(afterEach)

const GIULIA = utenteDiProva({
  email: 'giulia.conti@esempio.it',
  nome: 'Giulia Conti',
  registratoIl: '2026-09-12',
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  const sessione = useSessioneStore()
  sessione.utente = GIULIA
  sessione.metodi = { password: true, google: false }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
})

// jsdom non ha matchMedia: useIsDesktop vale false; per il pannello si finge una finestra larga.
function finestraDesktop(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

async function routerSu(percorso: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: rotte })
  await router.push(percorso)
  await router.isReady()
  return router
}

interface Montata {
  wrapper: VueWrapper
  router: Router
  azione: () => AzioneTestata | null
}

// Fa la parte di AppLayout: fornisce il contenitore dell'azione che la vista registra.
async function apri(): Promise<Montata> {
  const router = await routerSu('/account')
  let leggi: () => AzioneTestata | null = () => null
  const Contenitore = defineComponent({
    setup() {
      const contenitore = fornisciAzioneTestata()
      leggi = () => contenitore.value?.() ?? null
      return () => h(TooltipProvider, null, () => h(VistaAccount))
    },
  })
  const wrapper = mount(Contenitore, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router, azione: () => leggi() }
}

function bottone(wrapper: VueWrapper, testo: string) {
  return wrapper.findAll('button').find((b) => b.text() === testo)
}

function metodi(valore: MetodiDiAccesso | null): void {
  useSessioneStore().metodi = valore
}

describe('VistaAccount (R20)', () => {
  it('mostra la data di registrazione breve e l’email verificata', async () => {
    const { wrapper } = await apri()
    expect(wrapper.text()).toContain('12 set 2026')
    expect(wrapper.text()).toContain('Verificata')
    expect(wrapper.text()).toContain('giulia.conti@esempio.it')
    expect(wrapper.text()).toContain('Impostata')
    expect(wrapper.text()).toContain('Non collegato')
  })

  it('su telefono niente pannello, «Cambia password» a tutta riga', async () => {
    const { wrapper } = await apri()
    expect(wrapper.find('[data-pannello]').exists()).toBe(false)
    expect(bottone(wrapper, 'Cambia password')?.classes()).toContain('w-full')
  })

  it('su desktop c’è il pannello con nome, email e «Cambia foto»', async () => {
    finestraDesktop()
    const { wrapper } = await apri()
    const pannello = wrapper.get('[data-pannello]')
    expect(pannello.text()).toContain('Giulia Conti')
    expect(pannello.text()).toContain('giulia.conti@esempio.it')
    expect(pannello.text()).toContain('12 set 2026')
    expect(bottone(wrapper, 'Cambia foto')?.attributes('aria-disabled')).toBeUndefined()
    expect(bottone(wrapper, 'Cambia password')).toBeDefined()
    // I gruppi Account e Accesso stanno solo nel pannello, non doppi.
    expect(wrapper.text().match(/Registrato/g)).toHaveLength(1)
  })
})

describe('VistaAccount: «Cambia foto» nel pannello (R24)', () => {
  it('account solo Google: «Cambia foto» attivo, da solo, apre «Foto del profilo»', async () => {
    finestraDesktop()
    metodi({ password: false, google: true })
    const { wrapper } = await apri()
    const pulsante = bottone(wrapper, 'Cambia foto')
    expect(pulsante?.attributes('aria-disabled')).toBeUndefined()
    expect(bottone(wrapper, 'Cambia password')).toBeUndefined()
    expect(document.body.textContent).not.toContain('Foto del profilo')

    await pulsante?.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Foto del profilo')
    expect(document.body.textContent).toContain('Scegli una foto')
  })
})

describe('VistaAccount: nome (R21)', () => {
  it('nome uguale con spazi → azione non attiva e niente modifiche', async () => {
    const { wrapper, azione } = await apri()
    await wrapper.get('#account-nome').setValue('  Giulia Conti ')
    expect(azione()?.attiva).toBe(false)
    expect(azione()?.modificato).toBe(false)
    expect(azione()?.etichetta).toBe('Salva')
  })

  it('nome cambiato → aggiornaNome col nome pulito e toast «Nome aggiornato»', async () => {
    vi.mocked(aggiornaNome).mockResolvedValue(undefined)
    const { wrapper, azione } = await apri()
    await wrapper.get('#account-nome').setValue('  Giulia Conti Ferri ')
    expect(azione()?.attiva).toBe(true)
    expect(azione()?.modificato).toBe(true)

    azione()?.esegui()
    await nextTick()
    expect(azione()?.inCorso).toBe(true)
    await flushPromises()

    expect(aggiornaNome).toHaveBeenCalledWith('Giulia Conti Ferri')
    expect(toast.success).toHaveBeenCalledWith('Nome aggiornato')
    expect(useSessioneStore().utente?.nome).toBe('Giulia Conti Ferri')
    expect(azione()?.attiva).toBe(false)
  })

  it('Invio nel campo invia', async () => {
    vi.mocked(aggiornaNome).mockResolvedValue(undefined)
    const { wrapper } = await apri()
    const campo = wrapper.get('#account-nome')
    await campo.setValue('Giulia Ferri')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(aggiornaNome).toHaveBeenCalledWith('Giulia Ferri')
  })

  it('Invio con il nome invariato non salva', async () => {
    const { wrapper } = await apri()
    const campo = wrapper.get('#account-nome')
    await campo.setValue('  Giulia Conti ')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(aggiornaNome).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('nome vuoto → «Scrivi il tuo nome.» e nessuna chiamata', async () => {
    const { wrapper, azione } = await apri()
    await wrapper.get('#account-nome').setValue('   ')
    expect(azione()?.attiva).toBe(true)
    azione()?.esegui()
    await flushPromises()
    expect(wrapper.text()).toContain('Scrivi il tuo nome.')
    expect(aggiornaNome).not.toHaveBeenCalled()
  })
})

describe('VistaAccount: accesso (R22)', () => {
  it('solo Google → niente «Cambia password», Google per primo', async () => {
    metodi({ password: false, google: true })
    const { wrapper } = await apri()
    expect(bottone(wrapper, 'Cambia password')).toBeUndefined()
    const righe = wrapper.findAll('dt').map((dt) => dt.text())
    expect(righe.indexOf('Google')).toBeLessThan(righe.indexOf('Password'))
    expect(wrapper.text()).toContain('Non impostata')
    expect(wrapper.text()).toContain('Collegato')
  })

  it('metodi non caricati → «—» e «Cambia password» c’è', async () => {
    metodi(null)
    const { wrapper } = await apri()
    const valori = wrapper
      .findAll('dt')
      .filter((dt) => ['Password', 'Google'].includes(dt.text()))
      .map((dt) => dt.element.nextElementSibling?.textContent)
    expect(valori).toEqual(['—', '—'])
    expect(bottone(wrapper, 'Cambia password')).toBeDefined()
  })
})

describe('VistaAccount: cambio password (R22)', () => {
  function campo(id: string): HTMLInputElement {
    const el = document.getElementById(id)
    if (!(el instanceof HTMLInputElement)) throw new Error(`manca #${id}`)
    return el
  }

  function scrivi(id: string, valore: string): void {
    const el = campo(id)
    el.value = valore
    el.dispatchEvent(new Event('input'))
  }

  function salvaLaPassword(): HTMLButtonElement {
    const pulsante = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Salva la password',
    )
    if (!pulsante) throw new Error('manca «Salva la password»')
    return pulsante
  }

  async function apriPannello(): Promise<Montata> {
    const montata = await apri()
    await bottone(montata.wrapper, 'Cambia password')?.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Usa una password lunga che non usi altrove.')
    return montata
  }

  async function compila(attuale: string, nuova: string, conferma: string): Promise<void> {
    scrivi('cambia-password-attuale', attuale)
    scrivi('cambia-password-nuova', nuova)
    scrivi('cambia-password-conferma', conferma)
    await nextTick()
    salvaLaPassword().click()
    await flushPromises()
  }

  it('conferma diversa → «Le password non coincidono.» senza chiamata', async () => {
    await apriPannello()
    await compila('vecchia123', 'nuovissima1', 'nuovissima2')
    expect(document.body.textContent).toContain('Le password non coincidono.')
    expect(cambiaPassword).not.toHaveBeenCalled()
  })

  it('password attuale sbagliata (vincolo) → messaggio sotto «Password attuale»', async () => {
    vi.mocked(cambiaPassword).mockRejectedValue(
      new ErroreDati('vincolo', 'La password attuale non è corretta.'),
    )
    await apriPannello()
    await compila('sbagliata1', 'nuovissima1', 'nuovissima1')
    expect(cambiaPassword).toHaveBeenCalledWith('sbagliata1', 'nuovissima1')
    const riga = campo('cambia-password-attuale').closest('[data-slot="field"]')
    expect(riga?.textContent).toContain('La password attuale non è corretta.')
    expect(campo('cambia-password-attuale').getAttribute('aria-invalid')).toBe('true')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('riuscito → chiude e toast «Password aggiornata»', async () => {
    vi.mocked(cambiaPassword).mockResolvedValue(undefined)
    await apriPannello()
    await compila('vecchia123', 'nuovissima1', 'nuovissima1')
    expect(cambiaPassword).toHaveBeenCalledWith('vecchia123', 'nuovissima1')
    expect(toast.success).toHaveBeenCalledWith('Password aggiornata')
    await flushPromises()
    expect(document.getElementById('cambia-password-attuale')).toBeNull()
  })
})

describe('VistaAccount: cancellazione (R23)', () => {
  function campoConferma(): HTMLInputElement {
    const el = document.getElementById('cancella-account-conferma')
    if (!(el instanceof HTMLInputElement)) throw new Error('manca il campo della conferma')
    return el
  }

  async function apriCancella(): Promise<Montata> {
    const montata = await apri()
    await bottone(montata.wrapper, 'Cancella account')?.trigger('click')
    await flushPromises()
    return montata
  }

  async function conferma(valore: string): Promise<void> {
    const campo = campoConferma()
    campo.value = valore
    campo.dispatchEvent(new Event('input'))
    await nextTick()
    const pulsante = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Cancella per sempre',
    )
    pulsante?.click()
    await flushPromises()
  }

  it('con la password: testo di R23 e campo password', async () => {
    await apriCancella()
    expect(document.body.textContent).toContain(
      'Cancelliamo subito buste paga, movimenti, estratti conto, impostazioni e la foto',
    )
    expect(document.body.textContent).toContain('Per confermare, scrivi la tua password.')
    expect(campoConferma().type).toBe('password')
  })

  it('password errata → «Password non corretta.» e la RPC non parte', async () => {
    vi.mocked(verificaPassword).mockRejectedValue(
      new ErroreDati('vincolo', 'Password non corretta.'),
    )
    const { router } = await apriCancella()
    await conferma('sbagliata')
    expect(verificaPassword).toHaveBeenCalledWith('giulia.conti@esempio.it', 'sbagliata')
    const riga = campoConferma().closest('[data-slot="field"]')
    expect(riga?.textContent).toContain('Password non corretta.')
    expect(cancellaAccount).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/account')
    expect(useSessioneStore().utente).not.toBeNull()
  })

  it('password vuota → «Scrivi la password.» senza chiamate', async () => {
    await apriCancella()
    await conferma('')
    expect(document.body.textContent).toContain('Scrivi la password.')
    expect(verificaPassword).not.toHaveBeenCalled()
  })

  it('solo Google con l’email giusta fra spazi e maiuscole → RPC e /accedi?avviso=cancellato', async () => {
    metodi({ password: false, google: true })
    vi.mocked(cancellaAccount).mockResolvedValue(undefined)
    const { router } = await apriCancella()
    expect(document.body.textContent).toContain('Per confermare, scrivi la tua email.')
    expect(campoConferma().type).toBe('email')
    await conferma(' Giulia.Conti@Esempio.it ')
    expect(verificaPassword).not.toHaveBeenCalled()
    expect(cancellaAccount).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/accedi?avviso=cancellato')
    expect(useSessioneStore().utente).toBeNull()
  })

  it('solo Google con un’altra email → messaggio di R6 e la RPC non parte', async () => {
    metodi({ password: false, google: true })
    const { router } = await apriCancella()
    await conferma('altra@esempio.it')
    expect(campoConferma().closest('[data-slot="field"]')?.textContent).toContain(
      'L’email non è quella del tuo account.',
    )
    expect(cancellaAccount).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/account')
  })

  it('la RPC fallisce per la rete → errore nel pannello, l’account resta', async () => {
    vi.mocked(verificaPassword).mockResolvedValue(undefined)
    vi.mocked(cancellaAccount).mockRejectedValue(
      new ErroreDati('rete', 'Sei offline o il server non risponde. Riprova.'),
    )
    const { router } = await apriCancella()
    await conferma('giusta123')
    expect(cancellaAccount).toHaveBeenCalledOnce()
    const alert = document.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('Sei offline o il server non risponde. Riprova.')
    expect(router.currentRoute.value.fullPath).not.toBe('/accedi?avviso=cancellato')
    expect(router.currentRoute.value.path).toBe('/account')
    expect(useSessioneStore().utente).toEqual(GIULIA)
  })
})
