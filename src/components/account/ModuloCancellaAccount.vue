<script setup lang="ts">
import { computed, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { validaConfermaCancellazione, type BozzaConfermaCancellazione } from '@/calc/validaAccesso'
import DescrizioneSheet from '@/components/account/DescrizioneSheet.vue'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useIsDesktop } from '@/composables/useIsDesktop'
import { useModulo } from '@/composables/useModulo'
import { useSessioneStore } from '@/stores/sessione'

const props = defineProps<{
  /** Conferma con la password; false per un account solo Google, che scrive l'email. */
  conPassword: boolean
}>()

const emit = defineEmits<{ chiudi: [] }>()

const ID_CONFERMA = 'cancella-account-conferma'

const router = useRouter()
const sessione = useSessioneStore()
const isDesktop = useIsDesktop()

// L'email si legge all'apertura: dopo la cancellazione lo store è vuoto ma il pannello è ancora qui.
const emailAccount = sessione.utente?.email ?? ''

const bozza = reactive<BozzaConfermaCancellazione>({ conferma: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: (b) => validaConfermaCancellazione(b, props.conPassword),
  invia: async ({ conferma }) => {
    await sessione.cancellaAccount(conferma, props.conPassword)
    await router.replace('/accedi?avviso=cancellato')
  },
  // Password o email sbagliate sono della conferma; rete e sessione vanno sotto il modulo e l'account resta.
  campoDi: (errore) => (errore.tipo === 'vincolo' ? 'conferma' : undefined),
})

const istruzione = computed(() =>
  props.conPassword
    ? 'Per confermare, scrivi la tua password.'
    : 'Per confermare, scrivi la tua email.',
)

async function cancella(): Promise<void> {
  if (await invia()) return
  await nextTick()
  if (errori.value.conferma !== undefined) document.getElementById(ID_CONFERMA)?.focus()
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="cancella">
    <DescrizioneSheet>
      Cancelliamo subito buste paga, movimenti, estratti conto, impostazioni e la foto, poi
      l’account. Non si può annullare: se ti serve, scarica prima un backup dalle Impostazioni.
      {{ istruzione }}
    </DescrizioneSheet>
    <InsetGroup>
      <InsetRow
        :for="ID_CONFERMA"
        :label="conPassword ? 'Password' : 'Email'"
        hide-label
        :error="errori.conferma"
      >
        <PasswordInput
          v-if="conPassword"
          :id="ID_CONFERMA"
          v-model="bozza.conferma"
          :class="insetPasswordClass"
          autocomplete="current-password"
          placeholder="Password"
          :aria-invalid="errori.conferma ? true : undefined"
        />
        <InsetInput
          v-else
          :id="ID_CONFERMA"
          v-model="bozza.conferma"
          align="left"
          type="email"
          inputmode="email"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          :placeholder="emailAccount"
          :aria-invalid="errori.conferma ? true : undefined"
        />
      </InsetRow>
    </InsetGroup>

    <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
      {{ erroreGenerale }}
    </p>

    <!-- Telefono: il comando a tutta larghezza; dialog: in riga a destra con «Annulla». -->
    <div :class="isDesktop ? 'flex justify-end gap-2' : 'flex flex-col'">
      <Button v-if="isDesktop" type="button" variant="secondary" size="lg" @click="emit('chiudi')">
        Annulla
      </Button>
      <Button
        type="submit"
        variant="destructive"
        size="lg"
        :class="{ 'w-full': !isDesktop }"
        :disabled="inCorso"
      >
        <Spinner v-if="inCorso" />
        Cancella per sempre
      </Button>
    </div>
  </form>
</template>
