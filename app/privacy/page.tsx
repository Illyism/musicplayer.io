import type { Metadata } from 'next'
import { LegalShell } from '@/components/legal-shell'
import { MAX_LISTENING_SIGNALS, SIGNAL_RETENTION_DAYS } from '@/lib/listening/retention'

export const metadata: Metadata = {
  alternates: { canonical: '/privacy' },
  description:
    'Privacy policy for Music Player for Reddit (musicplayer.io), an open-source streaming music player powered by public Reddit communities.',
  robots: { follow: true, index: false },
  title: 'Privacy Policy | Music Player for Reddit',
}

export default function PrivacyPage() {
  return (
    <LegalShell
      current="privacy"
      subtitle="Music Player for Reddit (musicplayer.io) is an open-source web player for music shared across public Reddit communities. No account or registration is required to listen."
      title="Privacy Policy"
      updatedAt="November 14, 2026"
    >
      <section>
        <h2>No registration required</h2>
        <p>
          You can browse music communities, build mixes, save bookmarks, and stream tracks on{' '}
          <strong>musicplayer.io</strong> without creating an account or sharing personal
          information. We do not maintain a user database, collect email addresses, or sell personal
          data.
        </p>
      </section>

      <section>
        <h2>Local browser storage</h2>
        <p>
          Your selected subreddit mix, playback preferences, theme choice, saved track IDs, and
          optional local listening signals stay in your browser&apos;s <code>localStorage</code> on
          your device:
        </p>
        <ul>
          <li>
            <strong>Listening signals:</strong> When &ldquo;Learn from my listening&rdquo; is
            enabled, play, save, and skip events are scored locally in your browser (capped at{' '}
            {MAX_LISTENING_SIGNALS}
            signals and pruned after {SIGNAL_RETENTION_DAYS} days) and are never uploaded to our
            servers or used for model training.
          </li>
          <li>
            <strong>Full control:</strong> You can disable local taste signals, export your history
            as JSON, or clear it anytime from your library settings or by clearing site data in your
            browser.
          </li>
        </ul>
      </section>

      <section>
        <h2>Optional Reddit sign-in</h2>
        <p>
          Signing in with Reddit is completely optional and only used if you want to upvote or
          downvote from the player. Authentication happens directly with Reddit via OAuth. We never
          see your Reddit password; OAuth session tokens are stored in <code>httpOnly</code> cookies
          in your browser solely to perform actions you initiate and are cleared when you sign out.
        </p>
      </section>

      <section>
        <h2>Public Reddit feeds &amp; embedded media players</h2>
        <p>
          Community listings and track metadata are retrieved from Reddit&apos;s public feeds and
          Data API. Audio and video streams play directly from third-party providers embedded in the
          page, including <strong>YouTube</strong>, <strong>SoundCloud</strong>,{' '}
          <strong>Vimeo</strong>, and direct audio links. When you play an embedded stream, that
          provider receives standard request data (such as your IP address and browser headers) and
          may apply its own cookies and privacy policy.
        </p>
      </section>

      <section>
        <h2>Analytics &amp; server logs</h2>
        <p>
          We use lightweight, self-hosted, cookieless web analytics (<code>fast.il.ly</code>) to
          understand aggregate traffic and page performance without cross-site tracking or
          advertising profiles. Standard operational server logs may briefly process request
          metadata (such as IP address and user agent) for security and rate-limit protection.
        </p>
      </section>

      <section>
        <h2>Open source &amp; contact</h2>
        <p>
          Music Player for Reddit is an open-source project—you can inspect how the application
          works on{' '}
          <a
            href="https://github.com/musicplayer-io/musicplayer.io"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          . For privacy questions or requests, email <a href="mailto:me@il.ly">me@il.ly</a>.
        </p>
      </section>
    </LegalShell>
  )
}
