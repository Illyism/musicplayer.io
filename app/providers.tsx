'use client'

import Script from 'next/script'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const plausibleHost = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || 'https://plausible.io'

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src={`${plausibleHost}/js/script.outbound-links.js`}
          strategy="afterInteractive"
        />
      )}
      <Toaster />
      {children}
    </ThemeProvider>
  )
}
