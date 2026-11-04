<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    data-slot="sheet-footer"
    :class="cn('mt-auto flex flex-col gap-2 border-t-[0.75px] border-divider p-4', props.class)"
  >
    <slot />
  </div>
</template>
