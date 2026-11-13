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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            aria-label="Music Player for Reddit home"
            className="flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            <Brand compact />
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-secondary px-4 font-medium text-secondary-foreground text-sm transition-colors hover:bg-accent"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Open player
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="border-border/60 border-b pb-6">
          <p className="font-medium text-muted-foreground text-xs">Last updated {updatedAt}</p>
          <h1 className="mt-2 font-semibold text-3xl tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6">{subtitle}</p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-7 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-foreground [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:text-foreground [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-muted-foreground">
          {children}
        </div>
      </main>

      <footer className="border-border/60 border-t">
        <nav
          aria-label="Legal and project links"
          className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-muted-foreground text-xs sm:px-8"
        >
          <span>Music Player for Reddit · Open-source streaming player</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="hover:text-foreground" href="/">
              Player
            </Link>
            <Link
              aria-current={current === 'privacy' ? 'page' : undefined}
              className={
                current === 'privacy' ? 'font-medium text-foreground' : 'hover:text-foreground'
              }
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              aria-current={current === 'terms' ? 'page' : undefined}
              className={
                current === 'terms' ? 'font-medium text-foreground' : 'hover:text-foreground'
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
