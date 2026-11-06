import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex h-[22px] items-center justify-center rounded-full border-0 px-[9px] text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring aria-invalid:focus-visible:outline-destructive transition-[color,background-color,box-shadow] duration-200 overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground [a&]:hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-accent',
        destructive: 'border-[0.75px] border-destructive bg-transparent text-destructive',
        warning: 'border-[0.75px] border-warning bg-transparent text-warning',
        outline:
          'border-[0.75px] border-border-strong bg-transparent text-foreground [a&]:hover:bg-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
