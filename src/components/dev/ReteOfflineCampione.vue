<script setup lang="ts">
import { ref } from 'vue'
import { fornisciRete } from '@/composables/useRete'

// La rete forzata offline per i discendenti, senza toccare navigator.
fornisciRete(ref(false))
</script>

<template>
  <slot />
</template>
