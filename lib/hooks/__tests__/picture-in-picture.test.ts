import { expect, mock, test } from 'bun:test'
import { requestPictureInPictureWindow } from '../use-picture-in-picture'

test('browsers without document PiP select the in-tab fallback', async () => {
  expect(await requestPictureInPictureWindow()).toBeNull()
})

test('a native PiP request retains the browser window and requests both required dimensions', async () => {
  const nativeWindow = { closed: false } as Window
  const requestWindow = mock(async () => nativeWindow)
  expect(await requestPictureInPictureWindow({ requestWindow })).toBe(nativeWindow)
  expect(requestWindow).toHaveBeenCalledWith({ height: 320, width: 360 })
})

test('a rejected native request selects the in-tab fallback instead of leaking a rejected promise', async () => {
  const requestWindow = mock(() =>
    Promise.reject(new DOMException('No user gesture', 'NotAllowedError'))
  )
  expect(await requestPictureInPictureWindow({ requestWindow })).toBeNull()
  expect(requestWindow).toHaveBeenCalledTimes(1)
})

test('a native API that never settles times out so the mini player can open', async () => {
  const requestWindow = mock(() => new Promise<Window>(() => undefined))
  expect(await requestPictureInPictureWindow({ requestWindow }, 10)).toBeNull()
})

test('a window returned after the native request timeout is closed instead of opening unexpectedly', async () => {
  let resolveRequest: ((nativeWindow: Window) => void) | undefined
  const requestWindow = mock(
    () =>
      new Promise<Window>(resolve => {
        resolveRequest = resolve
      })
  )
  expect(await requestPictureInPictureWindow({ requestWindow }, 10)).toBeNull()
  const close = mock(() => undefined)
  resolveRequest?.({ close, closed: false } as unknown as Window)
  await Promise.resolve()
  expect(close).toHaveBeenCalledTimes(1)
})

test('an already-closed native window selects the in-tab fallback', async () => {
  const requestWindow = mock(async () => ({ closed: true }) as Window)
  expect(await requestPictureInPictureWindow({ requestWindow })).toBeNull()
})
