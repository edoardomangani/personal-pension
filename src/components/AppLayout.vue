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
      <!-- max-lg:hidden batte il flex della testata, che hidden da solo non batterebbe. -->
      <AppTopBar class="max-lg:hidden" />
      <div
        class="mx-auto flex w-full max-w-content flex-1 flex-col pb-[calc(var(--bottom-bar-height)+env(safe-area-inset-bottom))] lg:px-12 lg:pt-6 lg:pb-12"
      >
        <slot />
      </div>
      <div class="lg:hidden">
        <AppBottomBar />
      </div>
    </AppContent>
    <Toaster
      theme="dark"
      container-aria-label="Notifiche"
      :offset="{ bottom: '32px', right: '24px' }"
      :mobile-offset="{ bottom: 'calc(var(--bottom-bar-height) + 8px)' }"
    />
  </AppShell>
</template>
