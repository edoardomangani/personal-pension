<script setup lang="ts">
import { useRoute } from 'vue-router'
import NewMovementButton from '@/components/NewMovementButton.vue'
import { useShellHeading } from '@/composables/useShellHeading'

const route = useRoute()
const { titolo } = useShellHeading()
</script>

<template>
  <header class="sticky top-0 isolate z-30 flex h-(--topbar-height) items-center gap-4 px-12">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 -bottom-(--glass-fade) -z-10 glass-header"
    />
    <h1 class="min-w-0 flex-1 truncate text-xl leading-6 font-semibold tracking-[-0.015em]">
      {{ titolo }}
    </h1>
    <NewMovementButton v-if="route.meta.registra" testo="Registra" />
  </header>
</template>
