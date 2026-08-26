'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: shadcn InputGroup contract; role kept for AT grouping
    <div
      className={cn(
        'group/input-group relative flex h-7 w-full min-w-0 items-center rounded-md border border-input bg-input/20 outline-none transition-colors has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-start]]:h-auto has-[>textarea]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:flex-col has-[textarea]:rounded-md has-data-[align=block-end]:rounded-md has-data-[align=block-start]:rounded-md has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-control]:focus-visible]:ring-[2px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 has-[[data-slot][aria-invalid=true]]:ring-[2px] has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-start]]:[&>input]:pl-1.5 [[data-slot=combobox-content]_&]:focus-within:border-inherit [[data-slot=combobox-content]_&]:focus-within:ring-0',
        className
      )}
      data-slot="input-group"
      role="group"
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text select-none items-center justify-center gap-1 py-2 font-medium text-muted-foreground text-xs/relaxed **:data-[slot=kbd]:rounded-[calc(var(--radius-sm)-2px)] **:data-[slot=kbd]:bg-muted-foreground/10 **:data-[slot=kbd]:px-1 **:data-[slot=kbd]:text-[0.625rem] group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-3.5",
  {
    defaultVariants: {
      align: 'inline-start',
    },
    variants: {
      align: {
        'block-end':
          'order-last w-full justify-start px-2 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
        'block-start':
          'order-first w-full justify-start px-2 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'inline-end': 'order-last pr-2 has-[>button]:mr-[-0.275rem] has-[>kbd]:mr-[-0.275rem]',
        'inline-start': 'order-first pl-2 has-[>button]:ml-[-0.275rem] has-[>kbd]:ml-[-0.275rem]',
      },
    },
  }
)

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: click focuses the input (shadcn)
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users focus the input directly via Tab
    // biome-ignore lint/a11y/useSemanticElements: shadcn InputGroupAddon contract; role kept for AT grouping
    <div
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="input-group-addon"
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) {
          return
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      role="group"
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  'flex items-center gap-2 rounded-md text-xs/relaxed shadow-none',
  {
    defaultVariants: {
      size: 'xs',
    },
    variants: {
      size: {
        'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
        'icon-xs': 'size-6 p-0 has-[>svg]:p-0',
        sm: '',
        xs: "h-5 gap-1 rounded-[calc(var(--radius-sm)-2px)] px-1 [&>svg:not([class*='size-'])]:size-3",
      },
    },
  }
)

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      className={cn(inputGroupButtonVariants({ size }), className)}
      data-size={size}
      type={type}
      variant={variant}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-muted-foreground text-xs/relaxed [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      className={cn(
        'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        className
      )}
      data-slot="input-group-control"
      {...props}
    />
  )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      className={cn(
        'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
        className
      )}
      data-slot="input-group-control"
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
}
