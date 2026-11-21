const COMMUNITY_SEPARATOR_REGEX = /[+\s]+/u
const VALID_SUBREDDIT_REGEX = /^[a-z0-9_-]{1,100}$/iu
const MAX_ROUTE_COMMUNITIES = 50

export function parseRouteCommunities(value: string) {
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    decoded = value
  }
  return [
    ...new Set(
      decoded
        .split(COMMUNITY_SEPARATOR_REGEX)
        .map(name => name.trim().toLowerCase())
        .filter(name => VALID_SUBREDDIT_REGEX.test(name))
    ),
  ].slice(0, MAX_ROUTE_COMMUNITIES)
}

export function listingRequestPath(
  subreddit: string,
  sort = 'hot',
  timePeriod?: string,
  after?: string
) {
  const params = new URLSearchParams({
    limit: '100',
    sort,
    subreddit,
    ...(timePeriod && { t: timePeriod }),
    ...(after && { after }),
  })
  return `/api/reddit?${params.toString()}`
}
