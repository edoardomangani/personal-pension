<script setup lang="ts">
import { ref } from 'vue'
import DensityFrame from '@/components/dev/DensityFrame.vue'
import { useShowcaseDensity } from '@/components/dev/showcase'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import { insetPasswordClass } from '@/components/forms/inset'
import InsetChoiceRow from '@/components/forms/InsetChoiceRow.vue'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import InsetSwitchRow from '@/components/forms/InsetSwitchRow.vue'
import InsetTextareaRow from '@/components/forms/InsetTextareaRow.vue'
import PasswordInput from '@/components/PasswordInput.vue'

const density = useShowcaseDensity()

const busta = ref<string | null>('2026-09')
const volontario = ref(true)

const busteOptions = [
  { value: '2026-10', label: 'Ottobre 2026' },
  { value: '2026-09', label: 'Settembre 2026' },
  { value: '2026-08', label: 'Agosto 2026' },
]
</script>

<template>
  <ShowcaseSection id="form">
    <ShowcaseBlock id="form-righe">
      <p class="text-xs text-subtle-foreground">
        Etichetta a sinistra, valore a destra, una card di vetro per gruppo; un tocco ovunque sulla
        riga raggiunge il controllo.
      </p>
      <Specimen :code="`FRM-rows-${density}`">
        <DensityFrame>
          <InsetGroup title="Movimento" description="Gli importi contano dalla data sul fondo.">
            <InsetRow :for="`frm-${density}-fund`" label="Fondo">
              <InsetInput :id="`frm-${density}-fund`" default-value="Amundi Seconda Pensione" />
            </InsetRow>
            <InsetRow :for="`frm-${density}-amount`" label="Importo TFR">
              <InsetInput
                :id="`frm-${density}-amount`"
                inputmode="decimal"
                default-value="175,07"
              />
            </InsetRow>
            <InsetChoiceRow
              :id="`frm-${density}-payslip`"
              v-model="busta"
              label="Busta paga"
              :options="busteOptions"
            />
            <InsetRow :for="`frm-${density}-date`" label="Data sul fondo">
              <InsetInput :id="`frm-${density}-date`" type="date" default-value="2026-11-03" />
            </InsetRow>
            <InsetSwitchRow
              :id="`frm-${density}-voluntary`"
              v-model="volontario"
              label="Versamento volontario"
            />
          </InsetGroup>
        </DensityFrame>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="form-errore">
      <Specimen :code="`FRM-error-${density}`">
        <DensityFrame>
          <InsetGroup>
            <InsetRow
              :for="`frm-${density}-error-amount`"
              label="Importo TFR"
              error="Scrivi un importo maggiore di zero."
            >
              <InsetInput
                :id="`frm-${density}-error-amount`"
                inputmode="decimal"
                default-value="0,00"
                aria-invalid="true"
              />
            </InsetRow>
            <InsetRow :for="`frm-${density}-error-voluntary`" label="Volontario">
              <InsetInput
                :id="`frm-${density}-error-voluntary`"
                inputmode="decimal"
                default-value="50,00"
              />
            </InsetRow>
          </InsetGroup>
        </DensityFrame>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="form-accesso">
      <p class="text-xs text-subtle-foreground">
        Accesso, registrazione e password: righe senza etichetta visibile, con il nome per i lettori
        di schermo.
      </p>
      <Specimen :code="`FRM-credentials-${density}`">
        <DensityFrame>
          <InsetGroup>
            <InsetRow :for="`frm-${density}-email`" label="Indirizzo email" hide-label>
              <InsetInput
                :id="`frm-${density}-email`"
                type="email"
                align="left"
                placeholder="email@esempio.it"
              />
            </InsetRow>
            <InsetRow :for="`frm-${density}-password`" label="Password" hide-label>
              <PasswordInput
                :id="`frm-${density}-password`"
                :class="insetPasswordClass"
                placeholder="Password"
              />
            </InsetRow>
          </InsetGroup>
        </DensityFrame>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="form-note">
      <Specimen :code="`FRM-notes-${density}`">
        <DensityFrame>
          <InsetGroup>
            <InsetRow :for="`frm-${density}-notes-amount`" label="Volontario">
              <InsetInput
                :id="`frm-${density}-notes-amount`"
                inputmode="decimal"
                default-value="50,00"
              />
            </InsetRow>
            <InsetTextareaRow :id="`frm-${density}-notes`" label="Nota" />
          </InsetGroup>
        </DensityFrame>
      </Specimen>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
