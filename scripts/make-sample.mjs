// Generates a deterministic, entirely fictional listening history in public/sample/.
// No real user data is used. Run: npm run sample
import { mkdirSync, writeFileSync } from 'node:fs'

let seed = 20261124
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const weighted = (items, w) => { let r = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i]; return items.at(-1) }

const A = ['Neon', 'Velvet', 'Paper', 'Static', 'Golden', 'Hollow', 'Midnight', 'Lunar', 'Coral', 'Glass', 'Saffron', 'Echo', 'Wild', 'Silver', 'Quiet', 'Electric', 'Monsoon', 'Cobalt', 'Honey', 'Feral']
const B = ['Harbor', 'Atlas', 'Foxes', 'Parade', 'Cassette', 'Riot', 'Gardens', 'Satellites', 'Lanterns', 'Machines', 'Sisters', 'Static', 'Oceans', 'Kids', 'Engines', 'Choir', 'Moths', 'Ghosts', 'Tides', 'Society']
const W = ['Love', 'Night', 'Drive', 'Fever', 'Gravity', 'Summer', 'Ghost', 'Fire', 'Rain', 'Heart', 'City', 'Dream', 'Gold', 'Static', 'Blue', 'Wire', 'Velvet', 'Signal', 'Sugar', 'Echo', 'Paper', 'Moon', 'Run', 'Stay']
const GENRES = [['indie pop', 'dream pop'], ['bedroom pop', 'lo-fi'], ['alt r&b', 'neo soul'], ['synthwave', 'electronic'], ['hip hop', 'rap'], ['shoegaze', 'noise pop'], ['house', 'deep house'], ['folk', 'indie folk'], ['k-pop', 'dance pop'], ['bangla rock', 'alternative'], ['jazz', 'nu jazz'], ['ambient', 'chill']]

const used = new Set()
const artists = Array.from({ length: 140 }, (_, i) => {
  let name
  do name = rnd() < 0.35 ? `${pick(A)} ${pick(B)}` : `The ${pick(A)} ${pick(B)}`; while (used.has(name))
  used.add(name)
  const g = pick(GENRES)
  const tracks = Array.from({ length: 4 + Math.floor(rnd() * 10) }, () => (rnd() < 0.5 ? `${pick(W)} ${pick(W)}` : pick(W)))
  return { name, tags: [...g, rnd() < 0.3 ? 'seen live' : 'chill', '2020s'], tracks: [...new Set(tracks)], weight: 1 / (i + 1) ** 0.9, debut: i < 50 ? 0 : Math.floor(rnd() * 360) }
})

const END = Date.UTC(2026, 10, 23, 23, 0)
const START = END - 365 * 864e5
const hourW = [3, 2, 1, .5, .3, .3, .6, 1.5, 2.5, 3, 3, 3.2, 3.5, 3.2, 3, 3.2, 3.8, 4.5, 5.5, 6.5, 7, 6.5, 5.5, 4.5]
const obsessed = artists[7], obsessedTrack = obsessed.tracks[0], obsessionDay = 200
const rows = []
for (let day = 0; day < 365; day++) {
  const dow = new Date(START + day * 864e5).getUTCDay()
  if (rnd() < 0.04) continue // some silent days
  let n = Math.round((dow === 0 || dow === 6 ? 60 : 40) * (0.4 + rnd() * 1.2))
  if (day >= 251 && day <= 311) n = Math.round(n * 0.12) // Aug–Sep: 'the gap'
  if (day === 330) n = 230 // a big day
  for (let i = 0; i < n; i++) {
    const hr = weighted([...Array(24).keys()], hourW)
    const ts = START + day * 864e5 + hr * 36e5 + Math.floor(rnd() * 36e5)
    const pool = artists.filter((a) => a.debut <= day)
    let a = weighted(pool, pool.map((x) => x.weight * (day - x.debut < 30 ? 3 : 1)))
    let track = pick(a.tracks)
    if (day >= obsessionDay && day < obsessionDay + 7 && rnd() < 0.3) (a = obsessed), (track = obsessedTrack)
    const skip = rnd() < 0.18
    const ms = skip ? Math.floor(rnd() * 29000) : 120000 + Math.floor(rnd() * 140000)
    rows.push({ ts, artistName: a.name, trackName: track, msPlayed: ms })
  }
}
rows.sort((x, y) => x.ts - y.ts)
const fmt = (t) => new Date(t).toISOString().slice(0, 16).replace('T', ' ')
const out = rows.map(({ ts, ...r }) => ({ endTime: fmt(ts), ...r }))

const dir = new URL('../public/sample/', import.meta.url)
mkdirSync(dir, { recursive: true })
const files = []
const write = (name, data) => (writeFileSync(new URL(name, dir), JSON.stringify(data)), files.push(name))
for (let i = 0; i * 10000 < out.length; i++) write(`StreamingHistory_music_${i}.json`, out.slice(i * 10000, (i + 1) * 10000))

const uri = (k, s) => `spotify:${k}:${Buffer.from(s).toString('base64url').padEnd(22, 'x').slice(0, 22)}`
write('Wrapped2025.json', {
  topArtists: { topArtistUris: artists.slice(1, 6).map((a) => uri('artist', a.name)), numUniqueArtists: 96, topNPercentileFan: 0.5, topArtistMsPlayed: 21_000_000 },
  topTracks: { topTracks: artists.slice(1, 6).map((a) => ({ trackUri: uri('track', a.tracks[0]), count: 60, msPlayed: 9_000_000 })), numUniqueTracks: 610 },
  yearlyMetrics: { totalMsListened: 31_500 * 60000 },
  topGenres: { topGenres: [], totalNumGenres: 18 },
  party: { totalNumListeningMinutes: 31_500, totalNumListeningDays: 301, streakNumListeningDays: 41, numArtistsDiscovered: 52, percentListenedNight: 0.21 },
})
write('YourLibrary.json', {
  tracks: artists.slice(1, 6).map((a) => ({ artist: a.name, album: 'Sample', track: a.tracks[0], uri: uri('track', a.tracks[0]) })),
  artists: artists.slice(1, 6).map((a) => ({ name: a.name, uri: uri('artist', a.name) })),
})
write('TasteProfile.json', { tasteProfile: { musicalIdentity: 'A night-drive dreamer who lives between indie pop haze and late-night R&B.' } })
write('genres.json', { artists: Object.fromEntries(artists.map((a) => [a.name, a.tags])) })
writeFileSync(new URL('manifest.json', dir), JSON.stringify(files))
console.log(`sample: ${out.length} streams, ${artists.length} fake artists -> public/sample/ (${files.join(', ')})`)
