<script setup lang="ts">
const { size = 'screen' } = defineProps<{
  size?: 'screen' | 'header' | 'header-banner' | 'bar' | 'card' | 'form'
}>()

const heights = {
  screen: 'h-[760px]',
  header: 'h-[132px]',
  // Testata col banner offline, più la sfumatura del vetro sotto.
  'header-banner': 'h-[210px]',
  bar: 'h-[220px]',
  card: 'h-[340px]',
  form: 'h-[480px]',
} as const
</script>

<template>
  <!-- Il transform fa della cornice il blocco contenitore: la barra in basso fixed si ancora qui, non alla finestra. -->
  <div
    class="relative w-[390px] max-w-full shrink-0 [transform:translateZ(0)] overflow-hidden rounded-[40px] border-[0.75px] border-border-strong bg-background"
    :class="[
      heights[size],
      size === 'screen' &&
        'bg-[radial-gradient(560px_460px_at_104%_-8%,var(--ambient-strong),transparent_70%),radial-gradient(480px_480px_at_-14%_62%,var(--ambient-soft),transparent_70%)]',
    ]"
  >
    <div class="h-full [scrollbar-width:none] overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
