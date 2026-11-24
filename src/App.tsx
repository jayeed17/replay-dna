import { useState } from 'react'
import { UploadScreen } from './components/UploadScreen'
import { loadFiles, type Dataset, type InputFile } from './loaders'
import { demoFiles } from './upload/demo'

export default function App() {
  const [data, setData] = useState<Dataset>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function ingest(getFiles: () => Promise<InputFile[]> | InputFile[]) {
    setBusy(true)
    setError(undefined)
    try {
      const ds = await loadFiles(await getFiles())
      if (!ds.plays.length) {
        const soon = ds.report.comingSoon.map((c) => c.loader)
        setError(
          soon.length
            ? `Found ${[...new Set(soon)].join(', ')}. Support for that format is coming soon.`
            : 'No StreamingHistory_music_*.json files found. Drop the unzipped “Spotify Account Data” folder.',
        )
        return
      }
      setData(ds)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <UploadScreen busy={busy} error={error} onFiles={(f) => ingest(() => f)} onDemo={() => ingest(demoFiles)} />

  return (
    <main className="p-6">
      <p>
        Loaded {data.plays.length.toLocaleString()} streams from {data.report.used.length} files ({data.report.ignored} ignored).
      </p>
    </main>
  )
}
