import type { Community } from '@/lib/community/types'
import { communityAffinities, type ListeningEvent } from '@/lib/store/listening-store'

export function recommendCommunities(
  communities: Community[],
  events: ListeningEvent[],
  selected: string[],
  limit = 6,
  now = Date.now()
) {
  const affinities = communityAffinities(events, now)
  const uniqueCommunities = new Map<string, Community>()
  for (const community of communities) {
    const key = community.key.toLowerCase()
    const existing = uniqueCommunities.get(key)
    if (!existing || (community.qualityScore ?? 0) > (existing.qualityScore ?? 0)) {
      uniqueCommunities.set(key, community)
    }
  }
  const categories = new Map<string, number>()
  for (const community of uniqueCommunities.values()) {
    categories.set(
      community.category,
      (categories.get(community.category) ?? 0) +
        Math.max(0, affinities.get(community.key.toLowerCase()) ?? 0)
    )
  }
  const selectedKeys = new Set(selected.map(name => name.toLowerCase()))
  const ranked = [...uniqueCommunities.values()]
    .filter(
      community => !selectedKeys.has(community.key.toLowerCase()) && community.activity !== 'quiet'
    )
    .map(community => ({
      community,
      score:
        (community.qualityScore ?? 0) / 100 +
        (affinities.get(community.key.toLowerCase()) ?? 0) +
        (categories.get(community.category) ?? 0) * 0.4,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.community.key.localeCompare(right.community.key)
    )
  const count = Math.max(0, Math.floor(limit))
  const recommendations: Community[] = []
  const deferred: Community[] = []
  const categoryCounts = new Map<string, number>()
  for (const { community } of ranked) {
    const categoryCount = categoryCounts.get(community.category) ?? 0
    if (categoryCount >= 2 || recommendations.length >= count) {
      deferred.push(community)
      continue
    }
    recommendations.push(community)
    categoryCounts.set(community.category, categoryCount + 1)
  }
  if (recommendations.length < count) {
    recommendations.push(...deferred.slice(0, count - recommendations.length))
  }
  return recommendations.map(community => {
    let reason = 'Explore a different community'
    if (community.recentPlayablePosts && community.recentPlayablePosts > 0) {
      reason = `${community.recentPlayablePosts} recent supported links in the sample`
    }
    if ((categories.get(community.category) ?? 0) > 0) {
      reason = `More ${community.category.toLowerCase()}, based on your listening`
    }
    return { community, reason }
  })
}
