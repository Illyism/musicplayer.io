"use client"

import { useEffect } from "react"
import { usePlaylistStore } from "@/lib/store"

export function PageTitle() {
  const currentSong = usePlaylistStore((state) => state.currentSong)
  const isPlaying = usePlaylistStore((state) => state.isPlaying)

  useEffect(() => {
    if (currentSong) {
      const title = isPlaying 
        ? `▶ ${currentSong.title} - Music Player for Reddit`
        : `${currentSong.title} - Music Player for Reddit`
      document.title = title
    } else {
      document.title = "Music Player for Reddit | A Free and Open-Source Music Player"
    }
  }, [currentSong, isPlaying])

  return null
}



