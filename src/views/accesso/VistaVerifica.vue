<script setup lang="ts">
import { PhEnvelope } from '@phosphor-icons/vue'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { validaCodice, type BozzaCodice } from '@/calc/validaAccesso'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { messaggioDi, useModulo } from '@/composables/useModulo'
import { useSessioneStore } from '@/stores/sessione'

const ATTESA_REINVIO = 60
const ID_CODICE = 'verifica-codice'

const route = useRoute()
const router = useRouter()
const sessione = useSessioneStore()

// Il router non entra qui senza `email` (R15).
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))

const bozza = reactive<BozzaCodice>({ codice: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaCodice,
  invia: async ({ codice }) => {
    await sessione.verificaCodice(email.value, codice)
    // Il guard porta un account nuovo, senza fondo, all'onboarding.
    await router.replace('/')
  },
  campoDi: (errore) => (errore.tipo === 'vincolo' ? 'codice' : undefined),
})

async function verifica(): Promise<void> {
  if (await invia()) return
  await nextTick()
  if (errori.value.codice !== undefined) document.getElementById(ID_CODICE)?.focus()
}

const reinvioInCorso = ref(false)
const reinviato = ref(false)
const erroreReinvio = ref<string | null>(null)
const secondi = ref(0)
let conto: ReturnType<typeof setInterval> | undefined

function fermaConto(): void {
  if (conto !== undefined) clearInterval(conto)
  conto = undefined
}

function partiConto(): void {
  fermaConto()
  secondi.value = ATTESA_REINVIO
  conto = setInterval(() => {
    secondi.value -= 1
    if (secondi.value <= 0) fermaConto()
  }, 1000)
}

async function reinvia(): Promise<void> {
  if (reinvioInCorso.value || secondi.value > 0) return
  reinvioInCorso.value = true
  erroreReinvio.value = null
  try {
    await sessione.reinviaCodice(email.value)
    reinviato.value = true
    partiConto()
  } catch (eccezione) {
    erroreReinvio.value = messaggioDi(eccezione)
  } finally {
    reinvioInCorso.value = false
  }
}

onMounted(() => document.getElementById(ID_CODICE)?.focus())
onUnmounted(fermaConto)
</script>

<template>
  <div class="flex flex-col gap-6">
    <TestaAccesso class="mb-2" titolo="Controlla la posta">
      Ti abbiamo mandato un codice a <span class="text-foreground">{{ email }}</span
      >. Scrivilo qui per attivare l'account.
    </TestaAccesso>

    <Alert v-if="reinviato" data-avviso>
      <PhEnvelope />
      <AlertTitle>Codice inviato di nuovo</AlertTitle>
      <AlertDescription>Controlla la posta, anche nello spam.</AlertDescription>
    </Alert>

    <form class="flex flex-col gap-6" novalidate @submit.prevent="verifica">
      <InsetGroup>
        <InsetRow :for="ID_CODICE" label="Codice" :error="errori.codice">
          <InsetInput
            :id="ID_CODICE"
            v-model="bozza.codice"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="6 cifre"
            :aria-invalid="errori.codice ? true : undefined"
          />
        </InsetRow>
      </InsetGroup>

      <div class="flex flex-col gap-2">
        <Button type="submit" size="lg" class="w-full" :disabled="inCorso">
          <Spinner v-if="inCorso" />
          Verifica
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>

    <div class="flex flex-col items-center gap-4">
      <Button
        type="button"
        variant="secondary"
        data-reinvia
        :disabled="reinvioInCorso || secondi > 0"
        @click="reinvia"
      >
        <template v-if="secondi > 0">Reinvia tra {{ secondi }} secondi</template>
        <template v-else>
          <Spinner v-if="reinvioInCorso" />
          <PhEnvelope v-else />
          Mandami un altro codice
        </template>
      </Button>
      <p v-if="erroreReinvio" role="alert" class="text-xs text-destructive">
        {{ erroreReinvio }}
      </p>
      <p class="text-center text-sm text-muted-foreground">
        Email sbagliata?
        <RouterLink
          to="/registrati"
          class="text-foreground underline underline-offset-4 relative touch-target"
        >
          Crea di nuovo l'account
        </RouterLink>
      </p>
      <RouterLink
        to="/accedi"
        class="text-sm text-foreground underline underline-offset-4 relative touch-target"
      >
        Torna all'accesso
      </RouterLink>
    </div>
  </div>
</template>
