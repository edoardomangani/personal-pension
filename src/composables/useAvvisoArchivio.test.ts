import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ErroreDati } from '@/data/errori'
import { metodiDiAccesso, sessioneCorrente, type Utente } from '@/data/sessione'
import { salvaUltimoUtente } from '@/data/ultimoUtente'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'
import { inSospeso } from '@/test/promesse'
import { utenteDiProva } from '@/test/utenti'
import { fornisciRete } from './useRete'
import { useAvvisoArchivio } from './useAvvisoArchivio'

vi.mock('@/data/sessione', () => ({
  sessioneCorrente: vi.fn(),
  esci: vi.fn(),
  metodiDiAccesso: vi.fn(),
}))
vi.mock('@/data/foto', () => ({ leggiFoto: vi.fn() }))

const UTENTE = utenteDiProva()
const SENZA_RETE = () => new TypeError('Failed to fetch')

enableAutoUnmount(afterEach)

// Il carico vero dell'archivio non parte mai: se fallisse a test finito sporcherebbe il test dopo.
let carica: MockInstance<() => Promise<void>>

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.mocked(metodiDiAccesso).mockResolvedValue({ password: true, google: false })
  carica = vi.spyOn(useArchivioStore(), 'carica').mockResolvedValue()
})

/** Sonda col composable sotto un antenato che fissa lo stato della rete. */
function monta(online: boolean): {
  rete: Ref<boolean>
  avviso: ReturnType<typeof useAvvisoArchivio>
} {
  const rete = ref(online)
  let avviso: ReturnType<typeof useAvvisoArchivio> | undefined
  const Sonda = defineComponent({
    setup() {
      avviso = useAvvisoArchivio()
      return () => null
    },
  })
  mount(
    defineComponent({
      setup() {
        fornisciRete(rete)
        return () => h(Sonda)
      },
    }),
  )
  if (!avviso) throw new Error('useAvvisoArchivio non è stato chiamato')
  return { rete, avviso }
}

/** Ultimo utente noto e primo ripristino fallito per la rete: utente provvisorio. */
async function provvisorio(): Promise<void> {
  salvaUltimoUtente(UTENTE)
  vi.mocked(sessioneCorrente).mockRejectedValueOnce(SENZA_RETE())
  await useSessioneStore().ripristina()
  vi.mocked(sessioneCorrente).mockClear()
}

describe('useAvvisoArchivio: primo carico ed errore (PWA-01-C1 R10, R12)', () => {
  it('T23: da provvisorio nessun carica(); alla conferma uno solo', async () => {
    await provvisorio()
    monta(true)
    await flushPromises()
    expect(carica).not.toHaveBeenCalled()

    vi.mocked(sessioneCorrente).mockResolvedValueOnce(UTENTE)
    await useSessioneStore().ripristina()
    await flushPromises()
    expect(carica).toHaveBeenCalledTimes(1)
  })

  it('T26: online da provvisorio con errore rete è visibile; offline no; con errore sessione no', async () => {
    await provvisorio()
    const { rete, avviso } = monta(true)
    expect(avviso.visibile.value).toBe(true)

    rete.value = false
    await nextTick()
    expect(avviso.visibile.value).toBe(false)

    rete.value = true
    useSessioneStore().errore = new ErroreDati('sessione', 'messaggio')
    await nextTick()
    expect(avviso.visibile.value).toBe(false)
  })
})

describe('useAvvisoArchivio: ricontrollo e Riprova (PWA-01-C1 R11, R13)', () => {
  it('T24: provvisorio, ritorno della rete e sessione confermata → ripristina poi un carica()', async () => {
    await provvisorio()
    const { rete } = monta(false)
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(UTENTE)

    rete.value = true
    await flushPromises()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(carica).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sessioneCorrente).mock.invocationCallOrder[0]).toBeLessThan(
      carica.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('T25: provvisorio, ritorno della rete e sessione assente → uscita per sessione, nessun carica()', async () => {
    await provvisorio()
    const { rete } = monta(false)
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(null)

    rete.value = true
    await flushPromises()
    expect(useSessioneStore().motivoUscita).toBe('sessione')
    expect(useSessioneStore().utente).toBeNull()
    expect(carica).not.toHaveBeenCalled()
  })

  it('T27: Riprova da provvisorio → ripristina poi carica(), inCorso fino alla fine, un secondo clic non rifà niente', async () => {
    await provvisorio()
    const { avviso } = monta(true)
    const sessioneInVolo = inSospeso<Utente | null>()
    const caricaInVolo = inSospeso<void>()
    vi.mocked(sessioneCorrente).mockReturnValueOnce(sessioneInVolo.promessa)
    carica.mockReturnValueOnce(caricaInVolo.promessa)

    const primo = avviso.riprova()
    expect(avviso.inCorso.value).toBe(true)
    void avviso.riprova()
    sessioneInVolo.risolvi(UTENTE)
    await flushPromises()
    expect(carica).toHaveBeenCalledTimes(1)
    expect(avviso.inCorso.value).toBe(true)

    void avviso.riprova()
    caricaInVolo.risolvi()
    await primo
    expect(avviso.inCorso.value).toBe(false)
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(carica).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sessioneCorrente).mock.invocationCallOrder[0]).toBeLessThan(
      carica.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('T28: Riprova da provvisorio con ricontrollo in errore rete → nessun carica(), avviso visibile', async () => {
    await provvisorio()
    const { avviso } = monta(true)
    vi.mocked(sessioneCorrente).mockRejectedValueOnce(SENZA_RETE())

    await avviso.riprova()
    expect(sessioneCorrente).toHaveBeenCalledTimes(1)
    expect(carica).not.toHaveBeenCalled()
    expect(avviso.visibile.value).toBe(true)
  })

  it('confermato con archivio in errore rete: al ritorno della rete solo carica(), nessun ripristino', async () => {
    vi.mocked(sessioneCorrente).mockResolvedValueOnce(UTENTE)
    await useSessioneStore().ripristina()
    vi.mocked(sessioneCorrente).mockClear()
    useArchivioStore().errore = new ErroreDati('rete', 'messaggio')
    const { rete } = monta(false)

    rete.value = true
    await flushPromises()
    expect(carica).toHaveBeenCalledTimes(1)
    expect(sessioneCorrente).not.toHaveBeenCalled()
  })

  it('provvisorio, ritorno della rete con ricontrollo in volo → avviso nascosto', async () => {
    await provvisorio()
    const { rete, avviso } = monta(false)
    const sessioneInVolo = inSospeso<Utente | null>()
    vi.mocked(sessioneCorrente).mockReturnValueOnce(sessioneInVolo.promessa)

    rete.value = true
    await nextTick()
    expect(useSessioneStore().errore?.tipo).toBe('rete')
    expect(avviso.visibile.value).toBe(false)

    sessioneInVolo.risolvi(UTENTE)
    await flushPromises()
    expect(avviso.visibile.value).toBe(false)
    expect(carica).toHaveBeenCalledTimes(1)
  })
})
