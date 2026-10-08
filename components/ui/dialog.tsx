'use client'

import { X } from '@phosphor-icons/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type * as React from 'react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Overlay> | null>
}) => (
  <DialogPrimitive.Overlay
    className={cn(
      'data-[state=open]:fade-in-0 fixed inset-0 z-100 bg-black/60 backdrop-blur-xs data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:duration-200 motion-reduce:animate-none',
      className
    )}
    data-slot="dialog-overlay"
    ref={ref}
    {...props}
  />
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = ({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Content> | null>
}) => {
  const returnFocusRef = useRef<HTMLElement | null>(null)

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'data-[state=open]:fade-in-0 fixed top-1/2 left-1/2 z-101 grid max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl data-[state=closed]:animate-none data-[state=open]:animate-in data-[state=open]:duration-200 motion-reduce:animate-none sm:p-7',
          className
        )}
        data-slot="dialog-content"
        onCloseAutoFocus={event => {
          onCloseAutoFocus?.(event)
          if (!event.defaultPrevented && returnFocusRef.current?.isConnected) {
            event.preventDefault()
            returnFocusRef.current.focus({ preventScroll: true })
          }
        }}
        onOpenAutoFocus={event => {
          returnFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
          onOpenAutoFocus?.(event)
        }}
        ref={ref}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:pointer-events-none motion-reduce:transform-none">
          <X aria-hidden className="size-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
  ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Title> | null>
}) => (
  <DialogPrimitive.Title
    className={cn('font-semibold text-lg leading-none tracking-tight', className)}
    ref={ref}
    {...props}
  />
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
  ref?: React.RefObject<React.ElementRef<typeof DialogPrimitive.Description> | null>
}) => (
  <DialogPrimitive.Description
    className={cn('text-muted-foreground text-sm', className)}
    ref={ref}
    {...props}
  />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
