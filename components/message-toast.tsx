"use client"

import { X, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlaylistStore } from "@/lib/store"

export function MessageToast() {
  const messages = usePlaylistStore((state) => state.messages)
  const removeMessage = usePlaylistStore((state) => state.removeMessage)

  if (messages.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-50 space-y-2 max-w-md">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 rounded-lg border shadow-lg flex items-start gap-3 animate-in slide-in-from-right ${
            message.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-white'
              : message.type === 'success'
              ? 'bg-green-900/90 border-green-700 text-white'
              : 'bg-blue-900/90 border-blue-700 text-white'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'info' && <Info className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message.text}</p>
            {message.buttons && message.buttons.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {message.buttons.map((button, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (button.action === 'close') {
                        removeMessage(message.id)
                      } else if (button.callback) {
                        button.callback()
                      } else if (button.url) {
                        window.open(button.url, '_blank')
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      button.className?.includes('blue')
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : button.className?.includes('yellow')
                        ? 'bg-[#FDC00F] hover:bg-[#f99b1d] text-black'
                        : button.className?.includes('red')
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {button.text || (button.action === 'close' && <X className="w-4 h-4" />)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => removeMessage(message.id)}
            className="flex-shrink-0 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}



