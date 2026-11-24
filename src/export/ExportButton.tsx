import { useState } from 'react'
import { cardToPng, saveOrShare } from './png'

export function ExportButton({ id, getNode }: { id: string; getNode: () => HTMLElement | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  async function run() {
    const node = getNode()
    if (!node) return
    setState('busy')
    try {
      await saveOrShare(await cardToPng(node), `replay-dna-${id}.png`)
      setState('done')
      setTimeout(() => setState('idle'), 1800)
    } catch {
      setState('error')
    }
  }
  return (
    <button onClick={run} disabled={state === 'busy'} className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink disabled:opacity-60" aria-live="polite">
      {state === 'busy' ? 'Rendering…' : state === 'done' ? 'Saved ✓' : state === 'error' ? 'Failed, retry' : '↓ PNG 1080×1920'}
    </button>
  )
}
