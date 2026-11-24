// Timestamps from DuckDB are *naive local* times encoded as UTC, so always format in UTC.
const utc = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' })
const dayFmt = utc({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const shortFmt = utc({ month: 'short', day: 'numeric', year: 'numeric' })
const monthFmt = utc({ month: 'short', year: '2-digit' })

export const fmtDay = (d: Date) => dayFmt.format(d)
export const fmtShort = (d: Date) => shortFmt.format(d)
export const fmtMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`))
export const int = (n: number) => Math.round(n).toLocaleString('en-US')
export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`
export const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`

export function weekRange(start: Date) {
  const end = new Date(start.getTime() + 6 * 864e5)
  return `${utc({ month: 'short', day: 'numeric' }).format(start)} – ${utc({ month: 'short', day: 'numeric' }).format(end)}`
}

/** Spotify sometimes stores fractions (0.21), sometimes percents (21). */
export const asPercent = (v: number) => (v <= 1 ? v * 100 : v)
