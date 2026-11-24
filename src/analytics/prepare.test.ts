import { describe, expect, it } from 'vitest'
import { cleanTags, genresToCsv, makeLocalizer, playsToCsv } from './prepare'

describe('prepare', () => {
  it('localizes across timezones and DST', () => {
    const t = Date.UTC(2026, 0, 1, 2, 30)
    expect(makeLocalizer('UTC')(t)).toBe('2026-01-01 02:30:00')
    expect(makeLocalizer('Asia/Dhaka')(t)).toBe('2026-01-01 08:30:00')
    expect(makeLocalizer('America/New_York')(t)).toBe('2025-12-31 21:30:00')
    expect(makeLocalizer('America/New_York')(Date.UTC(2026, 6, 1, 2, 30))).toBe('2026-06-30 22:30:00')
  })

  it('escapes quotes and commas in CSV', () => {
    const csv = playsToCsv([{ ts: 0, artist: 'Tyler, The "Creator"', track: 'X', ms_played: 1000.4, source: 'spotifyBasic' }], 'UTC')
    expect(csv).toBe('0,1970-01-01 00:00:00,"Tyler, The ""Creator""","X",,1000,,,,"spotifyBasic"\n')
  })

  it('drops junk tags and caps at 3', () => {
    expect(cleanTags(['seen live', 'Indie Pop', 'indie pop', '2010s', 'dream pop', 'shoegaze', 'rock'])).toEqual(['indie pop', 'dream pop', 'shoegaze'])
  })

  it('writes an empty file for no genres (regression: DuckDB sniffer failed on "\\n")', () => {
    expect(genresToCsv({})).toBe('')
    expect(playsToCsv([], 'UTC')).toBe('')
  })

  it('writes ranked genre rows with lowercased artist keys', () => {
    expect(genresToCsv({ 'Some Band': ['alternative', 'rock'] })).toBe('"some band","alternative",1\n"some band","rock",2\n')
  })
})
