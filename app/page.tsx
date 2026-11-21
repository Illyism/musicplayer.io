import { preload } from 'react-dom'
import { MusicApp } from '@/components/music-app'
import { listingRequestPath } from '@/lib/utils/listing-request'

export default function Home() {
  preload(listingRequestPath('listentothis'), { as: 'fetch', crossOrigin: 'anonymous' })

  return <MusicApp />
}
