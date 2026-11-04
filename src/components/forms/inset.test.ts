import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { insetGroupClass } from './inset'
import InsetChoiceRow from './InsetChoiceRow.vue'
import InsetGroup from './InsetGroup.vue'
import InsetInput from './InsetInput.vue'
import InsetRow from './InsetRow.vue'

type Riga = { label: string; error?: string; hideLabel?: boolean }

function montaRiga(riga: Riga, valore = ref('')) {
  const Modulo = defineComponent({
    setup() {
      return () =>
        h(InsetGroup, { title: 'Movimento' }, () =>
          h(InsetRow, { for: 'importo-tfr', ...riga }, () =>
            h(InsetInput, {
              id: 'importo-tfr',
              modelValue: valore.value,
              'onUpdate:modelValue': (v: string | number) => {
                valore.value = String(v)
              },
            }),
          ),
        )
    },
  })
  return mount(Modulo, { attachTo: document.body })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('InsetRow con InsetInput', () => {
  it('collega l’etichetta al controllo', () => {
    const wrapper = montaRiga({ label: 'Importo TFR' })
    const etichetta = wrapper.get('label')
    expect(etichetta.text()).toBe('Importo TFR')
    expect(etichetta.attributes('for')).toBe('importo-tfr')
    expect(wrapper.get('input').attributes('id')).toBe('importo-tfr')
    expect(etichetta.classes()).not.toContain('sr-only')
  })

  it('con hideLabel l’etichetta resta solo ai lettori di schermo', () => {
    const wrapper = montaRiga({ label: 'Nota', hideLabel: true })
    const etichetta = wrapper.get('label')
    expect(etichetta.text()).toBe('Nota')
    expect(etichetta.classes()).toContain('sr-only')
    expect(etichetta.attributes('for')).toBe('importo-tfr')
  })

  it('mostra l’errore sotto il campo', () => {
    const wrapper = montaRiga({
      label: 'Importo TFR',
      error: 'Scrivi un importo maggiore di zero.',
    })
    const errore = wrapper.get('[role="alert"]')
    expect(errore.text()).toBe('Scrivi un importo maggiore di zero.')
    expect(wrapper.get('[data-slot="field"]').attributes('data-invalid')).toBe('true')
    const input = wrapper.get('input').element
    expect(
      input.compareDocumentPosition(errore.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('senza errore non mostra nulla', () => {
    const wrapper = montaRiga({ label: 'Importo TFR' })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('il tocco sulla riga fuori dal controllo dà il focus all’input', async () => {
    const wrapper = montaRiga({ label: 'Importo TFR' })
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    await wrapper.get('[data-slot="field"]').trigger('click')
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('v-model aggiorna il valore', async () => {
    const valore = ref('')
    const wrapper = montaRiga({ label: 'Importo TFR' }, valore)
    await wrapper.get('input').setValue('180,95')
    expect(valore.value).toBe('180,95')
  })
})

describe('insetGroupClass (R4, R5)', () => {
  const classiGruppo = insetGroupClass.split(' ')

  it('è la card di vetro dei gruppi di oggi', () => {
    expect(insetGroupClass).toBe(
      'overflow-hidden rounded-[24px] border-[0.75px] border-border bg-card shadow-glass lg:rounded-3xl',
    )
  })

  it('InsetGroup la applica con gap-0 al posto del gap della base', () => {
    const gruppo = montaRiga({ label: 'Importo TFR' }).get('[data-slot="field-group"]')
    expect(gruppo.classes()).toEqual(expect.arrayContaining([...classiGruppo, 'gap-0']))
    expect(gruppo.classes()).not.toContain('gap-7')
  })

  it('la lista aperta di InsetChoiceRow ha la stessa card', async () => {
    // Il foglio vero apre un overlay in teleport: qui basta il suo contenuto quando è aperto.
    const FoglioFinto = defineComponent({
      props: { open: Boolean },
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('div', slots.default?.()) : null,
    })
    const wrapper = mount(InsetChoiceRow, {
      props: { id: 'fondo', label: 'Fondo', options: [{ value: 'a', label: 'Amundi' }] },
      global: { stubs: { ResponsiveSheet: FoglioFinto } },
      attachTo: document.body,
    })
    await wrapper.get('#fondo').trigger('click')
    expect(wrapper.get('[role="listbox"]').classes()).toEqual(expect.arrayContaining(classiGruppo))
  })
})
