import { Brand } from '@/components/brand'

const SKELETON_ROWS = ['one', 'two', 'three', 'four', 'five', 'six']

export function AppShellFallback() {
  return (
    <div className="music-app bg-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="app-header shrink-0">
        <div className="bg-background z-40 flex h-14 shrink-0 items-center gap-3 px-4 sm:h-16">
          <span className="px-1">
            <Brand compact />
          </span>
          <div className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            <div className="bg-panel dark:bg-card size-12 shrink-0 rounded-full" />
            <div className="bg-panel dark:bg-card h-12 w-full max-w-[760px] rounded-full" />
          </div>
        </div>
      </div>
      <main
        className="relative flex min-h-0 flex-1 gap-2 overflow-hidden lg:px-2 lg:pb-2"
        id="main-content"
      >
        <div
          aria-hidden="true"
          className="bg-panel hidden w-[325px] shrink-0 rounded-lg lg:block"
        />
        <section
          aria-label="Your music mix"
          className="bg-panel flex h-full min-h-0 min-w-0 flex-1 flex-col lg:rounded-lg"
        >
          <header className="from-reddit/20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 bg-linear-to-b to-transparent px-4 pt-5 lg:grid-rows-[1fr_auto] lg:gap-x-6 lg:px-6 lg:pt-6">
            <div className="bg-muted size-24 shrink-0 rounded-lg lg:row-span-2 lg:size-[200px]" />
            <div className="flex min-w-0 flex-col">
              <p className="text-sm font-bold">Your mix</p>
              <h1 className="mt-1 text-4xl leading-[1.05] font-extrabold tracking-[-0.04em] lg:text-7xl">
                Your mix
              </h1>
            </div>
            <p className="text-muted-foreground col-span-2 mt-3 text-sm font-medium lg:col-span-1 lg:col-start-2 lg:mt-2">
              Music shared by the communities you love.
            </p>
          </header>
          <div className="flex h-24 shrink-0 items-center gap-3 px-4 lg:px-6">
            <div className="bg-muted size-14 rounded-full" />
            <div className="bg-muted size-8 rounded-full" />
            <div className="bg-muted size-8 rounded-full" />
          </div>
          <div aria-busy="true" className="flex-1 px-2 pb-6 lg:px-4">
            <div aria-label="Loading tracks" className="flex flex-col py-2" role="status">
              <span className="sr-only">Finding music from your communities…</span>
              {SKELETON_ROWS.map(key => (
                <div
                  aria-hidden="true"
                  className="flex h-14 items-center gap-3 rounded-md px-3"
                  key={key}
                >
                  <div className="bg-muted size-10 shrink-0 rounded-sm" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="bg-muted h-3 w-3/4 rounded-full" />
                    <div className="bg-muted h-2.5 w-2/5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div
          aria-hidden="true"
          className="bg-panel hidden w-[400px] shrink-0 rounded-lg lg:block"
        />
      </main>
      <div className="app-dock shrink-0">
        <div className="bg-card lg:bg-panel mx-2 h-16 rounded-lg lg:mb-2 lg:h-[72px]" />
        <div className="h-[61px] lg:hidden" />
      </div>
    </div>
  )
}
