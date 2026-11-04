<script setup lang="ts">
import ShowcaseBlock from '@/components/dev/ShowcaseBlock.vue'
import ShowcaseSection from '@/components/dev/ShowcaseSection.vue'
import Specimen from '@/components/dev/Specimen.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fieldStates = [
  { code: 'empty', value: '', invalid: false, disabled: false },
  { code: 'filled', value: 'Amundi Seconda Pensione', invalid: false, disabled: false },
  { code: 'error', value: 'Amundi Seconda Pensione', invalid: true, disabled: false },
  { code: 'disabled', value: 'Amundi Seconda Pensione', invalid: false, disabled: true },
]

const selectStates = [
  { code: 'empty', invalid: false, disabled: false },
  { code: 'error', invalid: true, disabled: false },
  { code: 'disabled', invalid: false, disabled: true },
]

const checkboxStates = [
  { code: 'unchecked', checked: false, invalid: false, disabled: false },
  { code: 'checked', checked: true, invalid: false, disabled: false },
  { code: 'error', checked: false, invalid: true, disabled: false },
  { code: 'disabled', checked: false, invalid: false, disabled: true },
]
</script>

<template>
  <ShowcaseSection id="campi">
    <ShowcaseBlock id="campi-label">
      <div class="flex flex-wrap gap-8">
        <Specimen code="LBL-default">
          <div class="grid w-64 gap-2">
            <Label for="showcase-label">Email</Label>
            <Input id="showcase-label" type="email" />
          </div>
        </Specimen>
        <Specimen code="LBL-disabled">
          <div class="group grid w-64 gap-2" data-disabled="true">
            <Label for="showcase-label-disabled">Email</Label>
            <Input id="showcase-label-disabled" type="email" disabled />
          </div>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="campi-testo-stati">
      <div class="grid gap-6 sm:grid-cols-2">
        <Specimen v-for="state in fieldStates" :key="state.code" :code="`INP-text-${state.code}`">
          <Field class="w-72" :data-invalid="state.invalid || undefined">
            <FieldLabel :for="`showcase-input-${state.code}`">Fondo</FieldLabel>
            <Input
              :id="`showcase-input-${state.code}`"
              :default-value="state.value"
              placeholder="Per esempio, Amundi Seconda Pensione"
              :disabled="state.disabled"
              :aria-invalid="state.invalid || undefined"
            />
            <FieldError v-if="state.invalid" :errors="['Il nome è già in uso.']" />
          </Field>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="campi-select">
      <div class="grid gap-6 sm:grid-cols-2">
        <Specimen v-for="state in selectStates" :key="state.code" :code="`SEL-${state.code}`">
          <Field class="w-72" :data-invalid="state.invalid || undefined">
            <FieldLabel :for="`showcase-select-${state.code}`">Busta paga</FieldLabel>
            <Select :disabled="state.disabled">
              <SelectTrigger
                :id="`showcase-select-${state.code}`"
                :aria-invalid="state.invalid || undefined"
                class="w-full"
              >
                <SelectValue placeholder="Scegli una busta paga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-10">Ottobre 2026</SelectItem>
                <SelectItem value="2026-09">Settembre 2026</SelectItem>
                <SelectItem value="2026-08">Agosto 2026</SelectItem>
              </SelectContent>
            </Select>
            <FieldError v-if="state.invalid" :errors="['Scegli una busta paga.']" />
          </Field>
        </Specimen>
      </div>
    </ShowcaseBlock>

    <ShowcaseBlock id="campi-checkbox">
      <div class="flex flex-wrap gap-8">
        <Specimen v-for="state in checkboxStates" :key="state.code" :code="`CHK-${state.code}`">
          <Field orientation="horizontal" :data-invalid="state.invalid || undefined">
            <Checkbox
              :id="`showcase-checkbox-${state.code}`"
              :default-value="state.checked"
              :disabled="state.disabled"
              :aria-invalid="state.invalid || undefined"
            />
            <FieldLabel :for="`showcase-checkbox-${state.code}`">Ricordami</FieldLabel>
          </Field>
        </Specimen>
      </div>
    </ShowcaseBlock>
  </ShowcaseSection>
</template>
