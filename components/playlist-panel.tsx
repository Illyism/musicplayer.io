'use client'

import {
  ArrowClockwise,
  ArrowUp,
  CaretDown,
  Clock,
  Compass,
  Flame,
  MagnifyingGlass,
  MusicNote,
  Pause,
  Play,
  RedditLogo,
  Shuffle,
  SpeakerHigh,
  Trophy,
  X,
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { DiscoveryShelves } from '@/components/discovery-shelves'
import { TrackMenu } from '@/components/track-menu'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/errors/reddit-error'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { formatNumber, getPlatformName, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

const SORT_OPTIONS = [
  { icon: Flame, label: 'Hot', value: 'hot' },
  { icon: Clock, label: 'New', value: 'new' },
  { icon: Trophy, label: 'Top', value: 'top' },
] as const

const TOP_PERIODS = [
  { label: 'Today', value: 'day' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'All time', value: 'all' },
] as const

function SortControls({ loading }: { loading: boolean }) {
  const { sortMethod, topPeriod, setSortMethod, setTopPeriod } = usePlayerStore()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset
        aria-label="Sort tracks"
        className="flex gap-1 lg:gap-0 lg:rounded-full lg:bg-muted lg:p-1"
      >
        {SORT_OPTIONS.map(({ icon: Icon, label, value }) => (
          <Button
            aria-pressed={sortMethod === value}
            className={cn(
              'h-11 gap-1.5 rounded-full px-3 text-xs lg:h-9 lg:px-4',
              value === 'top' && 'hidden lg:inline-flex',
              sortMethod === value
                ? 'bg-muted text-foreground lg:bg-background lg:shadow-sm'
                : 'text-muted-foreground'
            )}
            disabled={loading}
            key={value}
            onClick={() => setSortMethod(value)}
            variant="ghost"
          >
            <Icon className="size-3.5" weight={sortMethod === value ? 'fill' : 'regular'} />
            {label}
          </Button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Choose top tracks time period"
              aria-pressed={sortMethod === 'top'}
              className={cn(
                'h-11 gap-1.5 px-3 text-xs lg:hidden',
                sortMethod === 'top' ? 'bg-muted text-foreground' : 'text-muted-foreground'
              )}
              disabled={loading}
              variant="ghost"
            >
              <Trophy className="size-3.5" weight={sortMethod === 'top' ? 'fill' : 'regular'} />
              Top
              <CaretDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Top tracks</DropdownMenuLabel>
            {TOP_PERIODS.map(period => (
              <DropdownMenuItem
                className={cn(
                  'min-h-11',
                  sortMethod === 'top' && topPeriod === period.value && 'bg-muted'
                )}
                key={period.value}
                onSelect={() => {
                  setTopPeriod(period.value)
                  setSortMethod('top')
                }}
              >
                {period.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </fieldset>
      {sortMethod === 'top' && (
        <div className="hidden lg:block">
          <Select
            disabled={loading}
            onValueChange={value => {
              const period = TOP_PERIODS.find(option => option.value === value)
              if (period) {
                setTopPeriod(period.value)
              }
            }}
            value={topPeriod}
          >
            <SelectTrigger
              aria-label="Top tracks time period"
              className="h-11 rounded-full border-border bg-transparent px-4 text-xs data-[size=default]:h-11 sm:data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {TOP_PERIODS.map(period => (
                <SelectItem
                  className="min-h-11 px-3 text-sm"
                  key={period.value}
                  value={period.value}
                >
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

function TrackToolbar({
  filterQuery,
  loading,
  onFilterChange,
}: {
  filterQuery: string
  loading: boolean
  onFilterChange: (query: string) => void
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (filterOpen) {
      inputRef.current?.focus()
    }
  }, [filterOpen])

  return (
    <div
      className="sticky top-0 z-10 flex flex-col gap-2 border-border/70 border-b bg-background/95 px-4 py-2 backdrop-blur-sm sm:px-8 lg:gap-3 lg:pb-4"
      data-track-toolbar
    >
      <div className="flex items-center justify-between gap-2">
        <SortControls loading={loading} />
        <Button
          aria-expanded={filterOpen}
          aria-label="Find in this mix"
          className={cn(
            'relative size-11 text-muted-foreground lg:hidden',
            (filterOpen || filterQuery.length > 0) && 'bg-muted text-foreground'
          )}
          onClick={() => setFilterOpen(open => !open)}
          ref={triggerRef}
          size="icon"
          variant="ghost"
        >
          <MagnifyingGlass className="size-5" />
          {filterQuery.length > 0 && (
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-reddit">
              <span className="sr-only">Filter active</span>
            </span>
          )}
        </Button>
      </div>
      <div className={cn('relative hidden lg:block', filterOpen && 'block')}>
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Filter tracks in this mix"
          className="h-11 rounded-xl border-transparent bg-muted/50 pr-11 pl-10 text-base shadow-none lg:text-sm"
          onChange={event => onFilterChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              setFilterOpen(false)
              triggerRef.current?.focus()
            }
          }}
          placeholder="Find in this mix"
          ref={inputRef}
          value={filterQuery}
        />
        {filterQuery.length > 0 && (
          <Button
            aria-label="Clear track filter"
            className="absolute top-0 right-0 size-11 rounded-xl text-muted-foreground"
            onClick={() => {
              onFilterChange('')
              inputRef.current?.focus()
            }}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

const EAGER_COVER_COUNT = 6

function TrackRow({
  song,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  priority,
}: {
  song: Song
  index: number
  isCurrent: boolean
  isPlaying: boolean
  onPlay: (index: number) => void
  priority?: boolean
}) {
  const display = trackDisplay(song)
  return (
    <div className={cn('flex items-center rounded-xl', isCurrent && 'bg-muted')}>
      <Button
        aria-label={`Play ${song.title}, shared in r/${song.subreddit}`}
        aria-pressed={isCurrent}
        className={cn(
          'group/track grid h-auto min-h-[76px] min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl px-3 py-3 text-left md:grid-cols-[1.5rem_minmax(0,1fr)_auto] xl:grid-cols-[1.5rem_minmax(0,1fr)_4rem]',
          isCurrent ? 'bg-muted hover:bg-muted' : 'hover:bg-muted/60'
        )}
        disabled={!song.playable}
        onClick={() => onPlay(index)}
        variant="ghost"
      >
        <span className="hidden items-center justify-center text-muted-foreground md:flex">
          {isCurrent && isPlaying ? (
            <SpeakerHigh className="size-4 text-reddit" weight="fill" />
          ) : (
            <>
              <span className="text-xs tabular-nums group-hover/track:hidden group-focus-visible/track:hidden">
                {index + 1}
              </span>
              <Play
                className="hidden size-3.5 group-hover/track:block group-focus-visible/track:block"
                weight="fill"
              />
            </>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted outline outline-black/10 dark:outline-white/10">
            {song.thumbnail ? (
              <Image
                alt=""
                className="size-full object-cover"
                height={48}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                src={song.thumbnail}
                unoptimized={isRedditHostedImage(song.thumbnail)}
                width={48}
              />
            ) : (
              <MusicNote className="size-5 text-muted-foreground" />
            )}
            {isCurrent === true && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white md:hidden">
                {isPlaying ? (
                  <SpeakerHigh className="size-4" weight="fill" />
                ) : (
                  <Play className="size-4" weight="fill" />
                )}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="line-clamp-2 whitespace-normal font-medium text-[13px] leading-5 md:block md:truncate">
              {display.title}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="truncate">{display.artist ?? `r/${song.subreddit}`}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{getPlatformName(song.domain)}</span>
              <span className="hidden min-w-0 truncate 2xl:inline">· u/{song.author}</span>
            </span>
          </span>
        </span>
        <span className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground tabular-nums">
          <ArrowUp className="size-3" />
          {formatNumber(song.score)}
        </span>
      </Button>
      <TrackMenu song={song} />
    </div>
  )
}

function TrackLoadingState() {
  return (
    <div aria-label="Loading tracks" className="flex flex-col gap-2 py-2" role="status">
      <span className="sr-only">Finding music from your communities…</span>
      {['one', 'two', 'three', 'four', 'five', 'six'].map(key => (
        <div
          aria-hidden="true"
          className="flex items-center gap-3 rounded-xl px-3 py-3 motion-safe:animate-pulse"
          key={key}
        >
          <div className="size-12 shrink-0 rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-3/4 rounded-full bg-muted" />
            <div className="h-2.5 w-2/5 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PlaylistPanel() {
  const [filterQuery, setFilterQuery] = useState('')
  const [requestError, setRequestError] = useState<string | null>(null)
  const {
    songs,
    currentIndex,
    isPlaying,
    sortMethod,
    topPeriod,
    selectedSubreddits,
    searchQuery,
    loading,
    after,
    setCurrentSong,
    shufflePlaylist,
    togglePlay,
    setMobileView,
  } = usePlayerStore()
  const { fetchSongs } = useRedditAPI()
  const previousSort = useRef({ sortMethod, topPeriod })
  const contextKey = searchQuery ? `search/${searchQuery}` : selectedSubreddits.join('+')
  const previousContext = useRef(contextKey)

  // Initial loading belongs to the app shell. Only changed sort settings reload here.
  useEffect(() => {
    const previous = previousSort.current
    previousSort.current = { sortMethod, topPeriod }
    if (previous.sortMethod === sortMethod && previous.topPeriod === topPeriod) {
      return
    }
    if (usePlayerStore.getState().loading) {
      return
    }

    const refresh = async () => {
      setRequestError(null)
      try {
        await fetchSongs()
      } catch (error) {
        setRequestError(getErrorMessage(error))
      }
    }
    refresh()
  }, [fetchSongs, sortMethod, topPeriod])

  useEffect(() => {
    if (previousContext.current === contextKey) {
      return
    }
    previousContext.current = contextKey
    setRequestError(null)
    setFilterQuery('')
  }, [contextKey])

  const handleFetch = async (pagination?: string) => {
    setRequestError(null)
    try {
      await fetchSongs(pagination)
    } catch (error) {
      setRequestError(getErrorMessage(error))
    }
  }

  const handlePlayMix = () => {
    if (currentIndex >= 0) {
      togglePlay()
      return
    }
    const firstPlayableIndex = songs.findIndex(song => song.playable)
    if (firstPlayableIndex >= 0) {
      setCurrentSong(firstPlayableIndex)
    }
  }

  const normalizedFilter = filterQuery.trim().toLowerCase()
  const visibleSongs = songs
    .map((song, index) => ({ index, song }))
    .filter(({ song }) =>
      `${song.title} ${song.subreddit} ${song.author}`.toLowerCase().includes(normalizedFilter)
    )
  const hasPlayableSongs = songs.some(song => song.playable)

  let context = 'Music shared by the communities you love.'
  if (searchQuery) {
    context = `Music from across Reddit, matching “${searchQuery}”.`
  } else if (selectedSubreddits.length === 1) {
    context = `Fresh finds from r/${selectedSubreddits[0]}, ready to play.`
  } else if (selectedSubreddits.length > 1) {
    context = `Your own mix of ${selectedSubreddits.length} music communities.`
  }

  return (
    <section aria-label="Your music mix" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-8 lg:gap-4 lg:pt-8 lg:pb-5">
          <div className="hidden items-center gap-2 text-muted-foreground text-xs lg:flex">
            <RedditLogo className="size-4 text-reddit" weight="fill" />
            <span>Good music. Real communities.</span>
          </div>
          <div>
            <h1 className="max-w-[26ch] text-balance font-semibold text-2xl leading-[1.15] tracking-[-0.04em] lg:text-[32px]">
              {searchQuery ? (
                `Sounds like “${searchQuery}”.`
              ) : (
                <>
                  <span className="lg:hidden">Your mix</span>
                  <span className="hidden lg:inline">Your next favorite is here.</span>
                </>
              )}
            </h1>
            <p className="mt-2 max-w-[46ch] text-muted-foreground text-sm leading-5 lg:mt-3 lg:leading-6">
              {context}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-11 gap-2 rounded-full px-5 text-sm"
              disabled={!hasPlayableSongs}
              onClick={handlePlayMix}
            >
              {isPlaying ? (
                <Pause className="size-4" weight="fill" />
              ) : (
                <Play className="size-4 translate-x-px" weight="fill" />
              )}
              {isPlaying ? 'Pause' : 'Play mix'}
            </Button>
            <Button
              aria-label="Shuffle your mix"
              className="size-11 rounded-full border-border"
              disabled={songs.length < 2}
              onClick={shufflePlaylist}
              size="icon"
              variant="outline"
            >
              <Shuffle className="size-4" />
            </Button>
            <span className="pl-2 text-muted-foreground text-xs tabular-nums">
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
            </span>
            <Button
              aria-label="Refresh your mix"
              className="ml-auto size-11 rounded-full text-muted-foreground"
              disabled={loading}
              onClick={() => handleFetch()}
              size="icon"
              variant="ghost"
            >
              <ArrowClockwise className={cn('size-4', loading && 'motion-safe:animate-spin')} />
            </Button>
          </div>
        </header>

        <div className={searchQuery ? undefined : 'min-h-[228px]'}>
          {songs.length > 0 ? <DiscoveryShelves /> : null}
        </div>

        <TrackToolbar filterQuery={filterQuery} loading={loading} onFilterChange={setFilterQuery} />

        <div aria-busy={loading} className="flex-1 px-2 pt-3 pb-6 sm:px-5 lg:px-7">
          {requestError !== null && (
            <div className="mx-3 mb-4 rounded-xl bg-destructive/10 p-4 text-sm" role="alert">
              <p>{requestError}</p>
              <Button
                className="mt-3 h-11 rounded-full px-4"
                disabled={loading}
                onClick={() => handleFetch()}
                variant="outline"
              >
                Try again
              </Button>
            </div>
          )}
          {songs.length === 0 &&
            (loading ||
              (selectedSubreddits.length > 0 && !searchQuery && requestError === null)) && (
              <TrackLoadingState />
            )}
          {!loading &&
            songs.length === 0 &&
            requestError === null &&
            (searchQuery !== null || selectedSubreddits.length === 0) && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <MusicNote className="size-6 text-muted-foreground" />
                </span>
                <h3 className="mt-1 font-medium text-lg">A little quiet here.</h3>
                <p className="max-w-64 text-muted-foreground text-sm leading-6">
                  {searchQuery
                    ? 'Try another search, or explore a music community.'
                    : 'Try another community or sort to find something good.'}
                </p>
                <Button
                  className="mt-2 h-11 gap-2 rounded-full px-5 lg:hidden"
                  onClick={() => setMobileView('browse')}
                  variant="outline"
                >
                  <Compass className="size-4" />
                  Explore communities
                </Button>
              </div>
            )}
          {songs.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground">
                <span>
                  {normalizedFilter ? `${visibleSongs.length} matching tracks` : 'In the mix'}
                </span>
                <span aria-live="polite">{loading ? 'Updating…' : 'Upvotes'}</span>
              </div>
              {visibleSongs.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="font-medium text-sm">No tracks match “{filterQuery}”.</p>
                  <Button
                    className="mt-3 h-11 rounded-full px-4"
                    onClick={() => setFilterQuery('')}
                    variant="ghost"
                  >
                    Clear filter
                  </Button>
                </div>
              ) : (
                <ol className="flex min-h-[480px] flex-col gap-1">
                  {visibleSongs.map(({ song, index }, visibleIndex) => (
                    <li className="min-h-[76px]" key={song.id}>
                      <TrackRow
                        index={index}
                        isCurrent={currentIndex === index}
                        isPlaying={isPlaying}
                        onPlay={setCurrentSong}
                        priority={visibleIndex < EAGER_COVER_COUNT}
                        song={song}
                      />
                    </li>
                  ))}
                </ol>
              )}
              {after !== null && (
                <div className="flex justify-center px-3 pt-6">
                  <Button
                    className="h-11 rounded-full px-6 text-sm"
                    disabled={loading}
                    onClick={() => handleFetch(after)}
                    variant="outline"
                  >
                    {loading ? 'Finding more…' : 'Load more tracks'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
