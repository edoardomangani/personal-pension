<script setup lang="ts">
import { insetRowClass } from '@/components/forms/inset'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

const {
  label,
  for: controlId,
  error,
  hideLabel = false,
} = defineProps<{
  label: string
  for: string
  error?: string
  // Label-less rows (email, password) keep the label for screen readers only.
  hideLabel?: boolean
}>()

// A tap anywhere on the row reaches the control, as in iOS settings.
function activateControl(event: MouseEvent): void {
  if (
    event.target instanceof Element &&
    event.target.closest('input, textarea, button, a, label, [role="switch"], [role="combobox"]')
  ) {
    return
  }

  const control = document.getElementById(controlId)

  if (control?.matches('button, [role="switch"]')) {
    control.click()
  } else {
    control?.focus()
  }
}
</script>

<template>
  <Field :data-invalid="error ? true : undefined" :class="insetRowClass" @click="activateControl">
    <div class="flex min-h-12 items-center gap-3 px-4">
      <FieldLabel
        :for="controlId"
        :class="
          hideLabel
            ? 'sr-only'
            : 'shrink-0 text-sm font-normal text-foreground group-data-[invalid=true]/field:text-destructive'
        "
        >{{ label }}</FieldLabel
      >
      <div
        class="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm"
        :class="hideLabel && '*:flex-1'"
      >
        <slot />
      </div>
    </div>
    <FieldError v-if="error" :errors="[error]" class="-mt-1 px-4 pb-2.5 text-xs" />
  </Field>
</template>
