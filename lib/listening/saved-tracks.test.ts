import { expect, mock, test } from 'bun:test'
import { createSavedTrackReader, parseSavedTrackIds, parseSavedTracks } from './saved-tracks'

const POST = {
  author: 'publiclistener',
  created_utc: 1_790_000_000,
  domain: 'youtu.be',
  id: 'abc123',
  is_self: false,
  name: 't3_abc123',
  subreddit: 'Jazz',
  title: 'A public music link',
  url: 'https://youtu.be/example',
}
const listing = (posts: unknown[]) => ({
  data: { children: posts.map(data => ({ data, kind: 't3' })) },
})

test('saved IDs reject paths, fullnames, blanks, excessive lengths and more than 100 posts', () => {
  for (const value of [null, '', 'abc123,', 't3_abc123', '../api/me', 'a b', 'a'.repeat(14)]) {
    expect(parseSavedTrackIds(value)).toBeNull()
  }
  expect(parseSavedTrackIds(Array.from({ length: 101 }, () => 'abc123').join(','))).toBeNull()
  expect(parseSavedTrackIds('AbC123,abc123,def456')).toEqual(['abc123', 'def456'])
  expect(
    parseSavedTrackIds(Array.from({ length: 100 }, (_, i) => i.toString(36)).join(','))
  ).toHaveLength(100)
})

test('bookmark refresh rejects removed, deleted, NSFW, self and unsupported source posts', () => {
  const unavailable = [
    { removed_by_category: 'deleted' },
    { author: '[deleted]' },
    { title: '[removed]' },
    { selftext: '[deleted]' },
    { over_18: true },
    { is_self: true },
    { url: 'javascript:alert(1)' },
    { url: 'https://youtube.com.attacker.example/watch?v=test' },
    { url: 'https://open.spotify.com/track/example' },
    { created_utc: Number.NaN },
  ]
  for (const changes of unavailable) {
    expect(parseSavedTracks(listing([{ ...POST, ...changes }]), ['abc123'])).toEqual([])
  }
  const [song] = parseSavedTracks(listing([POST, { ...POST, id: 'unwanted' }]), ['abc123'])
  expect(song.id).toBe('abc123')
  expect(song.type).toBe('youtube')
  expect(song.playable).toBe(true)
  expect(song.media).toBeUndefined()
  expect(song.selftext).toBeUndefined()
})

test('bookmark reads coalesce reordered requests, preserve caller order and revalidate after five minutes', async () => {
  let now = 1000
  let response = listing([POST, { ...POST, id: 'def456', name: 't3_def456' }])
  const request = mock((_path: string, _params: URLSearchParams) => Promise.resolve(response))
  const read = createSavedTrackReader({ now: () => now, request })
  const [first, second] = await Promise.all([
    read(['abc123', 'def456']),
    read(['def456', 'abc123']),
  ])
  expect(first.map(song => song.id)).toEqual(['abc123', 'def456'])
  expect(second.map(song => song.id)).toEqual(['def456', 'abc123'])
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0][0]).toBe('/api/info')
  expect(request.mock.calls[0][1].get('id')).toBe('t3_abc123,t3_def456')
  now += 5 * 60_000 - 1
  expect(await read(['abc123', 'def456'])).toHaveLength(2)
  expect(request).toHaveBeenCalledTimes(1)
  now += 2
  response = listing([])
  expect(await read(['abc123', 'def456'])).toEqual([])
  expect(request).toHaveBeenCalledTimes(2)
})

test('a failed bookmark refresh is not cached as an empty successful result', async () => {
  const request = mock(() => Promise.resolve(listing([POST])))
  request.mockRejectedValueOnce(new Error('unavailable'))
  const read = createSavedTrackReader({ request })
  await expect(read(['abc123'])).rejects.toThrow('unavailable')
  expect(await read(['abc123'])).toHaveLength(1)
  expect(request).toHaveBeenCalledTimes(2)
})
