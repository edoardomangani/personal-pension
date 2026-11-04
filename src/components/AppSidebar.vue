<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import NavMain from '@/components/NavMain.vue'
import NewMovementButton from '@/components/NewMovementButton.vue'
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar'
import { useNavigazione } from '@/composables/useNavigazione'

const { vociDesktop } = useNavigazione()
</script>

<template>
  <Sidebar collapsible="none" class="sticky top-0 h-svh gap-5 px-3 py-5">
    <!-- «Registra» sta qui, sotto il marchio, e non nella testata: un solo + su desktop. -->
    <SidebarHeader class="gap-5 p-0">
      <RouterLink to="/" class="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
        <AppLogo />
      </RouterLink>
      <NewMovementButton testo="Registra" />
    </SidebarHeader>

    <SidebarContent class="p-0">
      <nav aria-label="Navigazione principale">
        <NavMain :voci="vociDesktop" />
      </nav>
    </SidebarContent>
  </Sidebar>
</template>
