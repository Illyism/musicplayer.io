'use client'

import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { usePlayerStore } from '@/lib/store/player-store'
import { useSearchStore } from '@/lib/store/search-store'
import { cn } from '@/lib/utils'

const MIN_TRACK_QUERY = 3
const MAX_QUERY = 200

export function SearchForm({
  className,
  variant,
}: {
  className?: string
  variant: 'bar' | 'panel'
}) {
  const { query, setQuery } = useSearchStore()
  const loading = usePlayerStore(state => state.loading)
  const { fetchSearch } = useRedditAPI()
  const router = useRouter()
  const isBar = variant === 'bar'
  const trimmed = query.trim()

  const searchTracks = async () => {
    if (trimmed.length < MIN_TRACK_QUERY || loading) {
      return
    }
    const store = usePlayerStore.getState()
    store.setSearchQuery(trimmed)
    store.setSelectedSubreddits([], { persist: false })
    if (window.location.pathname !== '/') {
      router.push('/')
    }
    store.setMobileView('playlist')
    await fetchSearch(trimmed)
  }

  return (
    <form
      className={cn('relative', className)}
      onSubmit={event => {
        event.preventDefault()
        searchTracks()
      }}
    >
      <MagnifyingGlass
        aria-hidden
        className={cn(
          'text-muted-foreground pointer-events-none absolute top-1/2 size-5 -translate-y-1/2',
          isBar ? 'left-4' : 'left-3.5'
        )}
      />
      <Input
        aria-label="Search communities and tracks"
        className={cn(
          'border-transparent pr-12 shadow-none',
          isBar
            ? 'bg-panel dark:bg-card dark:hover:bg-muted dark:focus-visible:bg-muted hover:ring-foreground/15 h-12 rounded-full pl-12 text-sm hover:ring-1 md:text-sm dark:hover:ring-0'
            : 'bg-muted dark:bg-card h-12 rounded-full pl-11 text-base'
        )}
        maxLength={MAX_QUERY}
        onChange={event => setQuery(event.target.value)}
        placeholder="Communities, artists, tracks"
        type="search"
        value={query}
      />
      {trimmed.length >= MIN_TRACK_QUERY && (
        <Button
          aria-label={`Search tracks for ${trimmed}`}
          className="text-muted-foreground hover:text-foreground absolute top-0.5 right-0.5 size-11 rounded-full"
          disabled={loading}
          size="icon"
          title="Search tracks on Reddit"
          type="submit"
          variant="ghost"
        >
          <ArrowRight className="size-5" />
        </Button>
      )}
    </form>
  )
}
