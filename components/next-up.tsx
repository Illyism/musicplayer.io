'use client'

import { MusicNote } from '@phosphor-icons/react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useUpcomingTracks } from '@/lib/hooks/use-upcoming-tracks'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage, smallCover } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

const VISIBLE_TRACKS = 5

function UpcomingTrack({ song, onPlay }: { onPlay: () => void; song: Song }) {
  const display = trackDisplay(song)
  const cover = smallCover(song)

  return (
    <li>
      <Button
        aria-label={`Play ${song.title}`}
        className="hover:bg-foreground/10 dark:hover:bg-foreground/10 h-14 w-full justify-start gap-3 rounded-md px-2 text-left font-normal"
        onClick={onPlay}
        static
        variant="ghost"
      >
        <span className="bg-muted relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm">
          {cover ? (
            <Image
              alt=""
              className="size-full object-cover"
              height={40}
              src={cover}
              unoptimized={isRedditHostedImage(cover)}
              width={40}
            />
          ) : (
            <MusicNote className="text-muted-foreground size-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] leading-5 font-medium">{display.title}</span>
          <span className="text-muted-foreground block truncate text-[13px] leading-5">
            {display.artist ?? `r/${song.subreddit}`}
          </span>
        </span>
      </Button>
    </li>
  )
}

export function NextUp() {
  const { nextTracks, queueSongs } = useUpcomingTracks()
  const playQueuedSong = usePlayerStore(state => state.playQueuedSong)
  const setCurrentSong = usePlayerStore(state => state.setCurrentSong)
  const setQueueOpen = usePlayerStore(state => state.setQueueOpen)
  const upcoming = [
    ...queueSongs.map(song => ({
      key: `queue-${song.id}`,
      onPlay: () => playQueuedSong(song.id),
      song,
    })),
    ...nextTracks.map(({ index, song }) => ({
      key: `mix-${song.id}`,
      onPlay: () => setCurrentSong(index),
      song,
    })),
  ].slice(0, VISIBLE_TRACKS)

  return (
    <section aria-label="Next up" className="bg-card rounded-lg p-2">
      <div className="flex items-center justify-between pl-2">
        <h3 className="text-base font-bold">Next up</h3>
        <Button
          className="text-muted-foreground hover:text-foreground h-9 rounded-full px-3 text-sm font-semibold"
          onClick={() => setQueueOpen(true)}
          variant="ghost"
        >
          Open queue
        </Button>
      </div>
      {upcoming.length > 0 ? (
        <ol className="mt-1 flex flex-col">
          {upcoming.map(({ key, onPlay, song }) => (
            <UpcomingTrack key={key} onPlay={onPlay} song={song} />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground px-2 py-3 text-sm">
          Nothing is lined up after this track.
        </p>
      )}
    </section>
  )
}
