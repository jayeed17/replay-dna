import { useEffect, useMemo, useState } from 'react'
import { buildReport, type Report } from './analytics/report'
import { TopBar, type View } from './components/TopBar'
import { UploadScreen } from './components/UploadScreen'
import { loadFiles, type Dataset, type InputFile } from './loaders'
import { ExportButton } from './export/ExportButton'
import { buildCards } from './story/cards'
import { StoryPlayer } from './story/StoryPlayer'
import { demoFiles } from './upload/demo'

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
    buildReport(data, timeZone)
      .then((r) => {
        if (!live) return
        setReport(r)
        if (import.meta.env.DEV) (window as unknown as { __report: Report }).__report = r
      })
      .catch((e) => live && setError(String(e)))
    return () => void (live = false)
  }, [data, timeZone])

  const cards = useMemo(() => (report ? buildCards(report) : []), [report])

  if (!data) return <UploadScreen busy={busy} error={error} onFiles={(f) => ingest(() => f, false)} onDemo={() => ingest(demoFiles, true)} />

  return (
    <div className="flex h-dvh flex-col">
      <TopBar view={view} onView={setView} timeZone={timeZone} onTimeZone={setTimeZone} isDemo={isDemo} onReset={() => (setData(undefined), setReport(undefined))} />
      <main className="min-h-0 flex-1 p-4">
        {!report ? (
          <p className="grid h-full place-items-center text-muted" role="status">{error ?? 'Crunching your history in-browser…'}</p>
        ) : view === 'story' ? (
          <StoryPlayer cards={cards} actions={(card, getNode) => <ExportButton key={card.id} id={card.id} getNode={getNode} />} />
        ) : (
          <p className="grid h-full place-items-center text-muted">Dashboard coming next.</p>
        )}
      </main>
    </div>
  )
}
