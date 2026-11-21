import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalShell } from '@/components/legal-shell'

export const metadata: Metadata = {
  alternates: { canonical: '/terms' },
  description:
    'Terms of service for Music Player for Reddit (musicplayer.io), an open-source Reddit streaming music player.',
  robots: { follow: true, index: false },
  title: 'Terms of Service | Music Player for Reddit',
}

export default function TermsPage() {
  return (
    <LegalShell
      current="terms"
      subtitle="Simple terms for using Music Player for Reddit (musicplayer.io), a free and open-source streaming music player built on public Reddit communities."
      title="Terms of Service"
      updatedAt="November 14, 2026"
    >
      <section>
        <h2>About the service</h2>
        <p>
          <strong>Music Player for Reddit</strong> (<code>musicplayer.io</code>) is an independent,
          open-source web interface that organizes music links shared in public Reddit communities
          into a continuous player. No user registration is required to listen. It is not affiliated
          with, endorsed by, or sponsored by Reddit, YouTube, SoundCloud, or Vimeo. By using the
          site, you agree to these terms and our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Third-party streams &amp; community content</h2>
        <p>
          Music Player for Reddit does not upload, host, transcode, or store audio or video files.
          Post titles, scores, and discussions come from Reddit&apos;s public feeds, and playback is
          delivered through official embedded players from <strong>YouTube</strong>,{' '}
          <strong>SoundCloud</strong>, <strong>Vimeo</strong>, and linked audio sources.
        </p>
        <ul>
          <li>
            All music, artwork, posts, and trademarks remain the property of their respective
            creators, rights holders, and platforms.
          </li>
          <li>
            Playing embedded streams or signing in with Reddit is also governed by each
            platform&apos;s own terms (including YouTube Terms of Service, SoundCloud Terms of Use,
            Vimeo Terms, and Reddit&apos;s User Agreement).
          </li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Please use the player responsibly. Do not attempt to scrape, overload, bypass rate limits
          on, or disrupt <code>musicplayer.io</code> or the upstream services it connects to. If you
          choose to sign in with Reddit to vote, you are responsible for actions taken with your
          Reddit account and for following Reddit&apos;s content rules.
        </p>
      </section>

      <section>
        <h2>Open-source project</h2>
        <p>
          Music Player for Reddit is developed openly as an MIT / open-source software project on{' '}
          <a
            href="https://github.com/musicplayer-io/musicplayer.io"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          . Reuse and distribution of the source code are governed by the license included in the
          repository.
        </p>
      </section>

      <section>
        <h2>Disclaimer &amp; limitation of liability</h2>
        <p>
          Music Player for Reddit is provided free of charge on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis without warranties of any kind, express or implied. Because streams
          and community feeds come from external services, tracks or communities may become
          unavailable at any time. To the fullest extent permitted by law, the maintainers are not
          liable for any indirect, incidental, or consequential damages arising from your use of the
          site or third-party streams.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions, copyright inquiries, or feedback can be sent to{' '}
          <a href="mailto:me@il.ly">me@il.ly</a>.
        </p>
      </section>
    </LegalShell>
  )
}
