<script setup lang="ts">
import { PhPlus } from '@phosphor-icons/vue'
import ComingSoonTooltip from '@/components/ComingSoonTooltip.vue'
import { Button } from '@/components/ui/button'

const { variant = 'pill', testo = 'Nuovo movimento' } = defineProps<{
  variant?: 'pill' | 'round'
  testo?: string
}>()
</script>

<template>
  <!-- aria-disabled, non disabled: il pulsante resta focalizzabile perché il tooltip spieghi il motivo. -->
  <!-- + tondo e pillola restano bianchi pieni anche disabilitati: sono il punto focale della barra. -->
  <ComingSoonTooltip>
    <Button
      v-if="variant === 'round'"
      type="button"
      size="icon-lg"
      aria-disabled="true"
      aria-label="Nuovo movimento"
      class="size-12 shrink-0 shadow-fab aria-disabled:opacity-100"
    >
      <PhPlus weight="bold" class="size-6" />
    </Button>
    <!-- 14 a sinistra, 16 a destra: il + ha più aria del testo. -->
    <Button
      v-else
      type="button"
      aria-disabled="true"
      class="has-[>svg]:pr-4 aria-disabled:opacity-100"
    >
      <PhPlus weight="bold" />
      {{ testo }}
    </Button>
  </ComingSoonTooltip>
</template>
