export interface MonthMinutes { month: string; minutes: number } // month = "YYYY-MM"

export interface Gap {
  months: string[]
  minutes: number
  /** minutes/day during the gap vs. your usual (median month), 0..1 */
  ratio: number
  usualPerDay: number
  gapPerDay: number
}

const DAY = 864e5
const monthStart = (ym: string) => Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1)
const monthEnd = (ym: string) => Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 1) // exclusive

/** Days of a month actually covered by the export window (so partial edge months aren't "drops"). */
export function coveredDays(ym: string, first: Date, last: Date): number {
  const from = Math.max(monthStart(ym), Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()))
  const to = Math.min(monthEnd(ym), Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()) + DAY)
  return Math.max(0, Math.round((to - from) / DAY))
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const nextMonth = (ym: string) => new Date(monthEnd(ym)).toISOString().slice(0, 7)

/**
 * Finds the deepest run of months whose minutes/day fall below `threshold` × your median month.
 * Months with fewer than `minDays` covered days are ignored. Missing months count as 0.
 */
export function findGap(monthly: MonthMinutes[], first: Date, last: Date, threshold = 0.5, minDays = 7): Gap | undefined {
  if (!monthly.length) return
  // fill missing months with 0 so a silent month still counts
  const byMonth = new Map(monthly.map((m) => [m.month, m.minutes]))
  const all: MonthMinutes[] = []
  for (let ym = monthly[0].month; ym <= monthly.at(-1)!.month; ym = nextMonth(ym)) all.push({ month: ym, minutes: byMonth.get(ym) ?? 0 })

  const rated = all
    .map((m) => ({ ...m, days: coveredDays(m.month, first, last) }))
    .filter((m) => m.days >= minDays)
    .map((m) => ({ ...m, perDay: m.minutes / m.days }))
  if (rated.length < 4) return
  const usual = median(rated.map((m) => m.perDay))
  if (!usual) return

  let best: Gap | undefined
  let run: typeof rated = []
  const flush = () => {
    if (!run.length) return
    const days = run.reduce((a, m) => a + m.days, 0)
    const minutes = run.reduce((a, m) => a + m.minutes, 0)
    const gap: Gap = { months: run.map((m) => m.month), minutes, gapPerDay: minutes / days, usualPerDay: usual, ratio: minutes / days / usual }
    const deficit = (g: Gap) => (g.usualPerDay - g.gapPerDay) * g.months.length
    if (!best || deficit(gap) > deficit(best)) best = gap
    run = []
  }
  for (const m of rated) {
    if (m.perDay < usual * threshold) run.push(m)
    else flush()
  }
  flush()
  return best
}
