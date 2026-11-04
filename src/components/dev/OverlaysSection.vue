<script setup lang="ts">
import { PhCaretDown, PhExport, PhGear, PhInfo, PhSignOut } from '@phosphor-icons/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import DrawerPreview from '@/components/dev/DrawerPreview.vue'
import PhoneFrame from '@/components/dev/PhoneFrame.vue'
import SheetSampleBody from '@/components/dev/SheetSampleBody.vue'
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import InsetChoiceRow from '@/components/forms/InsetChoiceRow.vue'
import InsetGroup from '@/components/forms/InsetGroup.vue'
import InsetInput from '@/components/forms/InsetInput.vue'
import InsetRow from '@/components/forms/InsetRow.vue'
import ResponsiveSheet from '@/components/ResponsiveSheet.vue'
import ResponsiveSheetHeader from '@/components/ResponsiveSheetHeader.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const sheetSides = ['right', 'left', 'bottom'] as const

const showPaid = ref(false)

const sheetSamples = [
  { code: 'confirm', title: 'Conferma versamento', description: null, trigger: 'Apri la conferma' },
  {
    code: 'form',
    title: 'Modifica movimento',
    description: 'Le modifiche valgono da oggi.',
    trigger: 'Apri il modulo',
  },
  {
    code: 'long',
    title: 'Tutte le buste paga',
    description: null,
    trigger: "Apri l'elenco lungo",
  },
] as const

const isEditStatementOpen = ref(false)
const isDestructiveDialogOpen = ref(false)
const statementFund = ref<string | null>('amundi')
const fundOptions = [{ value: 'amundi', label: 'Amundi Seconda Pensione' }]

const openSheet = ref<Record<string, boolean>>({
  confirm: false,
  form: false,
  long: false,
})

function sheetTrigger(side: (typeof sheetSides)[number]): string {
  return { right: 'Apri a destra', left: 'Apri a sinistra', bottom: 'Apri dal basso' }[side]
}
</script>

<template>
  <ShowcaseSection id="overlay">
    <ShowcaseBlock id="overlay-menu">
      <Specimen code="MNU-account">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              Apri il menu
              <PhCaretDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56" align="start">
            <DropdownMenuLabel>Il mio piano</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <PhGear />
                Impostazioni
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PhExport />
                Esporta i dati
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Disattivato</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem v-model="showPaid">
              Mostra le buste versate
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <PhSignOut />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-tooltip">
      <Specimen code="TIP-default">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="outline" size="icon" aria-label="Altre informazioni">
              <PhInfo />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Gli importi sono in euro.</TooltipContent>
        </Tooltip>
      </Specimen>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-dialog">
      <p class="text-xs text-subtle-foreground">
        Ogni dialog ha il titolo a sinistra e la ✕ a destra, anche su telefono; sotto lg solo i
        dialog responsive diventano un pannello dal basso, con la sua testata.
      </p>
      <div class="flex flex-wrap gap-6">
        <Specimen code="DLG-destructive">
          <Dialog v-model:open="isDestructiveDialogOpen">
            <DialogTrigger as-child>
              <Button variant="outline">Apri la finestra</Button>
            </DialogTrigger>
            <DialogContent :show-close-button="false" class="pt-4">
              <ResponsiveSheetHeader layout="dialog" @close="isDestructiveDialogOpen = false">
                <template #title>
                  <DialogTitle class="truncate text-base font-semibold">
                    Elimina il movimento
                  </DialogTitle>
                </template>
              </ResponsiveSheetHeader>
              <DialogDescription>L'azione non si può annullare.</DialogDescription>
              <DialogFooter class="gap-2">
                <DialogClose as-child>
                  <Button variant="secondary">Annulla</Button>
                </DialogClose>
                <DialogClose as-child>
                  <Button variant="destructive">Elimina</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Specimen>
        <Specimen code="DLG-form">
          <Button variant="outline" @click="isEditStatementOpen = true">
            Modifica estratto conto
          </Button>
          <ResponsiveSheet v-model:open="isEditStatementOpen" title="Modifica estratto conto">
            <form id="dlg-form-sample" @submit.prevent="isEditStatementOpen = false">
              <InsetGroup description="Il valore aggiorna crescita e rendimento.">
                <InsetRow for="dlg-form-date" label="Data">
                  <InsetInput id="dlg-form-date" type="date" default-value="2026-11-03" />
                </InsetRow>
                <InsetRow for="dlg-form-value" label="Valore">
                  <InsetInput id="dlg-form-value" inputmode="decimal" default-value="1.641,45" />
                </InsetRow>
                <InsetChoiceRow
                  id="dlg-form-fund"
                  v-model="statementFund"
                  label="Fondo"
                  :options="fundOptions"
                />
              </InsetGroup>
            </form>
            <template #footer>
              <Button type="submit" form="dlg-form-sample" size="lg" class="w-full">
                Salva modifiche
              </Button>
            </template>
          </ResponsiveSheet>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-sheet">
      <div class="flex flex-wrap gap-6">
        <Specimen v-for="side in sheetSides" :key="side" :code="`SHT-${side}`">
          <Sheet>
            <SheetTrigger as-child>
              <Button variant="outline">{{ sheetTrigger(side) }}</Button>
            </SheetTrigger>
            <SheetContent :side="side">
              <SheetHeader>
                <SheetTitle>Dettagli del movimento</SheetTitle>
                <SheetDescription>Controlla il movimento prima di salvarlo.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-drawer">
      <p class="text-xs text-subtle-foreground">
        Stato aperto statico in un telefono da 390px: il pannello vero si apre sulla pagina, usa i
        bottoni del blocco Pannello adattivo a larghezza telefono.
      </p>
      <div class="flex flex-wrap gap-6">
        <Specimen
          v-for="sample in sheetSamples"
          :key="sample.code"
          :code="`DRW-${sample.code}-mobile`"
        >
          <PhoneFrame>
            <DrawerPreview :kind="sample.code" :title="sample.title" />
          </PhoneFrame>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-toast">
      <div class="flex flex-wrap gap-6">
        <Specimen code="TST-success">
          <Button variant="outline" @click="toast.success('Modifiche salvate.')">
            Mostra conferma
          </Button>
        </Specimen>
        <Specimen code="TST-error">
          <Button variant="outline" @click="toast.error('Qualcosa è andato storto.')">
            Mostra errore
          </Button>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="overlay-sheet-responsive">
      <p class="text-xs text-subtle-foreground">
        Sotto lg si apre come pannello dal basso, da lg come dialog centrato: ridimensiona la
        finestra per vederli entrambi.
      </p>
      <div class="flex flex-wrap gap-6">
        <Specimen
          v-for="sample in sheetSamples"
          :key="sample.code"
          :code="`SHT-responsive-${sample.code}`"
        >
          <Button variant="outline" @click="openSheet[sample.code] = true">
            {{ sample.trigger }}
          </Button>
          <ResponsiveSheet
            v-model:open="openSheet[sample.code]"
            :title="sample.title"
            :description="sample.description ?? undefined"
          >
            <template v-if="sample.code === 'form'" #action>
              <Button @click="openSheet[sample.code] = false">Salva</Button>
            </template>
            <SheetSampleBody :kind="sample.code" @done="openSheet[sample.code] = false" />
          </ResponsiveSheet>
        </Specimen>
      </div>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
