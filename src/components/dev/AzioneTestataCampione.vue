<script setup lang="ts">
import { fornisciAzioneTestata } from '@/composables/useAzioneTestata'

// Fa la parte di AppLayout e della vista: un «Salva» fisso con modifiche non salvate.
fornisciAzioneTestata().value = () => ({
  etichetta: 'Salva',
  attiva: true,
  inCorso: false,
  modificato: true,
  esegui: () => {},
})
</script>

<template>
  <slot />
</template>
