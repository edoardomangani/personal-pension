<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import { PhCheckCircle, PhInfo, PhSpinnerGap, PhWarning, PhX, PhXCircle } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/lib/utils'

import 'vue-sonner/style.css'

const props = defineProps<ToasterProps>()

// --width vale anche per ogni toast: 100% lo lega alla lista, che legge --toast-width.
const toastOptions = computed(() => ({
  ...props.toastOptions,
  style: { '--width': '100%', ...props.toastOptions?.style },
}))
</script>

<template>
  <Sonner
    :class="cn('toaster group **:data-sonner-toast:backdrop-blur-popover', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border-strong)',
      '--border-radius': 'calc(var(--radius) + 4px)',
      '--width': 'var(--toast-width)',
    }"
    v-bind="props"
    :toast-options="toastOptions"
  >
    <template #success-icon>
      <PhCheckCircle class="size-4" />
    </template>
    <template #info-icon>
      <PhInfo class="size-4" />
    </template>
    <template #warning-icon>
      <PhWarning class="size-4" />
    </template>
    <template #error-icon>
      <PhXCircle class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <PhSpinnerGap class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <PhX class="size-4" />
    </template>
  </Sonner>
</template>
