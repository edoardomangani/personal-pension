<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'

const { layout = 'drawer' } = defineProps<{
  layout?: 'drawer' | 'dialog'
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <!-- Dialog desktop: titolo a sinistra, poi l'azione e il pulsante di chiusura a destra. -->
  <div v-if="layout === 'dialog'" class="flex h-11 items-center gap-3">
    <div class="min-w-0 flex-1">
      <slot name="title" />
    </div>
    <slot name="action" />
    <Button type="button" variant="outline" size="icon" aria-label="Chiudi" @click="emit('close')">
      <PhX class="size-4" />
    </Button>
  </div>

  <!-- Colonne laterali uguali tengono il titolo centrato qualunque sia l'azione a destra. -->
  <div v-else class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-3">
    <div class="flex justify-start">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Chiudi"
        @click="emit('close')"
      >
        <PhX class="size-4" />
      </Button>
    </div>
    <div class="min-w-0 text-center">
      <slot name="title" />
    </div>
    <div class="flex justify-end">
      <slot name="action" />
    </div>
  </div>
</template>
