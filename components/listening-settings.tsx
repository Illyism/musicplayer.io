'use client'

import { DownloadSimple, SlidersHorizontal, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useListeningStore } from '@/lib/store/listening-store'

export function ListeningSettings() {
  const [open, setOpen] = useState(false)
  const { enabled, setEnabled, events, clearHistory } = useListeningStore()
  const [cleared, setCleared] = useState(false)

  const exportHistory = () => {
    const blob = new Blob(
      [JSON.stringify({ events, exportedAt: new Date().toISOString(), version: 1 }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'music-player-listening.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Button
        aria-label="Listening preferences"
        className="size-11 rounded-full"
        onClick={() => setOpen(true)}
        size="icon"
        variant="ghost"
      >
        <SlidersHorizontal className="size-5" />
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your listening preferences</DialogTitle>
            <DialogDescription>
              Recommendations learn from listening, saves, and early skips on this device. Your
              history stays in this browser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
            <label className="cursor-pointer font-medium text-sm" htmlFor="learn-from-listening">
              Learn from my listening
            </label>
            <input
              checked={enabled}
              className="size-5 accent-reddit"
              id="learn-from-listening"
              onChange={event => setEnabled(event.target.checked)}
              type="checkbox"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Up to 500 signals, kept for 30 days. Playback errors and seeking do not count as taste
            signals. Saved tracks are kept separately.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={events.length === 0} onClick={exportHistory} variant="outline">
              <DownloadSimple className="size-4" />
              Export history
            </Button>
            <Button
              disabled={events.length === 0}
              onClick={() => {
                clearHistory()
                setCleared(true)
              }}
              variant="outline"
            >
              <Trash className="size-4" />
              Clear history
            </Button>
          </div>
          <p aria-live="polite" className="text-muted-foreground text-xs">
            {cleared && events.length === 0
              ? 'Listening history cleared.'
              : `${events.length} listening signals on this device.`}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
