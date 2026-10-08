import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { type Song, usePlayerStore } from '@/lib/store/player-store'
import { KeyboardShortcuts } from '../keyboard-shortcuts'

const attributeSelectorPattern = /^\[([^=\]]+)(?:="([^"]*)")?\]$/

// A small DOM substitute: shortcuts only need Element.closest(), including ancestors.
class ShortcutElement {
  private readonly tagName: string
  private readonly attributes: Record<string, string>
  private readonly parent: ShortcutElement | null

  constructor(
    tagName = 'div',
    attributes: Record<string, string> = {},
    parent: ShortcutElement | null = null
  ) {
    this.tagName = tagName
    this.attributes = attributes
    this.parent = parent
  }

  private matches(selector: string): boolean {
    const [positive, excluded] = selector.split(':not(')
    const attribute = positive.match(attributeSelectorPattern)
    const positiveMatch = attribute
      ? Object.hasOwn(this.attributes, attribute[1]) &&
        (attribute[2] === undefined || this.attributes[attribute[1]] === attribute[2])
      : this.tagName === positive
    return positiveMatch && !(excluded && this.matches(excluded.slice(0, -1)))
  }

  closest(selector: string): ShortcutElement | null {
    if (selector.split(',').some(part => this.matches(part.trim()))) {
      return this
    }
    return this.parent?.closest(selector) ?? null
  }
}

const songs = ['first', 'second', 'third'].map(id => ({
  id,
  playable: true,
  title: id,
  type: 'youtube',
  url: `https://www.youtube.com/watch?v=${id}`,
})) as Song[]
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalElement = Object.getOwnPropertyDescriptor(globalThis, 'Element')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const originalActEnvironment = Object.getOwnPropertyDescriptor(
  globalThis,
  'IS_REACT_ACT_ENVIRONMENT'
)
let renderer: ReactTestRenderer | undefined
let listeners: Set<(event: KeyboardEvent) => void>

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor)
  } else {
    Reflect.deleteProperty(globalThis, name)
  }
}

beforeEach(async () => {
  listeners = new Set()
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: ShortcutElement })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem: mock(() => undefined) },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: (type: string, listener: (event: KeyboardEvent) => void) => {
        if (type === 'keydown') {
          listeners.add(listener)
        }
      },
      removeEventListener: (type: string, listener: (event: KeyboardEvent) => void) => {
        if (type === 'keydown') {
          listeners.delete(listener)
        }
      },
    },
  })
  usePlayerStore.setState({
    currentIndex: 0,
    currentSong: songs[0],
    failedSongIds: [],
    isPlaying: false,
    songs,
    volume: 60,
  })
  await act(() => {
    renderer = create(<KeyboardShortcuts />)
  })
})

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  restoreGlobal('window', originalWindow)
  restoreGlobal('Element', originalElement)
  restoreGlobal('localStorage', originalStorage)
  restoreGlobal('IS_REACT_ACT_ENVIRONMENT', originalActEnvironment)
})

async function dispatch(
  key: string,
  options: {
    altKey?: boolean
    ctrlKey?: boolean
    defaultPrevented?: boolean
    metaKey?: boolean
    target?: ShortcutElement
  } = {}
) {
  const preventDefault = mock(() => undefined)
  const event = {
    altKey: false,
    code: key === ' ' ? 'Space' : key,
    ctrlKey: false,
    defaultPrevented: false,
    key,
    metaKey: false,
    preventDefault,
    target: new ShortcutElement('body'),
    ...options,
  } as unknown as KeyboardEvent
  await act(() => {
    for (const listener of [...listeners]) {
      listener(event)
    }
  })
  return preventDefault
}

test('one Space event toggles playback once, including after the component rerenders', async () => {
  expect(listeners.size).toBe(1)
  const preventDefault = await dispatch(' ')
  expect(usePlayerStore.getState().isPlaying).toBe(true)
  expect(preventDefault).toHaveBeenCalledTimes(1)
  expect(listeners.size).toBe(1)
  await dispatch(' ')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})

test('one right arrow advances one track and left arrow returns one track', async () => {
  const preventDefault = await dispatch('ArrowRight')
  expect(usePlayerStore.getState().currentSong?.id).toBe('second')
  expect(preventDefault).toHaveBeenCalledTimes(1)
  await dispatch('ArrowLeft')
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
})

for (const tagName of ['button', 'input', 'textarea', 'select', 'a']) {
  test(`a focused ${tagName} keeps its Space and arrow behavior`, async () => {
    const target = new ShortcutElement(tagName)
    const spacePrevented = await dispatch(' ', { target })
    const arrowPrevented = await dispatch('ArrowRight', { target })
    const modifiedArrowPrevented = await dispatch('ArrowRight', { ctrlKey: true, target })
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(usePlayerStore.getState().currentSong?.id).toBe('first')
    expect(spacePrevented).not.toHaveBeenCalled()
    expect(arrowPrevented).not.toHaveBeenCalled()
    expect(modifiedArrowPrevented).not.toHaveBeenCalled()
  })
}

for (const role of ['dialog', 'alertdialog', 'menu', 'slider', 'combobox', 'listbox']) {
  test(`a focused descendant of a ${role} keeps navigation and volume keys`, async () => {
    const parent = new ShortcutElement('div', { role })
    const target = new ShortcutElement('span', {}, parent)
    const arrowPrevented = await dispatch('ArrowRight', { target })
    const volumePrevented = await dispatch('ArrowUp', { target })
    const modifiedVolumePrevented = await dispatch('ArrowUp', { metaKey: true, target })
    expect(usePlayerStore.getState().currentSong?.id).toBe('first')
    expect(usePlayerStore.getState().volume).toBe(60)
    expect(arrowPrevented).not.toHaveBeenCalled()
    expect(volumePrevented).not.toHaveBeenCalled()
    expect(modifiedVolumePrevented).not.toHaveBeenCalled()
  })
}

test('typing Space in an editable region leaves playback paused', async () => {
  const parent = new ShortcutElement('div', { contenteditable: 'true' })
  const target = new ShortcutElement('span', {}, parent)
  const preventDefault = await dispatch(' ', { target })
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(preventDefault).not.toHaveBeenCalled()
})

for (const modifier of ['ctrlKey', 'metaKey'] as const) {
  test(`${modifier} arrow shortcuts dispatch each action once`, async () => {
    const nextPrevented = await dispatch('ArrowRight', { [modifier]: true })
    expect(usePlayerStore.getState().currentSong?.id).toBe('second')
    expect(nextPrevented).toHaveBeenCalledTimes(1)
    const previousPrevented = await dispatch('ArrowLeft', { [modifier]: true })
    expect(usePlayerStore.getState().currentSong?.id).toBe('first')
    expect(previousPrevented).toHaveBeenCalledTimes(1)
    const volumeUpPrevented = await dispatch('ArrowUp', { [modifier]: true })
    expect(usePlayerStore.getState().volume).toBe(70)
    expect(volumeUpPrevented).toHaveBeenCalledTimes(1)
    const volumeDownPrevented = await dispatch('ArrowDown', { [modifier]: true })
    expect(usePlayerStore.getState().volume).toBe(60)
    expect(volumeDownPrevented).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(1)
  })

  test(`${modifier} non-arrow shortcuts stay available to the browser`, async () => {
    for (const key of [' ', 'm', 's', '?']) {
      // biome-ignore lint/performance/noAwaitInLoops: key events must run in order through React act
      const preventDefault = await dispatch(key, { [modifier]: true })
      expect(preventDefault).not.toHaveBeenCalled()
    }
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(usePlayerStore.getState().currentSong?.id).toBe('first')
    expect(usePlayerStore.getState().volume).toBe(60)
    expect(usePlayerStore.getState().songs.map(song => song.id)).toEqual([
      'first',
      'second',
      'third',
    ])
  })
}

test('Alt-modified keys stay available to the browser, including Ctrl/Alt arrows', async () => {
  for (const key of [' ', 'm', 's', '?', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    // biome-ignore lint/performance/noAwaitInLoops: key events must run in order through React act
    const preventDefault = await dispatch(key, { altKey: true })
    expect(preventDefault).not.toHaveBeenCalled()
  }
  const combinedPrevented = await dispatch('ArrowRight', { altKey: true, ctrlKey: true })
  expect(combinedPrevented).not.toHaveBeenCalled()
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(usePlayerStore.getState().currentSong?.id).toBe('first')
  expect(usePlayerStore.getState().volume).toBe(60)
})

test('a key handled by another control does not trigger playback', async () => {
  const preventDefault = await dispatch(' ', { defaultPrevented: true })
  expect(usePlayerStore.getState().isPlaying).toBe(false)
  expect(preventDefault).not.toHaveBeenCalled()
})

test('unmounting removes the keyboard listener', async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  expect(listeners.size).toBe(0)
  await dispatch(' ')
  expect(usePlayerStore.getState().isPlaying).toBe(false)
})
