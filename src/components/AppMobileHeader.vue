<script setup lang="ts">
import { PhCaretLeft } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AvatarUtente from '@/components/AvatarUtente.vue'
import { Button } from '@/components/ui/button'
import AzioneTestata from '@/components/AzioneTestata.vue'
import BannerOffline from '@/components/BannerOffline.vue'
import { formatoGiorno } from '@/calc/formato'
import { useAzioneTestata } from '@/composables/useAzioneTestata'
import { useIndietro } from '@/composables/useIndietro'
import { useProfilo } from '@/composables/useProfilo'
import { useRete } from '@/composables/useRete'
import { useShellHeading } from '@/composables/useShellHeading'
import { useArchivioStore } from '@/stores/archivio'

const route = useRoute()
const archivio = useArchivioStore()
const { titolo } = useShellHeading()
const { iniziali, saluto, foto } = useProfilo()
const { indietro } = useIndietro()
const azione = useAzioneTestata()
const { online } = useRete()

const secondaria = computed(() => route.meta.testata === 'secondaria')
const inHome = computed(() => route.name === 'home')
const giorno = computed(() => formatoGiorno(archivio.oggi))
</script>

<template>
  <header class="sticky top-0 isolate z-30 px-4 pt-(--header-mobile-pad-top) pb-3">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 -bottom-(--glass-fade) -z-10 glass-header"
    />
    <!-- Secondaria: a destra l'azione della pagina o uno spazio largo quanto la freccia. -->
    <div v-if="secondaria" class="flex min-h-9 items-center gap-3">
      <!-- I due lati crescono uguali: il titolo resta al centro anche con «Salva», più largo della freccia. -->
      <div class="flex flex-1 basis-0">
        <Button variant="outline" size="icon" aria-label="Indietro" @click="indietro">
          <PhCaretLeft class="size-4.5" />
        </Button>
      </div>
      <h1 class="min-w-0 truncate text-center text-base font-semibold">{{ titolo }}</h1>
      <div class="flex flex-1 basis-0 justify-end">
        <AzioneTestata v-if="azione" :azione="azione" variante="mobile" />
        <span v-else aria-hidden="true" class="size-9 shrink-0" />
      </div>
    </div>
    <!-- min-h-11: la riga tiene saluto e data, così la testata è alta uguale con e senza data. -->
    <div v-else class="flex min-h-11 items-center gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 class="truncate text-xl leading-6 font-semibold tracking-title">
          {{ inHome ? saluto : titolo }}
        </h1>
        <p v-if="inHome" class="truncate text-xs text-subtle-foreground">{{ giorno }}</p>
      </div>
      <Button as-child variant="ghost" size="icon" class="shrink-0 hover:bg-transparent">
        <RouterLink to="/profilo" aria-label="Profilo: account e impostazioni">
          <AvatarUtente :foto="foto" :iniziali="iniziali" class="size-9" />
        </RouterLink>
      </Button>
    </div>
    <!-- Dentro la testata sticky: resta visibile scorrendo. -->
    <BannerOffline v-if="!online" class="mt-3" />
  </header>
</template>
