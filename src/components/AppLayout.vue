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
      <!-- Il padding sta fuori: il limite di 1180px vale per il contenuto dentro. -->
      <div
        data-contenuto
        class="flex flex-1 flex-col px-4 pt-3 pb-[calc(var(--bottom-bar-height)+(--spacing(9))+env(safe-area-inset-bottom))] lg:px-12 lg:pt-6 lg:pb-(--content-pad-bottom)"
      >
        <div class="mx-auto flex w-full max-w-content flex-1 flex-col">
          <slot />
        </div>
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
