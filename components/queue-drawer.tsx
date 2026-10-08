'use client'

import { ArrowDown, ArrowUp, DotsThree, MusicNote, Queue, X } from '@phosphor-icons/react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

function QueueArtwork({ song }: { song: Song }) {
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
      {song.thumbnail ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="48px"
          src={song.thumbnail}
          unoptimized={isRedditHostedImage(song.thumbnail)}
        />
      ) : (
        <MusicNote aria-hidden className="size-5" />
      )}
    </span>
  )
}

function QueueDetails({ song }: { song: Song }) {
  const { title, artist } = trackDisplay(song)
  const source = song.subreddit ? `r/${song.subreddit}` : song.domain || 'Music from Reddit'

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="truncate font-medium text-sm" title={song.title}>
        {title}
      </span>
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
        {artist ? (
          <>
            <span className="truncate">{artist}</span>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <span className={artist ? 'max-w-[55%] shrink-0 truncate' : 'truncate'} title={source}>
          {source}
        </span>
      </span>
    </span>
  )
}

function QueueTrack({ song, onPlay }: { onPlay: () => void; song: Song }) {
  return (
    <Button
      aria-label={`Play ${song.title}`}
      className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-xl p-2 text-left"
      onClick={onPlay}
      static
      type="button"
      variant="ghost"
    >
      <QueueArtwork song={song} />
      <QueueDetails song={song} />
    </Button>
  )
}

export function QueueDrawer() {
  const {
    clearQueue,
    currentSong,
    failedSongIds,
    listingCursorId,
    moveQueuedSong,
    playQueuedSong,
    queueOpen,
    queueSongs,
    removeQueuedSong,
    repeatMode,
    setCurrentSong,
    setQueueOpen,
    songs,
  } = usePlayerStore()
  const [announcement, setAnnouncement] = useState('')
  const swipeStartRef = useRef<{ pointerId: number; y: number } | null>(null)
  const suppressClickRef = useRef<boolean>(false)
  const cursorIndex = songs.findIndex(song => song.id === listingCursorId)
  const availableTracks = songs
    .map((song, index) => ({ index, song }))
    .filter(({ song }) => song.playable && !failedSongIds.includes(song.id))
  const nextTracks = availableTracks.filter(({ index }) => index > cursorIndex)
  if (repeatMode === 'all' && cursorIndex >= 0) {
    nextTracks.push(...availableTracks.filter(({ index }) => index <= cursorIndex))
  }

  const reorder = (song: Song, direction: 'up' | 'down') => {
    moveQueuedSong(song.id, direction)
    setAnnouncement(`Moved ${song.title} ${direction === 'up' ? 'earlier' : 'later'} in the queue.`)
  }

  const remove = (song: Song) => {
    removeQueuedSong(song.id)
    setAnnouncement(`Removed ${song.title} from the queue.`)
  }

  const dismissQueue = () => {
    setQueueOpen(false)
    setAnnouncement('')
  }

  return (
    <Dialog
      onOpenChange={open => {
        setQueueOpen(open)
        if (!open) {
          setAnnouncement('')
        }
      }}
      open={queueOpen}
    >
      <DialogContent className="top-auto bottom-0 left-0 flex h-[85dvh] max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0 p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-dvh sm:w-[440px] sm:max-w-[calc(100vw_-_2rem)] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l sm:p-0">
        <Button
          aria-label="Close queue"
          className="h-11 w-full shrink-0 touch-none rounded-none bg-transparent p-0 hover:bg-transparent sm:hidden"
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false
              return
            }
            dismissQueue()
          }}
          onPointerCancel={() => {
            swipeStartRef.current = null
          }}
          onPointerDown={event => {
            if (!event.isPrimary || swipeStartRef.current) {
              return
            }
            suppressClickRef.current = false
            swipeStartRef.current = { pointerId: event.pointerId, y: event.clientY }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={event => {
            const start = swipeStartRef.current
            if (!start || start.pointerId !== event.pointerId) {
              return
            }
            swipeStartRef.current = null
            const distance = event.clientY - start.y
            suppressClickRef.current = Math.abs(distance) > 8
            if (distance > 60) {
              dismissQueue()
            }
          }}
          static
          title="Close queue"
          type="button"
          variant="ghost"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-muted-foreground/40" />
        </Button>
        <DialogHeader className="shrink-0 gap-1 border-border border-b px-6 py-6 pr-16 text-left">
          <DialogTitle className="text-2xl leading-tight">Queue</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {repeatMode === 'one'
              ? 'This track is on repeat. Press Next to continue your queue.'
              : 'Your picks play first, followed by music from this feed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          {currentSong ? (
            <section aria-label="Now playing" className="py-5">
              <h3 className="px-2 pb-3 font-semibold text-sm">Now playing</h3>
              <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                <QueueArtwork song={currentSong} />
                <QueueDetails song={currentSong} />
                <MusicNote aria-hidden className="size-4 text-reddit" weight="fill" />
              </div>
            </section>
          ) : null}

          <section aria-label="Added to queue" className="pb-5">
            <div className="flex min-h-11 items-center justify-between gap-3 px-2">
              <h3 className="font-semibold text-sm">
                Added by you
                {queueSongs.length > 0 ? (
                  <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                    {queueSongs.length}
                  </span>
                ) : null}
              </h3>
              {queueSongs.length > 0 ? (
                <Button
                  className="px-3 text-muted-foreground text-xs"
                  onClick={() => {
                    clearQueue()
                    setAnnouncement('Queue cleared. Your current track keeps playing.')
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear
                </Button>
              ) : null}
            </div>
            {queueSongs.length > 0 ? (
              <ol className="space-y-1">
                {queueSongs.map((song, index) => (
                  <li className="flex items-center" key={song.id}>
                    <QueueTrack onPlay={() => playQueuedSong(song.id)} song={song} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`Queue options for ${song.title}`}
                          className="text-muted-foreground sm:hidden"
                          size="icon"
                          title="Queue options"
                          type="button"
                          variant="ghost"
                        >
                          <DotsThree aria-hidden className="size-5" weight="bold" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-120 min-w-52" sideOffset={6}>
                        <DropdownMenuItem
                          aria-label={`Move ${song.title} earlier in the queue`}
                          className="min-h-11"
                          disabled={index === 0}
                          onSelect={() => reorder(song, 'up')}
                        >
                          <ArrowUp aria-hidden />
                          Move earlier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          aria-label={`Move ${song.title} later in the queue`}
                          className="min-h-11"
                          disabled={index === queueSongs.length - 1}
                          onSelect={() => reorder(song, 'down')}
                        >
                          <ArrowDown aria-hidden />
                          Move later
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          aria-label={`Remove ${song.title} from the queue`}
                          className="min-h-11"
                          onSelect={() => remove(song)}
                        >
                          <X aria-hidden />
                          Remove from queue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="hidden shrink-0 items-center sm:flex">
                      <Button
                        aria-label={`Move ${song.title} earlier in the queue`}
                        className="text-muted-foreground"
                        disabled={index === 0}
                        onClick={() => reorder(song, 'up')}
                        size="icon"
                        static
                        type="button"
                        variant="ghost"
                      >
                        <ArrowUp aria-hidden className="size-4" />
                      </Button>
                      <Button
                        aria-label={`Move ${song.title} later in the queue`}
                        className="text-muted-foreground"
                        disabled={index === queueSongs.length - 1}
                        onClick={() => reorder(song, 'down')}
                        size="icon"
                        static
                        type="button"
                        variant="ghost"
                      >
                        <ArrowDown aria-hidden className="size-4" />
                      </Button>
                      <Button
                        aria-label={`Remove ${song.title} from the queue`}
                        className="text-muted-foreground"
                        onClick={() => remove(song)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X aria-hidden className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-2 py-3 text-muted-foreground text-sm leading-relaxed">
                Use a track’s menu to add music here.
              </p>
            )}
          </section>

          <section aria-label="Next from the feed" className="border-border border-t pt-5">
            <h3 className="px-2 pb-3 font-semibold text-sm">Next from this feed</h3>
            {nextTracks.length > 0 ? (
              <ol className="space-y-1">
                {nextTracks.map(({ index, song }) => (
                  <li className="flex" key={song.id}>
                    <QueueTrack onPlay={() => setCurrentSong(index)} song={song} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <Queue aria-hidden className="mb-1 size-7 text-muted-foreground" />
                <p className="font-medium text-sm">That’s the end of this feed.</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Find more music or add tracks to your queue.
                </p>
              </div>
            )}
          </section>
        </div>
        <p aria-live="polite" className="sr-only" role="status">
          {announcement}
        </p>
      </DialogContent>
    </Dialog>
  )
}
