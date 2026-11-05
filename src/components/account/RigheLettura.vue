<script setup lang="ts">
import type { RigaLettura } from '@/components/account/righe'
import { insetGroupClass, insetRowClass } from '@/components/forms/inset'

defineProps<{ righe: RigaLettura[] }>()
</script>

<template>
  <dl :class="insetGroupClass">
    <div
      v-for="riga in righe"
      :key="riga.etichetta"
      :class="[insetRowClass, 'flex min-h-12 items-center gap-3 px-4 text-sm']"
    >
      <dt class="shrink-0 text-foreground">{{ riga.etichetta }}</dt>
      <dd class="min-w-0 flex-1 truncate text-right text-muted-foreground">{{ riga.valore }}</dd>
    </div>
  </dl>
</template>
