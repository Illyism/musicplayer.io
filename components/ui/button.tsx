import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full border border-transparent bg-clip-padding font-medium text-sm outline-none transition-[background-color,color,box-shadow,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-11 gap-2 px-5',
        icon: 'size-11',
        'icon-lg': 'size-12 [&_svg]:size-5',
        'icon-sm': 'size-9 max-sm:size-11',
        'icon-xs': 'size-8 max-sm:size-11',
        lg: 'h-12 gap-2 px-6',
        sm: 'h-9 gap-1.5 px-4 max-sm:h-11',
        xs: 'h-8 gap-1.5 px-3 text-xs max-sm:h-11',
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 dark:hover:bg-destructive/30',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        outline:
          'border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
      },
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  static: isStatic = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    static?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      className={cn(
        buttonVariants({ className, size, variant }),
        !isStatic && 'active:not-disabled:not-focus-visible:scale-[0.96]'
      )}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  )
}

export { Button, buttonVariants }
