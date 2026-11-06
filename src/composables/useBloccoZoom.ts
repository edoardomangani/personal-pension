import { onMounted, onUnmounted } from 'vue'

const nonPassivo: AddEventListenerOptions = { passive: false }

function annulla(evento: Event): void {
  evento.preventDefault()
}

function annullaPizzico(evento: TouchEvent): void {
  if (evento.touches.length > 1) evento.preventDefault()
}

/**
 * DS-05 R10: blocca il pizzico su schermi touch, anche dove iOS ignora viewport e touch-action.
 * Solo con touch, così il pizzico del trackpad di Safari su Mac resta. Montato una volta in `App.vue`.
 */
export function useBloccoZoom(): void {
  let attivo = false

  onMounted(() => {
    if (navigator.maxTouchPoints <= 0) return
    attivo = true
    document.addEventListener('gesturestart', annulla, nonPassivo)
    document.addEventListener('gesturechange', annulla, nonPassivo)
    document.addEventListener('touchmove', annullaPizzico, nonPassivo)
  })

  onUnmounted(() => {
    if (!attivo) return
    document.removeEventListener('gesturestart', annulla, nonPassivo)
    document.removeEventListener('gesturechange', annulla, nonPassivo)
    document.removeEventListener('touchmove', annullaPizzico, nonPassivo)
    attivo = false
  })
}
