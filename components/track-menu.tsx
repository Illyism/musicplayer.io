'use client'

import { ArrowSquareOut, DotsThree, ListPlus, SkipForward } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'

interface TrackMenuProps {
  className?: string
  song: Song
}

export function TrackMenu({ song, className }: TrackMenuProps) {
  const enqueueSong = usePlayerStore(state => state.enqueueSong)

  const addToQueue = (placement: 'next' | 'last') => {
    enqueueSong(song, placement)
    toast.success(placement === 'next' ? 'Added to play next' : 'Added to queue', {
      description: song.title,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`More options for ${song.title}`}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          size="icon-sm"
          title="Track options"
          type="button"
          variant="ghost"
        >
          <DotsThree aria-hidden className="size-5" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-120 min-w-52" sideOffset={6}>
        <DropdownMenuItem disabled={!song.playable} onSelect={() => addToQueue('next')}>
          <SkipForward aria-hidden />
          Play next
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!song.playable} onSelect={() => addToQueue('last')}>
          <ListPlus aria-hidden />
          Add to queue
        </DropdownMenuItem>
        {song.permalink ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href={`https://www.reddit.com${song.permalink}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ArrowSquareOut aria-hidden />
                View on Reddit
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
