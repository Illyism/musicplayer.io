"use client"

import { useEffect, useState } from "react"
import { Shuffle, ArrowUp, Wifi, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePlaylistStore } from "@/lib/store"
import { useRedditMusic } from "@/lib/hooks/use-reddit-music"
import Link from "next/link"

export function PlaylistPanel() {
  const songs = usePlaylistStore((state) => state.songs)
  const currentIndex = usePlaylistStore((state) => state.currentIndex)
  const isPlaying = usePlaylistStore((state) => state.isPlaying)
  const sortMethod = usePlaylistStore((state) => state.sortMethod)
  const topMethod = usePlaylistStore((state) => state.topMethod)
  const loading = usePlaylistStore((state) => state.loading)
  const after = usePlaylistStore((state) => state.after)
  const searchQuery = usePlaylistStore((state) => state.searchQuery)
  const setSortMethod = usePlaylistStore((state) => state.setSortMethod)
  const setTopMethod = usePlaylistStore((state) => state.setTopMethod)
  const setCurrentSong = usePlaylistStore((state) => state.setCurrentSong)
  const { fetchMusic, fetchSearch } = useRedditMusic()

  const handleSongClick = (song: typeof songs[0], index: number) => {
    setCurrentSong(index)
  }

  const handleLoadMore = async () => {
    const after = usePlaylistStore.getState().after
    await fetchMusic(after)
  }

  const handleShuffle = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    usePlaylistStore.getState().setSongs(shuffled)
  }

  const handleSortChange = (newSort: "hot" | "new" | "top") => {
    if (newSort === sortMethod) return // Prevent unnecessary re-fetch
    setSortMethod(newSort)
    // useEffect will handle the fetch when sortMethod changes
  }

  const handleTopMethodChange = async (newTop: "day" | "week" | "month" | "year" | "all") => {
    if (newTop === topMethod) return // Prevent unnecessary re-fetch
    setTopMethod(newTop)
    // Don't call fetchMusic here - let useEffect handle it to prevent double calls
  }

  useEffect(() => {
    const state = usePlaylistStore.getState()
    const loadMusic = async () => {
      // Skip if no subreddits selected and no search query
      if (!state.searchQuery && state.selectedSubreddits.length === 0) {
        return
      }
      
      // Clear songs before loading new ones
      usePlaylistStore.getState().setSongs([])
      
      // If search query exists, use search
      if (state.searchQuery) {
        await fetchSearch(state.searchQuery)
      } else {
        await fetchMusic()
      }
    }
    loadMusic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMethod, topMethod])

  return (
    <div className="content-playlist py-4 md:py-6 px-2 md:px-4 relative bg-[#121212]">
      {/* Loading Overlay - Only show when loading initial songs, not when loading more */}
      {loading && songs.length === 0 && (
        <div className="absolute inset-0 bg-[#111]/90 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FDC00F] border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        </div>
      )}
      
      {/* Header - Compact */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h1 className="text-base md:text-lg font-semibold text-white mb-0.5">Playlist</h1>
            <p className="text-[10px] md:text-xs text-gray-500">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={handleShuffle}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Link href="/remote">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white h-8 w-8 p-0"
                title="Remote"
              >
                <Wifi className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Sort Method - Compact */}
        <div className="flex items-center gap-1 pb-3 border-b border-white/5">
          <Button
            onClick={() => handleSortChange("hot")}
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors h-auto ${
              sortMethod === "hot"
                ? "bg-white text-black hover:bg-white hover:text-black"
                : "text-gray-400 hover:text-[#FDC00F] hover:bg-transparent"
            }`}
          >
            Hot
          </Button>
          <Button
            onClick={() => handleSortChange("new")}
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors h-auto ${
              sortMethod === "new"
                ? "bg-white text-black hover:bg-white hover:text-black"
                : "text-gray-400 hover:text-[#FDC00F] hover:bg-transparent"
            }`}
          >
            New
          </Button>
          <Button
            onClick={() => handleSortChange("top")}
            variant="ghost"
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors h-auto ${
              sortMethod === "top"
                ? "bg-white text-black hover:bg-white hover:text-black"
                : "text-gray-400 hover:text-[#FDC00F] hover:bg-transparent"
            }`}
          >
            Top
          </Button>
          {sortMethod === "top" && (
            <Select
              value={topMethod}
              onValueChange={(value) => handleTopMethodChange(value as any)}
            >
              <SelectTrigger className="ml-2 px-3 py-2 text-sm bg-transparent border border-white/20 text-white rounded-full hover:border-white/40 transition-colors focus:outline-none focus:border-white/60 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/20 text-white">
                <SelectItem value="day" className="text-white hover:bg-[#FDC00F]/20 hover:text-[#FDC00F] focus:bg-[#FDC00F]/20 focus:text-[#FDC00F]">Today</SelectItem>
                <SelectItem value="week" className="text-white hover:bg-[#FDC00F]/20 hover:text-[#FDC00F] focus:bg-[#FDC00F]/20 focus:text-[#FDC00F]">This Week</SelectItem>
                <SelectItem value="month" className="text-white hover:bg-[#FDC00F]/20 hover:text-[#FDC00F] focus:bg-[#FDC00F]/20 focus:text-[#FDC00F]">This Month</SelectItem>
                <SelectItem value="year" className="text-white hover:bg-[#FDC00F]/20 hover:text-[#FDC00F] focus:bg-[#FDC00F]/20 focus:text-[#FDC00F]">This Year</SelectItem>
                <SelectItem value="all" className="text-white hover:bg-[#FDC00F]/20 hover:text-[#FDC00F] focus:bg-[#FDC00F]/20 focus:text-[#FDC00F]">All Time</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Playlist - Spotify Table Style */}
      <div>
        {loading && songs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FDC00F] border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm text-gray-400">Loading songs...</p>
            </div>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-base font-medium text-white mb-1">No songs found</p>
              <p className="text-sm text-gray-400">Select subreddits to build your playlist</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Column Headers - Spotify Style - Responsive */}
            <div className="hidden md:grid grid-cols-[24px_2fr_1fr_90px_60px] gap-4 px-2 mx-2 py-2 border-b border-white/5 mb-1">
              <div className="text-xs font-medium text-gray-400 text-center">#</div>
              <div className="text-xs font-medium text-gray-400">Title</div>
              <div className="text-xs font-medium text-gray-400">Subreddit</div>
              <div className="text-xs font-medium text-gray-400">Date added</div>
              <div className="text-xs font-medium text-gray-400 text-right">Karma</div>
            </div>

            {/* Song Rows - Spotify Style - Responsive */}
            <div>
              {songs.map((song, index) => (
                <div
                  key={`${song.id}-${song.name}-${index}`}
                  onClick={() => handleSongClick(song, index)}
                  className={`group hidden md:grid grid-cols-[24px_2fr_1fr_90px_60px] gap-4 px-2 py-1.5 mx-2 rounded-md cursor-pointer transition-colors ${
                    currentIndex === index
                      ? "bg-white/10"
                      : "hover:bg-[#1a1a1a]"
                  }`}
                >
                  {/* Track Number / Playing Indicator */}
                  <div className="flex items-center justify-center min-w-[24px]">
                    {currentIndex === index && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        <div className="w-0.5 h-3 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <div className="w-0.5 h-4 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <div className="w-0.5 h-2 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400 group-hover:hidden">
                          {index + 1}
                        </span>
                        <Play className="w-3.5 h-3.5 text-white hidden group-hover:block" />
                      </>
                    )}
                  </div>

                  {/* Title Column */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-10 h-10">
                      {song.thumbnail && 
                       song.thumbnail !== "self" && 
                       song.thumbnail !== "default" && 
                       song.thumbnail !== "nsfw" &&
                       (song.thumbnail.startsWith("http") || song.thumbnail.startsWith("//")) ? (
                        <img
                          src={song.thumbnail.startsWith("//") ? `https:${song.thumbnail}` : song.thumbnail}
                          alt=""
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                          <Play className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    {/* Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        currentIndex === index ? "text-[#FDC00F]" : "text-white"
                      }`}>
                        {song.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {song.author}
                      </p>
                    </div>
                  </div>

                  {/* Subreddit Column */}
                  <div className="flex items-center min-w-0">
                    <p className="text-sm text-gray-400 truncate">
                      {song.subreddit}
                    </p>
                  </div>

                  {/* Date Added Column */}
                  <div className="flex items-center min-w-[100px]">
                    <p className="text-xs text-gray-400 truncate">
                      {song.created_ago || '—'}
                    </p>
                  </div>

                  {/* Score Column */}
                  <div className="flex items-center justify-end min-w-[50px]">
                    <span className="text-xs text-gray-400">
                      {song.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
              {songs.map((song, index) => (
                <div
                  key={`${song.id}-${song.name}-${index}-mobile`}
                  onClick={() => handleSongClick(song, index)}
                  className={`p-3 rounded-lg border border-white/5 cursor-pointer transition-colors ${
                    currentIndex === index
                      ? "bg-white/10 border-[#FDC00F]/30"
                      : "bg-[#1a1a1a] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-12 h-12">
                      {song.thumbnail && 
                       song.thumbnail !== "self" && 
                       song.thumbnail !== "default" && 
                       song.thumbnail !== "nsfw" &&
                       (song.thumbnail.startsWith("http") || song.thumbnail.startsWith("//")) ? (
                        <img
                          src={song.thumbnail.startsWith("//") ? `https:${song.thumbnail}` : song.thumbnail}
                          alt=""
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                          <Play className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      {currentIndex === index && isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                          <div className="flex gap-0.5 items-end h-4">
                            <div className="w-0.5 h-3 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="w-0.5 h-4 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-0.5 h-2 bg-[#FDC00F] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        currentIndex === index ? "text-[#FDC00F]" : "text-white"
                      }`}>
                        {song.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-gray-400 truncate">
                          {song.subreddit}
                        </p>
                        <span className="text-[10px] text-gray-500">•</span>
                        <p className="text-[10px] text-gray-400">
                          {song.score} karma
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Load More - Spotify Style */}
        {songs.length > 0 && after && (
          <div className="mt-8 pt-4 border-t border-white/5">
            <Button
              onClick={handleLoadMore}
              disabled={loading}
              variant="ghost"
              className="w-full py-3 text-center text-sm text-gray-400 hover:text-white hover:bg-transparent font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-auto border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#FDC00F] border-t-transparent"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

