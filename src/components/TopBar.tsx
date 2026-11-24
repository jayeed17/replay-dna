import { useMemo } from 'react'

export type View = 'story' | 'dashboard'

interface Props {
  view: View
  onView(v: View): void
  timeZone: string
  onTimeZone(tz: string): void
  onReset(): void
  isDemo: boolean
}

export function TopBar({ view, onView, timeZone, onTimeZone, onReset, isDemo }: Props) {
  const zones = useMemo(() => {
    const all = Intl.supportedValuesOf?.('timeZone') ?? []
    return all.includes(timeZone) ? all : [timeZone, ...all]
  }, [timeZone])
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
      <button onClick={onReset} className="text-xl font-black tracking-tight" title="Start over">
        Replay <span className="text-lime">DNA</span>
      </button>
      {isDemo && <span className="rounded-full bg-pink/20 px-2 py-0.5 text-xs font-bold text-pink">DEMO DATA</span>}
      <nav className="ml-auto flex rounded-full bg-panel p-1 text-sm font-semibold" aria-label="View">
        {(['story', 'dashboard'] as const).map((v) => (
          <button key={v} onClick={() => onView(v)} aria-pressed={view === v} className={`rounded-full px-4 py-1.5 capitalize ${view === v ? 'bg-white text-ink' : 'text-muted hover:text-white'}`}>
            {v}
          </button>
        ))}
      </nav>
      <label className="flex items-center gap-2 text-sm text-muted">
        <span className="hidden sm:inline">Timezone</span>
        <select value={timeZone} onChange={(e) => onTimeZone(e.target.value)} className="max-w-[180px] rounded-lg border border-line bg-panel px-2 py-1.5 text-white">
          {zones.map((z) => <option key={z}>{z}</option>)}
        </select>
      </label>
    </header>
  )
}
