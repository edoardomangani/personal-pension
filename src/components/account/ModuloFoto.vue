<script setup lang="ts">
import { PhImage, PhTrash, PhWarning } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { FOTO_ACCEPT } from '@/calc/foto'
import DescrizioneSheet from '@/components/account/DescrizioneSheet.vue'
import AvatarUtente from '@/components/AvatarUtente.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useFotoProfilo } from '@/composables/useFotoProfilo'
import { useIsDesktop } from '@/composables/useIsDesktop'
import { useProfilo } from '@/composables/useProfilo'

const emit = defineEmits<{ chiudi: [] }>()

const isDesktop = useIsDesktop()
const { iniziali, foto } = useProfilo()
// Rimontato a ogni apertura dello sheet: anteprima e avviso ripartono puliti.
const { stato, avviso, nuova, scegli, usa, rimuovi } = useFotoProfilo()

const selettore = ref<HTMLInputElement | null>(null)

const inAnteprima = computed(() => nuova.value !== null)
const inInvio = computed(() => stato.value === 'invio')
const mostrata = computed(() => nuova.value ?? foto.value)

function apriSelettore(): void {
  selettore.value?.click()
}

async function suScelta(): Promise<void> {
  const input = selettore.value
  const file = input?.files?.[0]
  // Azzerato subito: «Scegline un'altra» con lo stesso file deve scattare di nuovo.
  if (input) input.value = ''
  if (file) await scegli(file)
}

async function usaQuesta(): Promise<void> {
  if (!(await usa())) return
  toast.success('Foto aggiornata')
  emit('chiudi')
}

async function rimuoviFoto(): Promise<void> {
  if (!(await rimuovi())) return
  toast.success('Foto rimossa')
  emit('chiudi')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col items-center gap-6 text-center">
      <AvatarUtente
        :foto="mostrata"
        :iniziali="iniziali"
        class="size-40"
        classe-iniziali="text-avatar-lg"
      />
      <DescrizioneSheet class="text-center">
        <template v-if="inAnteprima">Così la vedranno il menu e la testata.</template>
        <template v-else>JPG, PNG o HEIC fino a 5 MB. La mostriamo tonda, centrata.</template>
      </DescrizioneSheet>
    </div>

    <Alert v-if="avviso" variant="destructive">
      <PhWarning />
      <AlertTitle>{{ avviso.titolo }}</AlertTitle>
      <AlertDescription>{{ avviso.testo }}</AlertDescription>
    </Alert>

    <input
      ref="selettore"
      type="file"
      class="hidden"
      :accept="FOTO_ACCEPT"
      tabindex="-1"
      aria-hidden="true"
      @change="suScelta"
    />

    <!-- Il principale per primo: sopra sul telefono, a destra nel dialog. -->
    <div :class="isDesktop ? 'flex flex-row-reverse gap-2' : 'flex flex-col gap-2'">
      <template v-if="inAnteprima">
        <Button
          type="button"
          size="lg"
          :class="{ 'w-full': !isDesktop }"
          :disabled="inInvio"
          @click="usaQuesta"
        >
          <Spinner v-if="inInvio" />
          Usa questa foto
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          :class="{ 'w-full': !isDesktop }"
          :disabled="inInvio"
          @click="apriSelettore"
        >
          Scegline un’altra
        </Button>
      </template>
      <template v-else>
        <Button
          type="button"
          size="lg"
          :class="{ 'w-full': !isDesktop }"
          :disabled="inInvio"
          @click="apriSelettore"
        >
          <PhImage />
          Scegli una foto
        </Button>
        <Button
          v-if="foto"
          type="button"
          variant="ghost"
          size="lg"
          class="text-destructive hover:text-destructive"
          :class="{ 'w-full': !isDesktop }"
          :disabled="inInvio"
          @click="rimuoviFoto"
        >
          <Spinner v-if="inInvio" />
          <PhTrash v-else />
          Rimuovi la foto
        </Button>
      </template>
    </div>
  </div>
</template>
