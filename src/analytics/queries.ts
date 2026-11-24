import type { Engine } from './db'

const n = (v: unknown) => Number(v ?? 0)
const d = (v: unknown) => (v instanceof Date ? v : new Date(Number(v)))

export interface Totals {
  minutes: number; streams: number; plays: number; artists: number; tracks: number
  days: number; first: Date; last: Date; nightPct: number
}
export interface Ranked { name: string; artist?: string; minutes: number; plays: number }
export interface Genres { top: { genre: string; minutes: number; share: number }[]; count: number; coverage: number }
export interface BiggestDay { day: Date; minutes: number; plays: number; topArtist: string }
export interface Obsession { track: string; artist: string; week: Date; plays: number }

export async function totals(e: Engine): Promise<Totals> {
  const [r] = await e.query(`
    SELECT sum(mins) AS minutes, count(*) AS streams, count(*) FILTER (is_play) AS plays,
           count(DISTINCT artist) FILTER (is_play) AS artists, count(DISTINCT (artist, track)) FILTER (is_play) AS tracks,
           count(DISTINCT day) AS days, min(lt) AS first, max(lt) AS last,
           sum(mins) FILTER (hr >= 22 OR hr < 5) / nullif(sum(mins), 0) AS night
    FROM s`)
  return {
    minutes: n(r.minutes), streams: n(r.streams), plays: n(r.plays), artists: n(r.artists), tracks: n(r.tracks),
    days: n(r.days), first: d(r.first), last: d(r.last), nightPct: n(r.night) * 100,
  }
}

export async function topArtists(e: Engine, limit = 5): Promise<Ranked[]> {
  const rows = await e.query(`
    SELECT artist AS name, sum(mins) AS minutes, count(*) FILTER (is_play) AS plays
    FROM s GROUP BY artist ORDER BY minutes DESC LIMIT ${limit}`)
  return rows.map((r) => ({ name: String(r.name), minutes: n(r.minutes), plays: n(r.plays) }))
}

export async function topTracks(e: Engine, limit = 5): Promise<Ranked[]> {
  const rows = await e.query(`
    SELECT track AS name, artist, count(*) AS plays, sum(mins) AS minutes
    FROM plays GROUP BY track, artist ORDER BY plays DESC, minutes DESC LIMIT ${limit}`)
  return rows.map((r) => ({ name: String(r.name), artist: String(r.artist), minutes: n(r.minutes), plays: n(r.plays) }))
}

/** Minutes by primary genre; count = distinct genres across artists' top-3 tags. */
export async function genres(e: Engine, limit = 5): Promise<Genres> {
  const top = await e.query(`
    WITH g AS (SELECT pg.genre, sum(s.mins) AS minutes FROM s JOIN primary_genre pg USING (artist_key) GROUP BY 1)
    SELECT genre, minutes, minutes / sum(minutes) OVER () AS share FROM g ORDER BY minutes DESC LIMIT ${limit}`)
  const [c] = await e.query(`
    SELECT (SELECT count(DISTINCT genre) FROM artist_genre WHERE artist_key IN (SELECT DISTINCT artist_key FROM plays)) AS cnt,
           (SELECT sum(mins) FROM s WHERE artist_key IN (SELECT artist_key FROM primary_genre)) / nullif((SELECT sum(mins) FROM s), 0) AS cov`)
  return {
    top: top.map((r) => ({ genre: String(r.genre), minutes: n(r.minutes), share: n(r.share) })),
    count: n(c.cnt),
    coverage: n(c.cov),
  }
}

/** 24 buckets of minutes, local time. */
export async function clock(e: Engine): Promise<number[]> {
  const rows = await e.query(`SELECT hr, sum(mins) AS m FROM s GROUP BY hr`)
  const out = Array<number>(24).fill(0)
  for (const r of rows) out[n(r.hr)] = n(r.m)
  return out
}

export async function biggestDay(e: Engine): Promise<BiggestDay> {
  const [r] = await e.query(`
    WITH d AS (SELECT day, sum(mins) AS minutes, count(*) FILTER (is_play) AS plays FROM s GROUP BY day ORDER BY minutes DESC LIMIT 1)
    SELECT d.*, (SELECT artist FROM s WHERE s.day = d.day GROUP BY artist ORDER BY sum(mins) DESC LIMIT 1) AS top_artist FROM d`)
  return { day: d(r.day), minutes: n(r.minutes), plays: n(r.plays), topArtist: String(r.top_artist) }
}

/** The single track with the most plays inside one ISO week. */
export async function obsession(e: Engine): Promise<Obsession> {
  const [r] = await e.query(`
    SELECT track, artist, date_trunc('week', lt) AS week, count(*) AS plays
    FROM plays GROUP BY ALL ORDER BY plays DESC, week LIMIT 1`)
  return { track: String(r.track), artist: String(r.artist), week: d(r.week), plays: n(r.plays) }
}

// ---------- dashboard ----------

export interface Series { months: string[]; series: { name: string; data: number[] }[] }

const monthKey = (v: unknown) => d(v).toISOString().slice(0, 7)

export async function monthlyMinutes(e: Engine): Promise<{ month: string; minutes: number }[]> {
  const rows = await e.query(`SELECT month, sum(mins) AS m FROM s GROUP BY month ORDER BY month`)
  return rows.map((r) => ({ month: monthKey(r.month), minutes: n(r.m) }))
}

/** Monthly minutes for the top-N keys (by total), the rest folded into "Other". */
async function shareOverTime(e: Engine, keyExpr: string, from: string, topN: number): Promise<Series> {
  const rows = await e.query(`
    WITH base AS (SELECT month, ${keyExpr} AS k, mins FROM ${from}),
         top AS (SELECT k FROM base WHERE k IS NOT NULL GROUP BY k ORDER BY sum(mins) DESC LIMIT ${topN})
    SELECT month, CASE WHEN k IN (SELECT k FROM top) THEN k ELSE 'Other' END AS k, sum(mins) AS m
    FROM base GROUP BY ALL ORDER BY month`)
  const months = [...new Set(rows.map((r) => monthKey(r.month)))]
  const byKey = new Map<string, number[]>()
  for (const r of rows) {
    const k = String(r.k)
    if (!byKey.has(k)) byKey.set(k, Array(months.length).fill(0))
    byKey.get(k)![months.indexOf(monthKey(r.month))] = n(r.m)
  }
  const series = [...byKey].map(([name, data]) => ({ name, data }))
  series.sort((a, b) => (a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : sum(b.data) - sum(a.data)))
  return { months, series }
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

export const artistShare = (e: Engine, topN = 8) => shareOverTime(e, 'artist', 's', topN)
export const genreShare = (e: Engine, topN = 8) =>
  shareOverTime(e, "coalesce(pg.genre, 'untagged')", 's LEFT JOIN primary_genre pg USING (artist_key)', topN)

/** [weekday 0=Mon..6][hour 0..23] minutes. */
export async function hourWeekday(e: Engine): Promise<number[][]> {
  const rows = await e.query(`SELECT dow, hr, sum(mins) AS m FROM s GROUP BY ALL`)
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const r of rows) grid[n(r.dow) - 1][n(r.hr)] = n(r.m)
  return grid
}

/**
 * % of each month's minutes spent on artists first heard that month.
 * The first month in the data is a baseline (everything is "new") and is flagged.
 */
export async function discoveryRate(e: Engine): Promise<{ month: string; pct: number; newArtists: number; baseline: boolean }[]> {
  const rows = await e.query(`
    WITH firsts AS (SELECT artist, min(month) AS first_month FROM plays GROUP BY artist),
         m AS (SELECT s.month, sum(s.mins) AS total, sum(s.mins) FILTER (f.first_month = s.month) AS fresh
               FROM s LEFT JOIN firsts f USING (artist) GROUP BY s.month),
         c AS (SELECT first_month AS month, count(*) AS new_artists FROM firsts GROUP BY 1)
    SELECT m.month, coalesce(fresh, 0) / total AS pct, coalesce(c.new_artists, 0) AS new_artists,
           m.month = (SELECT min(month) FROM s) AS baseline
    FROM m LEFT JOIN c USING (month) ORDER BY m.month`)
  return rows.map((r) => ({ month: monthKey(r.month), pct: n(r.pct) * 100, newArtists: n(r.new_artists), baseline: Boolean(r.baseline) }))
}

/** Share of streams under the play threshold, per month. */
export async function skipRate(e: Engine): Promise<{ month: string; pct: number; streams: number }[]> {
  const rows = await e.query(`
    SELECT month, count(*) FILTER (NOT is_play) / count(*) AS pct, count(*) AS streams FROM s GROUP BY month ORDER BY month`)
  return rows.map((r) => ({ month: monthKey(r.month), pct: n(r.pct) * 100, streams: n(r.streams) }))
}

/** artist -> rank by minutes (1-based), for the top `limit` artists. */
export async function artistRanks(e: Engine, limit = 500): Promise<Record<string, number>> {
  const rows = await e.query(`SELECT artist, row_number() OVER (ORDER BY sum(mins) DESC) AS r FROM s GROUP BY artist ORDER BY r LIMIT ${limit}`)
  return Object.fromEntries(rows.map((r) => [String(r.artist), n(r.r)]))
}
