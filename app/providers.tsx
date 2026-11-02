'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange enableSystem>
      <Toaster
        mobileOffset={{ bottom: 'var(--app-toast-offset)' }}
        offset={{ bottom: 'var(--app-toast-offset)' }}
      />
      {children}
    </ThemeProvider>
  )
}
