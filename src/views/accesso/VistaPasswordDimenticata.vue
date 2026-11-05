<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ModuloRichiestaReset from '@/components/ModuloRichiestaReset.vue'
</script>

<template>
  <ModuloRichiestaReset
    titolo="Password dimenticata"
    descrizione="Inserisci la tua email: ti mandiamo un link per sceglierne una nuova"
    invio="Mandami il link"
    avviso-titolo="Controlla la posta"
    avviso-testo="Se l'indirizzo ha un account, ti abbiamo mandato un link per scegliere una nuova password."
  >
    <p class="text-center text-sm text-muted-foreground">
      Oppure torna alla
      <RouterLink to="/accedi" class="text-foreground underline underline-offset-4">
        pagina di accesso
      </RouterLink>
    </p>
  </ModuloRichiestaReset>
</template>
