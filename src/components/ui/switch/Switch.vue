<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<SwitchRootProps & { class?: HTMLAttributes['class'] }>()

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    data-slot="switch"
    v-bind="forwarded"
    :class="
      cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong inline-flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-[background-color] duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="
        cn(
          'data-[state=unchecked]:bg-foreground data-[state=checked]:bg-primary-foreground pointer-events-none block size-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0 motion-reduce:transition-none',
        )
      "
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>
