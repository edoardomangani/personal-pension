<script setup lang="ts">
import PlaceholderPattern from '@/components/PlaceholderPattern.vue'
</script>

<template>
  <!-- Il titolo della sezione sta nella testata della shell, letto da meta.titolo. -->
  <div data-segnaposto class="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
    <div class="grid auto-rows-min gap-4 md:grid-cols-3">
      <div class="relative aspect-video overflow-hidden rounded-xl border-[0.75px] border-border">
        <PlaceholderPattern />
      </div>
      <div class="relative aspect-video overflow-hidden rounded-xl border-[0.75px] border-border">
        <PlaceholderPattern />
      </div>
      <div class="relative aspect-video overflow-hidden rounded-xl border-[0.75px] border-border">
        <PlaceholderPattern />
      </div>
    </div>
    <div
      class="relative min-h-[100vh] flex-1 rounded-xl border-[0.75px] border-border md:min-h-min"
    >
      <PlaceholderPattern />
    </div>
  </div>
</template>
