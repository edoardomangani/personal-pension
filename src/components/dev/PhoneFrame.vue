<script setup lang="ts">
const { size = 'screen' } = defineProps<{
  size?: 'screen' | 'header' | 'header-banner' | 'bar' | 'card' | 'form'
}>()

const heights = {
  screen: 'h-[760px]',
  header: 'h-[132px]',
  // Testata col banner offline, più la sfumatura del vetro sotto.
  'header-banner': 'h-52.5',
  bar: 'h-[220px]',
  card: 'h-[340px]',
  form: 'h-[480px]',
} as const
</script>

<template>
  <!-- Il transform fa della cornice il blocco contenitore: testata e barra in basso fixed si ancorano qui, non alla finestra. -->
  <div
    class="relative w-[390px] max-w-full shrink-0 [transform:translateZ(0)] overflow-hidden rounded-[40px] border-[0.75px] border-border-strong bg-background"
    :class="heights[size]"
  >
    <!-- Il bagliore dell'app sotto lg, dietro al contenuto: la cornice col transform è il suo contesto. -->
    <div
      v-if="size === 'screen'"
      data-bagliore
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-1 bagliore-telefono"
    />
    <div class="h-full [scrollbar-width:none] overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
