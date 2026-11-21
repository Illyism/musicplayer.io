export const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox'

export function PauseOverlay({ onPause }: { onPause: () => void }) {
  return (
    <button
      aria-label="Pause"
      className="absolute inset-0 z-10 cursor-pointer"
      onClick={onPause}
      tabIndex={-1}
      type="button"
    />
  )
}
