import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toast } from 'vue-sonner'
import { eliminaFoto, salvaFoto } from '@/data/foto'
import { useSessioneStore } from '@/stores/sessione'
import { DATA_URL_DI_PROVA, fileDiProva, fingiFoto, ripristinaFoto } from '@/test/foto'
import { utenteDiProva } from '@/test/utenti'
import FotoProfiloSheet from './FotoProfiloSheet.vue'

vi.mock('@/data/foto', () => ({
  leggiFoto: vi.fn(async () => null),
  salvaFoto: vi.fn(async () => {}),
  eliminaFoto: vi.fn(async () => {}),
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  useSessioneStore().utente = utenteDiProva({ nome: 'Giulia Conti' })
})

afterEach(ripristinaFoto)

// Lo sheet va in un portal: si cerca in document.body.
async function monta() {
  const wrapper = mount(FotoProfiloSheet, {
    props: { open: true, 'onUpdate:open': (valore: boolean) => wrapper.setProps({ open: valore }) },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function bottone(testo: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === testo)
}

async function scegliFile(file: File): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('manca il selettore del file')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}

describe('FotoProfiloSheet (R25)', () => {
  it('senza foto: le iniziali, il testo e niente «Rimuovi la foto»', async () => {
    await monta()
    expect(document.body.textContent).toContain('Foto del profilo')
    expect(document.body.textContent).toContain(
      'JPG, PNG o HEIC fino a 5 MB. La mostriamo tonda, centrata.',
    )
    expect(bottone('Scegli una foto')).toBeDefined()
    expect(bottone('Rimuovi la foto')).toBeUndefined()
    const input = document.querySelector('input[type="file"]')
    expect(input?.getAttribute('accept')).toBe('image/jpeg,image/png,image/heic,image/heif')
  })

  it('scelta valida → anteprima, «Usa questa foto» salva e mostra «Foto aggiornata»', async () => {
    fingiFoto()
    const wrapper = await monta()
    await scegliFile(fileDiProva())

    expect(document.body.textContent).toContain('Così la vedranno il menu e la testata.')
    expect(bottone("Scegline un'altra")).toBeDefined()
    // L'input si azzera: la stessa foto si può scegliere di nuovo.
    expect(document.querySelector<HTMLInputElement>('input[type="file"]')?.value).toBe('')

    bottone('Usa questa foto')?.click()
    await flushPromises()

    expect(salvaFoto).toHaveBeenCalledWith(DATA_URL_DI_PROVA)
    expect(toast.success).toHaveBeenCalledWith('Foto aggiornata')
    expect(useSessioneStore().foto).toBe(DATA_URL_DI_PROVA)
    expect(wrapper.props('open')).toBe(false)
  })

  it('con la foto: «Rimuovi la foto» elimina e mostra «Foto rimossa»', async () => {
    useSessioneStore().foto = DATA_URL_DI_PROVA
    const wrapper = await monta()

    bottone('Rimuovi la foto')?.click()
    await flushPromises()

    expect(eliminaFoto).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Foto rimossa')
    expect(useSessioneStore().foto).toBeNull()
    expect(wrapper.props('open')).toBe(false)
  })

  it('file oltre 5 MB → «Foto troppo grande», nessun salvataggio', async () => {
    const finti = fingiFoto()
    await monta()
    await scegliFile(fileDiProva('enorme.jpg', 'image/jpeg', 5_242_881))

    expect(document.body.textContent).toContain('Foto troppo grande')
    expect(document.body.textContent).toContain('Scegline una sotto i 5 MB.')
    expect(finti.createImageBitmap).not.toHaveBeenCalled()
    expect(bottone('Usa questa foto')).toBeUndefined()
    expect(salvaFoto).not.toHaveBeenCalled()
  })
})
