import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { useEffect } from 'react'
import * as ReactDOM from 'react-dom'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { toast } from 'sonner'
import { type PictureInPictureState, usePictureInPicture } from '@/lib/hooks/use-picture-in-picture'
import { type Song, usePlayerStore } from '@/lib/store/player-store'

const reactDOMExports = { ...ReactDOM }
mock.module('react-dom', () => ({
  ...reactDOMExports,
  createPortal: (children: React.ReactNode) => children,
}))

const { PictureInPictureProvider } = await import('../picture-in-picture')
const originalWindow = globalThis.window
const originalDocument = globalThis.document
const originalMutationObserver = globalThis.MutationObserver
const originalToast = toast.info
let renderer: ReactTestRenderer | undefined
let controls: PictureInPictureState
let mediaMounts: number
let browserWindow: EventTarget & { documentPictureInPicture?: unknown }

function PlayerHarness() {
  controls = usePictureInPicture()
  useEffect(() => {
    mediaMounts += 1
  }, [])
  return <div>Persistent media player</div>
}

function makeNativeWindow() {
  const nativeWindow = Object.assign(new EventTarget(), {
    close: mock(() => {
      nativeWindow.closed = true
      nativeWindow.dispatchEvent(new Event('pagehide'))
    }),
    closed: false,
    document: {
      body: { className: '', nodeType: 1, style: {} },
      documentElement: { className: '' },
      head: { appendChild: mock(() => undefined) },
      title: '',
    },
  })
  return nativeWindow
}

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  browserWindow = new EventTarget()
  ;(globalThis as any).window = browserWindow
  ;(globalThis as any).document = {
    body: { className: '', nodeType: 1 },
    documentElement: { className: '' },
    querySelectorAll: () => [],
  }
  ;(globalThis as any).MutationObserver = class {
    disconnect = mock(() => undefined)
    observe = mock(() => undefined)
  }
  toast.info = mock(() => 1)
  mediaMounts = 0
  const song = {
    id: 'first',
    playable: true,
    subreddit: 'listentothis',
    title: 'First song',
    type: 'youtube',
    url: 'https://www.youtube.com/watch?v=first',
  } as Song
  usePlayerStore.setState({
    currentSong: song,
    currentTime: 42,
    isPlaying: true,
    isTheatreMode: false,
  })
})

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  ;(globalThis as any).window = originalWindow
  ;(globalThis as any).document = originalDocument
  ;(globalThis as any).MutationObserver = originalMutationObserver
  toast.info = originalToast
})

async function mountProvider() {
  await act(() => {
    renderer = create(
      <PictureInPictureProvider>
        <PlayerHarness />
      </PictureInPictureProvider>
    )
  })
}

test('an unsupported browser opens the actual fallback UI and closes without remounting the player', async () => {
  await mountProvider()
  expect(controls.supported).toBe(false)
  await act(() => controls.toggle())
  expect(controls.isActive).toBe(true)
  expect(controls.isNative).toBe(false)
  expect(renderer?.root.findByProps({ 'aria-label': 'Mini player' })).toBeDefined()
  expect(toast.info).toHaveBeenCalledTimes(1)
  expect(usePlayerStore.getState().currentTime).toBe(42)
  await act(() => controls.close())
  expect(controls.isActive).toBe(false)
  expect(mediaMounts).toBe(1)
})

test('a native request rejection opens the fallback UI and releases the opening state', async () => {
  browserWindow.documentPictureInPicture = {
    requestWindow: mock(() => Promise.reject(new Error('Unavailable in this webview'))),
  }
  await mountProvider()
  await act(() => controls.toggle())
  expect(controls.supported).toBe(true)
  expect(controls.isOpening).toBe(false)
  expect(renderer?.root.findByProps({ 'aria-label': 'Mini player' })).toBeDefined()
  expect(mediaMounts).toBe(1)
})

test('a native window discarded immediately by an embedded browser falls back instead of silently closing', async () => {
  const nativeWindow = makeNativeWindow()
  browserWindow.documentPictureInPicture = { requestWindow: mock(async () => nativeWindow) }
  await mountProvider()
  await act(() => controls.toggle())
  expect(controls.isNative).toBe(true)
  await act(() => nativeWindow.close())
  expect(controls.isActive).toBe(true)
  expect(controls.isNative).toBe(false)
  expect(renderer?.root.findByProps({ 'aria-label': 'Mini player' })).toBeDefined()
  expect(usePlayerStore.getState().currentTime).toBe(42)
  expect(mediaMounts).toBe(1)
})

test('an intentional close does not reopen the fallback during the native window startup period', async () => {
  const nativeWindow = makeNativeWindow()
  browserWindow.documentPictureInPicture = { requestWindow: mock(async () => nativeWindow) }
  await mountProvider()
  await act(() => controls.toggle())
  await act(() => controls.close())
  expect(controls.isActive).toBe(false)
  expect(nativeWindow.close).toHaveBeenCalledTimes(1)
  expect(toast.info).not.toHaveBeenCalled()
  expect(mediaMounts).toBe(1)
})

test('Escape closes the in-tab player while preserving the mounted media', async () => {
  await mountProvider()
  await act(() => controls.toggle())
  await act(() => {
    browserWindow.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }))
  })
  expect(controls.isActive).toBe(false)
  expect(mediaMounts).toBe(1)
})

test('unmounting closes the native window and does not reopen the fallback', async () => {
  const nativeWindow = makeNativeWindow()
  browserWindow.documentPictureInPicture = { requestWindow: mock(async () => nativeWindow) }
  await mountProvider()
  await act(() => controls.toggle())
  await act(() => renderer?.unmount())
  renderer = undefined
  expect(nativeWindow.close).toHaveBeenCalledTimes(1)
  expect(toast.info).not.toHaveBeenCalled()
})

test('a native window that resolves after the provider closes is cleaned up', async () => {
  const nativeWindow = makeNativeWindow()
  let resolveWindow: ((value: typeof nativeWindow) => void) | undefined
  browserWindow.documentPictureInPicture = {
    requestWindow: mock(
      () =>
        new Promise(resolve => {
          resolveWindow = resolve
        })
    ),
  }
  await mountProvider()
  let opening: Promise<void> | undefined
  await act(() => {
    opening = controls.toggle()
  })
  expect(controls.isOpening).toBe(true)
  await act(() => controls.close())
  await act(async () => {
    resolveWindow?.(nativeWindow)
    await opening
  })
  expect(nativeWindow.close).toHaveBeenCalledTimes(1)
  expect(controls.isActive).toBe(false)
  expect(controls.isOpening).toBe(false)
})
