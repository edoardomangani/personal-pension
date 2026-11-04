<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { VoceNavigazione } from '@/composables/useNavigazione'

defineProps<{
  voci: VoceNavigazione[]
}>()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem v-for="voce in voci" :key="voce.chiave">
      <SidebarMenuButton as-child :is-active="voce.attiva">
        <RouterLink :to="voce.percorso" :aria-current="voce.attiva ? 'page' : undefined">
          <component :is="voce.icona" :weight="voce.attiva ? 'fill' : 'regular'" />
          <span>{{ voce.titolo }}</span>
        </RouterLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
