import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Le taglie personalizzate di app.css sono dimensioni del testo: senza questo tailwind-merge le prende per colori e ne scarta una.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['balance-md', 'balance-md-decimals', 'balance-lg', 'balance-lg-decimals', 'tab-label'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
