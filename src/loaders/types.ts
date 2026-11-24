/** One normalized listening event, regardless of where it came from. */
export interface Play {
  /** Unix epoch milliseconds, UTC. For Spotify this is when playback *ended*. */
  ts: number
  artist: string
  track: string
  album?: string
  ms_played: number
  /** Explicit skip flag when the source provides one (extended history). */
  skipped?: boolean
  shuffle?: boolean
  platform?: string
  source: LoaderId
}

export type LoaderId = 'spotifyBasic' | 'spotifyExtended' | 'appleMusic'

export interface Loader {
  id: LoaderId
  label: string
  status: 'ready' | 'coming-soon'
  /** Decide from the file name alone, so unrelated (personal) files are never opened. */
  matches(fileName: string): boolean
  parse(text: string, fileName: string): Play[]
}

export class NotYetSupportedError extends Error {
  constructor(public loader: LoaderId) {
    super(`${loader} import is coming soon`)
    this.name = 'NotYetSupportedError'
  }
}

/** A play counts when at least this much was heard; shorter = skip proxy. */
export const PLAY_THRESHOLD_MS = 30_000
