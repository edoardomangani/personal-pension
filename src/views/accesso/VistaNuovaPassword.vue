<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { validaNuovaPassword, type BozzaNuovaPassword } from '@/calc/validaAccesso'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import ModuloRichiestaReset from '@/components/ModuloRichiestaReset.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { primoCampoConErrore, useModulo } from '@/composables/useModulo'
import { useSessioneStore } from '@/stores/sessione'

const ID = { password: 'nuova-password', conferma: 'nuova-password-conferma' } as const
const ORDINE = ['password', 'conferma'] as const

const route = useRoute()
const router = useRouter()
const sessione = useSessioneStore()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
// R17: Better Auth torna con `?error=` se il link non vale; senza token non c'è niente da fare.
const tokenRifiutato = ref(false)
const scaduto = computed(
  () => tokenRifiutato.value || route.query.error !== undefined || token.value === '',
)

const bozza = reactive<BozzaNuovaPassword>({ password: '', conferma: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaNuovaPassword,
  invia: async ({ password }) => {
    await sessione.reimpostaPassword(token.value, password)
    await router.replace({ path: '/accedi', query: { avviso: 'password' } })
  },
  gestisci: async (errore) => {
    // L'unico vincolo del reset è il token non valido.
    if (errore.tipo !== 'vincolo') return false
    tokenRifiutato.value = true
    return true
  },
})

async function salva(): Promise<void> {
  if (await invia()) return
  await nextTick()
  const campo = primoCampoConErrore(ORDINE, errori.value)
  if (campo !== undefined) document.getElementById(ID[campo])?.focus()
}

onMounted(() => {
  if (!scaduto.value) document.getElementById(ID.password)?.focus()
})
</script>

<template>
  <ModuloRichiestaReset
    v-if="scaduto"
    titolo="Il link è scaduto"
    descrizione="I link valgono per poco tempo e una volta sola. Scrivi la tua email e te ne mandiamo uno nuovo."
    invio="Mandami un nuovo link"
    avviso-titolo="Link inviato"
    avviso-testo="Controlla la posta, anche nello spam."
  >
    <RouterLink
      to="/accedi"
      class="self-center text-sm text-foreground underline underline-offset-4"
    >
      Torna all'accesso
    </RouterLink>
  </ModuloRichiestaReset>

  <div v-else class="flex flex-col gap-6">
    <!-- Il link porta solo il token: l'email dell'account non si conosce, quindi niente seconda riga. -->
    <TestaAccesso class="mb-2" titolo="Scegli una nuova password" />

    <form class="flex flex-col gap-6" novalidate @submit.prevent="salva">
      <InsetGroup>
        <InsetRow :for="ID.password" label="Nuova password" hide-label :error="errori.password">
          <PasswordInput
            :id="ID.password"
            v-model="bozza.password"
            :class="insetPasswordClass"
            autocomplete="new-password"
            placeholder="Nuova password"
            :aria-invalid="errori.password ? true : undefined"
          />
        </InsetRow>
        <InsetRow
          :for="ID.conferma"
          label="Conferma la password"
          hide-label
          :error="errori.conferma"
        >
          <PasswordInput
            :id="ID.conferma"
            v-model="bozza.conferma"
            :class="insetPasswordClass"
            autocomplete="new-password"
            placeholder="Conferma la password"
            :aria-invalid="errori.conferma ? true : undefined"
          />
        </InsetRow>
      </InsetGroup>

      <div class="flex flex-col gap-2">
        <Button type="submit" size="lg" class="w-full" :disabled="inCorso">
          <Spinner v-if="inCorso" />
          Salva la password
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>
  </div>
</template>
