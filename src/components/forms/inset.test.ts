import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { insetGroupClass, insetPasswordClass } from './inset'
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

describe('InsetGroup con l’aiuto che compare dopo un errore (R1)', () => {
  it('la card resta intera e non comprimibile, l’aiuto sta sotto', async () => {
    const description = ref<string | undefined>(undefined)
    const errore = ref<string | undefined>('Scrivi un anno valido.')
    const valore = ref('')
    const Modulo = defineComponent({
      setup() {
        return () =>
          h(InsetGroup, { description: description.value }, () =>
            h(InsetRow, { for: 'anno', label: 'Anno', error: errore.value }, () =>
              h(InsetInput, {
                id: 'anno',
                modelValue: valore.value,
                'onUpdate:modelValue': (v: string | number) => {
                  valore.value = String(v)
                },
              }),
            ),
          )
      },
    })
    const wrapper = mount(Modulo, { attachTo: document.body })
    expect(wrapper.find('[data-slot="field-description"]').exists()).toBe(false)

    description.value = 'Con questi dati vai in pensione nel 2061.'
    errore.value = undefined
    await nextTick()

    const card = wrapper.get('[data-slot="field-group"]')
    const aiuto = wrapper.get('[data-slot="field-description"]')
    expect(aiuto.text()).toBe('Con questi dati vai in pensione nel 2061.')
    expect(card.element.nextElementSibling).toBe(aiuto.element)
    expect(card.find('[data-slot="field"]').exists()).toBe(true)
    expect(card.find('#anno').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(card.classes()).toContain('shrink-0')

    await card.get('#anno').setValue('1994')
    expect(valore.value).toBe('1994')
  })
})

describe('PasswordInput in una riga inset (R4)', () => {
  function montaPassword() {
    const Modulo = defineComponent({
      setup() {
        return () =>
          h(InsetGroup, null, () =>
            h(InsetRow, { for: 'password', label: 'Password', hideLabel: true }, () =>
              h(PasswordInput, { id: 'password', class: insetPasswordClass }),
            ),
          )
      },
    })
    return mount(Modulo, { attachTo: document.body })
  }

  it('l’occhio sborda nel padding della riga e il toggle funziona', async () => {
    const wrapper = montaPassword()
    expect(wrapper.get('[data-slot="field"]').attributes()).toHaveProperty('data-inset-row')
    const occhio = wrapper.get('button')
    expect(occhio.classes()).toContain('in-data-inset-row:-right-3')
    expect(wrapper.get('input').classes()).toContain('pr-10')
    await occhio.trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(occhio.attributes('aria-label')).toBe('Nascondi password')
  })
})

describe('Titolo di InsetGroup (R7)', () => {
  it('con titolo la legenda sta 8px sopra la card', () => {
    const legenda = montaRiga({ label: 'Importo TFR' }).get('legend')
    expect(legenda.text()).toBe('Movimento')
    expect(legenda.classes()).toContain('mb-2')
    expect(legenda.classes()).not.toContain('mb-0')
  })

  it('senza titolo niente legenda', () => {
    const wrapper = mount(InsetGroup, { slots: { default: 'riga' } })
    expect(wrapper.find('legend').exists()).toBe(false)
  })
})
