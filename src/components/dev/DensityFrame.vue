<script setup lang="ts">
import PhoneFrame from '@/components/dev/PhoneFrame.vue'
import { useShowcaseDensity } from '@/components/dev/showcase'

// Il selettore di densità decide solo se il campione sta nel telefono da 390px.
const density = useShowcaseDensity()
</script>

<template>
  <PhoneFrame v-if="density === 'mobile'" size="form">
    <div class="p-4 pt-8">
      <slot />
    </div>
  </PhoneFrame>
  <div v-else class="w-[560px] max-w-full">
    <slot />
  </div>
</template>
