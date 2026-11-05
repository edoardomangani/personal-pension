<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <!-- Due tratti ai lati dell'etichetta, senza fondo: sotto c'è il bagliore. -->
  <div
    data-slot="field-separator"
    :data-content="!!$slots.default"
    :class="cn('flex h-6 items-center gap-3 text-sm', props.class)"
  >
    <Separator class="flex-1" />
    <template v-if="$slots.default">
      <span class="shrink-0 text-muted-foreground" data-slot="field-separator-content">
        <slot />
      </span>
      <Separator class="flex-1" />
    </template>
  </div>
</template>
