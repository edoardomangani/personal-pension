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
  <svg
    v-bind="$attrs"
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
    :class="cn('shrink-0', className)"
  >
    <path d="M60 102 L130 102 A26 26 0 0 1 130 154 L60 154 A26 26 0 0 1 60 102 Z" />
    <circle cx="196" cy="128" r="26" />
  </svg>
</template>
