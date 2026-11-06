<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TOUCH_OPEN_DURATION = 2000
// Deve restare sopra i 150 ms dell'animate-out di ui/tooltip/TooltipContent, o un tocco durante l'uscita lo richiude.
const EXIT_ANIMATION_WINDOW = 200

const open = ref(false)
let lastPointerType = ''
let closedAt = Number.NEGATIVE_INFINITY
let closeTimer: ReturnType<typeof setTimeout> | undefined
let openTimer: ReturnType<typeof setTimeout> | undefined

function clearCloseTimer(): void {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function clearOpenTimer(): void {
  if (openTimer !== undefined) {
    clearTimeout(openTimer)
    openTimer = undefined
  }
}

function clearTimers(): void {
  clearCloseTimer()
  clearOpenTimer()
}

function onPointerDown(event: PointerEvent): void {
  lastPointerType = event.pointerType
}

// Un tocco annullato non diventa mai un click: non deve valere per il click da tastiera successivo.
function resetPointerType(): void {
  lastPointerType = ''
}

// Reka ignora il focus dopo un tocco annullato finché non arriva un pointerup: il focus da tastiera lo apre qui.
function onFocus(event: FocusEvent): void {
  if (event.target instanceof Element && event.target.matches(':focus-visible')) {
    open.value = true
  }
}

function openForTouch(): void {
  openTimer = undefined
  open.value = true
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    open.value = false
  }, TOUCH_OPEN_DURATION)
}

function onClick(): void {
  if (lastPointerType !== 'touch' && lastPointerType !== 'pen') {
    open.value = false
    clearTimers()

    return
  }

  resetPointerType()
  clearOpenTimer()

  // Riaprire durante l'animazione di uscita verrebbe richiuso dal contenuto ancora montato.
  const exitRemaining = open.value ? 0 : EXIT_ANIMATION_WINDOW - (performance.now() - closedAt)

  if (exitRemaining > 0) {
    openTimer = setTimeout(openForTouch, exitRemaining)
  } else {
    openForTouch()
  }
}

function onOpenChange(isOpen: boolean): void {
  open.value = isOpen

  if (!isOpen) {
    clearTimers()
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    closedAt = performance.now()
  }
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <!-- Il trigger non deve chiuderlo: il tocco lo tiene aperto, il click lo chiude per mouse e tastiera. -->
  <!-- Lo slot è l'unico elemento focalizzabile, aria-disabled, della voce. -->
  <Tooltip :open="open" disable-closing-trigger @update:open="onOpenChange">
    <TooltipTrigger
      as-child
      @pointerdown="onPointerDown"
      @pointercancel="resetPointerType"
      @click="onClick"
      @focus="onFocus"
    >
      <slot />
    </TooltipTrigger>
    <TooltipContent>In arrivo</TooltipContent>
  </Tooltip>
</template>
