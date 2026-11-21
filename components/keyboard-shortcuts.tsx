'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { usePlayerStore } from '@/lib/store/player-store'

interface KeyboardShortcutsProps {
  onShowShortcuts?: () => void
}

const arrowShortcutKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const NATIVE_KEYBOARD_TARGETS =
  'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="alertdialog"], [role="menu"], [role="menuitem"], [role="slider"], [role="combobox"], [role="listbox"]'

function ownsNativeKeyboard(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(NATIVE_KEYBOARD_TARGETS) !== null
}

export function KeyboardShortcuts({ onShowShortcuts }: KeyboardShortcutsProps) {
  const { togglePlay, next, previous, setVolume, shufflePlaylist } = usePlayerStore(
    useShallow(state => ({
      next: state.next,
      previous: state.previous,
      setVolume: state.setVolume,
      shufflePlaylist: state.shufflePlaylist,
      togglePlay: state.togglePlay,
    }))
  )

  const previousVolumeRef = useRef<number>(100)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        ((e.ctrlKey || e.metaKey) && !arrowShortcutKeys.has(e.key)) ||
        e.altKey ||
        ownsNativeKeyboard(e.target)
      ) {
        return
      }

      if (e.key === '?' && onShowShortcuts) {
        e.preventDefault()
        onShowShortcuts()
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        previous()
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const newVolume = Math.min(100, usePlayerStore.getState().volume + 10)
        setVolume(newVolume)
        if (newVolume > 0) {
          previousVolumeRef.current = newVolume
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const newVolume = Math.max(0, usePlayerStore.getState().volume - 10)
        setVolume(newVolume)
        if (newVolume > 0) {
          previousVolumeRef.current = newVolume
        }
      }

      if ((e.key === 's' || e.key === 'S') && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        shufflePlaylist()
      }

      if ((e.key === 'm' || e.key === 'M') && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const currentVolume = usePlayerStore.getState().volume
        if (currentVolume > 0) {
          previousVolumeRef.current = currentVolume
          setVolume(0)
        } else {
          setVolume(previousVolumeRef.current || 100)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, next, previous, setVolume, shufflePlaylist, onShowShortcuts])

  return null
}
