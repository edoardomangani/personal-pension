<script setup lang="ts">
import { PhArrowClockwise, PhWarningCircle } from '@phosphor-icons/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    titolo?: string
    descrizione?: string
    /** Un caricamento è in corso: Riprova resta spento. */
    inCorso?: boolean
  }>(),
  {
    titolo: 'Non riesco a caricare i dati',
    descrizione: 'Controlla la connessione e riprova.',
    inCorso: false,
  },
)

const emit = defineEmits<{ riprova: [] }>()
</script>

<template>
  <Alert variant="destructive">
    <PhWarningCircle />
    <!-- Testo e Riprova in un solo figlio della colonna del testo: l'icona resta in alto. -->
    <div class="col-start-2 flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <AlertTitle class="font-medium">{{ titolo }}</AlertTitle>
        <AlertDescription>{{ descrizione }}</AlertDescription>
      </div>
      <Button variant="outline" size="sm" :disabled="inCorso" @click="emit('riprova')">
        <PhArrowClockwise />
        Riprova
      </Button>
    </div>
  </Alert>
</template>
