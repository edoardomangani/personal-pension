<script setup lang="ts">
import { insetControlClass, insetRowClass } from '@/components/forms/inset'
import { Field, FieldError } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const { id, label, error } = defineProps<{
  id: string
  label: string
  error?: string
}>()
</script>

<template>
  <!-- Long text: a full-width taller row where the label becomes the placeholder. -->
  <Field :data-invalid="error ? true : undefined" :class="insetRowClass">
    <Textarea
      :id="id"
      v-bind="$attrs"
      :placeholder="label"
      :aria-label="label"
      :aria-invalid="error ? true : undefined"
      :class="cn(insetControlClass, 'min-h-28 px-4 text-left leading-relaxed')"
    />
    <FieldError v-if="error" :errors="[error]" class="-mt-1 px-4 pb-2.5 text-xs" />
  </Field>
</template>
