<script setup lang="ts">
import { PhEnvelope } from '@phosphor-icons/vue'
import { nextTick, onMounted, reactive, ref } from 'vue'
import { validaRichiestaReset, type BozzaRichiestaReset } from '@/calc/validaAccesso'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useModulo } from '@/composables/useModulo'
import { urlApp } from '@/router'
import { useSessioneStore } from '@/stores/sessione'

// Password dimenticata (R16) e link scaduto (R17): stesso modulo, testi diversi.
const props = defineProps<{
  titolo: string
  descrizione: string
  invio: string
  avvisoTitolo: string
  avvisoTesto: string
}>()

const ID_EMAIL = 'reset-email'

const sessione = useSessioneStore()
const bozza = reactive<BozzaRichiestaReset>({ email: '' })
const inviato = ref(false)

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaRichiestaReset,
  invia: async ({ email }) => {
    // Better Auth risponde allo stesso modo se l'email non ha un account: niente da distinguere.
    await sessione.richiediReset(email.trim(), urlApp('/nuova-password'))
    inviato.value = true
  },
})

async function manda(): Promise<void> {
  if (await invia()) return
  await nextTick()
  if (errori.value.email !== undefined) document.getElementById(ID_EMAIL)?.focus()
}

onMounted(() => document.getElementById(ID_EMAIL)?.focus())
</script>

<template>
  <div class="flex flex-col gap-6">
    <TestaAccesso class="mb-2" :titolo="props.titolo" :descrizione="props.descrizione" />

    <Alert v-if="inviato" data-avviso>
      <PhEnvelope />
      <AlertTitle>{{ props.avvisoTitolo }}</AlertTitle>
      <AlertDescription>{{ props.avvisoTesto }}</AlertDescription>
    </Alert>

    <form class="flex flex-col gap-6" novalidate @submit.prevent="manda">
      <InsetGroup>
        <InsetRow :for="ID_EMAIL" label="Indirizzo email" hide-label :error="errori.email">
          <InsetInput
            :id="ID_EMAIL"
            v-model="bozza.email"
            type="email"
            align="left"
            autocomplete="email"
            placeholder="email@esempio.it"
            :aria-invalid="errori.email ? true : undefined"
          />
        </InsetRow>
      </InsetGroup>

      <div class="flex flex-col gap-2">
        <Button type="submit" size="lg" class="w-full" :disabled="inCorso">
          <Spinner v-if="inCorso" />
          {{ props.invio }}
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>

    <slot />
  </div>
</template>
