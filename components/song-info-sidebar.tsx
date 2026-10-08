'use client'

import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  ChatCircle,
  Headphones,
  MusicNote,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { Comments } from './comments'
import { LoginModal } from './login-modal'
import { MediaPlayerFrame } from './media-player-frame'

function getPlatformName(song: Song) {
  if (song.type === 'youtube') {
    return 'YouTube'
  }
  if (song.type === 'soundcloud') {
    return 'SoundCloud'
  }
  if (song.type === 'vimeo') {
    return 'Vimeo'
  }
  return 'Source'
}

export function PlayerEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Headphones className="size-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-balance font-medium text-lg">Find something worth hearing.</h2>
        <p className="max-w-60 text-pretty text-muted-foreground text-sm leading-relaxed">
          Pick a track. The music and conversation will meet you here.
        </p>
      </div>
    </div>
  )
}

export function SongInfoContent({ song }: { song: Song }) {
  const [comment, setComment] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginAction, setLoginAction] = useState('')

  const handleLogin = (action: string) => {
    setLoginAction(action)
    setShowLoginModal(true)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <a
            className="inline-flex min-h-8 items-center rounded-full bg-muted px-3 font-medium text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            href={`https://www.reddit.com/r/${song.subreddit}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="mr-0.5 text-reddit">r/</span>
            {song.subreddit}
          </a>
          <h2 className="text-pretty font-semibold text-lg leading-snug tracking-tight">
            {song.title}
          </h2>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
            <span className="max-w-full truncate">Shared by u/{song.author}</span>
            {song.created_ago ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{song.created_ago}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-11 items-center rounded-full bg-muted">
            <Button
              aria-label="Upvote track"
              className="size-11 rounded-full text-muted-foreground hover:text-reddit"
              onClick={() => handleLogin('upvote')}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowUp className="size-4" />
            </Button>
            <span className="min-w-6 text-center font-medium text-xs tabular-nums">
              {song.score.toLocaleString()}
            </span>
            <Button
              aria-label="Downvote track"
              className="size-11 rounded-full text-muted-foreground"
              onClick={() => handleLogin('downvote')}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowDown className="size-4" />
            </Button>
          </div>
          <Button asChild className="h-11 gap-2 rounded-full px-4" variant="secondary">
            <a
              href={`https://www.reddit.com${song.permalink}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowSquareOut className="size-4" />
              Reddit post
            </a>
          </Button>
        </div>

        {song.url ? (
          <a
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            href={song.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MusicNote className="size-4 shrink-0" />
              <span className="truncate">Open on {getPlatformName(song)}</span>
            </span>
            <ArrowSquareOut className="size-3.5 shrink-0" />
          </a>
        ) : null}

        {song.selftext ? (
          <p className="wrap-break-word whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
            {song.selftext}
          </p>
        ) : null}

        <section aria-label="Comments" className="space-y-5 border-border/60 border-t pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-medium text-sm">
              <ChatCircle className="size-4 text-muted-foreground" />
              The conversation
            </h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {song.num_comments.toLocaleString()}
            </span>
          </div>
          <form
            className="rounded-2xl bg-muted/60 p-3"
            onSubmit={event => {
              event.preventDefault()
              if (comment.trim()) {
                handleLogin('comment')
              }
            }}
          >
            <Textarea
              aria-label="Your comment"
              className="min-h-16 rounded-lg border-0 bg-transparent p-1 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent"
              onChange={event => setComment(event.target.value)}
              placeholder="Join the conversation…"
              value={comment}
            />
            <div className="mt-2 flex justify-end">
              <Button
                aria-label="Post comment"
                className="h-11 gap-2 rounded-full px-4"
                disabled={!comment.trim()}
                type="submit"
              >
                <PaperPlaneTilt className="size-4" />
                Comment
              </Button>
            </div>
          </form>
          <Comments key={song.id} onLogin={handleLogin} permalink={song.permalink} />
        </section>
      </div>
      <LoginModal
        action={loginAction}
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  )
}

interface SongInfoSidebarProps {
  isDesktop: boolean
}

export function SongInfoSidebar({ isDesktop }: SongInfoSidebarProps) {
  const currentSong = usePlayerStore(state => state.currentSong)

  return (
    <aside aria-label="Now playing" className="flex h-full min-h-0 w-full flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <h2 className="font-medium text-sm">Now playing</h2>
        <Headphones className="size-4 text-muted-foreground" />
      </div>
      {currentSong ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {isDesktop ? (
            <MediaPlayerFrame
              className="mb-5 overflow-hidden rounded-2xl outline outline-black/10 dark:outline-white/10"
              playerKeyPrefix="desktop-player"
              song={currentSong}
            />
          ) : null}
          <SongInfoContent key={currentSong.id} song={currentSong} />
        </div>
      ) : (
        <PlayerEmptyState />
      )}
    </aside>
  )
}
