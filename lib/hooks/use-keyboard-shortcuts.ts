"use client"

import { useEffect } from "react"
import { usePlaylistStore } from "@/lib/store"

/**
 * Keyboard shortcuts hook
 * - Space: Play/Pause
 * - Ctrl/Cmd + Arrow Left: Previous song
 * - Ctrl/Cmd + Arrow Right: Next song
 * - Ctrl/Cmd + Arrow Up: Volume up
 * - Ctrl/Cmd + Arrow Down: Volume down
 */
export function useKeyboardShortcuts() {
  const { isPlaying, playPause, forward, backward, volume, setVolume } = usePlaylistStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Space: Play/Pause
      if (e.key === ' ' || e.keyCode === 32) {
        e.preventDefault()
        playPause()
        return
      }

      // Ctrl/Cmd + Arrow keys
      const isModifierPressed = e.ctrlKey || e.metaKey

      if (isModifierPressed) {
        // Arrow Left: Previous song
        if (e.key === 'ArrowLeft' || e.keyCode === 37) {
          e.preventDefault()
          backward()
          return
        }

        // Arrow Right: Next song
        if (e.key === 'ArrowRight' || e.keyCode === 39) {
          e.preventDefault()
          forward()
          return
        }

        // Arrow Up: Volume up
        if (e.key === 'ArrowUp' || e.keyCode === 38) {
          e.preventDefault()
          setVolume(Math.min(100, volume + 10))
          return
        }

        // Arrow Down: Volume down
        if (e.key === 'ArrowDown' || e.keyCode === 40) {
          e.preventDefault()
          setVolume(Math.max(0, volume - 10))
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlaying, playPause, forward, backward, volume, setVolume])
}



