<script setup lang="ts">
import {
  PhArrowRight,
  PhBriefcase,
  PhHourglass,
  PhPencilSimple,
  PhPlus,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import NewMovementButton from '@/components/NewMovementButton.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const buttonVariants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const

const badgeVariants = ['default', 'secondary', 'outline', 'destructive', 'warning'] as const

// Stesse misure su mobile e desktop: la regola dipende dal contesto, non dal dispositivo.
const buttonSizes = [
  { code: 'sm', size: 'sm', icon: 'icon-sm', rule: '32px: solo in righe e card' },
  {
    code: 'default',
    size: 'default',
    icon: 'icon',
    rule: '36px: ogni bottone normale e ogni bottone a icona',
  },
  {
    code: 'lg',
    size: 'lg',
    icon: 'icon-lg',
    rule: '40px: CTA a tutta larghezza in fondo a uno sheet o a un modulo, stati vuoti',
  },
] as const
</script>

<template>
  <ShowcaseSection id="azioni">
    <ShowcaseBlock id="azioni-bottoni">
      <div class="flex flex-wrap items-end gap-6">
        <Specimen v-for="variant in buttonVariants" :key="variant" :code="`BTN-${variant}`">
          <Button :variant="variant">Salva movimento</Button>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="azioni-bottoni-misure">
      <p class="text-xs text-subtle-foreground">
        Sotto i 44px, sui touch screen i bottoni hanno un'area di tocco invisibile da 44px. Il «+»
        della barra in basso è l'unico bottone da 48px.
      </p>
      <div class="flex flex-col gap-5">
        <div
          v-for="buttonSize in buttonSizes"
          :key="buttonSize.code"
          class="flex flex-wrap items-start gap-6"
        >
          <Specimen :code="`BTN-size-${buttonSize.code}`" :note="buttonSize.rule">
            <Button :size="buttonSize.size">Salva movimento</Button>
          </Specimen>
          <Specimen :code="`BTN-icon-${buttonSize.code}`">
            <Button variant="outline" :size="buttonSize.icon" aria-label="Modifica">
              <PhPencilSimple />
            </Button>
          </Specimen>
        </div>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="azioni-bottoni-stati">
      <div class="flex flex-col gap-6">
        <div
          v-for="variant in buttonVariants"
          :key="variant"
          class="flex flex-wrap items-start gap-6"
        >
          <Specimen :code="`BTN-${variant}-disabled`">
            <Button :variant="variant" disabled>Salva movimento</Button>
          </Specimen>
          <Specimen :code="`BTN-${variant}-loading`">
            <Button :variant="variant" disabled>
              <Spinner />
              Salvataggio
            </Button>
          </Specimen>
          <Specimen :code="`BTN-${variant}-icon`">
            <Button :variant="variant" size="icon" aria-label="Modifica">
              <PhPencilSimple />
            </Button>
          </Specimen>
          <Specimen :code="`BTN-${variant}-icon-left`">
            <Button :variant="variant">
              <PhPlus />
              Aggiungi busta paga
            </Button>
          </Specimen>
          <Specimen :code="`BTN-${variant}-icon-right`">
            <Button :variant="variant">
              Tutti i movimenti
              <PhArrowRight />
            </Button>
          </Specimen>
        </div>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="azioni-badge">
      <div class="flex flex-wrap items-end gap-6">
        <Specimen v-for="variant in badgeVariants" :key="variant" :code="`BDG-${variant}`">
          <Badge :variant="variant">Versata</Badge>
        </Specimen>
        <Specimen code="BDG-count" note="Contatore">
          <Badge>5</Badge>
        </Specimen>
      </div>
      <p class="text-xs text-subtle-foreground">
        Con un'icona Phosphor da 12px prima del testo, a 4px. Tipi di riga: Briefcase per il TFR;
        stati: Hourglass, WarningCircle.
      </p>
      <div class="flex flex-wrap items-end gap-6">
        <Specimen code="BDG-outline-icon">
          <Badge variant="outline">
            <PhBriefcase />
            TFR
          </Badge>
        </Specimen>
        <Specimen code="BDG-warning-icon">
          <Badge variant="warning">
            <PhWarningCircle />
            Importo da verificare
          </Badge>
        </Specimen>
        <Specimen code="BDG-secondary-icon">
          <Badge variant="secondary">
            <PhHourglass />
            Da versare
          </Badge>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="azioni-nuovo-movimento">
      <p class="text-xs text-subtle-foreground">
        Già al suo posto ma disattivato finché il flusso non esiste: il suggerimento dice che è in
        arrivo.
      </p>
      <div class="flex flex-wrap items-end gap-8">
        <Specimen code="BTN-new-movement-desktop" note="Sidebar desktop">
          <NewMovementButton testo="Registra" />
        </Specimen>
        <Specimen code="BTN-new-movement-mobile" note="Barra in basso mobile">
          <NewMovementButton variant="round" />
        </Specimen>
      </div>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
