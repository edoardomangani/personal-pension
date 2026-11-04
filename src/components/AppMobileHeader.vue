<script setup lang="ts">
import { PhCaretLeft, PhUser } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatoGiorno } from '@/calc/formato'
import { useIndietro } from '@/composables/useIndietro'
import { useProfilo } from '@/composables/useProfilo'
import { useShellHeading } from '@/composables/useShellHeading'
import { useArchivioStore } from '@/stores/archivio'

const route = useRoute()
const archivio = useArchivioStore()
const { titolo } = useShellHeading()
const { iniziali, saluto } = useProfilo()
const { indietro } = useIndietro()

const secondaria = computed(() => route.meta.testata === 'secondaria')
const inHome = computed(() => route.name === 'home')
const giorno = computed(() => formatoGiorno(archivio.oggi))
</script>

<template>
  <header class="sticky top-0 isolate z-30 px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 -bottom-(--glass-fade) -z-10 glass-header"
    />
    <!-- Secondaria: lo spazio a destra pareggia la freccia, così il titolo resta al centro della testata. -->
    <div v-if="secondaria" class="flex min-h-9 items-center gap-3">
      <Button variant="outline" size="icon" aria-label="Indietro" @click="indietro">
        <PhCaretLeft class="size-[18px]" />
      </Button>
      <h1 class="min-w-0 flex-1 truncate text-center text-base font-semibold">{{ titolo }}</h1>
      <span aria-hidden="true" class="size-9 shrink-0" />
    </div>
    <!-- min-h-11: la riga tiene saluto e data, così la testata è alta uguale con e senza data. -->
    <div v-else class="flex min-h-11 items-center gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 class="truncate text-xl leading-6 font-semibold tracking-[-0.015em]">
          {{ inHome ? saluto : titolo }}
        </h1>
        <p v-if="inHome" class="truncate text-xs text-subtle-foreground">{{ giorno }}</p>
      </div>
      <Button as-child variant="ghost" size="icon" class="shrink-0 hover:bg-transparent">
        <RouterLink to="/profilo" aria-label="Profilo: account e impostazioni">
          <Avatar class="size-9">
            <AvatarFallback>
              <template v-if="iniziali">{{ iniziali }}</template>
              <PhUser v-else class="size-[18px]" />
            </AvatarFallback>
          </Avatar>
        </RouterLink>
      </Button>
    </div>
  </header>
</template>
