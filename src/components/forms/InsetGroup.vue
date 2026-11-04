<script setup lang="ts">
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'

const { title, description } = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <!-- Titolo sopra e aiuto sotto stanno fuori dalla card di vetro, come le etichette dei giorni nelle liste dei movimenti. -->
  <FieldSet class="w-full max-w-[560px] gap-2">
    <FieldLegend
      v-if="title"
      variant="label"
      class="mb-0 px-1 text-xs font-semibold text-muted-foreground data-[variant=label]:text-xs"
      >{{ title }}</FieldLegend
    >
    <FieldGroup
      class="gap-0 overflow-hidden rounded-[24px] border-[0.75px] border-border bg-card shadow-glass lg:rounded-3xl"
    >
      <slot />
    </FieldGroup>
    <FieldDescription v-if="description" class="px-1 text-xs text-subtle-foreground">{{
      description
    }}</FieldDescription>
  </FieldSet>
</template>
