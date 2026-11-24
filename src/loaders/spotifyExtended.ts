import { NotYetSupportedError, type Loader } from './types'

/**
 * Spotify "Extended streaming history" (endsong_*.json / Streaming_History_Audio_*.json).
 * Planned mapping: ts -> ts, master_metadata_album_artist_name -> artist,
 * master_metadata_track_name -> track, master_metadata_album_album_name -> album,
 * ms_played, skipped, shuffle, platform. Rows without a track name are podcasts/audiobooks.
 */
export const spotifyExtended: Loader = {
  id: 'spotifyExtended',
  label: 'Spotify extended streaming history',
  status: 'coming-soon',
  matches: (name) => /^(endsong_\d+|Streaming_History_Audio_.+)\.json$/i.test(name),
  parse() {
    throw new NotYetSupportedError('spotifyExtended')
  },
}
