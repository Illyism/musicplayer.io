import { ArrowLeft } from '@phosphor-icons/react/ssr'
import Link from 'next/link'
import { Brand } from '@/components/brand'

interface LegalShellProps {
  children: React.ReactNode
  current: 'privacy' | 'terms'
  subtitle: string
  title: string
  updatedAt: string
}

export function LegalShell({ children, current, subtitle, title, updatedAt }: LegalShellProps) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            aria-label="Music Player for Reddit home"
            className="focus-visible:ring-ring flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-2"
            href="/"
          >
            <Brand compact />
          </Link>
          <Link
            className="bg-secondary text-secondary-foreground hover:bg-accent inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Open player
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="border-border/60 border-b pb-6">
          <p className="text-muted-foreground text-xs font-medium">Last updated {updatedAt}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">{subtitle}</p>
        </div>

        <div className="hover:[&_a]:text-foreground [&_h2]:text-foreground [&_p]:text-muted-foreground [&_ul]:text-muted-foreground mt-8 space-y-8 text-sm leading-7 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <footer className="border-border/60 border-t">
        <nav
          aria-label="Legal and project links"
          className="text-muted-foreground mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs sm:px-8"
        >
          <span>Music Player for Reddit · Open-source streaming player</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="hover:text-foreground" href="/">
              Player
            </Link>
            <Link
              aria-current={current === 'privacy' ? 'page' : undefined}
              className={
                current === 'privacy' ? 'text-foreground font-medium' : 'hover:text-foreground'
              }
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              aria-current={current === 'terms' ? 'page' : undefined}
              className={
                current === 'terms' ? 'text-foreground font-medium' : 'hover:text-foreground'
              }
              href="/terms"
            >
              Terms
            </Link>
            <a
              className="hover:text-foreground"
              href="https://github.com/musicplayer-io/musicplayer.io"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <a className="hover:text-foreground" href="mailto:me@il.ly">
              me@il.ly
            </a>
          </div>
        </nav>
      </footer>
    </div>
  )
}
