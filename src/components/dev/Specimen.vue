<script setup lang="ts">
// Codice letterale: il test dei codici unici lo legge dal sorgente.
defineProps<{
  code: string
  note?: string
}>()
</script>

<template>
  <figure class="flex min-w-0 flex-col items-start gap-2" :data-specimen="code">
    <div class="flex min-h-10 max-w-full items-center">
      <slot />
    </div>
    <figcaption class="flex max-w-full flex-col gap-0.5">
      <code class="text-xs font-semibold break-words text-subtle-foreground select-all">{{
        code
      }}</code>
      <span v-if="note" class="text-xs text-subtle-foreground">
        {{ note }}
      </span>
    </figcaption>
  </figure>
</template>
