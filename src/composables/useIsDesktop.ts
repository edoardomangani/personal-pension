import { useMediaQuery } from '@vueuse/core'
import type { Ref } from 'vue'

// Stesso confine della shell: da lg (1024px) in su è desktop.
export function useIsDesktop(): Ref<boolean> {
  return useMediaQuery('(min-width: 1024px)')
}
