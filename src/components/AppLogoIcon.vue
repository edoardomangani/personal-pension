<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  className?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    v-bind="$attrs"
    aria-hidden="true"
    :class="
      cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md border-[0.75px] border-border bg-secondary text-base leading-none font-semibold text-foreground shadow-glass select-none',
        className,
      )
    "
    >P</span
  >
</template>
