import { describe, expect, it } from 'vitest'
import { loadFiles, parseWrapped, type InputFile } from './index'
import { parseEndTime, spotifyBasic } from './spotifyBasic'

const file = (name: string, body: unknown): InputFile & { opened: boolean } => {
  const f = { name, opened: false, text: async () => ((f.opened = true), typeof body === 'string' ? body : JSON.stringify(body)) }
  return f
}

describe('spotifyBasic', () => {
  it('matches only music history files', () => {
    expect(spotifyBasic.matches('StreamingHistory_music_0.json')).toBe(true)
    expect(spotifyBasic.matches('StreamingHistory_podcast_0.json')).toBe(false)
    expect(spotifyBasic.matches('StreamingHistory_audiobook_0.json')).toBe(false)
  })

  it('parses endTime as UTC', () => {
    expect(parseEndTime('2025-11-23 00:16')).toBe(Date.UTC(2025, 10, 23, 0, 16))
    expect(parseEndTime('garbage')).toBeNaN()
  })

  it('normalizes rows and drops malformed ones', () => {
    const plays = spotifyBasic.parse(
      JSON.stringify([
        { endTime: '2026-01-01 12:00', artistName: 'A', trackName: 'T', msPlayed: 45000 },
        { endTime: '2026-01-01 12:01', artistName: 'A', msPlayed: 1 },
        { endTime: 'bad', artistName: 'A', trackName: 'T', msPlayed: 1 },
      ]),
      'x',
    )
    expect(plays).toEqual([{ ts: Date.UTC(2026, 0, 1, 12), artist: 'A', track: 'T', ms_played: 45000, source: 'spotifyBasic' }])
  })
})

describe('loadFiles', () => {
  it('never opens unrelated personal files', async () => {
    const payments = file('Payments.json', { card: 'x' })
    const address = file('UserAddress.json', {})
    const podcast = file('StreamingHistory_podcast_0.json', [])
    const music = file('Spotify Account Data/StreamingHistory_music_0.json', [
      { endTime: '2026-01-01 12:00', artistName: 'A', trackName: 'T', msPlayed: 45000 },
    ])
    const ds = await loadFiles([payments, address, podcast, music])
    expect(payments.opened || address.opened || podcast.opened).toBe(false)
    expect(ds.plays).toHaveLength(1)
    expect(ds.report.ignored).toBe(3)
  })

  it('reports coming-soon formats without failing', async () => {
    const ds = await loadFiles([file('Streaming_History_Audio_2024.json', []), file('Apple Music Play Activity.csv', '')])
    expect(ds.report.comingSoon.map((c) => c.name)).toHaveLength(2)
    expect(ds.report.errors).toHaveLength(0)
  })

  it('records parse errors per file', async () => {
    const ds = await loadFiles([file('StreamingHistory_music_0.json', '{not json')])
    expect(ds.report.errors).toHaveLength(1)
  })
})

describe('parseWrapped', () => {
  it('extracts numeric comparison stats', () => {
    const w = parseWrapped(
      JSON.stringify({ yearlyMetrics: { totalMsListened: 6_000_000 }, topArtists: { numUniqueArtists: 9, topArtistUris: ['u1'] } }),
    )
    expect(w.totalMinutes).toBe(100)
    expect(w.uniqueArtists).toBe(9)
    expect(w.topArtistUris).toEqual(['u1'])
  })
})
