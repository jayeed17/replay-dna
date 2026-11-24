/** Non-history files we understand. Everything else in an export is ignored unread. */

export interface Wrapped {
  totalMinutes?: number
  uniqueArtists?: number
  uniqueTracks?: number
  totalGenres?: number
  artistsDiscovered?: number
  listeningDays?: number
  streakDays?: number
  percentNight?: number
  /** e.g. 0.02 means you were in the top 0.02% of listeners of your #1 artist */
  topPercentileFan?: number
  topArtistUris: string[]
  topTrackUris: string[]
}

export interface TasteProfile {
  musicalIdentity?: string
}

/** artist name (lowercased) -> ordered top tags */
export type GenreMap = Record<string, string[]>

export type ExtraKind = 'wrapped' | 'taste' | 'library' | 'genres'

export function extraKind(name: string): ExtraKind | null {
  if (/^Wrapped\d{4}\.json$/i.test(name)) return 'wrapped'
  if (/^TasteProfile\.json$/i.test(name)) return 'taste'
  if (/^YourLibrary\.json$/i.test(name)) return 'library'
  if (/^genres\.json$/i.test(name)) return 'genres'
  return null
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

export function parseWrapped(text: string): Wrapped {
  const w: Any = JSON.parse(text)
  const ms = num(w?.yearlyMetrics?.totalMsListened)
  return {
    totalMinutes: num(w?.party?.totalNumListeningMinutes) ?? (ms !== undefined ? Math.round(ms / 60000) : undefined),
    uniqueArtists: num(w?.topArtists?.numUniqueArtists),
    uniqueTracks: num(w?.topTracks?.numUniqueTracks),
    totalGenres: num(w?.topGenres?.totalNumGenres),
    artistsDiscovered: num(w?.party?.numArtistsDiscovered),
    listeningDays: num(w?.party?.totalNumListeningDays),
    streakDays: num(w?.party?.streakNumListeningDays),
    percentNight: num(w?.party?.percentListenedNight),
    topPercentileFan: num(w?.topArtists?.topNPercentileFan),
    topArtistUris: strs(w?.topArtists?.topArtistUris),
    topTrackUris: strs((w?.topTracks?.topTracks ?? []).map((t: Any) => t?.trackUri)),
  }
}

export function parseTaste(text: string): TasteProfile {
  const t: Any = JSON.parse(text)
  const id = t?.tasteProfile?.musicalIdentity
  return { musicalIdentity: typeof id === 'string' ? id : undefined }
}

/** uri -> human label, from saved tracks/artists in YourLibrary.json */
export function parseLibrary(text: string): Record<string, string> {
  const l: Any = JSON.parse(text)
  const out: Record<string, string> = {}
  for (const t of l?.tracks ?? []) if (t?.uri && t?.track) out[t.uri] = `${t.track} — ${t.artist ?? ''}`.trim()
  for (const a of l?.artists ?? []) if (a?.uri && a?.name) out[a.uri] = a.name
  return out
}

export function parseGenres(text: string): GenreMap {
  const g: Any = JSON.parse(text)
  const out: GenreMap = {}
  const src = g?.artists ?? g
  for (const [k, v] of Object.entries(src ?? {})) {
    const tags = Array.isArray(v) ? v : (v as Any)?.tags
    if (Array.isArray(tags)) out[k.toLowerCase()] = tags.filter((x: unknown): x is string => typeof x === 'string')
  }
  return out
}
