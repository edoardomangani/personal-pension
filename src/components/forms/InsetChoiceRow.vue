<script setup lang="ts">
import { PhCaretRight, PhCheck } from '@phosphor-icons/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { insetControlClass, insetGroupClass } from '@/components/forms/inset'
import InsetRow from '@/components/forms/InsetRow.vue'
import ResponsiveSheet from '@/components/ResponsiveSheet.vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type InsetChoiceOption = { value: string; label: string }

const value = defineModel<string | null>({ default: null })

const { id, label, options, name, error, placeholder, sheetTitle } = defineProps<{
  id: string
  label: string
  options: InsetChoiceOption[]
  name?: string
  error?: string
  placeholder?: string
  sheetTitle?: string
}>()

const open = ref(false)
const search = ref('')

// Gli elenchi lunghi hanno un campo di ricerca.
const searchable = computed(() => options.length > 12)

const selectedLabel = computed(() => options.find((option) => option.value === value.value)?.label)

const visibleOptions = computed(() => {
  const query = search.value.trim().toLowerCase()

  return query === ''
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(query))
})

// Ogni apertura parte con la ricerca vuota e centrata sul valore attuale.
watch(open, async (isOpen) => {
  if (!isOpen) {
    return
  }

  search.value = ''
  await nextTick()
  requestAnimationFrame(() => {
    document
      .getElementById(`${id}-options`)
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'center' })
  })
})

function choose(option: InsetChoiceOption): void {
  value.value = option.value
  open.value = false
}
</script>

<template>
  <InsetRow :for="id" :label="label" :error="error">
    <input v-if="name" type="hidden" :name="name" :value="value ?? ''" />
    <button
      :id="id"
      type="button"
      :aria-invalid="error ? true : undefined"
      aria-haspopup="dialog"
      :aria-expanded="open"
      class="flex min-h-12 min-w-0 items-center justify-end gap-2 text-sm text-muted-foreground outline-none focus-visible:text-foreground"
      @click="open = true"
    >
      <span class="truncate">{{ selectedLabel ?? placeholder ?? 'Scegli' }}</span>
      <PhCaretRight class="size-4 shrink-0 text-subtle-foreground" />
    </button>
  </InsetRow>

  <ResponsiveSheet v-model:open="open" :title="sheetTitle ?? label">
    <div class="flex flex-col gap-3 pb-2">
      <!-- La ricerca resta in alto mentre l'elenco lungo scorre sotto. -->
      <div
        v-if="searchable"
        class="sticky -top-4 z-10 -mt-4 bg-popover pt-4 pb-1 backdrop-blur-popover"
      >
        <div class="rounded-full border-[0.75px] border-border bg-card px-4 shadow-glass">
          <Input
            v-model="search"
            type="search"
            aria-label="Cerca"
            placeholder="Cerca"
            :class="cn(insetControlClass, 'py-2 text-left')"
          />
        </div>
      </div>
      <div :id="`${id}-options`" role="listbox" :aria-label="label" :class="insetGroupClass">
        <button
          v-for="option in visibleOptions"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="option.value === value"
          class="relative flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm transition-colors duration-200 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-[0.75px] not-first:before:bg-divider hover:bg-card focus-visible:bg-card focus-visible:outline-none aria-selected:bg-card aria-selected:font-semibold"
          @click="choose(option)"
        >
          <span class="flex-1 truncate">{{ option.label }}</span>
          <PhCheck v-if="option.value === value" class="size-4 shrink-0" />
        </button>
        <p v-if="visibleOptions.length === 0" class="px-4 py-3 text-sm text-subtle-foreground">
          Nessun risultato.
        </p>
      </div>
    </div>
  </ResponsiveSheet>
</template>
