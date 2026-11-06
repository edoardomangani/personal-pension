<script setup lang="ts">
import { DialogDescription } from '@/components/ui/dialog'
import { DrawerDescription } from '@/components/ui/drawer'
import { useIsDesktop } from '@/composables/useIsDesktop'

// Nel corpo e allineata a sinistra come nelle tavole, ma resta la descrizione del dialog o del drawer
// aperto da ResponsiveSheet, che sceglie col confine di useIsDesktop.
const isDesktop = useIsDesktop()
</script>

<template>
  <DialogDescription v-if="isDesktop"><slot /></DialogDescription>
  <DrawerDescription v-else><slot /></DrawerDescription>
</template>
