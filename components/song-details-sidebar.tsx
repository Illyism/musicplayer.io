'use client'

import Image from 'next/image'
import { usePlayerStore } from '@/lib/store/player-store'
import { isRedditHostedImage } from '@/lib/utils/song-utils'
import { PlayerEmptyState, SongInfoContent } from './song-info-sidebar'

export function SongDetailsSidebar() {
  const currentSong = usePlayerStore(state => state.currentSong)

  return (
    <aside
      aria-label="Track details"
      className="hidden h-full w-80 shrink-0 flex-col bg-sidebar lg:flex"
    >
      <div className="flex h-16 shrink-0 items-center px-5">
        <h2 className="font-medium text-sm">Now playing</h2>
      </div>
      {currentSong ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {currentSong.thumbnail ? (
            <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-muted outline outline-black/10 dark:outline-white/10">
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="320px"
                src={currentSong.thumbnail}
                unoptimized={isRedditHostedImage(currentSong.thumbnail)}
              />
            </div>
          ) : null}
          <SongInfoContent key={currentSong.id} song={currentSong} />
        </div>
      ) : (
        <PlayerEmptyState />
      )}
    </aside>
  )
}
