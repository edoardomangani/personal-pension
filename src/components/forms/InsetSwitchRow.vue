<script setup lang="ts">
import InsetRow from '@/components/forms/InsetRow.vue'
import { Switch } from '@/components/ui/switch'

const checked = defineModel<boolean>({ default: false })

const { id, label, name, error } = defineProps<{
  id: string
  label: string
  name?: string
  error?: string
}>()
</script>

<template>
  <InsetRow :for="id" :label="label" :error="error">
    <Switch :id="id" v-model="checked" :name="name" :aria-invalid="error ? true : undefined" />
  </InsetRow>
</template>
