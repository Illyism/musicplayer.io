"use client"

import { useEffect, useState, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/lib/hooks/use-auth"
import { usePlaylistStore } from "@/lib/store"
import { Constants } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Copy, Play, Pause, SkipBack, SkipForward, Wifi } from "lucide-react"
import { usePlaylistStore as useStore } from "@/lib/store"

interface RemoteControlProps {
  initialHash?: string | null
}

export function RemoteControl({ initialHash }: RemoteControlProps) {
  const { user, isAuthenticated } = useAuth()
  const [isReceiver, setIsReceiver] = useState(true)
  const [hash, setHash] = useState<string | null>(initialHash || null)
  const [hashLink, setHashLink] = useState<string>("")
  const socketRef = useRef<Socket | null>(null)
  const {
    forward,
    backward,
    playPause,
    isPlaying,
    selectedSubreddits,
    setSelectedSubreddits,
  } = usePlaylistStore()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Initialize Socket.io connection
    // For development, connect to same origin; for production, use NEXT_PUBLIC_SOCKET_URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socketRef.current = socket

    // Join user's room
    if (user.name) {
      socket.emit('join:user', user.name)
    }

    // Join hash room if hash exists
    if (hash) {
      socket.emit('join:hash', hash)
    }

    // Listen for remote control events
    socket.on(Constants.CONTROLS_FORWARD, () => {
      if (isReceiver) {
        forward()
      }
    })

    socket.on(Constants.CONTROLS_BACKWARD, () => {
      if (isReceiver) {
        backward()
      }
    })

    socket.on(Constants.CONTROLS_PLAY, () => {
      if (isReceiver) {
        playPause()
      }
    })

    socket.on(Constants.REMOTE_SUBREDDITS, (subreddits: string) => {
      if (isReceiver && subreddits) {
        const subredditList = subreddits.split('+').filter(Boolean)
        setSelectedSubreddits(subredditList)
      }
    })

    // Handle socket queries
    socket.on('get:user', () => {
      socket.emit('answer:user', {
        name: user.name,
        id: user.id,
      })
    })

    socket.on('get:play', () => {
      socket.emit('answer:play', isPlaying)
    })

    socket.on('get:subreddits', () => {
      socket.emit('answer:subreddits', selectedSubreddits)
    })

    socket.on('get:song', () => {
      const currentSong = useStore.getState().currentSong
      socket.emit('answer:song', currentSong || false)
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user, hash, isReceiver, forward, backward, playPause, isPlaying, selectedSubreddits, setSelectedSubreddits])

  const handleGenerateLink = async () => {
    try {
      const response = await fetch('/api/remote/generate')
      if (response.ok) {
        const newHash = await response.text()
        setHash(newHash)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const link = `${baseUrl}/remote/${newHash}`
        setHashLink(link)
        
        // Join hash room
        if (socketRef.current) {
          socketRef.current.emit('join:hash', newHash)
        }
      }
    } catch (error) {
      console.error('Failed to generate hash:', error)
    }
  }

  const handleCopySubreddits = () => {
    if (socketRef.current && !isReceiver) {
      socketRef.current.emit(Constants.REMOTE_SUBREDDITS, selectedSubreddits.join('+'))
    }
  }

  const handleControl = (type: string) => {
    if (socketRef.current && !isReceiver) {
      socketRef.current.emit(type)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show success message
      useStore.getState().addMessage({
        type: 'success',
        text: 'Copied to clipboard!',
      })
    })
  }

  return (
    <div className="min-h-screen bg-[#111] pt-14 pb-16">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 text-white">
          <Wifi className="w-5 h-5" />
          <span className="text-lg font-light">Remote Control</span>
        </div>

        {/* Mode Selection */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="mode"
                checked={isReceiver}
                onChange={() => setIsReceiver(true)}
                className="w-4 h-4 text-[#FDC00F]"
              />
              <span className="text-white">This is where I play music.</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="mode"
                checked={!isReceiver}
                onChange={() => setIsReceiver(false)}
                className="w-4 h-4 text-[#FDC00F]"
              />
              <span className="text-white">This is the remote control.</span>
            </label>
          </div>
        </div>

        {/* Remote Controls (Commander Mode) */}
        {!isReceiver && (
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => handleControl(Constants.CONTROLS_BACKWARD)}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:text-[#FDC00F] hover:bg-[#FDC00F]/10"
                >
                  <SkipBack className="w-6 h-6" />
                </Button>
                <Button
                  onClick={() => handleControl(Constants.CONTROLS_PLAY)}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:text-[#FDC00F] hover:bg-[#FDC00F]/10"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
                <Button
                  onClick={() => handleControl(Constants.CONTROLS_FORWARD)}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:text-[#FDC00F] hover:bg-[#FDC00F]/10"
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleCopySubreddits}
              className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Send Subreddits Selection
            </Button>
          </div>
        )}

        {/* Receiver Mode */}
        {isReceiver && (
          <div className="space-y-4">
            <Button
              onClick={handleGenerateLink}
              className="w-full bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Generate Link / Token
            </Button>

            {hash && hashLink && (
              <div className="bg-[#1a1a1a] rounded-lg p-6">
                <div className="text-center">
                  <h3 className="text-white font-medium mb-4">Remote Control Link</h3>
                  <div className="bg-[#111] rounded p-3 mb-4 break-all">
                    <code className="text-[#FDC00F] text-sm">{hashLink}</code>
                  </div>
                  <div className="bg-[#111] rounded p-3 mb-4">
                    <code className="text-[#FDC00F] text-sm">Token: {hash}</code>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(hashLink)}
                    variant="outline"
                    className="text-white border-[#FDC00F] hover:bg-[#FDC00F]/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

