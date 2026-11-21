'use client'

import {
  ArrowClockwise,
  CaretDown,
  Compass,
  MagnifyingGlass,
  MusicNote,
  Pause,
  Play,
  Shuffle,
  X,
} from '@phosphor-icons/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DiscoveryShelves } from '@/components/discovery-shelves'
import { MixHeader, MixWash } from '@/components/mix-header'
import { TrackLoadingState, TrackRow, TrackTableHeader } from '@/components/track-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { type PlayerState, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { smallCover } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

const TOP_PERIODS = [
  { label: 'Today', value: 'day' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
  { label: 'All time', value: 'all' },
] as const

const EAGER_COVER_COUNT = 6

function sortLabel(sortMethod: PlayerState['sortMethod'], topPeriod: PlayerState['topPeriod']) {
  if (sortMethod === 'hot') {
    return 'Hot'
  }
  if (sortMethod === 'new') {
    return 'New'
  }
  const period = TOP_PERIODS.find(option => option.value === topPeriod)
  return `Top · ${period?.label ?? 'This week'}`
}

function SortMenu({ loading }: { loading: boolean }) {
  const { sortMethod, topPeriod, setSortMethod, setTopPeriod } = usePlayerStore(
    useShallow(state => ({
      setSortMethod: state.setSortMethod,
      setTopPeriod: state.setTopPeriod,
      sortMethod: state.sortMethod,
      topPeriod: state.topPeriod,
    }))
  )
  const label = sortLabel(sortMethod, topPeriod)
  const value = sortMethod === 'top' ? `top:${topPeriod}` : sortMethod

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Sort tracks: ${label}`}
          className="text-muted-foreground hover:text-foreground aria-expanded:text-foreground h-11 gap-1.5 px-3 text-sm font-semibold"
          disabled={loading}
          variant="ghost"
        >
          <span className="text-foreground">{label}</span>
          <CaretDown aria-hidden className="size-3.5" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={next => {
            if (next === 'hot' || next === 'new') {
              setSortMethod(next)
              return
            }
            const period = TOP_PERIODS.find(option => `top:${option.value}` === next)
            if (period) {
              setTopPeriod(period.value)
              setSortMethod('top')
            }
          }}
          value={value}
        >
          <DropdownMenuRadioItem value="hot">Hot</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="new">New</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Top</DropdownMenuLabel>
          {TOP_PERIODS.map(period => (
            <DropdownMenuRadioItem key={period.value} value={`top:${period.value}`}>
              {period.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ActionRow({
  filterOpen,
  filterActive,
  onPlay,
  onRefresh,
  onToggleFilter,
  filterTriggerRef,
}: {
  filterOpen: boolean
  filterActive: boolean
  onPlay: () => void
  onRefresh: () => void
  onToggleFilter: () => void
  filterTriggerRef: RefObject<HTMLButtonElement | null>
}) {
  const { songs, isPlaying, loading, shufflePlaylist } = usePlayerStore(
    useShallow(state => ({
      isPlaying: state.isPlaying,
      loading: state.loading,
      shufflePlaylist: state.shufflePlaylist,
      songs: state.songs,
    }))
  )
  const hasPlayableSongs = songs.some(song => song.playable)

  return (
    <div className="flex shrink-0 items-center gap-2 px-4 py-5 @min-[480px]/mix:gap-3 @min-[480px]/mix:px-6">
      <Button
        aria-label={isPlaying ? 'Pause' : 'Play mix'}
        className="bg-reddit hover:bg-reddit mr-1 size-14 text-white shadow-[0_4px_12px_rgb(0_0_0/0.25)] transition-[scale,background-color] hover:scale-105 active:scale-95"
        disabled={!hasPlayableSongs}
        onClick={onPlay}
        size="icon"
        static
      >
        {isPlaying ? (
          <Pause className="size-6" weight="fill" />
        ) : (
          <Play className="size-6 translate-x-px" weight="fill" />
        )}
      </Button>
      <Button
        aria-label="Shuffle your mix"
        className="text-muted-foreground hover:text-foreground size-11"
        disabled={songs.length < 2}
        onClick={shufflePlaylist}
        size="icon"
        variant="ghost"
      >
        <Shuffle className="size-6" />
      </Button>
      <Button
        aria-label="Refresh your mix"
        className="text-muted-foreground hover:text-foreground size-11"
        disabled={loading}
        onClick={onRefresh}
        size="icon"
        variant="ghost"
      >
        <ArrowClockwise className={cn('size-6', loading && 'motion-safe:animate-spin')} />
      </Button>
      <Button
        aria-expanded={filterOpen}
        aria-label="Find in this mix"
        className={cn(
          'text-muted-foreground hover:text-foreground relative size-11',
          (filterOpen || filterActive) && 'text-foreground'
        )}
        onClick={onToggleFilter}
        ref={filterTriggerRef}
        size="icon"
        variant="ghost"
      >
        <MagnifyingGlass className="size-6" />
        {filterActive ? (
          <span className="bg-reddit absolute top-2 right-2 size-1.5 rounded-full">
            <span className="sr-only">Filter active</span>
          </span>
        ) : null}
      </Button>
      <div className="ml-auto">
        <SortMenu loading={loading} />
      </div>
    </div>
  )
}

function TrackFilter({
  filterQuery,
  onClose,
  onFilterChange,
}: {
  filterQuery: string
  onClose: () => void
  onFilterChange: (query: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="relative mx-4 mb-4 shrink-0 @min-[480px]/mix:mx-6 @min-[480px]/mix:max-w-sm">
      <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
      <Input
        aria-label="Filter tracks in this mix"
        className="bg-muted dark:bg-card h-11 rounded-md border-transparent pr-11 pl-10 text-base shadow-none md:text-sm"
        onChange={event => onFilterChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose()
          }
        }}
        placeholder="Find in this mix"
        ref={inputRef}
        value={filterQuery}
      />
      {filterQuery.length > 0 && (
        <Button
          aria-label="Clear track filter"
          className="text-muted-foreground absolute top-0 right-0 size-11 rounded-md"
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
  )
}

export function PlaylistPanel() {
  const [filterQuery, setFilterQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const {
    songs,
    currentIndex,
    currentSong,
    isPlaying,
    sortMethod,
    topPeriod,
    selectedSubreddits,
    searchQuery,
    listingError,
    loading,
    after,
    setCurrentSong,
    togglePlay,
    setMobileView,
  } = usePlayerStore(
    useShallow(state => ({
      after: state.after,
      currentIndex: state.currentIndex,
      currentSong: state.currentSong,
      isPlaying: state.isPlaying,
      listingError: state.listingError,
      loading: state.loading,
      searchQuery: state.searchQuery,
      selectedSubreddits: state.selectedSubreddits,
      setCurrentSong: state.setCurrentSong,
      setMobileView: state.setMobileView,
      songs: state.songs,
      sortMethod: state.sortMethod,
      togglePlay: state.togglePlay,
      topPeriod: state.topPeriod,
    }))
  )
  const { fetchSongs } = useRedditAPI()
  const previousSort = useRef({ sortMethod, topPeriod })
  const contextKey = searchQuery ? `search/${searchQuery}` : selectedSubreddits.join('+')
  const previousContext = useRef(contextKey)

  useEffect(() => {
    const previous = previousSort.current
    previousSort.current = { sortMethod, topPeriod }
    if (previous.sortMethod === sortMethod && previous.topPeriod === topPeriod) {
      return
    }
    if (usePlayerStore.getState().loading) {
      return
    }

    fetchSongs()
  }, [fetchSongs, sortMethod, topPeriod])

  useEffect(() => {
    if (previousContext.current === contextKey) {
      return
    }
    previousContext.current = contextKey
    setFilterQuery('')
  }, [contextKey])

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

  const closeFilter = () => {
    setFilterOpen(false)
    filterTriggerRef.current?.focus()
  }

  const normalizedFilter = filterQuery.trim().toLowerCase()
  const visibleSongs = songs
    .map((song, index) => ({ index, song }))
    .filter(({ song }) =>
      `${song.title} ${song.subreddit} ${song.author}`.toLowerCase().includes(normalizedFilter)
    )
  const genreCount = songs.filter(song => trackDisplay(song).genre !== null).length
  const showSharedBy = genreCount * 2 < songs.length
  const showSubreddit = Boolean(searchQuery) || selectedSubreddits.length > 1
  const washSong = currentSong?.thumbnail ? currentSong : songs.find(song => song.thumbnail)
  const washSource = washSong ? (smallCover(washSong) ?? null) : null

  return (
    <section
      aria-label="Your music mix"
      className="bg-panel @container/mix flex h-full min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="relative isolate flex shrink-0 flex-col">
          <MixWash src={washSource} />
          <MixHeader songs={songs} />
          <ActionRow
            filterActive={filterQuery.length > 0}
            filterOpen={filterOpen}
            filterTriggerRef={filterTriggerRef}
            onPlay={handlePlayMix}
            onRefresh={() => fetchSongs()}
            onToggleFilter={() => setFilterOpen(open => !open)}
          />
          {filterOpen ? (
            <TrackFilter
              filterQuery={filterQuery}
              onClose={closeFilter}
              onFilterChange={setFilterQuery}
            />
          ) : null}
        </div>

        <div aria-busy={loading} className="shrink-0 px-2 pb-6 @min-[480px]/mix:px-4">
          <span aria-live="polite" className="sr-only">
            {loading ? 'Updating tracks…' : ''}
          </span>
          {listingError !== null && !loading && (
            <div className="bg-destructive/10 mx-2 mb-4 rounded-lg p-4 text-sm" role="alert">
              <p>{listingError}</p>
              <Button
                className="mt-3 h-11 rounded-full px-4"
                disabled={loading}
                onClick={() => fetchSongs()}
                variant="outline"
              >
                Try again
              </Button>
            </div>
          )}
          {(songs.length > 0 || loading) && <TrackTableHeader showSharedBy={showSharedBy} />}
          {loading && songs.length === 0 && <TrackLoadingState />}
          {!loading && songs.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="bg-muted flex size-14 items-center justify-center rounded-lg">
                <MusicNote className="text-muted-foreground size-6" />
              </span>
              <h3 className="mt-1 text-lg font-bold">
                {listingError === null ? 'A little quiet here.' : 'Community not found.'}
              </h3>
              <p className="text-muted-foreground max-w-64 text-sm leading-6">
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
              {normalizedFilter ? (
                <p className="text-muted-foreground px-3 pb-2 text-xs">
                  {visibleSongs.length} matching {visibleSongs.length === 1 ? 'track' : 'tracks'}
                </p>
              ) : null}
              {visibleSongs.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium">No tracks match “{filterQuery}”.</p>
                  <Button
                    className="mt-3 h-11 rounded-full px-4"
                    onClick={() => setFilterQuery('')}
                    variant="ghost"
                  >
                    Clear filter
                  </Button>
                </div>
              ) : (
                <ol className="flex flex-col">
                  {visibleSongs.map(({ song, index }, visibleIndex) => (
                    <li
                      className="min-h-14 [contain-intrinsic-size:auto_56px] [content-visibility:auto]"
                      key={song.id}
                    >
                      <TrackRow
                        index={index}
                        isCurrent={currentIndex === index}
                        isPlaying={isPlaying}
                        onPlay={setCurrentSong}
                        priority={visibleIndex < EAGER_COVER_COUNT}
                        showSharedBy={showSharedBy}
                        showSubreddit={showSubreddit}
                        song={song}
                      />
                    </li>
                  ))}
                </ol>
              )}
              {after !== null && (
                <div className="flex justify-center px-3 pt-6">
                  <Button
                    className="h-11 rounded-full px-6 text-sm font-semibold"
                    disabled={loading}
                    onClick={() => fetchSongs(after)}
                    variant="outline"
                  >
                    {loading ? 'Finding more…' : 'Load more tracks'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {songs.length > 0 ? (
          <div className="shrink-0">
            <DiscoveryShelves />
          </div>
        ) : null}
      </div>
    </section>
  )
}
