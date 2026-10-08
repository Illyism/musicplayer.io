# Local listening and saved tracks

Taste adaptation uses listener-owned events in this browser's local storage. No listening events are sent to Reddit or an external training service, and no model is trained on Reddit content. The app uses explicit scoring rules: saves and completed listens raise a community's score, early skips lower it, and those weights decay with a fourteen-day half-life. Track recommendations come from the current mix; community suggestions combine those local preferences with checked discovery samples.

A listen counts after thirty seconds of advancing playback; completion counts after eighty percent of the duration. A manual track change after three to fifteen seconds can count as an early skip. Seeking, playback errors, and automatic advancement do not create skip signals. The session tests cover these distinctions.

Listening preferences let the listener disable collection, export their own signals as JSON, or clear history. Disabling collection stops new implicit events and retains the existing history. Explicit saved bookmarks remain independent of collection. At most five hundred signals are retained for thirty days; recent metadata is limited to twenty tracks and bookmarks to one hundred IDs.

Track titles, authors, artwork, source URLs, and other Reddit-derived metadata expire from local storage after forty-eight hours. Bookmark IDs remain until the listener removes them. Fresh listings can restore metadata for those IDs; opening Saved tracks can also request fresh public post metadata. No music file or embedded media is downloaded or stored by this feature. Retention pruning runs during hydration and store updates; it is not a background deletion service for an unopened browser.

## Saved-track refresh API

`GET /api/saved-tracks?ids=abc123,def456` accepts one to one hundred comma-separated base36 Reddit post IDs, without the `t3_` prefix. Invalid input returns HTTP 400. The server uses the existing app-only OAuth client to read `/api/info?id=t3_abc123,t3_def456`; it never writes bookmarks or events to Reddit and requires no new user login.

A successful response is a `Song[]` in the caller's requested order. Unavailable, deleted, removed, NSFW, self, and unsupported-source posts are omitted. An empty array is a successful read with no available tracks. Provider availability and embedding permission are still checked by the player, not by this metadata endpoint. Failure returns HTTP 503 with a safe generic message, so the client can retain bookmark IDs and offer a retry.

Repeated equivalent batches share an in-flight request and a five-minute internal cache, bounded to twenty batches. The HTTP response uses `Cache-Control: private, no-store` so intermediary caches do not retain a person's bookmark query. Reads share the discovery request budget and quota-header handling. No IDs, titles, author names, source URLs, credentials, or tokens are printed by the endpoint.

The metadata is a temporary playback cache. Apply the [Reddit access and retention requirements](community-discovery.md#reddit-access-scope) to ongoing operation and do not turn it into a training dataset.
