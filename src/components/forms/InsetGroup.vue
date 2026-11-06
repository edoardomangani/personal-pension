<script setup lang="ts">
import { insetGroupClass } from '@/components/forms/inset'
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { cn } from '@/lib/utils'

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
    <!-- Né container query né scroll container: con l'aiuto comparso la card nel fieldset flex collassava al solo bordo. -->
    <div
      data-slot="field-group"
      :class="cn('group/field-group flex w-full flex-col gap-0', insetGroupClass, 'overflow-clip')"
    >
      <slot />
    </div>
    <FieldDescription v-if="description" class="px-1 text-xs text-subtle-foreground">{{
      description
    }}</FieldDescription>
  </FieldSet>
</template>
