import type { Loader, Play } from './types'

interface BasicRow {
  endTime: string // "YYYY-MM-DD HH:MM", UTC
  artistName: string
  trackName: string
  msPlayed: number
}

const isRow = (r: unknown): r is BasicRow => {
  const o = r as Record<string, unknown>
  return (
    typeof o?.endTime === 'string' &&
    typeof o.artistName === 'string' &&
    typeof o.trackName === 'string' &&
    typeof o.msPlayed === 'number'
  )
}

/** "2025-11-23 00:16" (UTC) -> epoch ms. Returns NaN if malformed. */
export function parseEndTime(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s)
  if (!m) return NaN
  const [, y, mo, d, h, mi, sec] = m
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, sec ? +sec : 0)
}

export const spotifyBasic: Loader = {
  id: 'spotifyBasic',
  label: 'Spotify account data (StreamingHistory_music_*.json)',
  status: 'ready',
  matches: (name) => /^StreamingHistory_music_\d+\.json$/i.test(name),
  parse(text) {
    const data: unknown = JSON.parse(text)
    if (!Array.isArray(data)) throw new Error('Expected a JSON array of streams')
    const out: Play[] = []
    for (const r of data) {
      if (!isRow(r)) continue
      const ts = parseEndTime(r.endTime)
      if (Number.isNaN(ts) || !r.artistName || !r.trackName) continue
      out.push({ ts, artist: r.artistName, track: r.trackName, ms_played: r.msPlayed, source: 'spotifyBasic' })
    }
    return out
  },
}
