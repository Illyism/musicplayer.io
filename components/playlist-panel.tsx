'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Play, Shuffle, ChevronDown } from 'lucide-react'
import { usePlayerStore } from '@/lib/store/player-store'
import { useRedditAPI } from '@/lib/hooks/use-reddit-api'
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
  }, [sortMethod, topPeriod, fetchSongs])

  const handleSortChange = (newSort: 'hot' | 'new' | 'top') => {
    if (newSort === sortMethod) return // Don't reload if same
    setSortMethod(newSort)
  }

  const handleTopPeriodChange = (newPeriod: 'day' | 'week' | 'month' | 'year' | 'all') => {
    if (newPeriod === topPeriod) return // Don't reload if same
    setTopPeriod(newPeriod)
  }

  const handleLoadMore = async () => {
    if (after && !loading) {
      await fetchSongs(after)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Playlist</h2>
            <p className="text-sm text-muted-foreground">
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
          <button
            onClick={shufflePlaylist}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
            title="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSortChange('hot')}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              sortMethod === 'hot'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading && sortMethod === 'hot' && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            )}
            Hot
          </button>
          <button
            onClick={() => handleSortChange('new')}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              sortMethod === 'new'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading && sortMethod === 'new' && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            )}
            New
          </button>
          <button
            onClick={() => handleSortChange('top')}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              sortMethod === 'top'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading && sortMethod === 'top' && (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
            )}
            Top
          </button>

          {sortMethod === 'top' && (
            <div className="relative">
              <select
                value={topPeriod}
                onChange={e => handleTopPeriodChange(e.target.value as any)}
                disabled={loading}
                className={`pl-3 pr-8 py-1.5 text-xs font-medium bg-secondary rounded-full appearance-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
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
        {loading && songs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading songs...</p>
            </div>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-base font-medium mb-1">No songs found</p>
              <p className="text-sm text-muted-foreground">
                Select subreddits to build your playlist
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="w-[50px] text-center py-3">#</th>
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4 w-[140px]">Subreddit</th>
                    <th className="text-left py-3 px-4 w-[110px]">Date Added</th>
                    <th className="text-right py-3 px-4 w-[80px]">Karma</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song, index) => (
                    <tr
                      key={`${song.id}-${index}`}
                      onClick={() => setCurrentSong(index)}
                      className={`group cursor-pointer transition-colors ${
                        currentIndex === index ? 'bg-primary/10' : 'hover:bg-secondary/50'
                      }`}
                    >
                      <td className="text-center py-3 w-[50px]">
                        <div className="flex items-center justify-center">
                          {currentIndex === index && isPlaying ? (
                            <div className="flex gap-0.5 items-end h-4">
                              <div className="w-0.5 h-2 bg-primary animate-pulse" />
                              <div className="w-0.5 h-3 bg-primary animate-pulse [animation-delay:150ms]" />
                              <div className="w-0.5 h-2 bg-primary animate-pulse [animation-delay:300ms]" />
                            </div>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground group-hover:hidden">
                                {index + 1}
                              </span>
                              <Play className="h-3 w-3 hidden group-hover:block" />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                          {song.thumbnail && (
                            <Image
                              src={song.thumbnail}
                              alt=""
                              width={40}
                              height={40}
                              className="rounded object-cover shrink-0"
                              unoptimized={isRedditHostedImage(song.thumbnail)}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium truncate ${
                                currentIndex === index ? 'text-primary' : ''
                              }`}
                            >
                              {song.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{song.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 w-[140px]">
                        <p className="text-xs text-muted-foreground truncate">r/{song.subreddit}</p>
                      </td>
                      <td className="py-3 px-4 w-[110px]">
                        <p className="text-xs text-muted-foreground truncate">{song.created_ago}</p>
                      </td>
                      <td className="py-3 px-4 text-right w-[80px]">
                        <p className="text-xs text-muted-foreground">{song.score}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2 p-4">
              {songs.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  onClick={() => setCurrentSong(index)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentIndex === index
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-card border border-border hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {song.thumbnail && (
                      <Image
                        src={song.thumbnail}
                        alt=""
                        width={48}
                        height={48}
                        className="rounded object-cover shrink-0"
                        unoptimized={isRedditHostedImage(song.thumbnail)}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium truncate ${
                          currentIndex === index ? 'text-primary' : ''
                        }`}
                      >
                        {song.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="truncate">r/{song.subreddit}</span>
                        <span>•</span>
                        <span>{song.score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {after && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
