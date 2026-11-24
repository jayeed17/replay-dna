import { lazy, Suspense, useEffect, useState } from 'react'
import type { Report } from './analytics/report'
import { TopBar, type View } from './components/TopBar'
import { UploadScreen } from './components/UploadScreen'
import { loadFiles, type Dataset, type InputFile } from './loaders'
import { demoFiles } from './upload/demo'

// Heavy parts (DuckDB, ECharts, cards, dashboard) load only once there is data to show.
const StoryView = lazy(() => import('./story/StoryView'))
const Dashboard = lazy(() => import('./dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))

const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

export default function App() {
  const [data, setData] = useState<Dataset>()
  const [isDemo, setIsDemo] = useState(false)
  const [timeZone, setTimeZone] = useState(localTz)
  const [report, setReport] = useState<Report>()
  const [view, setView] = useState<View>('story')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function ingest(getFiles: () => Promise<InputFile[]> | InputFile[], demo: boolean) {
    setBusy(true)
    setError(undefined)
    try {
      const ds = await loadFiles(await getFiles())
      if (!ds.plays.length) {
        const soon = [...new Set(ds.report.comingSoon.map((c) => c.loader))]
        setError(soon.length ? `Found ${soon.join(', ')}. Support for that format is coming soon.` : 'No StreamingHistory_music_*.json files found. Drop the unzipped “Spotify Account Data” folder.')
        return
      }
      setIsDemo(demo)
      setTimeZone(demo ? 'UTC' : localTz) // the fictional demo listener lives in UTC
      setData(ds)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // (Re)build the report whenever the data or timezone changes.
  useEffect(() => {
    if (!data) return
    let live = true
    setReport(undefined)
    import('./analytics/report')
      .then(({ buildReport }) => buildReport(data, timeZone))
      .then((r) => {
        if (!live) return
        setReport(r)
        if (import.meta.env.DEV) (window as unknown as { __report: Report }).__report = r
      })
      .catch((e) => live && setError(String(e)))
    return () => void (live = false)
  }, [data, timeZone])

  if (!data) return <UploadScreen busy={busy} error={error} onFiles={(f) => ingest(() => f, false)} onDemo={() => ingest(demoFiles, true)} />

  return (
    <div className="flex h-dvh flex-col">
      <TopBar view={view} onView={setView} timeZone={timeZone} onTimeZone={setTimeZone} isDemo={isDemo} onReset={() => (setData(undefined), setReport(undefined))} />
      <main className={`min-h-0 flex-1 p-4 ${view === 'dashboard' ? 'overflow-y-auto' : ''}`}>
        {!report ? (
          <Loading text={error ?? 'Crunching your history in-browser…'} />
        ) : (
          <Suspense fallback={<Loading text="Loading…" />}>{view === 'story' ? <StoryView r={report} /> : <Dashboard r={report} />}</Suspense>
        )}
      </main>
    </div>
  )
}

function Loading({ text }: { text: string }) {
  return <p className="grid h-full place-items-center text-muted" role="status">{text}</p>
}
