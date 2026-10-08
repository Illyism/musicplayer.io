import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { extractYouTubeId } from '@/lib/utils/song-utils'
import { MP3Player } from '../mp3-player'
import { SoundCloudPlayer } from '../soundcloud-player'
import { YouTubePlayer } from '../youtube-player'

const songs = ['first', 'second'].map(id => ({
  id,
  playable: true,
  title: id,
  type: 'youtube',
  url: `https://www.youtube.com/watch?v=${id}`,
})) as Song[]
let renderer: ReactTestRenderer | undefined
let events: Record<string, (event: any) => void>
let player: any
const originalWindow = globalThis.window
const originalDocument = globalThis.document

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  usePlayerStore.setState({
    currentIndex: 0,
    currentSong: songs[0],
    currentTime: 0,
    duration: 0,
    failedSongIds: [],
    isPlaying: true,
    listingCursorId: songs[0].id,
    playbackError: null,
    playbackSource: 'listing',
    queueSongs: [],
    repeatMode: 'off',
    songs,
    volume: 100,
  })
  player = {
    cueVideoById: mock(() => undefined),
    destroy: mock(() => undefined),
    getCurrentTime: () => 0,
    getDuration: () => 100,
    loadVideoById: mock(() => undefined),
    pauseVideo: mock(() => undefined),
    playVideo: mock(() => undefined),
    seekTo: mock(() => undefined),
    setVolume: mock(() => undefined),
    stopVideo: mock(() => undefined),
  }
  ;(globalThis as any).window = {
    YT: {
      Player: class {
        constructor(_element: unknown, options: any) {
          ;({ events } = options)
          Object.assign(this, player)
        }
      },
    },
  }
  ;(globalThis as any).document = { createElement: () => ({}) }
})

afterEach(async () => {
  if (renderer) {
    await act(() => renderer?.unmount())
    renderer = undefined
  }
  ;(globalThis as any).window = originalWindow
  ;(globalThis as any).document = originalDocument
})

async function mountYouTube() {
  await act(() => {
    renderer = create(<YouTubePlayer song={songs[0]} />, {
      createNodeMock: () => ({
        appendChild: () => undefined,
        innerHTML: '',
        querySelector: () => ({}),
      }),
    })
  })
  await act(() => events.onReady({ target: player }))
}

test('YouTube completion keeps playback enabled despite a late pause from the previous track', async () => {
  await mountYouTube()
  await act(() => events.onStateChange({ data: 1 }))
  await act(() => events.onStateChange({ data: 0 }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  await act(() => events.onStateChange({ data: 2 }))
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  await act(() => renderer?.update(<YouTubePlayer song={songs[1]} />))
  expect(player.destroy).not.toHaveBeenCalled()
  expect(player.loadVideoById).toHaveBeenCalled()
})

test('changing volume keeps the YouTube player alive', async () => {
  await mountYouTube()
  await act(() => usePlayerStore.setState({ volume: 30 }))
  expect(player.destroy).not.toHaveBeenCalled()
})

test('YouTube Shorts URLs yield a video ID', () => {
  expect(extractYouTubeId('https://www.youtube.com/shorts/f2picMQC-9E?si=share')).toBe(
    'f2picMQC-9E'
  )
})

test('YouTube errors skip one failed track and ignore subsequent callbacks from it', async () => {
  await mountYouTube()
  await act(() => events.onError({ data: 100 }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  await act(() => events.onError({ data: 100 }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('an invalid YouTube URL does not prevent loading the next valid track', async () => {
  const invalid = { ...songs[0], url: 'https://www.youtube.com/not-a-video' }
  usePlayerStore.setState({ currentSong: invalid, songs: [invalid, songs[1]] })
  await act(() => {
    renderer = create(<YouTubePlayer song={invalid} />, {
      createNodeMock: () => ({ appendChild: () => undefined }),
    })
  })
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  await act(() => renderer?.update(<YouTubePlayer song={songs[1]} />))
  await act(() => events.onReady({ target: player }))
  expect(player.loadVideoById).toHaveBeenCalledWith({ startSeconds: 0, videoId: 'second' })
})

test('failure recovery stops when every track fails and permits an explicit retry', () => {
  const state = usePlayerStore.getState()
  state.failCurrentSong('first', 'unavailable')
  state.failCurrentSong('second', 'unavailable')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(usePlayerStore.getState().failedSongIds).toEqual(['first', 'second'])
  state.setCurrentSong(0)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(usePlayerStore.getState().failedSongIds).toEqual(['second'])
})

test('SoundCloud advances using load readiness, keeps its iframe, and ignores stale pause/load callbacks', async () => {
  usePlayerStore.setState({ repeatMode: 'all' })
  const scSongs = songs.map(item => ({
    ...item,
    type: 'soundcloud' as const,
    url: `https://soundcloud.com/artist/${item.id}`,
  }))
  usePlayerStore.setState({ currentSong: scSongs[0], songs: scSongs })
  const handlers: Record<string, () => void> = {}
  const callbacks: (() => void)[] = []
  const widget = {
    bind: (name: string, callback: () => void) => {
      handlers[name] = callback
    },
    getDuration: (callback: (duration: number) => void) => callback(180_000),
    load: mock((_url: string, options: any) => {
      callbacks.push(options.callback)
    }),
    pause: mock(() => undefined),
    play: mock(() => undefined),
    seekTo: mock(() => undefined),
    setVolume: mock(() => undefined),
    unbind: mock(() => undefined),
  }
  const Widget = Object.assign(() => widget, {
    Events: {
      ERROR: 'error',
      FINISH: 'finish',
      PAUSE: 'pause',
      PLAY: 'play',
      PLAY_PROGRESS: 'progress',
      READY: 'ready',
    },
  })
  window.SC = { Widget }
  await act(() => {
    renderer = create(<SoundCloudPlayer song={scSongs[0]} />, {
      createNodeMock: () => ({ contentWindow: {} }),
    })
  })
  await act(() => handlers.ready())
  expect(widget.play).not.toHaveBeenCalled()
  await act(() => callbacks[0]())
  expect(widget.play).toHaveBeenCalledTimes(1)
  await act(() => usePlayerStore.setState({ volume: 40 }))
  expect(widget.load).toHaveBeenCalledTimes(1)
  await act(() => handlers.play())
  await act(() => handlers.finish())
  await act(() => handlers.pause())
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  const originalSrc = renderer?.root.findByType('iframe').props.src
  await act(() => renderer?.update(<SoundCloudPlayer song={scSongs[1]} />))
  expect(widget.unbind).not.toHaveBeenCalled()
  expect(renderer?.root.findByType('iframe').props.src).toBe(originalSrc)
  await act(() => callbacks[0]())
  expect(widget.play).toHaveBeenCalledTimes(1)
  await act(() => usePlayerStore.getState().pause())
  await act(() => callbacks[1]())
  expect(widget.play).toHaveBeenCalledTimes(1)
  await act(() => usePlayerStore.getState().play())
  expect(widget.play).toHaveBeenCalledTimes(2)
  await act(() => handlers.play())
  await act(() => handlers.error())
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
})

test('a pause while YouTube is loading is honored when playback starts', async () => {
  await mountYouTube()
  await act(() => usePlayerStore.getState().pause())
  await act(() => events.onStateChange({ data: 1 }))
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(player.pauseVideo).toHaveBeenCalled()
})

test('a late YouTube callback after switching providers cannot stop the new track', async () => {
  await mountYouTube()
  await act(() => events.onStateChange({ data: 1 }))
  const soundcloud = {
    ...songs[1],
    type: 'soundcloud' as const,
    url: 'https://soundcloud.com/artist/second',
  }
  await act(() => usePlayerStore.setState({ songs: [songs[0], soundcloud] }))
  await act(() => events.onStateChange({ data: 0 }))
  await act(() => renderer?.unmount())
  renderer = undefined
  await act(() => events.onStateChange({ data: 2 }))
  await act(() => events.onError({ data: 100 }))
  expect(usePlayerStore.getState().currentSong?.type).toBe('soundcloud')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(usePlayerStore.getState().failedSongIds).toEqual([])
})

test('advance wraps to the first healthy track and skips previously failed tracks', () => {
  usePlayerStore.setState({ repeatMode: 'all' })
  const state = usePlayerStore.getState()
  state.failCurrentSong('first', 'unavailable')
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  state.setCurrentSong(0)
  state.setCurrentSong(1)
  state.next()
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentTime).toBe(0)
  expect(usePlayerStore.getState().isPlaying).toBe(true)
})

test('YouTube repeat-one replays the same mounted player at zero', async () => {
  await mountYouTube()
  await act(() => usePlayerStore.setState({ currentTime: 99, repeatMode: 'one' }))
  await act(() => events.onStateChange({ data: 1 }))
  await act(() => events.onStateChange({ data: 0 }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().currentTime).toBe(0)
  expect(player.seekTo).toHaveBeenCalledWith(0, true)
  expect(player.playVideo).toHaveBeenCalled()
  expect(player.destroy).not.toHaveBeenCalled()
})

test('YouTube repeat-off stops at the end without replaying the same song', async () => {
  usePlayerStore.setState({ songs: [songs[0]] })
  await mountYouTube()
  await act(() => events.onStateChange({ data: 1 }))
  await act(() => events.onStateChange({ data: 0 }))
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(player.seekTo).not.toHaveBeenCalled()
})

test('YouTube natural completion plays a queued track before the next listing song', async () => {
  const queued = { ...songs[1], id: 'queued', url: 'https://www.youtube.com/watch?v=queued' }
  await mountYouTube()
  await act(() => usePlayerStore.getState().enqueueSong(queued, 'next'))
  await act(() => events.onStateChange({ data: 1 }))
  await act(() => events.onStateChange({ data: 0 }))
  expect(usePlayerStore.getState().currentSong?.id).toBe('queued')
  expect(usePlayerStore.getState().playbackSource).toBe('queue')
  expect(usePlayerStore.getState().queueSongs).toEqual([])
})

test('MP3 repeat-one resets and restarts its persistent audio element', async () => {
  const mp3 = { ...songs[0], type: 'mp3' as const, url: 'https://example.com/first.mp3' }
  const handlers: Record<string, () => Promise<void>> = {}
  const audio = {
    addEventListener: (name: string, handler: () => Promise<void>) => {
      handlers[name] = handler
    },
    currentTime: 99,
    duration: 100,
    pause: mock(() => undefined),
    play: mock(async () => undefined),
    readyState: 4,
    removeEventListener: mock(() => undefined),
    volume: 1,
  }
  usePlayerStore.setState({ currentSong: mp3, repeatMode: 'one', songs: [mp3] })
  await act(() => {
    renderer = create(<MP3Player song={mp3} />, {
      createNodeMock: element => (element.type === 'audio' ? audio : {}),
    })
  })
  await act(async () => {
    await handlers.ended()
  })
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(audio.currentTime).toBe(0)
  expect(audio.play).toHaveBeenCalledTimes(2)
  expect(window.__audioPlayer).toBe(audio as unknown as HTMLAudioElement)
})

test('MP3 repeat-off ends without restarting the completed audio', async () => {
  const mp3 = { ...songs[0], type: 'mp3' as const, url: 'https://example.com/first.mp3' }
  const handlers: Record<string, () => Promise<void>> = {}
  const audio = {
    addEventListener: (name: string, handler: () => Promise<void>) => {
      handlers[name] = handler
    },
    currentTime: 99,
    duration: 100,
    pause: mock(() => undefined),
    play: mock(async () => undefined),
    readyState: 4,
    removeEventListener: mock(() => undefined),
    volume: 1,
  }
  usePlayerStore.setState({ currentSong: mp3, songs: [mp3] })
  await act(() => {
    renderer = create(<MP3Player song={mp3} />, {
      createNodeMock: element => (element.type === 'audio' ? audio : {}),
    })
  })
  await act(async () => {
    await handlers.ended()
  })
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(audio.play).toHaveBeenCalledTimes(1)
  expect(audio.pause).toHaveBeenCalled()
})

test('browser autoplay rejection pauses without marking the track failed', async () => {
  await mountYouTube()
  await act(() => events.onAutoplayBlocked({}))
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(usePlayerStore.getState().failedSongIds).toEqual([])
  expect(usePlayerStore.getState().playbackError).toContain('Press Play')
  await act(() => usePlayerStore.getState().play())
  expect(usePlayerStore.getState().playbackError).toBeNull()
  expect(player.playVideo).toHaveBeenCalled()
})
