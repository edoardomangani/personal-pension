<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue'

defineProps<{
  titolo: string
  descrizione?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center text-center">
    <AppLogoIcon class="size-9 text-foreground" />
    <h1 class="mt-4 text-xl/7 font-semibold text-foreground">{{ titolo }}</h1>
    <p v-if="descrizione || $slots.default" class="mt-2 text-sm text-muted-foreground">
      <slot>{{ descrizione }}</slot>
    </p>
  </div>
</template>
