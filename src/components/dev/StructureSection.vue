<script setup lang="ts">
import {
  PhCaretUpDown,
  PhCoins,
  PhInfo,
  PhPiggyBank,
  PhReceipt,
  PhUser,
  PhWarning,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import { RouterLink } from 'vue-router'
import iconaApp from '../../../icons/apple-touch-icon.png'
import { formatoData, formatoEuro } from '@/calc/formato'
import MovementDaySample from '@/components/dev/MovementDaySample.vue'
import MovementRowSample from '@/components/dev/MovementRowSample.vue'
import PhoneFrame from '@/components/dev/PhoneFrame.vue'
import { useShowcaseDensity } from '@/components/dev/showcase'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const density = useShowcaseDensity()

// Un aspetto per tipo: il versamento è lime, la spesa resta bianca, la busta da versare è né l'uno né l'altro.
const movementRows = [
  {
    code: 'versamento',
    label: 'Versamento TFR',
    meta: 'Amundi Seconda Pensione',
    amount: `+${formatoEuro(53495)}`,
    icon: PhPiggyBank,
    tile: 'bg-brand-soft text-brand',
    ink: 'text-income',
  },
  {
    code: 'spesa',
    label: 'Spese del piano',
    meta: 'Commissioni annue',
    amount: formatoEuro(-1500),
    icon: PhCoins,
    tile: 'bg-secondary text-foreground',
    ink: 'text-foreground',
  },
  {
    code: 'busta',
    label: 'TFR di giugno',
    meta: 'Da versare',
    amount: formatoEuro(17780),
    icon: PhReceipt,
    tile: 'bg-transparent text-subtle-foreground shadow-tile-outline',
    ink: 'text-subtle-foreground',
  },
]

// Importi e date del seed; il totale del giorno è un valore letto, non una somma, e manca se ci sono solo buste.
const movementDays = [
  { day: formatoData('2026-07-17'), codes: ['busta'] },
  {
    day: formatoData('2026-07-09'),
    codes: ['versamento', 'spesa'],
    total: `+${formatoEuro(51995)}`,
  },
].map(({ codes, ...giorno }) => ({
  ...giorno,
  rows: movementRows.filter((row) => codes.includes(row.code)),
}))
</script>

<template>
  <ShowcaseSection id="struttura">
    <ShowcaseBlock id="struttura-card">
      <Specimen code="CRD-default">
        <Card class="w-80">
          <CardHeader>
            <CardTitle>Amundi Seconda Pensione</CardTitle>
            <CardDescription>Aggiornato oggi</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm">Modifica</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              Il valore è quello dell'ultimo estratto conto, già al netto delle spese.
            </p>
          </CardContent>
          <CardFooter class="gap-2">
            <Button size="sm">Salva</Button>
            <Button variant="outline" size="sm">Annulla</Button>
          </CardFooter>
        </Card>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-breadcrumb">
      <Specimen code="BRC-default">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink as-child>
                <RouterLink to="/">Panoramica</RouterLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Vetrina dei componenti</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-alert">
      <div class="grid gap-6 lg:grid-cols-2">
        <Specimen code="ALR-default">
          <Alert class="w-96 max-w-full">
            <PhInfo />
            <AlertTitle>Attenzione</AlertTitle>
            <AlertDescription>Le modifiche vengono salvate in automatico.</AlertDescription>
          </Alert>
        </Specimen>
        <Specimen code="ALR-destructive">
          <Alert variant="destructive" class="w-96 max-w-full">
            <PhWarningCircle />
            <AlertTitle>Qualcosa è andato storto.</AlertTitle>
            <AlertDescription>Controlla i campi evidenziati e riprova.</AlertDescription>
          </Alert>
        </Specimen>
        <Specimen code="ALR-warning">
          <Alert class="w-96 max-w-full [&>svg]:text-warning">
            <PhWarning />
            <AlertTitle class="line-clamp-none">
              Sei buste paga hanno il TFR ancora da versare
            </AlertTitle>
            <AlertDescription>
              Il fondo lo accredita a trimestri: controlla il prossimo estratto conto.
            </AlertDescription>
          </Alert>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-avatar">
      <div class="flex flex-wrap items-end gap-8">
        <Specimen code="AVT-image">
          <Avatar class="size-11">
            <AvatarImage :src="iconaApp" alt="Immagine" />
            <AvatarFallback><PhUser /></AvatarFallback>
          </Avatar>
        </Specimen>
        <Specimen code="AVT-initials-mobile" note="36px">
          <Avatar class="size-9">
            <AvatarFallback class="text-xs">EM</AvatarFallback>
          </Avatar>
        </Specimen>
        <Specimen code="AVT-initials-desktop" note="36px">
          <Avatar class="size-9">
            <AvatarFallback class="text-xs">EM</AvatarFallback>
          </Avatar>
        </Specimen>
        <Specimen code="AVT-icon">
          <Avatar class="size-10 rounded-xl">
            <AvatarFallback class="rounded-xl"><PhPiggyBank class="size-5" /></AvatarFallback>
          </Avatar>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-indicatori">
      <div class="flex flex-wrap items-end gap-10">
        <Specimen code="IND-skeleton-row">
          <div class="flex items-center gap-3">
            <Skeleton class="size-9 rounded-xl" />
            <div class="flex flex-col gap-2">
              <Skeleton class="h-3.5 w-40 rounded-full" />
              <Skeleton class="h-3.5 w-24 rounded-full" />
            </div>
          </div>
        </Specimen>
        <Specimen code="IND-skeleton-balance">
          <div class="flex flex-col gap-3">
            <Skeleton class="h-3.5 w-28 rounded-full" />
            <Skeleton class="h-14 w-56 rounded-xl" />
          </div>
        </Specimen>
        <Specimen code="IND-spinner">
          <Spinner class="text-muted-foreground" />
        </Specimen>
        <Specimen code="IND-spinner-label">
          <span class="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Caricamento
          </span>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-separatori">
      <div class="flex flex-wrap gap-10">
        <Specimen code="SEP-horizontal">
          <div class="flex w-64 flex-col gap-3 text-sm">
            <span>Orizzontale</span>
            <Separator />
          </div>
        </Specimen>
        <Specimen code="SEP-vertical">
          <div class="flex h-5 items-center gap-3 text-sm">
            <span>Versato</span>
            <Separator orientation="vertical" />
            <span>Crescita</span>
            <Separator orientation="vertical" />
            <span>Spese</span>
          </div>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-collapsible">
      <Specimen code="CLP-default">
        <Collapsible class="flex w-80 flex-col gap-2">
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm font-medium">Movimenti recenti</span>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="icon-sm" aria-label="Apri o chiudi">
                <PhCaretUpDown />
              </Button>
            </CollapsibleTrigger>
          </div>
          <div class="rounded-lg border-[0.75px] border-border px-3 py-2 text-sm">
            Versamento TFR
          </div>
          <CollapsibleContent class="flex flex-col gap-2">
            <div class="rounded-lg border-[0.75px] border-border px-3 py-2 text-sm">
              Spese del piano
            </div>
            <div class="rounded-lg border-[0.75px] border-border px-3 py-2 text-sm">
              Versamento personale
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="struttura-movimenti">
      <p class="text-xs text-subtle-foreground">
        Una card di vetro per giorno; il giorno e il suo totale stanno fuori, sopra la card.
      </p>
      <div class="flex flex-wrap items-start gap-8">
        <Specimen :code="`MOV-list-${density}`">
          <PhoneFrame v-if="density === 'mobile'" size="card">
            <div class="flex flex-col gap-6 p-4 pt-8">
              <MovementDaySample
                v-for="giorno in movementDays"
                :key="giorno.day"
                :rows="giorno.rows"
                :density="density"
                :day="giorno.day"
                :total="giorno.total"
              />
            </div>
          </PhoneFrame>
          <div v-else class="flex w-[420px] max-w-full flex-col gap-6">
            <MovementDaySample
              v-for="giorno in movementDays"
              :key="giorno.day"
              :rows="giorno.rows"
              :density="density"
              :day="giorno.day"
              :total="giorno.total"
            />
          </div>
        </Specimen>
        <div class="flex flex-col gap-4">
          <Specimen
            v-for="row in movementRows"
            :key="row.code"
            :code="`MOV-row-${density}-${row.code}`"
          >
            <MovementRowSample :row="row" :density="density" specimen />
          </Specimen>
        </div>
      </div>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
