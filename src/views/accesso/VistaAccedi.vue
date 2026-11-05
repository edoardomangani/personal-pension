<script setup lang="ts">
import {
  PhArrowClockwise,
  PhCheckCircle,
  PhInfo,
  PhWarningCircle,
  PhWifiSlash,
} from '@phosphor-icons/vue'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, type Component } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { validaAccesso, type BozzaAccesso } from '@/calc/validaAccesso'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import GoogleButton from '@/components/GoogleButton.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FieldSeparator } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useAccessoGoogle } from '@/composables/useAccessoGoogle'
import { primoCampoConErrore, useModulo } from '@/composables/useModulo'
import { rottaDiRitorno } from '@/router'
import { CODICE_EMAIL_DA_VERIFICARE, useSessioneStore } from '@/stores/sessione'

interface Avviso {
  icona: Component
  titolo: string
  testo: string
  azione?: 'riprova'
}

// R13: un valore sconosciuto non mostra niente.
const AVVISI: Readonly<Record<string, Avviso>> = {
  sessione: {
    icona: PhInfo,
    titolo: 'Sessione scaduta',
    testo: 'Accedi di nuovo per tornare dove eri.',
  },
  password: {
    icona: PhCheckCircle,
    titolo: 'Password aggiornata',
    testo: 'Accedi con la nuova password.',
  },
  cancellato: {
    icona: PhCheckCircle,
    titolo: 'Account cancellato',
    testo: "L'account e tutti i dati del piano non ci sono più.",
  },
}

const AVVISO_GOOGLE: Avviso = {
  icona: PhWarningCircle,
  titolo: 'Accesso con Google non riuscito',
  testo: 'Riprova, o entra con email e password.',
}

// R4: il ripristino all'avvio non ha raggiunto il server.
const AVVISO_RETE: Avviso = {
  icona: PhWifiSlash,
  titolo: 'Non riesco a collegarmi',
  testo: 'Controlla la connessione e riprova.',
  azione: 'riprova',
}

const ID = { email: 'accedi-email', password: 'accedi-password' } as const
const ORDINE = ['email', 'password'] as const

const route = useRoute()
const router = useRouter()
const sessione = useSessioneStore()

const avviso = computed<Avviso | undefined>(() => {
  // Better Auth torna dall'errore di Google con `?error=…`.
  if (route.query.error !== undefined) return AVVISO_GOOGLE
  if (sessione.errore?.tipo === 'rete') return AVVISO_RETE
  const chiave = route.query.avviso
  return typeof chiave === 'string' && Object.hasOwn(AVVISI, chiave) ? AVVISI[chiave] : undefined
})

const riprovaInCorso = ref(false)
let smontata = false

async function riprova(): Promise<void> {
  if (riprovaInCorso.value) return
  riprovaInCorso.value = true
  try {
    await sessione.ripristina()
  } finally {
    riprovaInCorso.value = false
  }
  if (smontata || sessione.utente === null) return
  await router.replace(rottaDiRitorno(route.query.da))
}

const bozza = reactive<BozzaAccesso>({ email: '', password: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaAccesso,
  invia: async ({ email, password }) => {
    await sessione.accedi(email.trim(), password)
    await router.replace(rottaDiRitorno(route.query.da))
  },
  // Le credenziali errate arrivano come `sessione`: vanno sotto la password.
  campoDi: (errore) => (errore.tipo === 'sessione' ? 'password' : undefined),
  gestisci: async (errore) => {
    if (errore.codice !== CODICE_EMAIL_DA_VERIFICARE) return false
    await mandaAVerifica(bozza.email.trim())
    return true
  },
})

async function mandaAVerifica(email: string): Promise<void> {
  // Il codice nuovo è un aiuto: se non parte, «Controlla la posta» ha il suo «Mandami un altro codice».
  try {
    await sessione.reinviaCodice(email)
  } catch {
    // Niente da mostrare qui.
  }
  await router.push({ path: '/verifica', query: { email } })
}

function focalizza(campo: keyof BozzaAccesso): void {
  document.getElementById(ID[campo])?.focus()
}

async function accedi(): Promise<void> {
  const riuscito = await invia()
  if (riuscito) return
  await nextTick()
  const campo = primoCampoConErrore(ORDINE, errori.value)
  if (campo !== undefined) focalizza(campo)
}

const {
  inCorso: googleInCorso,
  errore: erroreGoogle,
  continua: continuaConGoogle,
} = useAccessoGoogle()

onMounted(() => focalizza(bozza.email === '' ? 'email' : 'password'))
onUnmounted(() => {
  smontata = true
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <TestaAccesso
      class="mb-2"
      titolo="Accedi a Next"
      descrizione="Entra con Google o con la tua email e la password"
    />

    <Alert v-if="avviso" :data-avviso="avviso.azione === 'riprova' ? 'rete' : ''">
      <component :is="avviso.icona" />
      <AlertTitle>{{ avviso.titolo }}</AlertTitle>
      <AlertDescription>{{ avviso.testo }}</AlertDescription>
      <Button
        v-if="avviso.azione === 'riprova'"
        variant="outline"
        size="sm"
        class="col-start-2 mt-2 justify-self-start"
        :disabled="riprovaInCorso"
        @click="riprova"
      >
        <Spinner v-if="riprovaInCorso" />
        <PhArrowClockwise v-else />
        Riprova
      </Button>
    </Alert>

    <div class="flex flex-col gap-2">
      <GoogleButton :in-corso="googleInCorso" :disabled="inCorso" @click="continuaConGoogle" />
      <p v-if="erroreGoogle" role="alert" class="text-xs text-destructive">{{ erroreGoogle }}</p>
    </div>

    <FieldSeparator>oppure con la tua email</FieldSeparator>

    <form class="flex flex-col gap-6" novalidate @submit.prevent="accedi">
      <div class="flex flex-col gap-3">
        <InsetGroup>
          <InsetRow :for="ID.email" label="Indirizzo email" hide-label :error="errori.email">
            <InsetInput
              :id="ID.email"
              v-model="bozza.email"
              type="email"
              align="left"
              autocomplete="email"
              placeholder="email@esempio.it"
              :aria-invalid="errori.email ? true : undefined"
            />
          </InsetRow>
          <InsetRow :for="ID.password" label="Password" hide-label :error="errori.password">
            <PasswordInput
              :id="ID.password"
              v-model="bozza.password"
              :class="insetPasswordClass"
              autocomplete="current-password"
              placeholder="Password"
              :aria-invalid="errori.password ? true : undefined"
            />
          </InsetRow>
        </InsetGroup>
        <RouterLink
          to="/password-dimenticata"
          class="self-end text-sm text-foreground underline underline-offset-4 relative touch-target"
        >
          Hai dimenticato la password?
        </RouterLink>
      </div>

      <div class="flex flex-col gap-2">
        <Button type="submit" size="lg" class="w-full" :disabled="inCorso">
          <Spinner v-if="inCorso" />
          Accedi
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Non hai un account?
      <RouterLink
        to="/registrati"
        class="text-foreground underline underline-offset-4 relative touch-target"
      >
        Registrati
      </RouterLink>
    </p>
  </div>
</template>
