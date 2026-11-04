<script setup lang="ts">
import { formatoData, formatoEuro } from '@/calc/formato'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const { kind } = defineProps<{
  kind: 'confirm' | 'form' | 'long'
}>()

const emit = defineEmits<{
  done: []
}>()

const importo = formatoEuro(17507)
const data = formatoData('2026-11-03')
</script>

<template>
  <div v-if="kind === 'confirm'" class="flex flex-col gap-6 pt-2">
    <p class="text-center text-sm text-muted-foreground">
      Il versamento di {{ importo }} conta sul fondo dal {{ data }}. Potrai comunque modificarlo
      dopo.
    </p>
    <Button size="lg" class="w-full" @click="emit('done')">Conferma</Button>
  </div>

  <form v-else-if="kind === 'form'" @submit.prevent="emit('done')">
    <FieldGroup>
      <Field>
        <FieldLabel :for="`sheet-${kind}-tfr`">Importo TFR</FieldLabel>
        <Input :id="`sheet-${kind}-tfr`" default-value="175,07" inputmode="decimal" class="px-4" />
      </Field>
      <Field>
        <FieldLabel :for="`sheet-${kind}-voluntary`">Volontario</FieldLabel>
        <Input
          :id="`sheet-${kind}-voluntary`"
          default-value="50,00"
          inputmode="decimal"
          class="px-4"
        />
      </Field>
    </FieldGroup>
  </form>

  <div v-else class="flex flex-col gap-3">
    <p
      v-for="index in 14"
      :key="index"
      class="rounded-2xl border-[0.75px] border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-glass"
    >
      Riga {{ index }} di un elenco lungo.
    </p>
  </div>
</template>
