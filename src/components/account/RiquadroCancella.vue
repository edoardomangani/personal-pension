<script setup lang="ts">
import { PhTrash } from '@phosphor-icons/vue'
import GruppoAccount from '@/components/account/GruppoAccount.vue'
import { Button } from '@/components/ui/button'

defineEmits<{ cancella: [] }>()
</script>

<template>
  <GruppoAccount titolo="Cancella account">
    <div
      class="flex flex-col items-start rounded-2xl border-[0.75px] border-border bg-card p-4 text-sm text-destructive shadow-glass"
    >
      <p class="font-medium">Attenzione</p>
      <p>Cancelli l’account con il fondo, i movimenti e i valori. Non si può annullare.</p>
      <Button type="button" variant="destructive" class="mt-4" @click="$emit('cancella')">
        <PhTrash />
        Cancella account
      </Button>
    </div>
  </GruppoAccount>
</template>
