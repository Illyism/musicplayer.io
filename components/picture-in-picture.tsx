'use client'

import {
  ArrowSquareIn,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from '@phosphor-icons/react'
import Image from 'next/image'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  type DocumentPictureInPictureApi,
  PictureInPictureContext,
  requestPictureInPictureWindow,
  usePictureInPicture,
} from '@/lib/hooks/use-picture-in-picture'
import { usePlayerStore } from '@/lib/store/player-store'
import { formatTime, isRedditHostedImage } from '@/lib/utils/song-utils'
import { trackDisplay } from '@/lib/utils/track-display'

type PictureInPictureMode = 'closed' | 'floating' | 'native'
const NATIVE_WINDOW_STARTUP_GRACE_MS = 1000

function getDocumentPictureInPicture(): DocumentPictureInPictureApi | undefined {
  return (window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi })
    .documentPictureInPicture
}

function copyStyles(target: Document) {
  target.documentElement.className = document.documentElement.className
  target.body.className = document.body.className
  for (const stylesheet of document.querySelectorAll('link[rel="stylesheet"], style')) {
    target.head.appendChild(stylesheet.cloneNode(true))
  }
  target.body.style.margin = '0'
}

export function PictureInPictureProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PictureInPictureMode>('closed')
  const [supported, setSupported] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [mediaDestination, setMediaDestination] = useState<HTMLElement | null>(null)
  const nativeWindowRef = useRef<Window | null>(null)
  const mediaRef = useRef<{ element: HTMLElement; home: HTMLElement } | null>(null)
  const openingRef = useRef<boolean>(false)
  const generationRef = useRef(0)

  const restoreMedia = useCallback(() => {
    const media = mediaRef.current
    if (media && media.element.parentNode !== media.home) {
      media.home.appendChild(media.element)
    }
  }, [])

  const close = useCallback(() => {
    generationRef.current += 1
    openingRef.current = false
    setIsOpening(false)
    restoreMedia()
    setMediaDestination(null)
    setMode('closed')
    setPipWindow(null)
    const nativeWindow = nativeWindowRef.current
    nativeWindowRef.current = null
    if (nativeWindow && !nativeWindow.closed) {
      nativeWindow.close()
    }
  }, [restoreMedia])

  const registerMedia = useCallback((element: HTMLElement, home: HTMLElement) => {
    mediaRef.current = { element, home }
    return () => {
      if (element.parentNode !== home) {
        home.appendChild(element)
      }
      if (mediaRef.current?.element === element) {
        mediaRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setSupported(typeof getDocumentPictureInPicture()?.requestWindow === 'function')
    return () => {
      generationRef.current += 1
      restoreMedia()
      const nativeWindow = nativeWindowRef.current
      nativeWindowRef.current = null
      nativeWindow?.close()
    }
  }, [restoreMedia])

  useEffect(() => {
    if (!pipWindow) {
      return
    }
    const syncTheme = () => {
      pipWindow.document.documentElement.className = document.documentElement.className
      pipWindow.document.body.className = document.body.className
    }
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, { attributeFilter: ['class'], attributes: true })
    observer.observe(document.body, { attributeFilter: ['class'], attributes: true })
    return () => observer.disconnect()
  }, [pipWindow])

  useEffect(() => {
    if (mode === 'closed') {
      return
    }
    const targetWindow = pipWindow || window
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    targetWindow.addEventListener('keydown', handleEscape)
    return () => targetWindow.removeEventListener('keydown', handleEscape)
  }, [close, mode, pipWindow])

  const toggle = useCallback(async () => {
    if (mode !== 'closed') {
      close()
      return
    }
    if (openingRef.current) {
      return
    }
    if (!usePlayerStore.getState().currentSong) {
      toast.info('Choose a track before opening the mini player.')
      return
    }
    usePlayerStore.getState().setTheatreMode(false)
    const api = getDocumentPictureInPicture()
    if (typeof api?.requestWindow !== 'function') {
      setMode('floating')
      toast.info(
        'Mini player opened in this tab. This browser does not support a separate player window.'
      )
      return
    }
    openingRef.current = true
    setIsOpening(true)
    generationRef.current += 1
    const generation = generationRef.current
    try {
      const nextWindow = await requestPictureInPictureWindow(api)
      if (!nextWindow) {
        if (generation === generationRef.current) {
          setMode('floating')
          toast.info('The separate player window could not open. Mini player opened in this tab.')
        }
        return
      }
      if (generation !== generationRef.current) {
        nextWindow.close()
        return
      }
      nativeWindowRef.current = nextWindow
      copyStyles(nextWindow.document)
      nextWindow.document.title = 'Music Player for Reddit'
      const openedAt = Date.now()
      nextWindow.addEventListener(
        'pagehide',
        () => {
          if (nativeWindowRef.current === nextWindow) {
            nativeWindowRef.current = null
            restoreMedia()
            setMediaDestination(null)
            setPipWindow(null)
            // Some embedded browsers expose the API but immediately discard its window.
            // Keep the requested player available when the native window never becomes usable.
            if (Date.now() - openedAt < NATIVE_WINDOW_STARTUP_GRACE_MS) {
              setMode('floating')
              toast.info(
                'The separate player window could not stay open. Mini player opened in this tab.'
              )
            } else {
              setMode('closed')
            }
          }
        },
        { once: true }
      )
      setPipWindow(nextWindow)
      setMode('native')
    } catch {
      if (generation === generationRef.current) {
        nativeWindowRef.current?.close()
        nativeWindowRef.current = null
        setMode('floating')
        toast.info('The separate player window could not open. Mini player opened in this tab.')
      }
    } finally {
      if (generation === generationRef.current) {
        openingRef.current = false
        setIsOpening(false)
      }
    }
  }, [close, mode, restoreMedia])

  const value = useMemo(
    () => ({
      close,
      isActive: mode !== 'closed',
      isNative: mode === 'native',
      isOpening,
      mediaDestination,
      registerMedia,
      setMediaDestination,
      supported,
      toggle,
    }),
    [close, isOpening, mediaDestination, mode, registerMedia, supported, toggle]
  )

  return (
    <PictureInPictureContext value={value}>
      {children}
      <span
        aria-live="polite"
        className="sr-only"
        data-pip-mode={mode}
        data-pip-supported={supported}
      >
        {isOpening ? 'Opening the mini player…' : null}
        {mode === 'native' ? 'Music controls opened in a separate window.' : null}
        {mode === 'floating' ? 'Mini player opened in this tab.' : null}
      </span>
      {mode === 'native' && pipWindow
        ? createPortal(<PictureInPictureWindow />, pipWindow.document.body)
        : null}
      {mode === 'floating' ? createPortal(<PictureInPictureWindow />, document.body) : null}
    </PictureInPictureContext>
  )
}

function PictureInPictureWindow() {
  const { close, isNative, setMediaDestination } = usePictureInPicture()
  const currentSong = usePlayerStore(state => state.currentSong)
  const isPlaying = usePlayerStore(state => state.isPlaying)
  const currentTime = usePlayerStore(state => state.currentTime)
  const duration = usePlayerStore(state => state.duration)
  const togglePlay = usePlayerStore(state => state.togglePlay)
  const previous = usePlayerStore(state => state.previous)
  const next = usePlayerStore(state => state.next)
  const display = currentSong ? trackDisplay(currentSong) : null

  return (
    <section
      aria-label={isNative ? 'Picture-in-picture player' : 'Mini player'}
      className={
        isNative
          ? 'flex min-h-screen flex-col bg-card text-foreground'
          : 'pointer-events-none fixed right-3 bottom-[calc(152px+env(safe-area-inset-bottom))] z-80 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-border text-foreground shadow-2xl lg:right-5 lg:bottom-[108px]'
      }
    >
      <div className="pointer-events-auto flex h-11 shrink-0 items-center justify-between bg-card pl-4">
        <span className="font-medium text-xs">
          {isNative ? 'Music controls' : 'Mini player · this tab'}
        </span>
        <Button
          aria-label="Close mini player"
          className="size-11 rounded-full"
          onClick={close}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
      {isNative ? (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
          {currentSong?.thumbnail ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="360px"
              src={currentSong.thumbnail}
              unoptimized={isRedditHostedImage(currentSong.thumbnail)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Headphones className="size-12" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-linear-to-t from-black/80 to-transparent px-3 pt-8 pb-3 text-white text-xs">
            <span className="truncate">r/{currentSong?.subreddit}</span>
            <span className="shrink-0 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="pointer-events-none relative aspect-video w-full shrink-0"
          ref={setMediaDestination}
        />
      )}
      <div className="pointer-events-auto flex items-center gap-2 bg-card p-2 pl-3">
        <div className="min-w-0 flex-1" title={currentSong?.title}>
          <p className="truncate font-medium text-xs">{display?.title || 'Now playing'}</p>
          {display?.artist ? (
            <p className="truncate text-[11px] text-muted-foreground">{display.artist}</p>
          ) : null}
        </div>
        <Button
          aria-label="Previous track"
          className="size-11 rounded-full"
          onClick={previous}
          size="icon"
          variant="ghost"
        >
          <SkipBack className="size-4" weight="fill" />
        </Button>
        <Button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="size-11 rounded-full"
          onClick={togglePlay}
          size="icon"
        >
          {isPlaying ? (
            <Pause className="size-4" weight="fill" />
          ) : (
            <Play className="ml-0.5 size-4" weight="fill" />
          )}
        </Button>
        <Button
          aria-label="Next track"
          className="size-11 rounded-full"
          onClick={next}
          size="icon"
          variant="ghost"
        >
          <SkipForward className="size-4" weight="fill" />
        </Button>
      </div>
    </section>
  )
}

export function PiPMediaHost({ children }: { children: ReactNode }) {
  const { isActive, isNative, mediaDestination, registerMedia, close } = usePictureInPicture()
  const homeRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const home = homeRef.current
    if (!home) {
      return
    }
    const element = document.createElement('div')
    element.className = 'relative h-full w-full'
    element.dataset.pipMediaHost = 'true'
    home.appendChild(element)
    const unregister = registerMedia(element, home)
    setHost(element)
    return () => {
      unregister()
      element.remove()
    }
  }, [registerMedia])

  useLayoutEffect(() => {
    const home = homeRef.current
    if (!(host && home)) {
      return
    }
    if (isActive && !isNative && mediaDestination) {
      const updatePosition = () => {
        const bounds = mediaDestination.getBoundingClientRect()
        Object.assign(host.style, {
          height: `${bounds.height}px`,
          left: `${bounds.left}px`,
          pointerEvents: 'auto',
          position: 'fixed',
          top: `${bounds.top}px`,
          visibility: 'visible',
          width: `${bounds.width}px`,
          zIndex: '90',
        })
      }
      updatePosition()
      const observer = new ResizeObserver(updatePosition)
      observer.observe(mediaDestination)
      window.addEventListener('resize', updatePosition)
      return () => {
        observer.disconnect()
        window.removeEventListener('resize', updatePosition)
        host.style.cssText = ''
      }
    }
    if (host.parentNode !== home) {
      home.appendChild(host)
    }
  }, [host, isActive, isNative, mediaDestination])

  return (
    <div className="relative h-full w-full" ref={homeRef}>
      {host ? createPortal(children, host) : null}
      {isActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-4 text-center">
          <ArrowSquareIn className="size-6 text-white/60" />
          <p className="text-white/70 text-xs">
            {isNative ? 'Music controls are in the separate window' : 'Playing in the mini player'}
          </p>
          <Button className="h-11 rounded-full" onClick={close} variant="secondary">
            Return player here
          </Button>
        </div>
      ) : null}
    </div>
  )
}
