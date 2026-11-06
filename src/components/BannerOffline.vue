<script setup lang="ts">
import { PhWifiSlash } from '@phosphor-icons/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
</script>

<template>
  <!-- Annuncio cortese: il role passato qui batte il role="alert" di Alert. -->
  <Alert role="status">
    <PhWifiSlash />
    <AlertTitle class="font-medium">Sei offline</AlertTitle>
    <AlertDescription>I dati si aggiornano quando torna la rete.</AlertDescription>
  </Alert>
</template>
