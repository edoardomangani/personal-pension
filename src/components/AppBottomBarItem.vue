<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { VoceNavigazione } from '@/composables/useNavigazione'

defineProps<{
  voce: VoceNavigazione
}>()
</script>

<template>
  <RouterLink
    :to="voce.percorso"
    :aria-current="voce.attiva ? 'page' : undefined"
    :class="[
      'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 text-tab-label font-semibold transition-transform duration-150 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] motion-reduce:active:scale-100',
      voce.attiva ? 'text-foreground' : 'text-subtle-foreground',
    ]"
  >
    <component :is="voce.icona" :weight="voce.attiva ? 'fill' : 'regular'" class="size-6" />
    {{ voce.titolo }}
  </RouterLink>
</template>
