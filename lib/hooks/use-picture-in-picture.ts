'use client'

import { createContext, useContext } from 'react'

export interface DocumentPictureInPictureApi {
  requestWindow: (options: { height: number; width: number }) => Promise<Window>
}

export async function requestPictureInPictureWindow(
  api?: DocumentPictureInPictureApi,
  timeoutMs = 2500
) {
  if (typeof api?.requestWindow !== 'function') {
    return null
  }
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const request = api.requestWindow({ height: 320, width: 360 }).then(nativeWindow => {
      if (timedOut) {
        nativeWindow.close()
        return null
      }
      return nativeWindow.closed ? null : nativeWindow
    })
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => {
        timedOut = true
        resolve(null)
      }, timeoutMs)
    })
    return await Promise.race([request, timeout])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface PictureInPictureState {
  close: () => void
  isActive: boolean
  isNative: boolean
  isOpening: boolean
  mediaDestination: HTMLElement | null
  registerMedia: (element: HTMLElement, home: HTMLElement) => () => void
  setMediaDestination: (element: HTMLElement | null) => void
  supported: boolean
  toggle: () => Promise<void>
}

export const PictureInPictureContext = createContext<PictureInPictureState | null>(null)

export function usePictureInPicture() {
  const context = useContext(PictureInPictureContext)
  if (!context) {
    throw new Error('usePictureInPicture must be used within PictureInPictureProvider')
  }
  return context
}
