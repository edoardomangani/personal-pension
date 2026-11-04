<script setup lang="ts">
import SheetSampleBody from '@/components/dev/SheetSampleBody.vue'
import ResponsiveSheetHeader from '@/components/ResponsiveSheetHeader.vue'
import { Button } from '@/components/ui/button'

const { kind, title } = defineProps<{
  kind: 'confirm' | 'form' | 'long'
  title: string
}>()
</script>

<template>
  <!-- Stato aperto statico: il drawer vero va in un portal su <body> e non starebbe nella cornice. -->
  <div class="relative h-full">
    <div class="flex flex-col gap-3 p-4 pt-16" aria-hidden="true">
      <div
        v-for="index in 5"
        :key="index"
        class="h-24 rounded-[24px] border-[0.75px] border-border bg-card"
      />
    </div>
    <div class="absolute inset-0 bg-overlay" />
    <div
      role="dialog"
      :aria-label="title"
      class="absolute inset-x-0 bottom-0 flex max-h-[90%] flex-col rounded-t-[24px] sheet-surface pb-6"
    >
      <div class="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/18" />
      <ResponsiveSheetHeader>
        <template #title>
          <h2 class="truncate text-base font-semibold">
            {{ title }}
          </h2>
        </template>
        <template v-if="kind === 'form'" #action>
          <Button>Salva</Button>
        </template>
      </ResponsiveSheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <SheetSampleBody :kind="kind" />
      </div>
    </div>
  </div>
</template>
