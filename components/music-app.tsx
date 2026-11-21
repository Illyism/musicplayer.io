'use client'

import { Suspense, useEffect, useState } from 'react'
import { AppShellFallback } from '@/components/app-shell-fallback'
import { BrowsePanel } from '@/components/browse-panel'
import { Header } from '@/components/header'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { ListeningLibrary } from '@/components/listening-library'
import { MobileNavigation } from '@/components/mobile-navigation'
import { PictureInPictureProvider } from '@/components/picture-in-picture'
import { PlayerControls } from '@/components/player-controls'
import { PlayerPanel } from '@/components/player-panel'
import { PlaylistPanel } from '@/components/playlist-panel'
import { QueueDrawer } from '@/components/queue-drawer'
import { SongInfoSidebar } from '@/components/song-info-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useInitializeApp } from '@/lib/hooks/use-initialize-app'
import { useListeningSignals } from '@/lib/hooks/use-listening-signals'
import { useMediaSession } from '@/lib/hooks/use-media-session'
import { usePlayerHydration } from '@/lib/hooks/use-player-hydration'
import { usePlayerStore } from '@/lib/store/player-store'

const PANEL_GUTTER =
  'w-2 bg-transparent before:absolute before:inset-y-3 before:left-1/2 before:w-px before:-translate-x-1/2 before:rounded-full before:bg-transparent before:transition-colors hover:before:bg-foreground/25 data-[separator=hover]:before:bg-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:before:w-0.5 focus-visible:before:bg-ring data-[separator=active]:before:bg-foreground/40'

function RouteInitializer() {
  useInitializeApp()
  return null
}

function MusicAppContent() {
  usePlayerHydration()
  useListeningSignals()
  useMediaSession()

  const mobileView = usePlayerStore(state => state.mobileView)
  const currentSong = usePlayerStore(state => state.currentSong)
  const [isDesktop, setIsDesktop] = useState(false)
  const [showKeyboardModal, setShowKeyboardModal] = useState(false)

  useEffect(() => {
    document.title = currentSong
      ? `${currentSong.title} · Music Player for Reddit`
      : 'Music Player for Reddit'
  }, [currentSong])

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const updateLayout = () => setIsDesktop(desktopQuery.matches)
    updateLayout()
    desktopQuery.addEventListener('change', updateLayout)
    return () => desktopQuery.removeEventListener('change', updateLayout)
  }, [])

  useEffect(() => {
    const handleKeyDown = () => {
      document.documentElement.dataset.inputMethod = 'keyboard'
    }
    const handlePointerDown = () => {
      delete document.documentElement.dataset.inputMethod
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
      delete document.documentElement.dataset.inputMethod
    }
  }, [])

  return (
    <div
      className="music-app bg-background flex h-dvh min-h-0 flex-col overflow-hidden"
      data-now-playing={!isDesktop && mobileView === 'player'}
    >
      <a
        className="bg-primary text-primary-foreground sr-only z-110 rounded-full px-4 py-3 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
        href="#main-content"
      >
        Skip to music
      </a>
      <Suspense fallback={null}>
        <RouteInitializer />
      </Suspense>
      <KeyboardShortcuts onShowShortcuts={() => setShowKeyboardModal(true)} />
      <div className="app-header shrink-0">
        <Header setShowKeyboardModal={setShowKeyboardModal} showKeyboardModal={showKeyboardModal} />
      </div>
      <main
        className="relative flex min-h-0 flex-1 overflow-hidden lg:pb-2"
        id="main-content"
        tabIndex={-1}
      >
        {isDesktop ? (
          <ResizablePanelGroup className="min-h-0 px-2" direction="horizontal">
            <ResizablePanel
              className="bg-panel min-h-0 overflow-hidden rounded-lg"
              defaultSize={325}
              maxSize={420}
              minSize={240}
            >
              <BrowsePanel />
            </ResizablePanel>
            <ResizableHandle className={PANEL_GUTTER} />
            <ResizablePanel className="bg-panel min-h-0 overflow-hidden rounded-lg" minSize={340}>
              {mobileView === 'library' ? (
                <div className="h-full overflow-y-auto">
                  <ListeningLibrary />
                </div>
              ) : (
                <PlaylistPanel />
              )}
            </ResizablePanel>
            <ResizableHandle className={PANEL_GUTTER} />
            <ResizablePanel
              className="bg-panel flex min-h-0 flex-col overflow-hidden rounded-lg"
              defaultSize={400}
              maxSize={520}
              minSize={300}
            >
              <SongInfoSidebar isDesktop />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            <div
              className="bg-panel min-h-0 w-full overflow-y-auto"
              hidden={mobileView !== 'browse'}
            >
              <BrowsePanel />
            </div>
            <div
              className="bg-panel min-h-0 w-full overflow-y-auto"
              hidden={mobileView !== 'playlist'}
            >
              <PlaylistPanel />
            </div>
            <div
              className="mobile-player-panel min-h-0 w-full overflow-y-auto"
              data-visible={mobileView === 'player'}
            >
              <PlayerPanel isDesktop={false} />
            </div>
            <div
              className="bg-panel min-h-0 w-full overflow-y-auto"
              hidden={mobileView !== 'library'}
            >
              <ListeningLibrary active={mobileView === 'library'} />
            </div>
          </>
        )}
      </main>
      <div className="app-dock shrink-0">
        <PlayerControls />
        <MobileNavigation />
      </div>
      <QueueDrawer />
    </div>
  )
}

export function MusicApp() {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <PictureInPictureProvider>
        <MusicAppContent />
      </PictureInPictureProvider>
    </Suspense>
  )
}
