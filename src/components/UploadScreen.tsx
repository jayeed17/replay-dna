import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { filesFromDrop } from '../upload/collectFiles'

interface Props {
  onFiles(files: File[]): void
  onDemo(): void
  busy: boolean
  error?: string
}

export function UploadScreen({ onFiles, onDemo, busy, error }: Props) {
  const [over, setOver] = useState(false)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const pick = (list: FileList | null) => list && list.length && onFiles(Array.from(list))

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-12">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tight sm:text-6xl"
        >
          Replay <span className="text-lime">DNA</span>
        </motion.h1>
        <p className="mt-3 text-lg text-muted">Spotify Wrapped, but better. Drop your Spotify data export and replay your year.</p>
      </header>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop your Spotify export folder or files here, or press Enter to choose a folder"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && folderInput.current?.click()}
        onClick={() => folderInput.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault()
          setOver(false)
          onFiles(await filesFromDrop(e.dataTransfer))
        }}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
          over ? 'border-lime bg-lime/10' : 'border-line bg-panel hover:border-muted'
        }`}
      >
        <p className="text-xl font-semibold">{busy ? 'Reading your history…' : 'Drop your “Spotify Account Data” folder'}</p>
        <p className="mt-2 text-sm text-muted">
          or click to choose a folder ·{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-white"
            onClick={(e) => (e.stopPropagation(), fileInput.current?.click())}
          >
            pick individual files
          </button>
        </p>
        <p className="mt-4 text-xs text-muted">Unzip the export first. We only open StreamingHistory_music_*, Wrapped, TasteProfile, YourLibrary and genres.json.</p>
      </div>

      <input ref={folderInput} type="file" className="hidden" multiple {...{ webkitdirectory: '' }} onChange={(e) => pick(e.target.files)} />
      <input ref={fileInput} type="file" className="hidden" multiple accept=".json,.csv" onChange={(e) => pick(e.target.files)} />

      {error && <p role="alert" className="rounded-xl bg-pink/15 px-4 py-3 text-sm text-pink">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onDemo}
          disabled={busy}
          className="rounded-full bg-lime px-6 py-3 font-bold text-ink transition hover:scale-[1.03] disabled:opacity-50"
        >
          Try the demo data
        </button>
        <span className="text-sm text-muted">🔒 Your data never leaves your browser. No uploads, no server, no tracking.</span>
      </div>
    </main>
  )
}
