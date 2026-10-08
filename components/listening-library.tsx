'use client'

import { ClockCounterClockwise, Heart, MusicNote, Play } from '@phosphor-icons/react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ListeningSettings } from '@/components/listening-settings'
import { SaveTrackButton } from '@/components/save-track-button'
import { TrackMenu } from '@/components/track-menu'
import { Button } from '@/components/ui/button'
import { useListeningStore } from '@/lib/store/listening-store'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function LibraryTrack({ song }: { song: Song }) {
  const playQueuedSong = usePlayerStore(state => state.playQueuedSong)
  const enqueueSong = usePlayerStore(state => state.enqueueSong)
  const display = trackDisplay(song)
  const play = () => {
    enqueueSong(song, 'next')
    playQueuedSong(song.id)
  }
  return (
    <div className="flex min-h-20 items-center gap-1">
      <button
        aria-label={`Play ${song.title}, shared in r/${song.subreddit}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={play}
        type="button"
      >
        {song.thumbnail ? (
          <Image
            alt=""
            className="size-14 shrink-0 rounded-lg object-cover"
            height={56}
            src={song.thumbnail}
            unoptimized={isRedditHostedImage(song.thumbnail)}
            width={56}
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
            <MusicNote className="size-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm" title={song.title}>
            {display.title}
          </span>
          <span className="mt-1 block truncate text-muted-foreground text-xs">
            {display.artist ? `${display.artist} · ` : null}
            r/{song.subreddit}
          </span>
        </span>
      </button>
      <TrackMenu song={song} />
    </div>
  )
}

export function ListeningLibrary({ active = true }: { active?: boolean }) {
  const { savedSongs, savedSongIds, recentSongs, refreshSongs } = useListeningStore()
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const enqueueSong = usePlayerStore(state => state.enqueueSong)
  const playQueuedSong = usePlayerStore(state => state.playQueuedSong)
  const missingIds = savedSongIds.filter(id => !savedSongs.some(song => song.id === id)).join(',')

  useEffect(() => {
    if (!(active && missingIds)) {
      return
    }
    const controller = new AbortController()
    const reload = async () => {
      setRefreshing(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/saved-tracks?${new URLSearchParams({ ids: missingIds })}`,
          { cache: attempt > 0 ? 'reload' : 'default', signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error('Saved tracks could not refresh. Try again shortly.')
        }
        const data: Song[] = await response.json()
        if (!controller.signal.aborted) {
          refreshSongs(data)
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Saved tracks could not refresh.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false)
        }
      }
    }
    reload()
    return () => controller.abort()
  }, [active, missingIds, refreshSongs, attempt])
  return (
    <div className="flex min-h-full flex-col gap-8 px-5 py-5 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-3xl tracking-tight">Your library</h1>
        <ListeningSettings />
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-xl">
            <Heart className="size-5 text-reddit" weight="fill" />
            Saved tracks
          </h2>
          {savedSongs.length > 0 && (
            <Button
              aria-label="Play saved tracks"
              className="size-12 rounded-full"
              onClick={() => {
                for (const song of [...savedSongs].reverse()) {
                  enqueueSong(song, 'next')
                }
                playQueuedSong(savedSongs[0].id)
              }}
              size="icon"
            >
              <Play className="size-5" weight="fill" />
            </Button>
          )}
        </div>
        {savedSongIds.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-5">
            <p className="font-medium">Keep the good finds.</p>
            <p className="text-muted-foreground text-sm">
              Tap the save button on a track to find it here. No sign-in needed.
            </p>
          </div>
        ) : (
          <div>
            {savedSongs.map(song => (
              <div className="flex items-center gap-1" key={song.id}>
                <div className="min-w-0 flex-1">
                  <LibraryTrack song={song} />
                </div>
                <SaveTrackButton song={song} />
              </div>
            ))}
          </div>
        )}
        {missingIds && (
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            <p aria-live="polite">
              {refreshing
                ? 'Refreshing saved tracks…'
                : (error ??
                  'Some saved tracks are currently unavailable. Your bookmarks are still saved.')}
            </p>
            <Button
              className="mt-3"
              disabled={refreshing}
              onClick={() => setAttempt(value => value + 1)}
              variant="outline"
            >
              Refresh saved tracks
            </Button>
          </div>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-semibold text-xl">
          <ClockCounterClockwise className="size-5" />
          Recently played
        </h2>
        {recentSongs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tracks appear after you’ve listened for a little while.
          </p>
        ) : (
          <div>
            {recentSongs.map(song => (
              <LibraryTrack key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
