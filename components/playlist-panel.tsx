'use client'

import { CaretDown, Play, Shuffle } from '@phosphor-icons/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
import { usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'

export function PlaylistPanel() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const {
    songs,
    currentIndex,
    isPlaying,
    sortMethod,
    topPeriod,
    loading,
    after,
    setSortMethod,
    setTopPeriod,
    setCurrentSong,
    shufflePlaylist,
  } = usePlayerStore()

  const { fetchSongs } = useRedditAPI()

  // Reload when sort changes - only depend on sortMethod and topPeriod
  useEffect(() => {
    const doFetch = async () => {
      try {
        setIsTransitioning(true)
        await fetchSongs()
      } catch {
        // ignore - fetchSongs logs errors
      } finally {
        setIsTransitioning(false)
      }
    }

    // Always refresh the playlist when sort or top period changes
    doFetch()
  }, [fetchSongs])

  const handleSortChange = (newSort: 'hot' | 'new' | 'top') => {
    if (newSort === sortMethod) {
      return // Don't reload if same
    }
    setSortMethod(newSort)
  }

  const handleTopPeriodChange = (newPeriod: 'day' | 'week' | 'month' | 'year' | 'all') => {
    if (newPeriod === topPeriod) {
      return // Don't reload if same
    }
    setTopPeriod(newPeriod)
  }

  const handleLoadMore = async () => {
    if (after && !loading) {
      await fetchSongs(after)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="mb-0.5 font-bold text-lg">All Music</h2>
            <p className="text-muted-foreground text-sm">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
          <button
            className="rounded-lg bg-secondary/50 p-2 transition-colors hover:bg-secondary"
            onClick={shufflePlaylist}
            title="Shuffle"
            type="button"
          >
            <Shuffle className="h-4 w-4" weight="fill" />
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-full px-3 py-1.5 font-semibold text-xs transition-colors ${
              sortMethod === 'hot'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={loading}
            onClick={() => handleSortChange('hot')}
            type="button"
          >
            {loading && sortMethod === 'hot' && (
              <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Hot
          </button>
          <button
            className={`rounded-full px-3 py-1.5 font-semibold text-xs transition-colors ${
              sortMethod === 'new'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={loading}
            onClick={() => handleSortChange('new')}
            type="button"
          >
            {loading && sortMethod === 'new' && (
              <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            New
          </button>
          <button
            className={`rounded-full px-3 py-1.5 font-semibold text-xs transition-colors ${
              sortMethod === 'top'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={loading}
            onClick={() => handleSortChange('top')}
            type="button"
          >
            {loading && sortMethod === 'top' && (
              <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Top
          </button>

          {sortMethod === 'top' && (
            <div className="relative">
              <select
                className={`cursor-pointer appearance-none rounded-full bg-secondary py-1.5 pr-8 pl-3 font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-ring ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
                disabled={loading}
                onChange={e => handleTopPeriodChange(e.target.value as any)}
                value={topPeriod}
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
              <CaretDown
                className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2"
                weight="fill"
              />
            </div>
          )}
        </div>
      </div>

      {/* Song List */}
      <div
        className={`flex-1 overflow-y-auto pb-24 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* pb-24 = 96px for player controls */}
        {(() => {
          if (loading && songs.length === 0) {
            return (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Loading songs...</p>
                </div>
              </div>
            )
          }
          if (songs.length === 0) {
            return (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <p className="mb-1 font-medium text-base">No songs found</p>
                  <p className="text-muted-foreground text-sm">
                    Select subreddits to build your playlist
                  </p>
                </div>
              </div>
            )
          }
          return (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                    <tr className="border-border border-b text-[11px] text-muted-foreground uppercase tracking-wide">
                      <th className="w-[44px] py-2.5 text-center">#</th>
                      <th className="px-3 py-2.5 text-left">Title</th>
                      <th className="w-[130px] px-3 py-2.5 text-left">Subreddit</th>
                      <th className="w-[105px] px-3 py-2.5 text-left">Added</th>
                      <th className="w-[70px] px-3 py-2.5 text-right">Karma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song, index) => (
                      <tr
                        className={`group cursor-pointer transition-colors ${
                          currentIndex === index
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-secondary/40'
                        }`}
                        key={song.id}
                        onClick={() => setCurrentSong(index)}
                      >
                        <td className="w-[44px] py-2.5 text-center">
                          <div className="flex items-center justify-center">
                            {currentIndex === index && isPlaying ? (
                              <div className="flex h-4 items-end gap-0.5">
                                <div className="h-2 w-0.5 animate-pulse bg-primary" />
                                <div className="h-3 w-0.5 animate-pulse bg-primary [animation-delay:150ms]" />
                                <div className="h-2 w-0.5 animate-pulse bg-primary [animation-delay:300ms]" />
                              </div>
                            ) : (
                              <>
                                <span className="text-muted-foreground text-xs group-hover:hidden">
                                  {index + 1}
                                </span>
                                <Play className="hidden h-3 w-3 group-hover:block" weight="fill" />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="overflow-hidden px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-3">
                            {song.thumbnail && (
                              <Image
                                alt=""
                                className="shrink-0 rounded object-cover"
                                height={36}
                                src={song.thumbnail}
                                style={{ height: 36, width: 36 }}
                                unoptimized={isRedditHostedImage(song.thumbnail)}
                                width={36}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate font-medium text-sm ${
                                  currentIndex === index ? 'text-primary' : ''
                                }`}
                              >
                                {song.title}
                              </p>
                              <p className="truncate text-muted-foreground text-xs">
                                u/{song.author}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="w-[130px] px-3 py-2.5">
                          <p className="truncate text-muted-foreground text-xs">
                            r/{song.subreddit}
                          </p>
                        </td>
                        <td className="w-[105px] px-3 py-2.5">
                          <p className="truncate text-muted-foreground text-xs">
                            {song.created_ago}
                          </p>
                        </td>
                        <td className="w-[70px] px-3 py-2.5 text-right">
                          <p className="text-muted-foreground text-xs">{song.score}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-2 p-4 md:hidden">
                {songs.map((song, index) => (
                  <button
                    className={`block w-full cursor-pointer rounded-lg p-3 text-left transition-colors ${
                      currentIndex === index
                        ? 'border border-primary/20 bg-primary/10'
                        : 'border border-border bg-card hover:bg-secondary'
                    }`}
                    key={song.id}
                    onClick={() => setCurrentSong(index)}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      {song.thumbnail && (
                        <Image
                          alt=""
                          className="shrink-0 rounded object-cover"
                          height={48}
                          src={song.thumbnail}
                          style={{ height: 48, width: 48 }}
                          unoptimized={isRedditHostedImage(song.thumbnail)}
                          width={48}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className={`block truncate font-medium text-sm ${
                            currentIndex === index ? 'text-primary' : ''
                          }`}
                        >
                          {song.title}
                        </span>
                        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="truncate">r/{song.subreddit}</span>
                          <span>•</span>
                          <span>{song.score}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More */}
              {after && (
                <div className="border-border border-t p-4">
                  <button
                    className="w-full py-2 text-muted-foreground text-sm transition-colors hover:text-foreground disabled:opacity-50"
                    disabled={loading}
                    onClick={handleLoadMore}
                    type="button"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
