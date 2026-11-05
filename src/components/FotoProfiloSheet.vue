<script setup lang="ts">
import ModuloFoto from '@/components/account/ModuloFoto.vue'
import ResponsiveSheet from '@/components/ResponsiveSheet.vue'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <!-- R25: aperto da «Cambia foto» in «Profilo» e nel pannello di Account. -->
  <ResponsiveSheet v-model:open="open" title="Foto del profilo">
    <ModuloFoto @chiudi="open = false" />
  </ResponsiveSheet>
</template>
