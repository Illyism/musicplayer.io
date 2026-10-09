import { Brand } from '@/components/brand'

export function AppShellFallback() {
  return (
    <div className="music-app flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <div className="app-header shrink-0">
        <div className="z-40 flex h-14 shrink-0 items-center justify-between gap-2 bg-background px-4 sm:h-[72px] sm:px-6">
          <Brand compact />
        </div>
      </div>
      <main className="relative flex min-h-0 flex-1 overflow-hidden" id="main-content">
        <section aria-label="Your music mix" className="flex h-full min-h-0 w-full flex-col">
          <header className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-8 lg:pt-8">
            <h1 className="max-w-[26ch] text-balance font-semibold text-2xl leading-[1.15] tracking-[-0.04em] lg:text-[32px]">
              <span className="lg:hidden">Your mix</span>
              <span className="hidden lg:inline">Your next favorite is here.</span>
            </h1>
            <p className="mt-2 max-w-[46ch] text-muted-foreground text-sm leading-5">
              Music shared by the communities you love.
            </p>
            <div className="flex h-11 items-center gap-2">
              <div className="h-11 w-28 rounded-full bg-muted" />
              <div className="size-11 rounded-full bg-muted" />
            </div>
          </header>
          <div className="min-h-[228px]" />
          <div aria-busy="true" className="flex-1 px-2 pt-3 pb-6 sm:px-5 lg:px-7">
            <div aria-label="Loading tracks" className="flex flex-col gap-2 py-2" role="status">
              <span className="sr-only">Finding music from your communities…</span>
              {['one', 'two', 'three', 'four', 'five', 'six'].map(key => (
                <div
                  aria-hidden="true"
                  className="flex min-h-[76px] items-center gap-3 rounded-xl px-3 py-3"
                  key={key}
                >
                  <div className="size-12 shrink-0 rounded-lg bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-3/4 rounded-full bg-muted" />
                    <div className="h-2.5 w-2/5 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <div className="app-dock shrink-0">
        <div className="mx-2 h-16 rounded-xl bg-muted lg:h-24 lg:rounded-none" />
        <div className="h-[61px] lg:hidden" />
      </div>
    </div>
  )
}
