"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlaylistStore } from "@/lib/store"

export function Controls() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    currentSong,
    playPause,
    forward,
    backward,
    setVolume,
    seekTo,
  } = usePlaylistStore()
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [seekingTime, setSeekingTime] = useState<number | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePlayPause = () => {
    playPause()
  }

  const handleForward = () => {
    forward()
  }

  const handleBackward = () => {
    backward()
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const newTime = (percentage / 100) * duration
    
    // Immediately update visual feedback
    setSeekingTime(newTime)
    
    // Update store time
    seekTo(newTime)
    
    // Seek in actual players - keep playing state
    const wasPlaying = isPlaying
    
    // YouTube
    if ((window as any).YT && (window as any).__youtubePlayer) {
      try {
        const player = (window as any).__youtubePlayer
        player.seekTo(newTime, true)
        // Ensure it keeps playing if it was playing
        if (wasPlaying && player.getPlayerState() !== 1) {
          player.playVideo()
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Vimeo
    if ((window as any).__vimeoPlayer) {
      try {
        const player = (window as any).__vimeoPlayer
        player.setCurrentTime(newTime).then(() => {
          // Ensure it keeps playing if it was playing
          if (wasPlaying) {
            player.getPaused().then((paused: boolean) => {
              if (paused) {
                player.play()
              }
            })
          }
        })
      } catch (e) {
        // Ignore
      }
    }
    
    // MP3
    const audio = (window as any).__mp3AudioRef?.current as HTMLAudioElement
    if (audio) {
      audio.currentTime = newTime
      // Ensure it keeps playing if it was playing
      if (wasPlaying && audio.paused) {
        audio.play().catch(() => {
          // Ignore autoplay errors
        })
      }
    }
    
    // SoundCloud
    if ((window as any).__soundcloudWidget) {
      try {
        const widget = (window as any).__soundcloudWidget
        widget.getDuration((duration: number) => {
          const seekPosition = (newTime / duration) * 1000
          widget.seekTo(seekPosition)
          // Ensure it keeps playing if it was playing
          if (wasPlaying) {
            widget.play()
          }
        })
      } catch (e) {
        // Ignore
      }
    }
    
    // Clear seeking time after a short delay to sync with actual player time
    setTimeout(() => {
      setSeekingTime(null)
    }, 100)
  }

  // Reset seeking time and ensure progress resets when song changes
  useEffect(() => {
    setSeekingTime(null)
    // Force reset progress bar when song changes
    if (currentSong) {
      // The store should already have currentTime: 0 and duration: 0
      // But we ensure seekingTime is cleared
    }
  }, [currentSong?.id])

  // Reset seeking time when currentTime updates from player
  useEffect(() => {
    if (seekingTime === null) return
    // If the player time has caught up, clear the seeking state
    if (Math.abs(currentTime - seekingTime) < 0.5) {
      setSeekingTime(null)
    }
  }, [currentTime, seekingTime])

  // Calculate display time (use seekingTime if actively seeking, otherwise use currentTime)
  // Ensure we never show progress if duration is 0 or invalid
  const displayTime = seekingTime !== null ? seekingTime : currentTime
  
  // Always show 0% if duration is 0, invalid, or if we don't have a current song
  let displayPercentage = 0
  if (currentSong && duration > 0 && !isNaN(duration) && !isNaN(displayTime) && isFinite(duration) && isFinite(displayTime)) {
    const calculated = (displayTime / duration) * 100
    displayPercentage = Math.max(0, Math.min(100, calculated))
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] border-t-2 border-black backdrop-blur-xl pb-2 md:pb-4">
      <div className="flex items-center gap-2 md:gap-4 px-3 md:px-6 h-14 md:h-16">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button
            onClick={handleBackward}
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 transition-all h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          >
            <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <Button
            onClick={handlePlayPause}
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 transition-all h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
            )}
          </Button>
          <Button
            onClick={handleForward}
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 transition-all h-9 w-9 md:h-10 md:w-10 touch-manipulation"
          >
            <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Progress Bar - Super Smooth Water Flow */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-white w-12 text-right font-mono tabular-nums flex-shrink-0">
            {formatTime(displayTime)}
          </span>
          <div
            ref={progressBarRef}
            className="flex-1 cursor-pointer relative h-4 min-w-0"
            onClick={handleSeek}
          >
            {/* Background track - dark gray */}
            <div className="absolute top-1/2 left-0 right-0 h-2.5 -translate-y-1/2 bg-gray-800 rounded-full" />
            
            {/* Completed portion - yellow filled, water-smooth animation */}
            <div
              className="absolute top-1/2 left-0 h-2.5 -translate-y-1/2 bg-[#FDC00F] rounded-full transition-[width] duration-75 ease-linear will-change-[width]"
              style={{ width: `${displayPercentage}%` }}
            />
            
            {/* Yellow vertical marker at current position, water-smooth */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-[#FDC00F] rounded-full transition-[left] duration-75 ease-linear will-change-[left] shadow-lg z-10"
              style={{ left: `${displayPercentage}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <span className="text-[10px] md:text-xs text-white w-10 md:w-12 font-mono tabular-nums flex-shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Right Volume Control */}
        <div className="relative flex items-center gap-1 md:gap-3">
          <Button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80 hover:bg-white/10 transition-all h-9 w-9 md:h-10 md:w-10 touch-manipulation hidden md:flex"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </Button>
          {showVolumeSlider && (
            <div className="absolute bottom-full right-0 mb-3 w-10 h-32 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 slide-in-right shadow-xl">
              <div
                className="w-full h-full flex flex-col-reverse cursor-pointer rounded"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const percentage = ((rect.height - y) / rect.height) * 100
                  handleVolumeChange(Math.max(0, Math.min(100, percentage)))
                }}
              >
                <div
                  className="w-full bg-gradient-to-t from-[#FDC00F] to-[#f99b1d] rounded transition-all"
                  style={{ height: `${volume}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

