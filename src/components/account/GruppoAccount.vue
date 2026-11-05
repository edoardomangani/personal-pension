<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ titolo: string }>()

const id = useId()
</script>

<template>
  <!-- Stesso titolo dei gruppi inset dei moduli, per i gruppi che non sono campi. -->
  <section :aria-labelledby="id" class="flex w-full flex-col gap-2">
    <h2 :id="id" class="px-1 text-xs font-semibold text-muted-foreground">{{ titolo }}</h2>
    <slot />
  </section>
</template>
