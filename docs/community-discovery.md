# Community discovery

The old YAML list is no longer an API source. `/api/subreddits` discovers music communities through Reddit's OAuth API, checks current public community metadata and the latest 25 posts, then ranks observed supported-source links. No machine learning model is trained.

## Interface

`GET /api/subreddits?q=ambient&category=Ambient` returns `CommunityDiscoveryResult` from `lib/community/types.ts`. `q` is optional and limited to 64 characters; `category` must match an exported category. `All music` removes the category filter. Default/category browsing excludes communities whose sample contains no music links in the last seven days. An explicit search can return a quiet community with that status shown.

`source` distinguishes a live check, a cached check, a saved snapshot, and unverified starter names. `updatedAt` is the original check time. A snapshot always sets `degraded: true`; starter-only results have null check times, counts, scores, and member totals. Never display fallback names as currently active. The client hook `useCommunityDiscovery(query, category)` returns `data`, `loading`, `error`, and `refresh`, with a shared cache and in-flight coalescing across mounted components.

`recentPlayablePosts` counts supported YouTube, SoundCloud, Vimeo, or direct MP3 links in the latest 25 sampled posts that are at most seven days old. It is a sample count, not a total per week. Removed/NSFW/self posts and invalid timestamps are excluded. Provider availability, embedding permission, and whether a video is a complete song are not verified. Subscriber totals come only from the current about response. Category labels are a deterministic inference from the community's name and description, not Reddit's own classification.

The score is an explicit heuristic: recent-link volume contributes up to 45 points, the supported-link share of the sample contributes 30, and newest-link recency contributes 25. Member totals do not affect the score. Explicit searches put exact community names first, partial name matches second, and then use that activity score; comparisons ignore case and an optional `r/` prefix. Default browsing keeps activity-first ordering. These search priorities never change the observed counts or turn a community sample into artist-specific counts. The default candidate mix balances starter names, subreddit search, and communities found in recent public music-link search. Each starter is checked like any other candidate.

## Request bounds and caching

A discovery pass considers at most 16 communities, with three concurrent enrichment workers and at most 34 logical data requests. Search/about/new use the existing app-only OAuth token and the app's descriptive User-Agent. Discovery reserves at most 40 data requests per process per minute, watches `X-Ratelimit-Remaining` and `X-Ratelimit-Reset`, and stops near the quota reserve or after a 429. A 401 can refresh the app token once; refused 403 responses are not bypassed. Individual data requests time out after eight seconds, token acquisition after twelve; queued work stops after a twenty-second discovery deadline. A request already in progress can finish after that deadline.

The server cache keeps successful query/category results for 15 minutes and degraded fallback attempts for one minute, capped at 20 keys. Concurrent misses share one request. Browser consumers share a one-minute cache. Server, browser, and HTTP cache lifetimes are bounded by the original result expiry, so a cached snapshot cannot extend its own validity. Future timestamps and snapshots older than 24 hours are rejected. Cached responses retain the original check time. Limits are per process; all app instances and other Reddit features share the OAuth client quota, so the response headers remain authoritative.

## Capture and refresh

Run `bun scripts/capture-community-discovery.ts` using the same configured Reddit credentials as the app. Optional arguments are `--query=ambient` and `--category=Ambient`. The script overwrites `data/community-discovery.json` only after a successful live pass and writes `data/community-discovery-status.json` for every attempt. It prints summary counts only and never prints credentials, tokens, post text, author names, or media URLs.

The saved artifact is a temporary local inspection receipt containing community metadata and aggregate activity samples, not a training dataset. Capture files are excluded from Git and Docker images and are not imported by production. The production service uses live checks, short-lived in-memory caches, and unverified starter suggestions; snapshot support is available only when explicitly supplied to the discovery factory. The receipt carries a 24-hour expiry, which marks its validity rather than physically deleting it. Do not accumulate historical copies or use it for model training. Refresh or delete saved Reddit-derived metadata within 48 hours and remove data that Reddit deletes. The implementation does not provide a deletion webhook or a retention scheduler; the operator must handle that before ongoing capture. A failed capture preserves the last snapshot and exits with status 2.

The captured snapshot checked ten communities at `2026-10-07T17:59:24.413Z`, spanning general music, hip-hop, electronic, classical, indie, ambient, and jazz. That receipt is evidence of that pass only; it does not establish current activity on later dates or provider playback availability.

The running app's artist query `q=Laufey` returned a successful live result at `2026-10-07T18:11:03.501Z`, including r/laufey and r/CoverSongQueens. Search can find communities through music links that mention an artist; the activity counts still describe the community's latest posts, not only posts matching that artist. The second query, `q=Ambient&category=Ambient`, returned three checked active communities at `2026-10-07T18:19:27.523Z`: r/ambient, r/DarkAmbient, and r/ambientmusic. It correctly reported `degraded: true` because some checks did not complete. Repeating that query returned `source: cache` with the same original timestamp. Only these two fresh queries were run for this verification; jazz was already included in the default capture.

## Reddit access scope

Checked the current official sources on October 8, 2026:

- [Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) requires OAuth, states 100 queries per minute per OAuth client for eligible free access, describes quota response headers, and recommends routinely deleting stored user content/data within 48 hours. Deleted content must not be retained even after deidentification.
- [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) requires explicit approval for the accessed use case and written approval for commercial uses. Credentials alone do not establish that approval.
- [Data API Terms](https://redditinc.com/policies/data-api-terms) restrict retention to the approved use case and prohibit using User Content to train machine learning or AI models without the applicable rights holders' express permission.
- [API documentation](https://www.reddit.com/dev/api/) documents `/subreddits/search`, `/search`, `/r/{community}/about`, and `/r/{community}/new` as read endpoints used here.

No approval record was available in the checkout to verify the app's approved access scope. These limits are implementation boundaries, not a claim that credentials grant every proposed data use. Local taste adaptation should use listener-owned play, skip, and save events; it should not train on Reddit post text, comments, or users. Keep any future training dataset separate from this temporary Reddit display cache and establish its permissions and retention rules first.
