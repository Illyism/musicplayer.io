'use client'

import { House, MagnifyingGlass, Stack } from '@phosphor-icons/react'
import { usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'

const destinations = [
  { icon: House, label: 'Home', view: 'playlist' },
  { icon: MagnifyingGlass, label: 'Search', view: 'browse' },
  { icon: Stack, label: 'Your library', view: 'library' },
] as const

export function MobileNavigation() {
  const mobileView = usePlayerStore(state => state.mobileView)
  const setMobileView = usePlayerStore(state => state.setMobileView)

  return (
    <nav
      aria-label="Main navigation"
      className="grid shrink-0 grid-cols-3 bg-background px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {destinations.map(({ icon: Icon, label, view }) => (
        <button
          aria-current={mobileView === view ? 'page' : undefined}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
            mobileView === view ? 'text-foreground' : 'text-muted-foreground'
          )}
          key={view}
          onClick={() => setMobileView(view)}
          type="button"
        >
          <Icon
            aria-hidden="true"
            className="size-6"
            weight={mobileView === view ? 'fill' : 'regular'}
          />
          <span className="font-medium">{label}</span>
        </button>
      ))}
    </nav>
  )
}
