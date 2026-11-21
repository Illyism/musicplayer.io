import { Brand } from '@/components/brand'

const SKELETON_ROWS = [
  'row-1',
  'row-2',
  'row-3',
  'row-4',
  'row-5',
  'row-6',
  'row-7',
  'row-8',
  'row-9',
  'row-10',
]

const COMMUNITY_ROWS = ['c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6']
const UPCOMING_ROWS = ['u-1', 'u-2', 'u-3', 'u-4', 'u-5']

export function AppShellFallback() {
  return (
    <div className="music-app bg-background flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="app-header shrink-0">
        <div className="bg-background z-40 flex h-14 shrink-0 items-center gap-2 px-4 sm:h-16 sm:gap-3 lg:px-4">
          <span className="flex min-h-11 shrink-0 items-center px-1">
            <Brand compact />
          </span>
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
            <div className="bg-panel dark:bg-card size-12 shrink-0 rounded-full" />
            <div className="bg-panel dark:bg-card h-12 w-full max-w-[760px] min-w-0 flex-1 rounded-full" />
          </div>
          <div aria-hidden="true" className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <div className="hidden size-11 rounded-full lg:block" />
            <div className="hidden size-11 rounded-full sm:block" />
            <div className="hidden size-11 rounded-full lg:block" />
            <div className="size-11 rounded-full" />
            <div className="bg-primary/15 ml-1 hidden h-12 w-[94px] rounded-full sm:block" />
          </div>
        </div>
      </div>
      <main className="relative flex min-h-0 flex-1 overflow-hidden lg:pb-2" id="main-content">
        <div className="flex min-h-0 w-full flex-1 lg:gap-2 lg:px-2">
          <aside
            aria-hidden="true"
            className="bg-panel hidden min-h-0 min-w-[240px] shrink grow-0 basis-[325px] flex-col overflow-hidden rounded-lg lg:flex"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-3 py-4">
              <div className="flex flex-col gap-2">
                <div className="flex h-11 items-center justify-between pl-2">
                  <div className="bg-muted h-4 w-16 rounded-full" />
                  <div className="bg-muted size-8 rounded-full" />
                </div>
                <div className="bg-muted h-11 rounded-md" />
                <div className="bg-muted dark:bg-card h-11 rounded-md" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex h-11 items-center justify-between pl-2">
                  <div className="bg-muted h-4 w-28 rounded-full" />
                  <div className="bg-muted size-8 rounded-full" />
                </div>
                <div className="mb-1 flex h-5 items-center px-2">
                  <div className="bg-muted h-3 w-40 rounded-full" />
                </div>
                {COMMUNITY_ROWS.map(key => (
                  <div className="flex min-h-16 items-center gap-3 rounded-md px-2 py-2" key={key}>
                    <div className="bg-muted size-12 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="bg-muted h-4 w-28 rounded-full" />
                      <div className="bg-muted h-3.5 w-44 max-w-full rounded-full" />
                    </div>
                    <div className="bg-muted size-9 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-border/50 flex shrink-0 items-center gap-3 border-t px-5 py-3">
              <div className="bg-muted h-3 w-10 rounded-full" />
              <div className="bg-muted h-3 w-10 rounded-full" />
              <div className="bg-muted h-3 w-10 rounded-full" />
            </div>
          </aside>
          <section
            aria-label="Your music mix"
            className="bg-panel @container/mix flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-w-[340px] lg:rounded-lg"
          >
            <header className="from-reddit/20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 bg-linear-to-b to-transparent px-4 pt-5 @min-[480px]/mix:grid-rows-[1fr_auto] @min-[480px]/mix:gap-x-6 @min-[480px]/mix:px-6 @min-[480px]/mix:pt-6">
              <div className="bg-muted size-24 shrink-0 rounded-lg @min-[480px]/mix:row-span-2 @min-[480px]/mix:size-36 @min-[720px]/mix:size-[200px]" />
              <div className="flex min-w-0 flex-col">
                <p className="text-sm font-bold">Your mix</p>
                <h1 className="mt-1 text-4xl leading-[1.05] font-extrabold tracking-[-0.04em] @min-[480px]/mix:text-6xl @min-[720px]/mix:text-7xl">
                  Your mix
                </h1>
              </div>
              <div className="col-span-2 mt-3 min-w-0 @min-[480px]/mix:col-span-1 @min-[480px]/mix:col-start-2 @min-[480px]/mix:mt-2">
                <p className="text-muted-foreground text-sm font-medium @min-[720px]/mix:text-base">
                  Music shared by the communities you love.
                </p>
                <div aria-hidden="true" className="mt-2 flex h-6 items-center gap-x-1.5">
                  <div className="bg-muted size-6 shrink-0 rounded-full" />
                  <div className="bg-muted h-3.5 w-28 rounded-full" />
                  <div className="bg-muted h-3.5 w-16 rounded-full" />
                </div>
              </div>
            </header>
            <div className="flex shrink-0 items-center gap-2 px-4 py-5 @min-[480px]/mix:gap-3 @min-[480px]/mix:px-6">
              <div className="bg-muted mr-1 size-14 rounded-full" />
              <div className="bg-muted size-11 rounded-full" />
              <div className="bg-muted size-11 rounded-full" />
              <div className="bg-muted size-11 rounded-full" />
              <div className="bg-muted ml-auto h-11 w-20 rounded-full" />
            </div>
            <div
              aria-busy="true"
              className="flex-1 overflow-hidden px-2 pb-6 @min-[480px]/mix:px-4"
            >
              <div className="bg-panel mb-2 hidden border-b px-3 @min-[480px]/mix:block">
                <div className="grid h-9 grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_2.25rem] items-center gap-x-3 @min-[600px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_4.5rem_2.25rem] @min-[720px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_5.5rem_4.5rem_2.25rem]">
                  <span className="bg-muted mx-auto h-3 w-3 rounded-full" />
                  <span className="bg-muted h-3 w-10 rounded-full" />
                  <span className="bg-muted hidden h-3 w-12 rounded-full @min-[600px]/mix:block" />
                  <span className="bg-muted hidden h-3 w-12 rounded-full @min-[720px]/mix:block" />
                  <span className="bg-muted ml-auto h-3 w-4 rounded-full" />
                  <span />
                </div>
              </div>
              <div aria-label="Loading tracks" role="status">
                <span className="sr-only">Finding music from your communities…</span>
                <ol className="flex flex-col">
                  {SKELETON_ROWS.map(key => (
                    <li className="min-h-14" key={key}>
                      <div
                        aria-hidden="true"
                        className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-x-3 rounded-md px-3 @min-[480px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_2.25rem] @min-[600px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_4.5rem_2.25rem] @min-[720px]/mix:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,9rem)_5.5rem_4.5rem_2.25rem]"
                      >
                        <span className="hidden items-center justify-center @min-[480px]/mix:flex">
                          <span className="bg-muted size-3.5 rounded-full" />
                        </span>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="bg-muted size-10 shrink-0 rounded-sm" />
                          <span className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className="bg-muted h-3.5 w-3/4 rounded-full" />
                            <span className="bg-muted h-3 w-2/5 rounded-full" />
                          </span>
                        </span>
                        <span className="hidden min-w-0 @min-[600px]/mix:block">
                          <span className="bg-muted block h-3.5 w-20 rounded-full" />
                        </span>
                        <span className="hidden min-w-0 @min-[720px]/mix:block">
                          <span className="bg-muted block h-3.5 w-16 rounded-full" />
                        </span>
                        <span className="flex justify-end">
                          <span className="bg-muted h-3.5 w-9 rounded-full" />
                        </span>
                        <span />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
          <aside
            aria-hidden="true"
            className="bg-panel hidden min-h-0 min-w-[300px] shrink grow-0 basis-[400px] flex-col overflow-hidden rounded-lg lg:flex"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
              <div className="bg-muted h-5 w-28 rounded-full" />
              <div className="bg-muted size-5 rounded-full" />
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 pb-6">
              <div
                className="bg-muted aspect-video min-h-[180px] w-full rounded-lg"
                style={{ aspectRatio: '16 / 9' }}
              />
              <div className="space-y-2">
                <div className="bg-muted h-6 w-4/5 rounded-full" />
                <div className="bg-muted h-4 w-2/5 rounded-full" />
              </div>
              <div className="bg-card space-y-3 rounded-lg p-4">
                <div className="bg-muted h-4 w-24 rounded-full" />
                <div className="space-y-2">
                  <div className="bg-muted h-3.5 w-36 rounded-full" />
                  <div className="bg-muted h-3.5 w-44 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <div className="bg-muted h-10 w-28 rounded-full" />
                  <div className="bg-muted h-10 w-24 rounded-full" />
                </div>
              </div>
              <div className="bg-card space-y-2 rounded-lg p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="bg-muted h-4 w-16 rounded-full" />
                  <div className="bg-muted h-4 w-20 rounded-full" />
                </div>
                {UPCOMING_ROWS.map(key => (
                  <div className="flex h-14 items-center gap-3 px-2" key={key}>
                    <div className="bg-muted size-10 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="bg-muted h-3.5 w-3/4 rounded-full" />
                      <div className="bg-muted h-3 w-1/2 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <div className="app-dock shrink-0">
        <div className="bg-card lg:bg-panel mx-2 h-16 rounded-lg lg:mb-2 lg:h-[72px]" />
        <div className="h-[calc(60px+max(0.5rem,env(safe-area-inset-bottom)))] lg:hidden" />
      </div>
    </div>
  )
}
