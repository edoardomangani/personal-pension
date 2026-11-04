<script setup lang="ts">
import { provide } from 'vue'
import { routeLocationKey, useRouter } from 'vue-router'

const { percorso } = defineProps<{ percorso: string }>()

// Il campione vede la sua rotta (testate, voci accese, RouterLink) senza cambiare quella vera della vetrina.
// `resolve` dà `name: null` alle rotte senza nome, la rotta caricata `undefined`.
const { name, ...rotta } = useRouter().resolve(percorso)
provide(routeLocationKey, { ...rotta, name: name ?? undefined })
</script>

<template>
  <slot />
</template>
