<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBottomBar from '@/components/AppBottomBar.vue'
import AppContent from '@/components/AppContent.vue'
import AppMobileHeader from '@/components/AppMobileHeader.vue'
import AppShell from '@/components/AppShell.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopBar from '@/components/AppTopBar.vue'
import BannerOffline from '@/components/BannerOffline.vue'
import ErroreCaricamento from '@/components/ErroreCaricamento.vue'
import { Toaster } from '@/components/ui/sonner'
import { useAvvisoArchivio } from '@/composables/useAvvisoArchivio'
import { fornisciAzioneTestata } from '@/composables/useAzioneTestata'
import { useRete } from '@/composables/useRete'

fornisciAzioneTestata()
const { online } = useRete()
const { visibile: erroreVisibile, inCorso: riprovaInCorso, riprova } = useAvvisoArchivio()

const route = useRoute()
// Il pannello di destra è fisso: testata e contenuto finiscono dove comincia.
const classeContenuto = computed(() =>
  route.meta.pannello ? 'min-w-0 overflow-x-clip lg:pr-100' : 'min-w-0 overflow-x-clip',
)
</script>

<template>
  <!-- Sotto lg: testata sticky e barra in basso; da lg: sidebar e testata desktop. -->
  <AppShell>
    <div class="hidden shrink-0 lg:block">
      <AppSidebar />
    </div>
    <AppContent variant="sidebar" :class="classeContenuto">
      <AppMobileHeader class="lg:hidden" />
      <!-- max-lg:hidden batte il flex della testata, che hidden da solo non batterebbe. -->
      <AppTopBar class="max-lg:hidden" />
      <!-- Il padding sta fuori: il limite di 1180px vale per il contenuto dentro. -->
      <div
        data-contenuto
        class="flex flex-1 flex-col px-4 pt-3 pb-(--content-pad-bottom-mobile) lg:px-12 lg:pt-6 lg:pb-(--content-pad-bottom)"
      >
        <div class="mx-auto flex w-full max-w-content flex-1 flex-col">
          <!-- Sotto lg il banner sta nella testata mobile. -->
          <BannerOffline v-if="!online" class="mb-8 max-lg:hidden" />
          <!-- Solo online: non compare mai insieme al banner. -->
          <ErroreCaricamento
            v-if="erroreVisibile"
            class="mb-8"
            :in-corso="riprovaInCorso"
            @riprova="riprova"
          />
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
      :offset="{ bottom: 'var(--toast-offset-bottom)', right: 'var(--toast-offset-x)' }"
      :mobile-offset="{
        bottom: 'calc(var(--bottom-bar-height) + 20px)',
        left: '16px',
        right: '16px',
      }"
    />
  </AppShell>
</template>
