<script setup lang="ts">
import { SidebarProvider } from '@/components/ui/sidebar'
</script>

<template>
  <!-- Solo la variante sidebar di Wallet: la sidebar è collapsible="none", sempre aperta. -->
  <SidebarProvider :default-open="true">
    <slot />
  </SidebarProvider>
</template>
