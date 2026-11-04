<script setup lang="ts">
import type { NavigationMenuLinkEmits, NavigationMenuLinkProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { NavigationMenuLink, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<NavigationMenuLinkProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<NavigationMenuLinkEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <NavigationMenuLink
    data-slot="navigation-menu-link"
    v-bind="forwarded"
    :class="
      cn(
        'data-active:focus:bg-accent data-active:hover:bg-accent data-active:bg-accent data-active:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground flex flex-col gap-1 rounded-lg p-2 text-sm font-medium outline-none transition-[color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring [&_svg:not([class*=\'size-\'])]:size-4',
        props.class,
      )
    "
  >
    <slot />
  </NavigationMenuLink>
</template>
