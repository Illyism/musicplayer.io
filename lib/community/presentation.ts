import type { CommunityDiscoveryResult } from './types'

export function discoveryStatus(data: CommunityDiscoveryResult) {
  if (data.source === 'fallback') {
    return data.communities.length > 0
      ? 'Starter suggestions · current activity has not been checked.'
      : 'Live discovery is unavailable.'
  }
  const checked = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString(undefined, {
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        month: 'short',
      })
    : 'recently'
  if (data.source === 'snapshot') {
    return `Snapshot from ${checked} · live checks unavailable.`
  }
  return `Checked ${checked}${data.degraded ? ' · some checks unavailable' : ''}.`
}
