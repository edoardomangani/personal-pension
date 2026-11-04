<script setup lang="ts">
import AppBottomBar from '@/components/AppBottomBar.vue'
import AppContent from '@/components/AppContent.vue'
import AppMobileHeader from '@/components/AppMobileHeader.vue'
import AppShell from '@/components/AppShell.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopBar from '@/components/AppTopBar.vue'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <!-- Sotto lg: testata sticky e barra in basso; da lg: sidebar e testata desktop. -->
  <AppShell>
    <div class="hidden shrink-0 lg:block">
      <AppSidebar />
    </div>
    <AppContent variant="sidebar" class="min-w-0 overflow-x-clip">
      <AppMobileHeader class="lg:hidden" />
      <div
        class="mx-auto flex w-full max-w-[1180px] flex-1 flex-col pb-[calc(var(--bottom-bar-height)+env(safe-area-inset-bottom))] lg:px-[clamp(4px,calc(4vw-16px),32px)] lg:pb-14"
      >
        <!-- max-lg:hidden batte il flex della testata, che hidden da solo non batterebbe. -->
        <AppTopBar class="px-4 pt-7 pb-2 max-lg:hidden" />
        <slot />
      </div>
      <div class="lg:hidden">
        <AppBottomBar />
      </div>
    </AppContent>
    <Toaster
      theme="dark"
      :offset="{ bottom: '32px', right: '24px' }"
      :mobile-offset="{ bottom: 'calc(var(--bottom-bar-height) + 8px)' }"
    />
  </AppShell>
</template>
