<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { AzioneTestata } from '@/composables/useAzioneTestata'

defineProps<{
  azione: AzioneTestata
  /** Telefono: «Salva» 32 col solo pallino; desktop: «Salva» 36 col testo. */
  variante: 'mobile' | 'desktop'
}>()
</script>

<template>
  <div :class="['flex shrink-0 items-center', variante === 'mobile' ? 'gap-2' : 'gap-4']">
    <!-- La regione resta montata anche vuota, così il lettore di schermo annuncia l'arrivo del testo. -->
    <span role="status" data-modifiche class="flex items-center gap-1.5 text-xs text-warning">
      <template v-if="azione.modificato">
        <span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-warning" />
        <span :class="{ 'sr-only': variante === 'mobile' }">Modifiche non salvate</span>
      </template>
    </span>
    <Button
      type="button"
      :size="variante === 'mobile' ? 'sm' : 'default'"
      :class="{ 'text-sm': variante === 'mobile' }"
      :disabled="!azione.attiva || azione.inCorso"
      @click="azione.esegui"
    >
      <Spinner v-if="azione.inCorso" />
      {{ azione.etichetta }}
    </Button>
  </div>
</template>
