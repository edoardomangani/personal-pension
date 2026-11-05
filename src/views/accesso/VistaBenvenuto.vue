<script setup lang="ts">
import { computed, nextTick, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { annoPensione } from '@/calc/pensione'
import { validaOnboarding, type BozzaOnboarding } from '@/calc/validaAccesso'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import TestaAccesso from '@/components/TestaAccesso.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useEsci } from '@/composables/useEsci'
import { primoCampoConErrore, useModulo } from '@/composables/useModulo'
import { useArchivioStore } from '@/stores/archivio'
import { useSessioneStore } from '@/stores/sessione'
import type { Fondo } from '@/types/dominio'

const ID = {
  fondo: 'benvenuto-fondo',
  annoNascita: 'benvenuto-anno',
  etaPensione: 'benvenuto-eta',
} as const
const ORDINE = ['fondo', 'annoNascita', 'etaPensione'] as const

const router = useRouter()
const sessione = useSessioneStore()
const archivio = useArchivioStore()
const { esci, inCorso: uscitaInCorso } = useEsci()

const annoCorrente = Number(archivio.oggi.slice(0, 4))
const valida = (bozza: BozzaOnboarding) => validaOnboarding(bozza, annoCorrente)

const bozza = reactive<BozzaOnboarding>({ fondo: '', annoNascita: '', etaPensione: '67' })

// R18: la frase c'è solo con anno ed età validi, e segue quello che scrivo.
const frase = computed(() => {
  const errori = valida(bozza)
  if (errori.annoNascita !== undefined || errori.etaPensione !== undefined) return undefined
  const anno = annoPensione(Number(bozza.annoNascita.trim()), Number(bozza.etaPensione.trim()))
  return `Con questi dati vai in pensione nel ${anno}.`
})

// Il fondo creato da un invio che poi non ha salvato le impostazioni: al nuovo invio non si ricrea.
let fondoCreato: Fondo | null = null

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida,
  invia: async ({ fondo, annoNascita, etaPensione }) => {
    const nome = fondo.trim()
    if (fondoCreato === null) fondoCreato = await archivio.salvaFondo({ nome })
    else if (fondoCreato.nome !== nome) {
      fondoCreato = await archivio.salvaFondo({ id: fondoCreato.id, nome })
    }
    await archivio.salvaImpostazioni({
      ...archivio.impostazioni,
      annoNascita: Number(annoNascita.trim()),
      etaPensione: Number(etaPensione.trim()),
    })
    await router.replace('/')
  },
})

async function inizia(): Promise<void> {
  if (await invia()) return
  await nextTick()
  const campo = primoCampoConErrore(ORDINE, errori.value)
  if (campo !== undefined) document.getElementById(ID[campo])?.focus()
}

onMounted(() => document.getElementById(ID.fondo)?.focus())
</script>

<template>
  <div class="flex flex-col gap-6">
    <TestaAccesso
      class="mb-2"
      titolo="Prepariamo il tuo piano"
      descrizione="Ci servono il fondo e l'anno di nascita: li cambi quando vuoi dalle Impostazioni"
    />

    <form class="flex flex-col gap-6" novalidate @submit.prevent="inizia">
      <InsetGroup :description="frase">
        <InsetRow :for="ID.fondo" label="Fondo" :error="errori.fondo">
          <InsetInput
            :id="ID.fondo"
            v-model="bozza.fondo"
            autocomplete="off"
            placeholder="Es. Amundi Seconda Pensione"
            :aria-invalid="errori.fondo ? true : undefined"
          />
        </InsetRow>
        <InsetRow :for="ID.annoNascita" label="Anno di nascita" :error="errori.annoNascita">
          <InsetInput
            :id="ID.annoNascita"
            v-model="bozza.annoNascita"
            inputmode="numeric"
            autocomplete="bday-year"
            maxlength="4"
            placeholder="1994"
            :aria-invalid="errori.annoNascita ? true : undefined"
          />
        </InsetRow>
        <InsetRow :for="ID.etaPensione" label="Età della pensione" :error="errori.etaPensione">
          <InsetInput
            :id="ID.etaPensione"
            v-model="bozza.etaPensione"
            inputmode="numeric"
            maxlength="2"
            :aria-invalid="errori.etaPensione ? true : undefined"
          />
        </InsetRow>
      </InsetGroup>

      <div class="flex flex-col gap-2">
        <Button type="submit" size="lg" class="w-full" :disabled="inCorso">
          <Spinner v-if="inCorso" />
          Inizia
        </Button>
        <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
          {{ erroreGenerale }}
        </p>
      </div>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Account {{ sessione.utente?.email }} ·
      <button
        type="button"
        class="text-foreground underline underline-offset-4"
        :disabled="uscitaInCorso"
        @click="esci"
      >
        Esci
      </button>
    </p>
  </div>
</template>
