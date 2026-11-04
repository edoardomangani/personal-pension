<script setup lang="ts">
import { useShellHeading } from '@/composables/useShellHeading'

const { titolo } = useShellHeading()
</script>

<template>
  <header class="sticky top-0 isolate z-30 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 -bottom-(--glass-fade) -z-10 glass-header"
    />
    <!-- min-h-9: la stessa altezza che in Wallet danno avatar e campanella. -->
    <div class="flex min-h-9 items-center gap-3">
      <div class="flex min-w-0 flex-1 flex-col leading-[1.25]">
        <span class="truncate text-base font-semibold">{{ titolo }}</span>
      </div>
    </div>
  </header>
</template>
