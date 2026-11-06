<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccessoLayout from '@/components/AccessoLayout.vue'
import AppLayout from '@/components/AppLayout.vue'
import { useBloccoZoom } from '@/composables/useBloccoZoom'
import { useConfermaSessione } from '@/composables/useConfermaSessione'
import { useSessioneScaduta } from '@/composables/useSessioneScaduta'

const route = useRoute()
useSessioneScaduta()
useConfermaSessione()
useBloccoZoom()

// Senza rotte risolte il guard sta ancora aspettando la sessione: né shell né accesso.
const risolta = computed(() => route.matched.length > 0)
const fuoriShell = computed(() => route.meta.accesso === true || route.meta.primoAvvio === true)
</script>

<template>
  <template v-if="risolta">
    <AccessoLayout v-if="fuoriShell">
      <RouterView />
    </AccessoLayout>
    <AppLayout v-else>
      <RouterView />
    </AppLayout>
  </template>
</template>
