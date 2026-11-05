<script setup lang="ts">
import { PhUser } from '@phosphor-icons/vue'
import type { HTMLAttributes } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const props = defineProps<{
  foto: string | null
  /** `null` senza sessione: al loro posto l'icona. */
  iniziali: string | null
  /** La misura del cerchio, es. `size-9`. */
  class?: HTMLAttributes['class']
  /** Il testo delle iniziali, per le misure grandi. */
  classeIniziali?: HTMLAttributes['class']
}>()
</script>

<template>
  <Avatar :class="props.class">
    <!-- R28: finché la foto non carica (o se non si decodifica) restano le iniziali. -->
    <AvatarImage v-if="foto" :src="foto" alt="" class="object-cover" />
    <AvatarFallback :class="classeIniziali">
      <template v-if="iniziali">{{ iniziali }}</template>
      <PhUser v-else class="size-4.5" />
    </AvatarFallback>
  </Avatar>
</template>
