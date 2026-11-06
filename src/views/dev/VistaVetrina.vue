<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import ActionsSection from '@/components/dev/ActionsSection.vue'
import FieldsSection from '@/components/dev/FieldsSection.vue'
import FormsSection from '@/components/dev/FormsSection.vue'
import FoundationsSection from '@/components/dev/FoundationsSection.vue'
import OverlaysSection from '@/components/dev/OverlaysSection.vue'
import ShellSection from '@/components/dev/ShellSection.vue'
import StructureSection from '@/components/dev/StructureSection.vue'
import {
  sectionBlocks,
  sectionNumber,
  showcaseDensityKey,
  showcaseSections,
  type ShowcaseDensity,
  type ShowcaseSectionId,
} from '@/components/dev/showcase'
import { Button } from '@/components/ui/button'

const densities: ShowcaseDensity[] = ['desktop', 'mobile']
const density = ref<ShowcaseDensity>('desktop')

provide(showcaseDensityKey, density)

function densityLabel(value: ShowcaseDensity): string {
  return value === 'desktop' ? 'Desktop' : 'Mobile'
}

// Indice dichiarato in showcase.ts; il DOM dice solo quale sezione è in vista.
const index = showcaseSections.map((section, position) => ({
  ...section,
  number: sectionNumber(position),
  blocks: sectionBlocks(section.id),
}))

const activeId = ref<ShowcaseSectionId>('fondamenta')
let observer: IntersectionObserver | undefined

// Con la history hash un'ancora `#id` cambierebbe rotta: si scorre a mano.
function vaiA(id: string): void {
  document.getElementById(id)?.scrollIntoView()
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const section = showcaseSections.find((candidate) => candidate.id === visible?.target.id)

      if (section) {
        activeId.value = section.id
      }
    },
    // Fascia stretta vicino all'alto: la sezione che la attraversa è quella in vista.
    { rootMargin: '-15% 0px -75% 0px' },
  )

  for (const section of showcaseSections) {
    const element = document.getElementById(section.id)

    if (element) {
      observer.observe(element)
    }
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="flex">
    <nav
      aria-label="Indice della vetrina"
      class="sticky top-(--topbar-height) hidden h-[calc(100dvh-var(--topbar-height)-var(--content-pad-bottom))] w-56 shrink-0 overflow-y-auto border-r-[0.75px] border-divider px-3 py-6 lg:block"
    >
      <p class="px-3 pb-3 text-xs font-semibold text-subtle-foreground">Sezioni</p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="section in index" :key="section.id">
          <a
            :href="`#${section.id}`"
            :aria-current="activeId === section.id ? 'true' : undefined"
            class="flex items-baseline gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-sidebar-hover hover:text-foreground"
            :class="
              activeId === section.id
                ? 'bg-sidebar-accent font-semibold text-foreground'
                : 'text-subtle-foreground'
            "
            @click.prevent="vaiA(section.id)"
          >
            <span class="text-xs">{{ section.number }}</span>
            {{ section.label }}
          </a>
          <ul
            v-if="activeId === section.id"
            class="mt-0.5 mb-2 ml-5 flex flex-col border-l-[0.75px] border-divider"
          >
            <li v-for="block in section.blocks" :key="block.id">
              <a
                :href="`#${block.id}`"
                class="block truncate py-1 pl-3 text-xs text-subtle-foreground hover:text-foreground"
                @click.prevent="vaiA(block.id)"
              >
                {{ block.number }} {{ block.title }}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <div class="flex w-full min-w-0 flex-col gap-16 lg:pl-10">
      <header class="flex flex-col gap-6 border-b-[0.75px] border-divider pb-8">
        <div class="flex flex-col gap-2">
          <p class="max-w-2xl text-sm text-muted-foreground">
            Token, componenti e shell come li usa l'app. Ogni esempio ha un codice da citare nelle
            segnalazioni.
          </p>
        </div>

        <div
          role="group"
          aria-label="Densità"
          class="flex w-fit gap-1 rounded-full border-[0.75px] border-border bg-card p-1 shadow-glass"
        >
          <Button
            v-for="value in densities"
            :key="value"
            size="sm"
            :variant="density === value ? 'default' : 'ghost'"
            :aria-pressed="density === value"
            @click="density = value"
          >
            {{ densityLabel(value) }}
          </Button>
        </div>

        <nav aria-label="Sezioni" class="flex flex-wrap gap-x-4 gap-y-2 lg:hidden">
          <a
            v-for="section in index"
            :key="section.id"
            :href="`#${section.id}`"
            class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            @click.prevent="vaiA(section.id)"
          >
            {{ section.number }} {{ section.label }}
          </a>
        </nav>
      </header>

      <FoundationsSection />
      <ShellSection />
      <ActionsSection />
      <FieldsSection />
      <FormsSection />
      <OverlaysSection />
      <StructureSection />
    </div>
  </div>
</template>
