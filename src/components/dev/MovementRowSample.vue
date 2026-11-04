<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import type { ShowcaseDensity } from '@/components/dev/showcase'

export type MovementSampleRow = {
  code: string
  label: string
  meta: string
  amount: string
  icon: Component
  tile: string
  ink: string
}

const {
  row,
  density,
  specimen = false,
} = defineProps<{
  row: MovementSampleRow
  density: ShowcaseDensity
  specimen?: boolean
}>()

// Desktop: righe 52px e tile 32px; mobile: righe 56px e tile 36px.
const rowClass = computed(() => (density === 'mobile' ? 'min-h-14' : 'min-h-[52px]'))
const tileClass = computed(() =>
  density === 'mobile'
    ? 'size-9 rounded-xl [&>svg]:size-[18px]'
    : 'size-8 rounded-[10px] [&>svg]:size-4',
)
</script>

<template>
  <component
    :is="specimen ? 'span' : 'div'"
    class="flex items-center gap-3"
    :class="[rowClass, specimen ? 'w-72' : 'px-4']"
  >
    <span class="grid shrink-0 place-items-center" :class="[tileClass, row.tile]">
      <component :is="row.icon" />
    </span>
    <span v-if="specimen" class="flex-1 truncate text-sm font-medium">{{ row.label }}</span>
    <span v-else class="flex min-w-0 flex-1 flex-col leading-[1.35]">
      <span class="truncate text-sm font-medium">{{ row.label }}</span>
      <span class="truncate text-xs text-subtle-foreground">{{ row.meta }}</span>
    </span>
    <span class="text-sm font-semibold whitespace-nowrap" :class="row.ink">{{ row.amount }}</span>
  </component>
</template>
