'use client'

import { CheckCircle, Info, SpinnerGap, Warning, XCircle } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      className="toaster group"
      icons={{
        error: <XCircle className="size-4" weight="fill" />,
        info: <Info className="size-4" weight="fill" />,
        loading: <SpinnerGap className="size-4 animate-spin" weight="bold" />,
        success: <CheckCircle className="size-4" weight="fill" />,
        warning: <Warning className="size-4" weight="fill" />,
      }}
      style={
        {
          '--border-radius': 'var(--radius)',
          '--normal-bg': 'var(--popover)',
          '--normal-border': 'var(--border)',
          '--normal-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      theme={theme as ToasterProps['theme']}
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
