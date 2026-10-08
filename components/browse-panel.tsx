'use client'

import {
  ArrowClockwise,
  ArrowRight,
  Check,
  MagnifyingGlass,
  Plus,
  RedditLogo,
  ShareNetwork,
  X,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ShareModal } from '@/components/share-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { discoveryStatus } from '@/lib/community/presentation'
import { COMMUNITY_CATEGORIES, type Community, type CommunityCategory } from '@/lib/community/types'
import { useCommunityDiscovery } from '@/lib/hooks/use-community-discovery'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/song-utils'

const COMMUNITY_PREFIX = /^\/?r\//
const COMMUNITY_NAME = /^[a-z0-9_]{1,21}$/
const GENRE_COLORS: Record<string, string> = {
  Ambient: 'bg-[#356665]',
  Classical: 'bg-[#475c4f]',
  Electronic: 'bg-[#28516e]',
  'Hip-hop': 'bg-[#765124]',
  Indie: 'bg-[#655087]',
  Jazz: 'bg-[#8f5b2e]',
  Metal: 'bg-[#414552]',
  Pop: 'bg-[#8e406f]',
  Rock: 'bg-[#963c39]',
}

function CommunityRow({
  community,
  selected,
  disabled,
  onToggle,
}: {
  community: Community
  selected: boolean
  disabled: boolean
  onToggle: (key: string) => Promise<void>
}) {
  return (
    <Button
      aria-label={`${selected ? 'Remove' : 'Add'} r/${community.name} ${selected ? 'from' : 'to'} your mix`}
      aria-pressed={selected}
      className={cn(
        'h-auto min-h-20 w-full justify-start gap-3 rounded-xl px-3 py-3 text-left lg:min-h-16',
        selected && 'bg-sidebar-accent'
      )}
      disabled={disabled}
      onClick={() => onToggle(community.key)}
      variant="ghost"
    >
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-reddit lg:size-9">
        {community.iconUrl ? (
          <Image
            alt=""
            className="size-full object-cover"
            height={48}
            src={community.iconUrl}
            unoptimized
            width={48}
          />
        ) : (
          <RedditLogo className="size-6 lg:size-4" weight="fill" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-sm lg:text-[13px]">
          r/{community.name}
        </span>
        <span className="mt-1 block truncate text-muted-foreground text-xs lg:text-[11px]">
          {community.recentPlayablePosts === null
            ? 'Activity not verified'
            : `${community.recentPlayablePosts} recent supported links${community.activity === 'quiet' ? ' · Quiet' : ''}`}
          {community.subscribers === null
            ? ''
            : ` · ${formatNumber(community.subscribers)} members`}
        </span>
        <span className="mt-1 line-clamp-1 whitespace-normal text-muted-foreground text-xs lg:hidden">
          {community.description}
        </span>
      </span>
      {selected ? (
        <Check className="size-4 text-reddit" weight="bold" />
      ) : (
        <Plus className="size-4 text-muted-foreground" />
      )}
    </Button>
  )
}

export function BrowsePanel() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'communities' | 'tracks'>('communities')
  const [category, setCategory] = useState<CommunityCategory | null>(null)
  const [custom, setCustom] = useState('')
  const [share, setShare] = useState(false)
  const {
    data,
    loading: discovering,
    error,
    refresh,
  } = useCommunityDiscovery(mode === 'communities' ? query : '', category)
  const router = useRouter()
  const pathname = usePathname()
  const {
    selectedSubreddits,
    setSelectedSubreddits,
    setSearchQuery,
    setMobileView,
    setSongs,
    setAfter,
    loading,
  } = usePlayerStore()
  const { fetchFromSubreddits, fetchSearch } = useRedditAPI()
  let resultsTitle = category ? `${category} communities` : 'Worth exploring'
  if (query) {
    resultsTitle = `Communities for “${query}”`
  }
  const matchingResult =
    data !== null && data.query === query.trim().toLowerCase() && data.category === category
  const visibleCommunities =
    matchingResult && !discovering && error === null ? data.communities : []

  const updatePath = (names: string[]) => {
    const path = names.length > 0 ? `/r/${names.join('+')}` : '/'
    if (path !== pathname) {
      router.push(path)
    }
  }

  const toggle = async (key: string) => {
    const names = selectedSubreddits.includes(key)
      ? selectedSubreddits.filter(name => name !== key)
      : [...selectedSubreddits, key]
    setSearchQuery(null)
    setSelectedSubreddits(names)
    updatePath(names)
    if (names.length === 0) {
      setSongs([])
      setAfter(null)
      return
    }
    try {
      await fetchFromSubreddits(names)
    } catch {
      /* Request errors are displayed by the API hook. */
    }
  }

  const searchTracks = async () => {
    if (query.trim().length < 3 || loading) {
      return
    }
    setSearchQuery(query.trim())
    setSelectedSubreddits([])
    updatePath([])
    setMobileView('playlist')
    try {
      await fetchSearch(query.trim())
    } catch {
      /* Request errors are displayed by the API hook. */
    }
  }

  const addCommunity = async () => {
    const name = custom.trim().toLowerCase().replace(COMMUNITY_PREFIX, '')
    if (!COMMUNITY_NAME.test(name)) {
      toast.error('Use a community name with letters, numbers, or underscores.')
      return
    }
    if (selectedSubreddits.includes(name)) {
      toast.info(`r/${name} is already in your mix.`)
      return
    }
    setCustom('')
    await toggle(name)
  }

  return (
    <aside
      aria-label="Music discovery"
      className="flex h-full min-h-0 flex-col bg-background lg:bg-sidebar"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 py-5 lg:gap-5 lg:px-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between lg:px-2">
            <h1 className="font-semibold text-3xl tracking-tight lg:text-xl">Find your sound</h1>
            <Button
              aria-label="Refresh communities"
              className="size-11 rounded-full"
              disabled={discovering}
              onClick={refresh}
              size="icon"
              variant="ghost"
            >
              <ArrowClockwise className={cn('size-5', discovering && 'motion-safe:animate-spin')} />
            </Button>
          </div>
          <form
            className="relative"
            onSubmit={event => {
              event.preventDefault()
              if (mode === 'tracks') {
                searchTracks()
              }
            }}
          >
            <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={
                mode === 'tracks' ? 'Search music on Reddit' : 'Search Reddit music communities'
              }
              className="h-12 rounded-xl border-transparent bg-muted pr-11 pl-11 text-base shadow-none lg:h-11 lg:text-sm"
              maxLength={mode === 'communities' ? 64 : 200}
              onChange={event => setQuery(event.target.value)}
              placeholder={
                mode === 'tracks'
                  ? 'What do you want to listen to?'
                  : 'Artists, genres, communities'
              }
              type="search"
              value={query}
            />
            {mode === 'tracks' && (
              <Button
                aria-label="Search music"
                className="absolute top-0 right-0 size-12 lg:size-11"
                disabled={loading || query.trim().length < 3}
                size="icon"
                type="submit"
                variant="ghost"
              >
                <ArrowRight className="size-5" />
              </Button>
            )}
          </form>
          <fieldset aria-label="Search type" className="flex gap-2">
            {(['communities', 'tracks'] as const).map(value => (
              <Button
                aria-pressed={mode === value}
                className="h-10 rounded-full px-4"
                key={value}
                onClick={() => setMode(value)}
                variant={mode === value ? 'default' : 'secondary'}
              >
                {value === 'communities' ? 'Communities' : 'Tracks'}
              </Button>
            ))}
          </fieldset>
        </div>
        {mode === 'communities' && (
          <>
            {!query && (
              <section className="flex flex-col gap-3 lg:hidden">
                <h2 className="font-semibold text-xl">Browse by sound</h2>
                <div className="grid grid-cols-2 gap-3">
                  {COMMUNITY_CATEGORIES.filter(
                    value => value !== 'All music' && value !== 'Other'
                  ).map(value => (
                    <button
                      aria-pressed={category === value}
                      className={cn(
                        'relative flex min-h-24 items-end overflow-hidden rounded-xl p-4 text-left font-semibold text-lg text-white outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        GENRE_COLORS[value],
                        category === value && 'ring-2 ring-foreground'
                      )}
                      key={value}
                      onClick={() => setCategory(category === value ? null : value)}
                      type="button"
                    >
                      <span>{value}</span>
                      <RedditLogo
                        aria-hidden
                        className="absolute -right-2 -bottom-2 size-20 -rotate-12 text-white/15"
                        weight="fill"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:flex-wrap">
              <Button
                className="h-9 rounded-full px-3 text-xs"
                onClick={() => setCategory(null)}
                variant={category === null ? 'default' : 'secondary'}
              >
                All music
              </Button>
              {COMMUNITY_CATEGORIES.filter(value => value !== 'All music' && value !== 'Other').map(
                value => (
                  <Button
                    className="h-9 rounded-full px-3 text-xs"
                    key={value}
                    onClick={() => setCategory(value)}
                    variant={category === value ? 'default' : 'secondary'}
                  >
                    {value}
                  </Button>
                )
              )}
            </div>
            <section className="flex flex-col gap-2">
              <h2 className="font-semibold text-xl lg:px-2 lg:text-sm">{resultsTitle}</h2>
              {discovering === true && (
                <p className="py-4 text-muted-foreground text-sm" role="status">
                  Checking recent music activity…
                </p>
              )}
              {error !== null && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              {data && matchingResult && !discovering && (
                <p className="text-muted-foreground text-xs leading-5 lg:px-2">
                  {discoveryStatus(data)}
                  {data.source !== 'fallback' &&
                    ` Links from the last ${data.sampleWindowDays} days, among each community’s latest 25 posts.`}
                </p>
              )}
              {visibleCommunities.map(community => (
                <CommunityRow
                  community={community}
                  disabled={loading}
                  key={community.key}
                  onToggle={toggle}
                  selected={selectedSubreddits.includes(community.key)}
                />
              ))}
              {matchingResult &&
                !discovering &&
                error === null &&
                visibleCommunities.length === 0 && (
                  <p className="py-4 text-muted-foreground text-sm">
                    {data?.source === 'fallback'
                      ? 'Try again shortly or add a community below.'
                      : 'No communities found. Try a broader genre or add a community below.'}
                  </p>
                )}
            </section>
          </>
        )}
        {mode === 'tracks' && (
          <p className="text-muted-foreground text-sm leading-6">
            Search tracks shared across Reddit, then add your favorites to the queue.
          </p>
        )}
        <section className="flex flex-col gap-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Your mix</h2>
            <Button
              aria-label="Share your mix"
              className="size-11 rounded-full"
              onClick={() => setShare(true)}
              size="icon"
              variant="ghost"
            >
              <ShareNetwork className="size-5" />
            </Button>
          </div>
          {selectedSubreddits.map(name => (
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 pr-1 pl-3" key={name}>
              <RedditLogo className="size-4 text-reddit" weight="fill" />
              <span className="min-w-0 flex-1 truncate text-sm">r/{name}</span>
              <Button
                aria-label={`Remove r/${name} from your mix`}
                className="size-11 shrink-0"
                disabled={loading}
                onClick={() => toggle(name)}
                size="icon"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <form
            className="relative"
            onSubmit={event => {
              event.preventDefault()
              addCommunity()
            }}
          >
            <Input
              aria-label="Add a Reddit community"
              className="h-11 rounded-xl bg-transparent pr-11 text-base lg:text-sm"
              onChange={event => setCustom(event.target.value)}
              placeholder="Add any r/community"
              value={custom}
            />
            <Button
              aria-label="Add community to your mix"
              className="absolute top-0 right-0 size-11"
              disabled={loading || !custom.trim()}
              size="icon"
              type="submit"
              variant="ghost"
            >
              <Plus className="size-4" />
            </Button>
          </form>
        </section>
      </div>
      <ShareModal isOpen={share} onClose={() => setShare(false)} subreddits={selectedSubreddits} />
    </aside>
  )
}
