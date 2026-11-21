'use client'

import { MusicNote, RedditLogo } from '@phosphor-icons/react'
import Image from 'next/image'
import { type CSSProperties, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useCommunityDiscovery } from '@/lib/hooks/use-community-discovery'
import { useEffectiveSubreddits } from '@/lib/hooks/use-route-subreddits'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { cn } from '@/lib/utils'
import { isRedditHostedImage, mediumCover } from '@/lib/utils/song-utils'

const MOSAIC_TILES = 4
const MIN_TITLE_CHARS = 8
const ONE_LINE_TITLE_CHARS = 24
const WORD_SPLIT = /\s+/u

export function MixWash({ src }: { src: string | null }) {
  const [layers, setLayers] = useState<string[]>(src ? [src] : [])
  if (src && layers.at(-1) !== src) {
    setLayers([...layers.slice(-1), src])
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {src ? (
        layers.map(url => (
          <Image
            alt=""
            className="animate-in fade-in absolute inset-0 size-full scale-150 object-cover opacity-50 blur-[64px] saturate-150 duration-700 outline-none dark:opacity-70 dark:outline-none"
            height={320}
            key={url}
            loading="eager"
            src={url}
            unoptimized={isRedditHostedImage(url)}
            width={320}
          />
        ))
      ) : (
        <div className="from-reddit/25 absolute inset-0 bg-linear-to-b to-transparent" />
      )}
      <div className="from-panel/40 via-panel/60 to-panel dark:via-panel/40 absolute inset-0 bg-linear-to-b dark:from-transparent" />
    </div>
  )
}

function MixMosaic({ songs, className }: { songs: Song[]; className?: string }) {
  const covers: string[] = []
  for (const song of songs) {
    const cover = mediumCover(song)
    if (cover && !covers.includes(cover)) {
      covers.push(cover)
    }
    if (covers.length === MOSAIC_TILES) {
      break
    }
  }
  const tiles = covers.length === MOSAIC_TILES ? covers : covers.slice(0, 1)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-muted grid size-24 shrink-0 overflow-hidden rounded-lg shadow-[0_8px_24px_rgb(0_0_0/0.35)] @min-[480px]/mix:size-36 @min-[720px]/mix:size-[200px]',
        tiles.length === MOSAIC_TILES && 'grid-cols-2 grid-rows-2',
        className
      )}
    >
      {tiles.length === 0 ? (
        <span className="text-muted-foreground flex items-center justify-center">
          <MusicNote className="size-1/3" />
        </span>
      ) : (
        tiles.map(url => (
          <Image
            alt=""
            className="size-full object-cover outline-none dark:outline-none"
            height={200}
            key={url}
            priority
            src={url}
            unoptimized={isRedditHostedImage(url)}
            width={200}
          />
        ))
      )}
    </div>
  )
}

function communityList(names: string[]) {
  if (names.length <= 2) {
    return names.map(name => `r/${name}`).join(' and ')
  }
  return `r/${names[0]}, r/${names[1]} and ${names.length - 2} more`
}

export function MixHeader({ songs }: { songs: Song[] }) {
  const effectiveSubreddits = useEffectiveSubreddits()
  const { searchQuery, listingUpdatedAt, loading } = usePlayerStore(
    useShallow(state => ({
      listingUpdatedAt: state.listingUpdatedAt,
      loading: state.loading,
      searchQuery: state.searchQuery,
    }))
  )
  const { data } = useCommunityDiscovery()
  const single = effectiveSubreddits.length === 1 ? effectiveSubreddits[0] : null

  let label = 'Your mix'
  let title = 'Your mix'
  let context = 'Music shared by the communities you love.'
  if (searchQuery) {
    label = 'Search'
    title = `“${searchQuery}”`
    context = `Music from across Reddit, matching “${searchQuery}”.`
  } else if (single) {
    label = 'Subreddit mix'
    title = `r/${single}`
    context = `Fresh finds from r/${single}, ready to play.`
  } else if (effectiveSubreddits.length > 1) {
    context = `Your own mix of ${effectiveSubreddits.length} music communities.`
  }

  const longestWord = Math.max(...title.split(WORD_SPLIT).map(word => word.length))
  const titleChars = Math.max(
    MIN_TITLE_CHARS,
    title.length <= ONE_LINE_TITLE_CHARS
      ? title.length
      : Math.max(longestWord, Math.ceil(title.length / 2))
  )

  const iconUrl = single
    ? data?.communities.find(community => community.key === single.toLowerCase())?.iconUrl
    : null
  const updated =
    listingUpdatedAt === null
      ? null
      : new Date(listingUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <header className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 px-4 pt-5 @min-[480px]/mix:grid-rows-[1fr_auto] @min-[480px]/mix:gap-x-6 @min-[480px]/mix:px-6 @min-[480px]/mix:pt-6">
      <MixMosaic className="@min-[480px]/mix:row-span-2" songs={songs} />
      <div
        className="flex min-w-0 flex-col [--mix-max:2.25rem] [--mix-min:1.125rem] [--mix-offset:9rem] @min-[480px]/mix:[--mix-max:4.5rem] @min-[480px]/mix:[--mix-min:1.5rem] @min-[480px]/mix:[--mix-offset:14.5rem] @min-[720px]/mix:[--mix-max:6rem] @min-[720px]/mix:[--mix-offset:18rem]"
        style={{ '--mix-chars': titleChars } as CSSProperties}
      >
        <p className="text-sm font-bold">{label}</p>
        <h1 className="mt-1 text-[clamp(var(--mix-min),calc((100cqi-var(--mix-offset))/(var(--mix-chars)*0.55)),var(--mix-max))] leading-[1.05] font-extrabold tracking-[-0.04em] text-balance wrap-normal @max-[479px]/mix:wrap-anywhere">
          {title}
        </h1>
      </div>
      <div className="col-span-2 mt-3 min-w-0 @min-[480px]/mix:col-span-1 @min-[480px]/mix:col-start-2 @min-[480px]/mix:mt-2">
        <p className="text-muted-foreground text-sm font-medium @min-[720px]/mix:text-base">
          {context}
        </p>
        <p className="text-muted-foreground mt-2 flex h-6 min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden text-sm">
          {searchQuery ? null : (
            <>
              <span className="bg-muted text-reddit flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {iconUrl ? (
                  <Image
                    alt=""
                    className="size-full object-cover"
                    height={24}
                    src={iconUrl}
                    unoptimized
                    width={24}
                  />
                ) : (
                  <RedditLogo aria-hidden className="size-4" weight="fill" />
                )}
              </span>
              <span className="text-foreground min-w-0 truncate font-bold">
                {effectiveSubreddits.length > 0 ? communityList(effectiveSubreddits) : 'Reddit'}
              </span>
              <span aria-hidden="true" className="shrink-0">
                ·
              </span>
            </>
          )}
          {loading && songs.length === 0 ? (
            <span
              aria-hidden="true"
              className="bg-muted inline-block h-3.5 w-16 shrink-0 rounded-full motion-safe:animate-pulse"
              key="tracks-skeleton"
            />
          ) : (
            <span className="shrink-0 whitespace-nowrap tabular-nums" key="tracks-count">
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
            </span>
          )}
          {updated ? (
            <span className="hidden shrink-0 items-center gap-x-1.5 whitespace-nowrap @min-[600px]/mix:inline-flex">
              <span aria-hidden="true">·</span>
              <span>updated {updated}</span>
            </span>
          ) : null}
        </p>
      </div>
    </header>
  )
}
