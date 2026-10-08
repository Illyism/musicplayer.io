import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { discoverCommunities } from '@/lib/community/discovery'
import { parseCommunityCategory } from '@/lib/community/types'

const queryArgument = process.argv.find(argument => argument.startsWith('--query='))
const categoryArgument = process.argv.find(argument => argument.startsWith('--category='))
const query = queryArgument?.slice('--query='.length) ?? ''
const categoryValue = categoryArgument?.slice('--category='.length)
const category = parseCommunityCategory(categoryValue)
if (categoryValue && category === null) {
  throw new Error('Use one of the categories exported in lib/community/types.ts.')
}
const result = await discoverCommunities({ category, query })
const dataDirectory = resolve(process.cwd(), 'data')
await mkdir(dataDirectory, { recursive: true })
await writeFile(
  resolve(dataDirectory, 'community-discovery-status.json'),
  `${JSON.stringify(
    {
      attemptedAt: new Date().toISOString(),
      communityCount: result.source === 'live' ? result.communities.length : 0,
      degraded: result.degraded,
      message: result.message,
      source: result.source,
    },
    null,
    2
  )}\n`
)
if (result.source === 'live') {
  // Overwrite a single temporary display snapshot. Do not accumulate post datasets.
  const snapshot = { ...result, expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString() }
  await writeFile(
    resolve(dataDirectory, 'community-discovery.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`
  )
  process.stdout.write(
    `Captured ${result.communities.length} checked communities. No post text, authors, or media URLs were saved.\n`
  )
} else {
  process.stderr.write(
    'Live discovery could not be captured. The status artifact records the failure; the last snapshot was preserved.\n'
  )
  process.exitCode = 2
}

const formatting = spawnSync(
  'bun',
  [
    'x',
    'ultracite',
    'fix',
    'data/community-discovery.json',
    'data/community-discovery-status.json',
  ],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
  }
)
if (formatting.status !== 0) {
  throw new Error('The discovery artifacts were saved, but scoped formatting failed.')
}
