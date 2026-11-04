<script setup lang="ts">
import {
  PhChartLineUp,
  PhGearSix,
  PhHourglassMedium,
  PhHouse,
  PhListBullets,
  PhPlus,
  PhReceipt,
  PhTrendUp,
} from '@phosphor-icons/vue'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import { Button } from '@/components/ui/button'
import { formatoEuro } from '@/calc/formato'

// Classi dei campioni scritte per intero, così Tailwind le genera.
const colorTokens = [
  { code: 'background', swatch: 'bg-background', value: '#060708' },
  { code: 'foreground', swatch: 'bg-foreground', value: '#f3f5f2' },
  { code: 'muted-foreground', swatch: 'bg-muted-foreground', value: '#b4b8b5' },
  { code: 'subtle-foreground', swatch: 'bg-subtle-foreground', value: '#9a9f9b' },
  { code: 'card', swatch: 'bg-card', value: 'rgba(255,255,255,.06)' },
  { code: 'secondary', swatch: 'bg-secondary', value: 'rgba(255,255,255,.09)' },
  { code: 'border-strong', swatch: 'bg-border-strong', value: 'rgba(255,255,255,.12)' },
  { code: 'border', swatch: 'bg-border', value: 'rgba(255,255,255,.08)' },
  { code: 'divider', swatch: 'bg-divider', value: 'rgba(255,255,255,.07)' },
  { code: 'popover', swatch: 'bg-popover', value: 'rgba(20,21,23,.92)' },
  { code: 'header', swatch: 'bg-header', value: 'rgba(6,7,8,.55)' },
  { code: 'bar', swatch: 'bg-bar', value: 'rgba(6,7,8,.72)' },
  { code: 'sidebar', swatch: 'bg-sidebar', value: 'rgba(6,7,8,.4)' },
  { code: 'primary', swatch: 'bg-primary', value: '#f3f5f2' },
  { code: 'brand', swatch: 'bg-brand', value: '#d4f53c' },
  { code: 'brand-soft', swatch: 'bg-brand-soft', value: 'rgba(212,245,60,.16)' },
  { code: 'ambient-strong', swatch: 'bg-ambient-strong', value: 'rgba(212,245,60,.15)' },
  { code: 'ambient-soft', swatch: 'bg-ambient-soft', value: 'rgba(212,245,60,.06)' },
  { code: 'destructive', swatch: 'bg-destructive', value: '#ff7a6b' },
  { code: 'warning', swatch: 'bg-warning', value: '#ffc457' },
]

const radii = [
  { code: 'sm', radius: 'rounded-sm', value: '6px' },
  { code: 'md', radius: 'rounded-md', value: '8px' },
  { code: 'lg', radius: 'rounded-lg', value: '10px' },
  { code: 'xl', radius: 'rounded-xl', value: '14px' },
  { code: '2xl', radius: 'rounded-2xl', value: '18px' },
  { code: '3xl', radius: 'rounded-3xl', value: '22px' },
  { code: 'card-mobile', radius: 'rounded-[24px]', value: '24px' },
  { code: 'full', radius: 'rounded-full', value: '999px' },
]

// Ruoli sulla scala standard di Tailwind, uguali su telefono e desktop.
const typeScale = [
  {
    code: 'display',
    type: 'text-2xl leading-[1.15] font-medium tracking-[-0.02em]',
    spec: 'text-2xl · 24 / 500',
  },
  { code: 'title', type: 'text-xl font-semibold tracking-[-0.015em]', spec: 'text-xl · 20 / 600' },
  {
    code: 'section',
    type: 'text-lg font-semibold tracking-[-0.01em]',
    spec: 'text-lg · 18 / 600',
  },
  { code: 'heading', type: 'text-base font-semibold', spec: 'text-base · 16 / 600' },
  { code: 'body', type: 'text-sm', spec: 'text-sm · 14 / 400' },
  { code: 'amount', type: 'text-sm font-semibold', spec: 'text-sm · 14 / 600' },
  { code: 'meta', type: 'text-xs text-subtle-foreground', spec: 'text-xs · 12 / 400' },
  { code: 'label', type: 'text-xs font-semibold', spec: 'text-xs · 12 / 600' },
]

const iconWeights = ['regular', 'fill', 'bold'] as const

const icons = [PhHouse, PhListBullets, PhTrendUp, PhChartLineUp, PhReceipt, PhGearSix, PhPlus]

const spacings = [
  { code: '1', bar: 'w-1', value: '4px' },
  { code: '2', bar: 'w-2', value: '8px' },
  { code: '2.5', bar: 'w-2.5', value: '10px' },
  { code: '3', bar: 'w-3', value: '12px' },
  { code: '4', bar: 'w-4', value: '16px' },
  { code: '5', bar: 'w-5', value: '20px' },
  { code: '6', bar: 'w-6', value: '24px' },
  { code: '8', bar: 'w-8', value: '32px' },
  { code: '9', bar: 'w-9', value: '36px' },
]

const ruoloIcona = {
  regular: 'Ovunque',
  fill: 'Solo la voce di navigazione attiva',
  bold: 'Solo il «+»',
} as const

// Importi del seed al 3 novembre 2026.
const valore = formatoEuro(164145)
const [valoreIntero, valoreDecimali] = valore.split(',')
const versato = formatoEuro(159191)
const [versatoIntero, versatoDecimali] = versato.split(',')
const crescita = formatoEuro(4954)
const daVersare = formatoEuro(106724)
const spese = formatoEuro(-1500)
</script>

<template>
  <ShowcaseSection id="fondamenta">
    <ShowcaseBlock id="fondamenta-colori">
      <p class="text-xs text-subtle-foreground">
        Tre gradini di vetro (6, 9 e 12%), tre inchiostri pieni, il bianco per le azioni e il lime
        solo per le cifre positive e il bagliore.
      </p>
      <div class="grid grid-cols-2 gap-5 sm:grid-cols-4 xl:grid-cols-5">
        <Specimen
          v-for="token in colorTokens"
          :key="token.code"
          :code="`CLR-${token.code}`"
          :note="token.value"
        >
          <span
            class="size-12 rounded-xl border-[0.75px] border-border-strong"
            :class="token.swatch"
          />
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-ruoli">
      <div class="flex flex-wrap items-end gap-8">
        <Specimen code="ACC-income-amount" note="Cifre positive: la crescita">
          <span class="text-sm font-semibold text-income">+{{ crescita }}</span>
        </Specimen>
        <Specimen code="ACC-income-tile" note="Tile della crescita">
          <span class="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
            <PhTrendUp class="size-[18px]" />
          </span>
        </Specimen>
        <Specimen code="ACC-forecast" note="Cifre positive: il versato">
          <span class="flex items-baseline gap-2 text-sm text-muted-foreground">
            Versato
            <strong class="text-base font-semibold text-brand">{{ versato }}</strong>
          </span>
        </Specimen>
        <Specimen code="ACC-future-line" note="Gli anni della proiezione">
          <span class="flex w-48 items-center">
            <span class="h-0.5 w-20 rounded-full bg-foreground/32" />
            <span class="size-3 shrink-0 rounded-full bg-foreground shadow-cutout" />
            <span
              class="h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,var(--brand)_0_4px,transparent_4px_8px)]"
            />
            <span class="size-2.5 shrink-0 rounded-full bg-brand shadow-cutout" />
          </span>
        </Specimen>
        <Specimen code="ACC-action" note="Le azioni sono bianche">
          <Button>Conferma</Button>
        </Specimen>
        <Specimen code="ACC-focus-ring" note="Anello del focus bianco">
          <Button variant="outline" class="outline-2 outline-offset-2 outline-ring outline-solid"
            >Focus</Button
          >
        </Specimen>
        <Specimen code="ACC-transfer-amount" note="Il TFR da versare non è lime">
          <span class="flex items-center gap-2 text-sm font-semibold text-subtle-foreground">
            <PhHourglassMedium class="size-[18px]" />
            {{ daVersare }}
          </span>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-tipografia">
      <div class="flex flex-col gap-4">
        <Specimen
          v-for="step in typeScale"
          :key="step.code"
          :code="`TYP-${step.code}`"
          :note="step.spec"
        >
          <span :class="step.type">Valore della posizione</span>
        </Specimen>
      </div>
      <p class="text-xs text-subtle-foreground">
        L'etichetta da 10px della barra in basso è l'unico testo sotto i 12px: vedi la sezione
        Shell.
      </p>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-raggi">
      <div class="flex flex-wrap gap-6">
        <Specimen
          v-for="radius in radii"
          :key="radius.code"
          :code="`RAD-${radius.code}`"
          :note="radius.value"
        >
          <span
            class="size-14 border-[0.75px] border-border bg-card shadow-glass"
            :class="radius.radius"
          />
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-spaziature">
      <div class="flex flex-wrap items-end gap-6">
        <Specimen
          v-for="spacing in spacings"
          :key="spacing.code"
          :code="`SPC-${spacing.code}`"
          :note="spacing.value"
        >
          <span class="h-8 rounded-sm bg-secondary" :class="spacing.bar" />
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-icone">
      <div class="flex flex-col gap-5">
        <Specimen
          v-for="weight in iconWeights"
          :key="weight"
          :code="`ICN-${weight}`"
          :note="ruoloIcona[weight]"
        >
          <span class="flex items-center gap-4">
            <component
              :is="icon"
              v-for="(icon, index) in icons"
              :key="index"
              :weight="weight"
              class="size-6"
            />
          </span>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="fondamenta-importi">
      <div class="flex flex-wrap items-end gap-10">
        <Specimen code="AMT-balance-mobile" note="56 / 26">
          <p class="flex items-baseline text-balance-md">
            {{ valoreIntero
            }}<span class="text-balance-md-decimals text-subtle-foreground"
              >,{{ valoreDecimali }}</span
            >
          </p>
        </Specimen>
        <Specimen code="AMT-balance-desktop" note="76 / 32">
          <p class="flex items-baseline text-balance-lg">
            {{ valoreIntero
            }}<span class="text-balance-lg-decimals text-subtle-foreground"
              >,{{ valoreDecimali }}</span
            >
          </p>
        </Specimen>
        <Specimen code="AMT-account" note="20 / 14">
          <span class="text-xl leading-[1.1] font-semibold tracking-[-0.03em]"
            >{{ versatoIntero
            }}<span class="text-sm tracking-normal text-subtle-foreground"
              >,{{ versatoDecimali }}</span
            ></span
          >
        </Specimen>
        <Specimen code="AMT-row-expense" note="14 / 600 · spese">
          <span class="text-sm font-semibold">{{ spese }}</span>
        </Specimen>
        <Specimen code="AMT-row-income" note="14 / 600 · crescita">
          <span class="text-sm font-semibold text-income">+{{ crescita }}</span>
        </Specimen>
        <Specimen code="AMT-hidden" note="Importi nascosti">
          <span class="text-sm font-semibold">•••• €</span>
        </Specimen>
      </div>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
