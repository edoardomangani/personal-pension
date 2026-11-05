<script setup lang="ts">
import { PhCamera, PhKey } from '@phosphor-icons/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { formatoDataBreve } from '@/calc/formato'
import { validaNome, type BozzaNome } from '@/calc/validaAccesso'
import GruppoAccount from '@/components/account/GruppoAccount.vue'
import ModuloCambiaPassword from '@/components/account/ModuloCambiaPassword.vue'
import ModuloCancellaAccount from '@/components/account/ModuloCancellaAccount.vue'
import RigheLettura from '@/components/account/RigheLettura.vue'
import type { RigaLettura } from '@/components/account/righe'
import RiquadroCancella from '@/components/account/RiquadroCancella.vue'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import { insetRowClass } from '@/components/forms/inset'
import FotoProfiloSheet from '@/components/FotoProfiloSheet.vue'
import ResponsiveSheet from '@/components/ResponsiveSheet.vue'
import AvatarUtente from '@/components/AvatarUtente.vue'
import { Button } from '@/components/ui/button'
import { registraAzioneTestata } from '@/composables/useAzioneTestata'
import { useIsDesktop } from '@/composables/useIsDesktop'
import { useModulo } from '@/composables/useModulo'
import { useProfilo } from '@/composables/useProfilo'
import { useSessioneStore } from '@/stores/sessione'

const ID_NOME = 'account-nome'
const VUOTO = '—'

const sessione = useSessioneStore()
const isDesktop = useIsDesktop()
const { rigaPrincipale, emailSecondaria, iniziali, foto } = useProfilo()

// Dopo la cancellazione lo store è vuoto prima che la rotta cambi: tutto regge `utente` null.
const email = computed(() => sessione.utente?.email ?? '')
const nomeSalvato = computed(() => sessione.utente?.nome ?? '')

const bozza = reactive<BozzaNome>({ nome: nomeSalvato.value })
watch(nomeSalvato, (nome) => (bozza.nome = nome))

const modificato = computed(() => bozza.nome.trim() !== nomeSalvato.value)

const {
  errori,
  erroreGenerale,
  inCorso,
  invia: inviaNome,
} = useModulo({
  bozza: () => bozza,
  valida: validaNome,
  invia: async ({ nome }) => {
    await sessione.aggiornaNome(nome)
    toast.success('Nome aggiornato')
  },
  // Sessione scaduta: lo store fa uscire e si torna all'accesso, niente toast.
  gestisci: async (errore) => errore.tipo === 'sessione',
})

async function salvaNome(): Promise<void> {
  if (!modificato.value) return
  if (await inviaNome()) return
  if (erroreGenerale.value !== null) toast.error(erroreGenerale.value)
  else if (errori.value.nome !== undefined) document.getElementById(ID_NOME)?.focus()
}

registraAzioneTestata(() => ({
  etichetta: 'Salva',
  attiva: modificato.value,
  inCorso: inCorso.value,
  modificato: modificato.value,
  esegui: () => void salvaNome(),
}))

const righeAccount = computed<RigaLettura[]>(() => [
  { etichetta: 'Registrato', valore: formatoDataBreve(sessione.utente?.registratoIl ?? null) },
  {
    etichetta: 'Email',
    valore: sessione.utente?.emailVerificata ? 'Verificata' : 'Da verificare',
  },
])

// Senza metodi caricati le righe restano generiche e «Cambia password» c'è (§ Corner case).
const conPassword = computed(() => sessione.metodi?.password !== false)

const righeAccesso = computed<RigaLettura[]>(() => {
  const metodi = sessione.metodi
  const password: RigaLettura = {
    etichetta: 'Password',
    valore: metodi === null ? VUOTO : metodi.password ? 'Impostata' : 'Non impostata',
  }
  const google: RigaLettura = {
    etichetta: 'Google',
    valore: metodi === null ? VUOTO : metodi.google ? 'Collegato' : 'Non collegato',
  }
  // Prima il metodo con cui si entra: per un account solo Google, Google.
  return conPassword.value ? [password, google] : [google, password]
})

const passwordAperto = ref(false)
const cancellaAperto = ref(false)
const fotoAperta = ref(false)
</script>

<template>
  <div class="flex w-full max-w-140 flex-col gap-6">
    <form novalidate @submit.prevent="salvaNome">
      <InsetGroup title="Dati">
        <InsetRow :for="ID_NOME" label="Nome" :error="errori.nome">
          <InsetInput
            :id="ID_NOME"
            v-model="bozza.nome"
            autocomplete="name"
            enterkeyhint="done"
            placeholder="Nome e cognome"
            :aria-invalid="errori.nome ? true : undefined"
            @keydown.enter.prevent="salvaNome"
          />
        </InsetRow>
        <div :class="[insetRowClass, 'flex min-h-12 items-center gap-3 px-4 text-sm']">
          <span class="shrink-0">Email</span>
          <span class="min-w-0 flex-1 truncate text-right text-muted-foreground">{{ email }}</span>
        </div>
      </InsetGroup>
    </form>

    <template v-if="!isDesktop">
      <GruppoAccount titolo="Account">
        <RigheLettura :righe="righeAccount" />
      </GruppoAccount>
      <GruppoAccount titolo="Accesso">
        <RigheLettura :righe="righeAccesso" />
      </GruppoAccount>
      <Button
        v-if="conPassword"
        type="button"
        variant="outline"
        class="w-full"
        @click="passwordAperto = true"
      >
        <PhKey />
        Cambia password
      </Button>
      <RiquadroCancella @cancella="cancellaAperto = true" />
    </template>
  </div>

  <aside
    v-if="isDesktop"
    aria-label="Il tuo account"
    class="fixed inset-y-0 right-0 z-20 flex w-100 flex-col overflow-y-auto border-l-[0.75px] border-sidebar-border bg-sidebar"
    data-pannello
  >
    <div class="flex items-center gap-3 px-6 pt-7">
      <AvatarUtente :foto="foto" :iniziali="iniziali" class="size-9" />
      <div class="min-w-0">
        <p class="truncate text-base font-semibold">{{ rigaPrincipale }}</p>
        <p v-if="emailSecondaria" class="truncate text-xs text-subtle-foreground">
          {{ emailSecondaria }}
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-6 px-6 pt-5 pb-6">
      <div :class="['grid gap-2', conPassword ? 'grid-cols-2' : 'grid-cols-1']">
        <Button type="button" variant="outline" class="w-full" @click="fotoAperta = true">
          <PhCamera />
          Cambia foto
        </Button>
        <Button
          v-if="conPassword"
          type="button"
          variant="outline"
          class="w-full"
          @click="passwordAperto = true"
        >
          <PhKey />
          Cambia password
        </Button>
      </div>
      <GruppoAccount titolo="Account">
        <RigheLettura :righe="righeAccount" />
      </GruppoAccount>
      <GruppoAccount titolo="Accesso">
        <RigheLettura :righe="righeAccesso" />
      </GruppoAccount>
      <RiquadroCancella @cancella="cancellaAperto = true" />
    </div>
  </aside>

  <ResponsiveSheet v-model:open="passwordAperto" title="Cambia password">
    <ModuloCambiaPassword @chiudi="passwordAperto = false" />
  </ResponsiveSheet>
  <ResponsiveSheet v-model:open="cancellaAperto" title="Cancellare l'account?">
    <ModuloCancellaAccount :con-password="conPassword" @chiudi="cancellaAperto = false" />
  </ResponsiveSheet>
  <FotoProfiloSheet v-model:open="fotoAperta" />
</template>
