<script setup lang="ts">
import { PhSignOut, PhUser } from '@phosphor-icons/vue'
import NavUtente from '@/components/NavUtente.vue'
import { useProfilo } from '@/composables/useProfilo'

const { rigaPrincipale, emailSecondaria } = useProfilo()

const voce =
  'relative flex h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium select-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'
</script>

<template>
  <!-- Stato aperto statico: il menu vero va in un portal su <body> e non starebbe nel campione. -->
  <div class="flex w-52 flex-col gap-2">
    <div
      class="rounded-xl border-[0.75px] border-border-strong bg-popover p-1 text-popover-foreground shadow-popover backdrop-blur-popover"
    >
      <div class="flex flex-col gap-0.5 px-2 py-1.5 text-foreground">
        <span class="truncate text-sm font-semibold">{{ rigaPrincipale }}</span>
        <span v-if="emailSecondaria" class="truncate text-xs text-subtle-foreground">
          {{ emailSecondaria }}
        </span>
      </div>
      <div class="-mx-1 my-1 h-px bg-divider" />
      <div :class="[voce, 'bg-accent text-accent-foreground']">
        <PhUser />
        Account
      </div>
      <div :class="voce">
        <PhSignOut />
        Esci
      </div>
    </div>
    <NavUtente />
  </div>
</template>
