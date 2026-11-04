<script setup lang="ts">
import { useShellHeading } from '@/composables/useShellHeading'

const { titolo } = useShellHeading()
</script>

<template>
  <header class="flex items-center gap-4">
    <div class="flex min-w-0 flex-1 flex-col leading-[1.25]">
      <span class="truncate text-xl font-semibold tracking-[-0.015em]">{{ titolo }}</span>
    </div>
  </header>
</template>
