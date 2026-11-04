<script setup lang="ts">
import { computed } from 'vue'
import MovementRowSample from '@/components/dev/MovementRowSample.vue'
import type { MovementSampleRow } from '@/components/dev/MovementRowSample.vue'
import type { ShowcaseDensity } from '@/components/dev/showcase'

// Giorno e totale arrivano già formattati: il campione non somma importi.
const { rows, density, day, total } = defineProps<{
  rows: ReadonlyArray<MovementSampleRow>
  density: ShowcaseDensity
  day: string
  total: string
}>()

// Card del giorno: 22px su desktop, 24px su mobile; le misure delle righe stanno in MovementRowSample.
const cardRadius = computed(() => (density === 'mobile' ? 'rounded-[24px]' : 'rounded-3xl'))
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between px-1 text-xs">
      <span class="font-semibold text-muted-foreground">{{ day }}</span>
      <span class="text-subtle-foreground">{{ total }}</span>
    </div>
    <div
      class="overflow-hidden border-[0.75px] border-border bg-card py-1 shadow-glass"
      :class="cardRadius"
    >
      <MovementRowSample v-for="row in rows" :key="row.code" :row="row" :density="density" />
    </div>
  </div>
</template>
