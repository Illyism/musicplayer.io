'use client'

import { Check, PlusCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useListeningStore } from '@/lib/store/listening-store'
import type { Song } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'

export function SaveTrackButton({ song, className }: { song: Song; className?: string }) {
  const saved = useListeningStore(state => state.savedSongIds.includes(song.id))
  const toggleSaved = useListeningStore(state => state.toggleSaved)
  return (
    <Button
      aria-label={`${saved ? 'Remove' : 'Save'} ${song.title} ${saved ? 'from' : 'to'} your library`}
      aria-pressed={saved}
      className={cn('size-11 shrink-0 rounded-full', saved && 'text-reddit', className)}
      onClick={() => toggleSaved(song)}
      size="icon"
      variant="ghost"
    >
      {saved ? <Check className="size-6" weight="bold" /> : <PlusCircle className="size-6" />}
    </Button>
  )
}
