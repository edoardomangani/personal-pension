<script setup lang="ts">
import { nextTick, reactive } from 'vue'
import { toast } from 'vue-sonner'
import { validaCambioPassword, type BozzaCambioPassword } from '@/calc/validaAccesso'
import DescrizioneSheet from '@/components/account/DescrizioneSheet.vue'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import PasswordInput from '@/components/PasswordInput.vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useIsDesktop } from '@/composables/useIsDesktop'
import { primoCampoConErrore, useModulo } from '@/composables/useModulo'
import { useSessioneStore } from '@/stores/sessione'

const emit = defineEmits<{ chiudi: [] }>()

const ID = {
  attuale: 'cambia-password-attuale',
  nuova: 'cambia-password-nuova',
  conferma: 'cambia-password-conferma',
} as const
const ORDINE = ['attuale', 'nuova', 'conferma'] as const

const sessione = useSessioneStore()
const isDesktop = useIsDesktop()

// Il corpo del pannello si monta a ogni apertura: bozza ed errori ripartono da vuoti.
const bozza = reactive<BozzaCambioPassword>({ attuale: '', nuova: '', conferma: '' })

const { errori, erroreGenerale, inCorso, invia } = useModulo({
  bozza: () => bozza,
  valida: validaCambioPassword,
  invia: async ({ attuale, nuova }) => {
    await sessione.cambiaPassword(attuale, nuova)
    toast.success('Password aggiornata')
    emit('chiudi')
  },
  // L'unico vincolo del cambio è la password attuale sbagliata (R3).
  campoDi: (errore) => (errore.tipo === 'vincolo' ? 'attuale' : undefined),
  // Sessione scaduta: lo store fa uscire e si torna all'accesso.
  gestisci: async (errore) => errore.tipo === 'sessione',
})

async function salva(): Promise<void> {
  if (await invia()) return
  await nextTick()
  const campo = primoCampoConErrore(ORDINE, errori.value)
  if (campo !== undefined) document.getElementById(ID[campo])?.focus()
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="salva">
    <DescrizioneSheet>Usa una password lunga che non usi altrove.</DescrizioneSheet>
    <InsetGroup>
      <InsetRow :for="ID.attuale" label="Password attuale" hide-label :error="errori.attuale">
        <PasswordInput
          :id="ID.attuale"
          v-model="bozza.attuale"
          :class="insetPasswordClass"
          autocomplete="current-password"
          placeholder="Password attuale"
          :aria-invalid="errori.attuale ? true : undefined"
        />
      </InsetRow>
      <InsetRow :for="ID.nuova" label="Nuova password" hide-label :error="errori.nuova">
        <PasswordInput
          :id="ID.nuova"
          v-model="bozza.nuova"
          :class="insetPasswordClass"
          autocomplete="new-password"
          placeholder="Nuova password"
          :aria-invalid="errori.nuova ? true : undefined"
        />
      </InsetRow>
      <InsetRow :for="ID.conferma" label="Conferma la password" hide-label :error="errori.conferma">
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

    <p v-if="erroreGenerale" role="alert" class="text-xs text-destructive">
      {{ erroreGenerale }}
    </p>

    <!-- Telefono: il comando a tutta larghezza; dialog: in riga a destra con «Annulla». -->
    <div :class="isDesktop ? 'flex justify-end gap-2' : 'flex flex-col'">
      <Button v-if="isDesktop" type="button" variant="secondary" size="lg" @click="emit('chiudi')">
        Annulla
      </Button>
      <Button type="submit" size="lg" :class="{ 'w-full': !isDesktop }" :disabled="inCorso">
        <Spinner v-if="inCorso" />
        Salva la password
      </Button>
    </div>
  </form>
</template>
