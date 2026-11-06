<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="sidebar-menu-badge"
    data-sidebar="menu-badge"
    :class="
      cn(
        'bg-secondary text-foreground pointer-events-none absolute right-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-semibold tabular-nums select-none',
        'peer-data-[size=sm]/menu-button:top-[5px]',
        'peer-data-[size=default]/menu-button:top-[9px]',
        'peer-data-[size=lg]/menu-button:top-[17px]',
        'group-data-[collapsible=icon]:hidden',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
