<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import NavMain from '@/components/NavMain.vue'
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar'
import { useNavigazione } from '@/composables/useNavigazione'

const { vociDesktop } = useNavigazione()
</script>

<template>
  <Sidebar collapsible="none" class="sticky top-0 h-svh gap-4 px-3 py-4">
    <SidebarHeader class="p-0">
      <RouterLink to="/" class="flex h-8 items-center gap-2.5 rounded-lg px-1">
        <AppLogo />
      </RouterLink>
    </SidebarHeader>

    <SidebarContent class="p-0">
      <nav aria-label="Navigazione principale">
        <NavMain :voci="vociDesktop" />
      </nav>
    </SidebarContent>
  </Sidebar>
</template>
