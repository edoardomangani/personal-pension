<script setup lang="ts">
import { nextTick, onMounted, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { validaRegistrazione, type BozzaRegistrazione } from '@/calc/validaAccesso'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import GoogleButton from '@/components/GoogleButton.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Button } from '@/components/ui/button'
import { FieldSeparator } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useAccessoGoogle } from '@/composables/useAccessoGoogle'
import { primoCampoConErrore, useModulo } from '@/composables/useModulo'
import { useSessioneStore } from '@/stores/sessione'

const ID = {
  nome: 'registrati-nome',
  email: 'registrati-email',
  password: 'registrati-password',
  conferma: 'registrati-conferma',
} as const
const ORDINE = ['nome', 'email', 'password', 'conferma'] as const

const router = useRouter()
const sessione = useSessioneStore()

const bozza = reactive<BozzaRegistrazione>({ nome: '', email: '', password: '', conferma: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaRegistrazione,
  invia: async ({ nome, email, password }) => {
    await sessione.registrati({ nome, email, password })
    await router.push({ path: '/verifica', query: { email: email.trim() } })
  },
  // L'unico vincolo della registrazione è l'email già registrata.
  campoDi: (errore) => (errore.tipo === 'vincolo' ? 'email' : undefined),
})

const {
  inCorso: googleInCorso,
  errore: erroreGoogle,
  continua: continuaConGoogle,
} = useAccessoGoogle()

function focalizza(campo: keyof BozzaRegistrazione): void {
  document.getElementById(ID[campo])?.focus()
}

async function creaAccount(): Promise<void> {
  if (await invia()) return
  await nextTick()
  const campo = primoCampoConErrore(ORDINE, errori.value)
  if (campo !== undefined) focalizza(campo)
}

onMounted(() => focalizza('nome'))
</script>

<template>
  <div class="flex flex-col gap-6">
    <TestaAccesso
      class="mb-2"
      titolo="Crea il tuo account"
      descrizione="Inserisci i tuoi dati per creare il tuo account"
    />

    <div class="flex flex-col gap-2">
      <GoogleButton :in-corso="googleInCorso" :disabled="inCorso" @click="continuaConGoogle" />
      <p v-if="erroreGoogle" role="alert" class="text-xs text-destructive">{{ erroreGoogle }}</p>
    </div>

    <FieldSeparator>oppure con la tua email</FieldSeparator>

    <form class="flex flex-col gap-6" novalidate @submit.prevent="creaAccount">
      <InsetGroup>
        <InsetRow :for="ID.nome" label="Nome e cognome" hide-label :error="errori.nome">
          <InsetInput
            :id="ID.nome"
            v-model="bozza.nome"
            align="left"
            autocomplete="name"
            placeholder="Nome e cognome"
            :aria-invalid="errori.nome ? true : undefined"
          />
        </InsetRow>
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
            autocomplete="new-password"
            placeholder="Password"
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
          Crea account
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Hai già un account?
      <RouterLink to="/accedi" class="text-foreground underline underline-offset-4">
        Accedi
      </RouterLink>
    </p>
  </div>
</template>
