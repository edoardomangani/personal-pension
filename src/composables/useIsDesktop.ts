import { useMediaQuery } from '@vueuse/core'
import type { Ref } from 'vue'

// Same boundary as the shell: lg (1024px) and up is desktop.
export function useIsDesktop(): Ref<boolean> {
  return useMediaQuery('(min-width: 1024px)')
}
