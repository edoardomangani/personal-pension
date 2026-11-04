<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { insetControlClass } from '@/components/forms/inset'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const { align = 'right', class: className } = defineProps<{
  align?: 'left' | 'right'
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Input
    v-bind="$attrs"
    :class="
      cn(
        insetControlClass,
        align === 'left' && 'text-left',
        // Native date fields ignore text-align: they size to their value instead.
        $attrs.type === 'date' && 'w-auto',
        className,
      )
    "
  />
</template>
