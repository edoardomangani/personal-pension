<script setup lang="ts">
import { insetGroupClass } from '@/components/forms/inset'
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field'

const { title, description } = defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <!-- Titolo sopra e aiuto sotto stanno fuori dalla card di vetro, come le etichette dei giorni nelle liste dei movimenti. -->
  <FieldSet class="w-full max-w-[560px] gap-2">
    <!-- La legend non è un elemento flex del fieldset: il gap-2 non la tocca, lo spazio lo dà il margine. -->
    <FieldLegend
      v-if="title"
      variant="label"
      class="mb-2 px-1 text-xs font-semibold text-muted-foreground data-[variant=label]:text-xs"
      >{{ title }}</FieldLegend
    >
    <!-- shrink-0: con overflow-hidden la card nel fieldset flex poteva schiacciarsi al solo bordo quando compare l'aiuto. -->
    <FieldGroup :class="`shrink-0 gap-0 ${insetGroupClass}`">
      <slot />
    </FieldGroup>
    <FieldDescription v-if="description" class="px-1 text-xs text-subtle-foreground">{{
      description
    }}</FieldDescription>
  </FieldSet>
</template>
