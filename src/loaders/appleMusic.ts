import { NotYetSupportedError, type Loader } from './types'

/**
 * Apple Music "Play Activity" CSV from privacy.apple.com.
 * Planned mapping: Event End Timestamp -> ts, Artist Name -> artist, Song Name -> track,
 * Album Name -> album, Play Duration Milliseconds -> ms_played,
 * End Reason Type (e.g. TRACK_SKIPPED_FORWARDS) -> skipped, Shuffle Play -> shuffle.
 */
export const appleMusic: Loader = {
  id: 'appleMusic',
  label: 'Apple Music Play Activity (CSV)',
  status: 'coming-soon',
  matches: (name) => /play activity.*\.csv$/i.test(name),
  parse() {
    throw new NotYetSupportedError('appleMusic')
  },
}
