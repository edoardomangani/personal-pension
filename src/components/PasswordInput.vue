<script setup lang="ts">
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'
import { onMounted, ref, useTemplateRef } from 'vue'
import type { HTMLAttributes } from 'vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  class?: HTMLAttributes['class']
  autofocus?: boolean
}>()

const showPassword = ref(false)
const inputRef = useTemplateRef('inputRef')

function focus(): void {
  inputRef.value?.$el?.focus()
}

onMounted(() => {
  if (props.autofocus) {
    focus()
  }
})

defineExpose({ $el: inputRef, focus })
</script>

<template>
  <div class="relative">
    <Input
      ref="inputRef"
      :type="showPassword ? 'text' : 'password'"
      :class="cn('pr-10', props.class)"
      v-bind="$attrs"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center rounded-full px-3 text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      :aria-label="showPassword ? 'Nascondi password' : 'Mostra password'"
      :tabindex="-1"
      @click="showPassword = !showPassword"
    >
      <PhEyeSlash v-if="showPassword" class="size-4" />
      <PhEye v-else class="size-4" />
    </button>
  </div>
</template>
