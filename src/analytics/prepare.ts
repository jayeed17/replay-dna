import type { GenreMap, Play } from '../loaders'

/** Junk Last.fm tags that aren't genres. */
const NON_GENRE = /^(seen live|favorites?|favourites?|my favorite|love|awesome|beautiful|albums i own|under \d+ listeners|\d{2,4}s?|male vocalists?|female vocalists?|singer-songwriter.*|american|british|uk|usa|canadian|australian|korean|swedish|german|french|bangladeshi|indian|japanese|spotify|all)$/i

export function cleanTags(tags: string[], max = 3): string[] {
  const out: string[] = []
  for (const t of tags) {
    const g = t.trim().toLowerCase()
    if (!g || NON_GENRE.test(g) || out.includes(g)) continue
    out.push(g)
    if (out.length === max) break
  }
  return out
}

/** Formats epoch ms as a naive local timestamp "YYYY-MM-DD HH:MM:SS" in the given IANA zone. */
export function makeLocalizer(timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return (ms: number) => {
    const p: Record<string, string> = {}
    for (const { type, value } of fmt.formatToParts(ms)) p[type] = value
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`
  }
}

const q = (v: string | undefined) => (v === undefined ? '' : `"${v.replace(/"/g, '""')}"`)
const b = (v: boolean | undefined) => (v === undefined ? '' : v ? 'true' : 'false')

export const PLAY_COLUMNS = {
  ts: 'BIGINT', lt: 'TIMESTAMP', artist: 'VARCHAR', track: 'VARCHAR', album: 'VARCHAR',
  ms: 'BIGINT', skipped: 'BOOLEAN', shuffle: 'BOOLEAN', platform: 'VARCHAR', source: 'VARCHAR',
} as const

/** RFC 4180 CSV (no header) in PLAY_COLUMNS order. */
export function playsToCsv(plays: Play[], timeZone: string): string {
  const local = makeLocalizer(timeZone)
  const lines = plays.map((p) =>
    [p.ts, local(p.ts), q(p.artist), q(p.track), q(p.album), Math.round(p.ms_played), b(p.skipped), b(p.shuffle), q(p.platform), q(p.source)].join(','),
  )
  return lines.length ? lines.join('\n') + '\n' : ''
}

export function genresToCsv(genres: GenreMap): string {
  const lines: string[] = []
  for (const [artist, tags] of Object.entries(genres)) cleanTags(tags).forEach((g, i) => lines.push(`${q(artist.toLowerCase())},${q(g)},${i + 1}`))
  return lines.length ? lines.join('\n') + '\n' : ''
}
