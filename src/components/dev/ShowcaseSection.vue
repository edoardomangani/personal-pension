<script setup lang="ts">
import { computed } from 'vue'
import { showcaseSection, type ShowcaseSectionId } from '@/components/dev/showcase'

const props = defineProps<{
  id: ShowcaseSectionId
}>()

const heading = computed(() => showcaseSection(props.id))
</script>

<template>
  <section
    :id="id"
    :aria-labelledby="`${id}-title`"
    class="flex scroll-mt-[calc(var(--header-mobile-height)+env(safe-area-inset-top)+(--spacing(6)))] lg:scroll-mt-[calc(var(--topbar-height)+(--spacing(6)))] flex-col gap-8"
  >
    <h2
      :id="`${id}-title`"
      class="flex items-baseline gap-3 border-b-[0.75px] border-divider pb-3 text-xl font-semibold tracking-[-0.015em]"
    >
      <span class="text-subtle-foreground">{{ heading.number }}</span>
      {{ heading.title }}
    </h2>
    <slot />
  </section>
</template>
