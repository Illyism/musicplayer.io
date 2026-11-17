import type * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-input bg-input/20 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full resize-none rounded-md border px-2 py-2 text-sm transition-colors outline-none focus-visible:ring-[2px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[2px] md:text-xs/relaxed',
        className
      )}
      data-slot="textarea"
      {...props}
    />
  )
}

export { Textarea }
