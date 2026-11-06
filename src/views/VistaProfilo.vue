<script setup lang="ts">
import { PhCamera, PhCaretRight, PhSignOut, PhUser } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import FotoProfiloSheet from '@/components/FotoProfiloSheet.vue'
import { insetGroupClass } from '@/components/forms/inset'
import AvatarUtente from '@/components/AvatarUtente.vue'
import { Button } from '@/components/ui/button'
import { useEsci } from '@/composables/useEsci'
import { useNavigazione, type PhosphorIcon } from '@/composables/useNavigazione'
import { useProfilo } from '@/composables/useProfilo'

type Collegamento = { chiave: string; titolo: string; percorso: string; icona: PhosphorIcon }

const { rigaPrincipale, emailSecondaria, iniziali, foto } = useProfilo()
const { vociDesktop } = useNavigazione()
const { esci, inCorso } = useEsci()
const fotoAperta = ref(false)

// Impostazioni e Fisco con titolo e icona della sidebar: una sola fonte.
const collegamenti = computed<Collegamento[]>(() => [
  { chiave: 'account', titolo: 'Account', percorso: '/account', icona: PhUser },
  ...vociDesktop.value.filter((voce) => voce.chiave === 'impostazioni'),
  ...vociDesktop.value.filter((voce) => voce.chiave === 'fisco'),
])

// Il filo fra le righe parte dal testo, non dal tile.
const riga =
  'relative flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm font-medium transition-colors duration-200 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-16 not-first:before:h-[0.75px] not-first:before:bg-divider hover:bg-accent focus-visible:bg-accent focus-visible:outline-none motion-reduce:transition-none disabled:opacity-50'
const tile = 'grid size-9 shrink-0 place-items-center rounded-tile bg-secondary text-foreground'
</script>

<template>
  <div class="mx-auto flex w-full max-w-140 flex-col gap-6">
    <section class="flex flex-col items-center pt-2 pb-2 text-center">
      <div class="relative">
        <AvatarUtente
          :foto="foto"
          :iniziali="iniziali"
          class="size-20"
          classe-iniziali="text-2xl font-semibold"
        />
        <Button
          type="button"
          size="icon-sm"
          aria-label="Cambia foto"
          class="absolute -right-0.5 -bottom-0.5 border-2 border-background"
          @click="fotoAperta = true"
        >
          <PhCamera class="size-4" />
        </Button>
      </div>
      <p class="mt-3 max-w-full truncate text-lg font-semibold tracking-[-0.01em]">
        {{ rigaPrincipale }}
      </p>
      <p v-if="emailSecondaria" class="mt-0.5 max-w-full truncate text-xs text-subtle-foreground">
        {{ emailSecondaria }}
      </p>
    </section>

    <nav aria-label="Profilo" :class="insetGroupClass">
      <RouterLink v-for="voce in collegamenti" :key="voce.chiave" :to="voce.percorso" :class="riga">
        <span :class="tile"><component :is="voce.icona" class="size-4.5" /></span>
        <span class="flex-1 truncate">{{ voce.titolo }}</span>
        <PhCaretRight class="size-4 shrink-0 text-subtle-foreground" />
      </RouterLink>
    </nav>

    <div :class="insetGroupClass">
      <button type="button" :class="riga" :disabled="inCorso" @click="esci">
        <span :class="tile"><PhSignOut class="size-4.5" /></span>
        <span class="flex-1 truncate">Esci</span>
      </button>
    </div>

    <FotoProfiloSheet v-model:open="fotoAperta" />
  </div>
</template>
