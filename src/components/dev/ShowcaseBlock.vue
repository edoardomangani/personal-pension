<script setup lang="ts">
import { computed } from 'vue'
import { showcaseBlock, type ShowcaseBlockId } from '@/components/dev/showcase'

// Titolo e numero vengono dall'indice di showcase.ts, non dal markup.
const props = defineProps<{
  id: ShowcaseBlockId
}>()

const heading = computed(() => showcaseBlock(props.id))
</script>

<template>
  <div class="flex flex-col gap-3">
    <h3
      :id="id"
      class="flex scroll-mt-6 items-baseline gap-2 text-xs font-semibold text-muted-foreground"
    >
      <span class="text-subtle-foreground">{{ heading.number }}</span>
      {{ heading.title }}
    </h3>
    <div class="flex flex-col gap-5 rounded-2xl border-[0.75px] border-divider p-5">
      <slot />
    </div>
  </div>
</template>
