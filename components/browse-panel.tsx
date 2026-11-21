'use client'

import { ArrowClockwise, Check, Plus, RedditLogo, ShareNetwork, X } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { SearchForm } from '@/components/search-form'
import { ShareModal } from '@/components/share-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { discoveryStatus } from '@/lib/community/presentation'
import { COMMUNITY_CATEGORIES, type Community, type CommunityCategory } from '@/lib/community/types'
import { useCommunityDiscovery } from '@/lib/hooks/use-community-discovery'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { useEffectiveSubreddits } from '@/lib/hooks/use-route-subreddits'
import { usePlayerStore } from '@/lib/store/player-store'
import { useSearchStore } from '@/lib/store/search-store'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/song-utils'

const COMMUNITY_PREFIX = /^\/?r\//u
const COMMUNITY_NAME = /^[a-z0-9_]{1,21}$/u
const MAX_COMMUNITY_QUERY = 64
const COMMUNITY_SKELETON_ROWS = ['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6']
const GENRE_CATEGORIES = COMMUNITY_CATEGORIES.filter(
  value => value !== 'All music' && value !== 'Other'
)
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
        'group/community hover:bg-foreground/10 dark:hover:bg-foreground/10 h-auto min-h-16 w-full justify-start gap-3 rounded-md px-2 py-2 text-left',
        selected && 'bg-muted hover:bg-muted dark:hover:bg-muted'
      )}
      disabled={disabled}
      onClick={() => onToggle(community.key)}
      static
      variant="ghost"
    >
      <span className="bg-muted text-reddit flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
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
          <RedditLogo className="size-6" weight="fill" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-base leading-6 font-bold',
            selected ? 'text-reddit' : 'text-foreground'
          )}
        >
          r/{community.name}
        </span>
        <span className="text-muted-foreground block truncate text-sm leading-5 font-normal">
          {community.recentPlayablePosts === null
            ? 'Activity not verified'
            : `${community.recentPlayablePosts} recent supported links${community.activity === 'quiet' ? ' · Quiet' : ''}`}
          {community.subscribers === null
            ? ''
            : ` · ${formatNumber(community.subscribers)} members`}
        </span>
        <span className="text-muted-foreground mt-0.5 line-clamp-1 text-xs font-normal whitespace-normal lg:hidden">
          {community.description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
          selected ? 'text-reddit' : 'text-muted-foreground group-hover/community:text-foreground'
        )}
      >
        {selected ? (
          <Check className="size-5" weight="bold" />
        ) : (
          <Plus className="size-5" weight="bold" />
        )}
      </span>
    </Button>
  )
}

export function BrowsePanel() {
  const query = useSearchStore(state => state.query)
  const trimmedQuery = query.trim()
  const communityQuery = trimmedQuery.length <= MAX_COMMUNITY_QUERY ? trimmedQuery : ''
  const [category, setCategory] = useState<CommunityCategory | null>(null)
  const [custom, setCustom] = useState('')
  const [share, setShare] = useState(false)
  const {
    data,
    loading: discovering,
    error,
    refresh,
  } = useCommunityDiscovery(communityQuery, category)
  const router = useRouter()
  const { selectedSubreddits, setSelectedSubreddits, setSearchQuery, setSongs, setAfter, loading } =
    usePlayerStore(
      useShallow(state => ({
        loading: state.loading,
        selectedSubreddits: state.selectedSubreddits,
        setAfter: state.setAfter,
        setSearchQuery: state.setSearchQuery,
        setSelectedSubreddits: state.setSelectedSubreddits,
        setSongs: state.setSongs,
      }))
    )
  const effectiveSubreddits = useEffectiveSubreddits()
  const { fetchFromSubreddits } = useRedditAPI()
  let resultsTitle = category ? `${category} communities` : 'Worth exploring'
  if (communityQuery) {
    resultsTitle = `Communities for “${communityQuery}”`
  }
  const matchingResult =
    data !== null && data.query === communityQuery.toLowerCase() && data.category === category
  const statusLine = data
    ? `${discoveryStatus(data)}${data.source === 'fallback' ? '' : ` Links from the last ${data.sampleWindowDays} days, among each community’s latest 25 posts.`}`
    : ''
  const visibleCommunities =
    matchingResult && !discovering && error === null ? data.communities : []

  let discoveryStatusContent = <div aria-hidden="true" className="mb-1 h-5" />
  if (discovering) {
    discoveryStatusContent = (
      <p className="mb-1 flex h-5 items-center px-2" role="status">
        <span
          aria-hidden="true"
          className="bg-muted h-3 w-40 rounded-full motion-safe:animate-pulse"
        />
        <span className="sr-only">Checking recent music activity…</span>
      </p>
    )
  } else if (error !== null) {
    discoveryStatusContent = (
      <p className="text-destructive mb-1 px-2 text-sm" role="alert">
        {error}
      </p>
    )
  } else if (data && matchingResult) {
    discoveryStatusContent = (
      <p
        className="text-muted-foreground mb-1 h-5 truncate px-2 text-xs leading-5"
        title={statusLine}
      >
        {statusLine}
      </p>
    )
  }

  const updatePath = (names: string[]) => {
    const path = names.length > 0 ? `/r/${names.join('+')}` : '/'
    if (typeof window === 'undefined' || path !== window.location.pathname) {
      router.push(path)
    }
  }

  const toggle = async (key: string) => {
    const isRemoving = selectedSubreddits.includes(key)
    const names = isRemoving
      ? selectedSubreddits.filter(name => name !== key)
      : [...selectedSubreddits, key]
    setSearchQuery(null)
    setSelectedSubreddits(names, { persist: isRemoving })
    updatePath(names)
    if (names.length === 0) {
      setSongs([])
      setAfter(null)
      return
    }
    await fetchFromSubreddits(names)
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
    <aside aria-label="Music discovery" className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4 lg:px-3">
        <div className="flex flex-col gap-4 lg:hidden">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Find your sound</h1>
          <SearchForm variant="panel" />
        </div>
        {!communityQuery && (
          <section className="flex flex-col gap-3 lg:hidden">
            <h2 className="text-xl font-semibold">Browse by sound</h2>
            <div className="grid grid-cols-2 gap-3">
              {GENRE_CATEGORIES.map(value => (
                <button
                  aria-pressed={category === value}
                  className={cn(
                    'focus-visible:ring-ring relative flex min-h-24 items-end overflow-hidden rounded-lg p-4 text-left text-lg font-semibold text-white outline-none focus-visible:ring-2',
                    GENRE_COLORS[value],
                    category === value && 'ring-foreground ring-2'
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
        <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
          <Button
            className="h-8 rounded-full px-3 text-xs max-sm:h-9"
            onClick={() => setCategory(null)}
            variant={category === null ? 'default' : 'secondary'}
          >
            All music
          </Button>
          {GENRE_CATEGORIES.map(value => (
            <Button
              className="h-8 rounded-full px-3 text-xs max-sm:h-9"
              key={value}
              onClick={() => setCategory(value)}
              variant={category === value ? 'default' : 'secondary'}
            >
              {value}
            </Button>
          ))}
        </div>
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between pl-2">
            <h2 className="text-lg font-bold lg:text-sm">Your mix</h2>
            <Button
              aria-label="Share your mix"
              className="text-muted-foreground hover:text-foreground size-11 rounded-full"
              onClick={() => setShare(true)}
              size="icon"
              variant="ghost"
            >
              <ShareNetwork className="size-5" />
            </Button>
          </div>
          {effectiveSubreddits.map(name => (
            <div className="bg-muted flex items-center gap-2 rounded-md pr-1 pl-3" key={name}>
              <RedditLogo className="text-reddit size-4" weight="fill" />
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
              className="bg-muted dark:bg-card h-11 rounded-md border-transparent pr-11 text-base shadow-none lg:text-sm"
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
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 pl-2">
            <h2 className="min-w-0 truncate text-lg font-bold lg:text-base">{resultsTitle}</h2>
            <Button
              aria-label="Refresh communities"
              className="text-muted-foreground hover:text-foreground size-11 shrink-0 rounded-full"
              disabled={discovering}
              onClick={refresh}
              size="icon"
              variant="ghost"
            >
              <ArrowClockwise className={cn('size-5', discovering && 'motion-safe:animate-spin')} />
            </Button>
          </div>
          {discoveryStatusContent}
          {discovering
            ? COMMUNITY_SKELETON_ROWS.map(key => (
                <div
                  aria-hidden="true"
                  className="flex min-h-16 items-center gap-3 rounded-md px-2 py-2 motion-safe:animate-pulse"
                  key={key}
                >
                  <div className="bg-muted size-12 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="bg-muted h-4 w-28 rounded-full" />
                    <div className="bg-muted h-3.5 w-44 max-w-full rounded-full" />
                  </div>
                  <div className="bg-muted size-9 shrink-0 rounded-full" />
                </div>
              ))
            : visibleCommunities.map(community => (
                <CommunityRow
                  community={community}
                  disabled={loading}
                  key={community.key}
                  onToggle={toggle}
                  selected={effectiveSubreddits.includes(community.key)}
                />
              ))}
          {matchingResult && !discovering && error === null && visibleCommunities.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-sm">
              {data?.source === 'fallback'
                ? 'Try again shortly or add a community below.'
                : 'No communities found. Try a broader genre or add a community below.'}
            </p>
          ) : null}
        </section>
      </div>
      <footer className="text-muted-foreground border-border/50 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-3 text-xs lg:px-5">
        <Link className="hover:text-foreground" href="/privacy">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link className="hover:text-foreground" href="/terms">
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <a
          className="hover:text-foreground"
          href="https://github.com/musicplayer-io/musicplayer.io"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </footer>
      <ShareModal isOpen={share} onClose={() => setShare(false)} subreddits={effectiveSubreddits} />
    </aside>
  )
}
