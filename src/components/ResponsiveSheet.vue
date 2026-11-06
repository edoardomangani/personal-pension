<script setup lang="ts">
import { watch } from 'vue'
import ResponsiveSheetHeader from '@/components/ResponsiveSheetHeader.vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { useIsDesktop } from '@/composables/useIsDesktop'

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title: string
  description?: string
}>()

defineSlots<{
  default?: () => unknown
  action?: () => unknown
  footer?: () => unknown
}>()

const isDesktop = useIsDesktop()

// Chiudere prima che i rami si scambino evita che il blocco dello scorrimento di un overlay aperto resti sul body.
watch(isDesktop, () => {
  open.value = false
})
</script>

<template>
  <!-- Sotto lg un drawer dal basso, da lg il dialog di vetro ancorato in alto: stessa testata, corpo e piede. -->
  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogContent
      :show-close-button="false"
      class="flex flex-col gap-0 p-0 pt-4 pb-5 sm:max-w-[480px]"
    >
      <ResponsiveSheetHeader layout="dialog" class="px-5" @close="open = false">
        <template #title>
          <DialogTitle class="truncate text-base font-semibold">{{ title }}</DialogTitle>
        </template>
        <template #action><slot name="action" /></template>
      </ResponsiveSheetHeader>
      <DialogDescription v-if="description" class="px-5 pt-2">{{ description }}</DialogDescription>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex flex-col gap-2 px-5 pt-4">
        <slot name="footer" />
      </div>
    </DialogContent>
  </Dialog>

  <Drawer v-else v-model:open="open">
    <DrawerContent>
      <ResponsiveSheetHeader @close="open = false">
        <template #title>
          <DrawerTitle class="truncate">{{ title }}</DrawerTitle>
        </template>
        <template #action><slot name="action" /></template>
      </ResponsiveSheetHeader>
      <DrawerDescription v-if="description" class="px-4 pt-2 text-center">{{
        description
      }}</DrawerDescription>
      <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex flex-col gap-2 px-4 pt-4">
        <slot name="footer" />
      </div>
    </DrawerContent>
  </Drawer>
</template>
