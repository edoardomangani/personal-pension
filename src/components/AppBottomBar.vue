<script setup lang="ts">
import { computed } from 'vue'
import AppBottomBarItem from '@/components/AppBottomBarItem.vue'
import NewMovementButton from '@/components/NewMovementButton.vue'
import { useNavigazione } from '@/composables/useNavigazione'

const { vociMobili } = useNavigazione()

// Due voci per lato attorno al + centrale.
const vociSinistra = computed(() => vociMobili.value.slice(0, 2))
const vociDestra = computed(() => vociMobili.value.slice(2))
</script>

<template>
  <nav
    aria-label="Navigazione principale"
    class="fixed inset-x-0 bottom-0 isolate z-40 px-1.5 pt-1 pb-(--bottom-bar-pad-bottom)"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 -top-(--glass-fade) bottom-0 -z-10 glass-bar"
    />
    <div class="flex items-center">
      <AppBottomBarItem v-for="voce in vociSinistra" :key="voce.chiave" :voce="voce" />
      <div class="mx-2 flex">
        <NewMovementButton variant="round" />
      </div>
      <AppBottomBarItem v-for="voce in vociDestra" :key="voce.chiave" :voce="voce" />
    </div>
  </nav>
</template>
