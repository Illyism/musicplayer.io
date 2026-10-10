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

function MusicAppContent() {
  usePlayerHydration()
  useInitializeApp()
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
    const useKeyboard = () => {
      document.documentElement.dataset.inputMethod = 'keyboard'
    }
    const usePointer = () => {
      delete document.documentElement.dataset.inputMethod
    }
    window.addEventListener('keydown', useKeyboard)
    window.addEventListener('pointerdown', usePointer)
    return () => {
      window.removeEventListener('keydown', useKeyboard)
      window.removeEventListener('pointerdown', usePointer)
      delete document.documentElement.dataset.inputMethod
    }
  }, [])

  return (
    <div
      className="music-app flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
      data-now-playing={!isDesktop && mobileView === 'player'}
    >
      <a
        className="sr-only z-110 rounded-full bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
        href="#main-content"
      >
        Skip to music
      </a>
      <KeyboardShortcuts onShowShortcuts={() => setShowKeyboardModal(true)} />
      <div className="app-header shrink-0">
        <Header setShowKeyboardModal={setShowKeyboardModal} showKeyboardModal={showKeyboardModal} />
      </div>
      <main
        className="relative flex min-h-0 flex-1 overflow-hidden"
        id="main-content"
        tabIndex={-1}
      >
        {isDesktop ? (
          <ResizablePanelGroup className="min-h-0" direction="horizontal">
            <ResizablePanel
              className="overflow-y-auto bg-sidebar"
              defaultSize={248}
              maxSize={320}
              minSize={220}
            >
              <BrowsePanel />
            </ResizablePanel>
            <ResizableHandle className="bg-border/60" />
            <ResizablePanel className="overflow-y-auto" minSize={340}>
              {mobileView === 'library' ? <ListeningLibrary /> : <PlaylistPanel />}
            </ResizablePanel>
            <ResizableHandle className="bg-border/60" />
            <ResizablePanel
              className="flex min-h-0 flex-col bg-background"
              defaultSize={340}
              maxSize={480}
              minSize={280}
            >
              <SongInfoSidebar isDesktop />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            <div
              className="min-h-0 w-full overflow-y-auto bg-sidebar"
              hidden={mobileView !== 'browse'}
            >
              <BrowsePanel />
            </div>
            <div className="min-h-0 w-full overflow-y-auto" hidden={mobileView !== 'playlist'}>
              <PlaylistPanel />
            </div>
            <div
              className="mobile-player-panel min-h-0 w-full overflow-y-auto"
              data-visible={mobileView === 'player'}
            >
              <PlayerPanel isDesktop={false} />
            </div>
            <div className="min-h-0 w-full overflow-y-auto" hidden={mobileView !== 'library'}>
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
