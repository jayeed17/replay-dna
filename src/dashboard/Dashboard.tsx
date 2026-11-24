import { coveredDays } from '../analytics/gaps'
import type { Report } from '../analytics/report'
import type { Series } from '../analytics/queries'
import { fmtMonth, hourLabel, int, pct } from '../story/format'
import { ChartCard } from './ChartCard'
import { axisCommon, colorMap, OTHER, SEQ, SERIES, SURFACE, TEXT_2, tooltipCommon } from './theme'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const grid = { left: 48, right: 16, top: 16, bottom: 32, containLabel: false }
const f1 = (n: number) => n.toFixed(1)

function Stat({ label, value, note, className = '' }: { label: string; value: string; note?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  )
}

/** 100% stacked area: each month's minutes as a share. */
function shareOption(s: Series) {
  const totals = s.months.map((_, i) => s.series.reduce((a, x) => a + x.data[i], 0) || 1)
  const colors = colorMap(s.series.map((x) => x.name))
  return {
    animationDuration: 400,
    grid: { ...grid, bottom: 64 },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: TEXT_2, fontSize: 11 }, pageTextStyle: { color: TEXT_2 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    tooltip: {
      ...tooltipCommon, trigger: 'axis', order: 'seriesDesc',
      valueFormatter: (v: number) => pct(v, 1),
      axisPointer: { type: 'line', lineStyle: { color: TEXT_2 } },
    },
    xAxis: { type: 'category', boundaryGap: false, data: s.months.map(fmtMonth), ...axisCommon, splitLine: { show: false } },
    yAxis: { type: 'value', max: 100, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: '{value}%' } },
    series: s.series.map((x) => ({
      name: x.name, type: 'line', stack: 'share', showSymbol: false, smooth: 0.25,
      data: x.data.map((v, i) => +((v / totals[i]) * 100).toFixed(2)),
      color: colors[x.name],
      lineStyle: { width: 1.5, color: SURFACE }, // 2px-ish surface gap between bands
      areaStyle: { color: colors[x.name], opacity: 1 },
      emphasis: { focus: 'series' },
    })),
  }
}

function shareTable(s: Series) {
  return { columns: ['Month', ...s.series.map((x) => x.name)], rows: s.months.map((m, i) => [fmtMonth(m), ...s.series.map((x) => int(x.data[i]))]) }
}

export function Dashboard({ r }: { r: Report }) {
  const t = r.totals
  const gapSet = new Set(r.gap?.months ?? [])
  const disc = r.discovery.filter((d) => !d.baseline)
  const avgDisc = disc.length ? disc.reduce((a, d) => a + d.pct, 0) / disc.length : 0
  const skipAll = r.skips.reduce((a, s) => a + (s.pct / 100) * s.streams, 0) / Math.max(1, t.streams) * 100
  const heatMax = Math.max(1, ...r.heatmap.flat())
  const partial = (ym: string) => { const [y, m] = ym.split('-').map(Number); return coveredDays(ym, t.first, t.last) < new Date(Date.UTC(y, m, 0)).getUTCDate() }
  const monthLabel = (ym: string) => fmtMonth(ym) + (partial(ym) ? '*' : '')

  const monthlyOption = {
    animationDuration: 400,
    grid,
    tooltip: {
      ...tooltipCommon, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.05)' } },
      formatter: (ps: { dataIndex: number; value: number }[]) => {
        const m = r.monthly[ps[0].dataIndex].month
        const note = gapSet.has(m) ? 'the gap' : partial(m) ? `partial month: ${coveredDays(m, t.first, t.last)} days in export` : ''
        return `${fmtMonth(m)}<br/><b>${int(ps[0].value)} min</b>${note ? `<br/><span style="color:${TEXT_2}">${note}</span>` : ''}`
      },
    },
    xAxis: { type: 'category', data: r.monthly.map((m) => monthLabel(m.month)), ...axisCommon, splitLine: { show: false } },
    yAxis: { type: 'value', ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => (v >= 1000 ? `${v / 1000}k` : v) } },
    series: [{
      name: 'Minutes', type: 'bar', barMaxWidth: 28,
      data: r.monthly.map((m) => ({ value: Math.round(m.minutes), itemStyle: { color: gapSet.has(m.month) ? OTHER : SERIES[0], borderRadius: [4, 4, 0, 0] } })),
    }],
  }

  const heatOption = {
    animation: false,
    grid: { left: 40, right: 16, top: 8, bottom: 70 },
    tooltip: { ...tooltipCommon, formatter: (p: { value: [number, number, number] }) => `${DAYS[p.value[1]]} ${hourLabel(p.value[0])}–${hourLabel((p.value[0] + 1) % 24)}<br/><b>${int(p.value[2])} min</b>` },
    xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? hourLabel(h) : '')), ...axisCommon, splitLine: { show: false } },
    yAxis: { type: 'category', data: DAYS, inverse: true, ...axisCommon, splitLine: { show: false } },
    visualMap: { min: 0, max: heatMax, calculable: false, text: ['More', 'Less'], orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 160, inRange: { color: SEQ }, textStyle: { color: TEXT_2, fontSize: 11 }, formatter: (v: number) => `${int(v)} min` },
    series: [{
      type: 'heatmap',
      data: r.heatmap.flatMap((row, d) => row.map((v, h) => [h, d, Math.round(v)])),
      itemStyle: { borderColor: SURFACE, borderWidth: 2, borderRadius: 3 },
      emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
    }],
  }

  const lineOption = (name: string, data: (number | null)[], months: string[], color: string, extra: (i: number) => string) => ({
    animationDuration: 400,
    grid,
    tooltip: {
      ...tooltipCommon, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: TEXT_2 } },
      formatter: (ps: { dataIndex: number; value: number | null }[]) => {
        const p = ps[0]
        return `${fmtMonth(months[p.dataIndex])}<br/><b>${p.value === null ? 'n/a' : pct(p.value, 1)}</b> ${name}<br/><span style="color:${TEXT_2}">${extra(p.dataIndex)}</span>`
      },
    },
    xAxis: { type: 'category', data: months.map(fmtMonth), ...axisCommon, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: '{value}%' } },
    series: [{ name, type: 'line', data, color, lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 8, itemStyle: { borderColor: SURFACE, borderWidth: 2 }, connectNulls: false }],
  })

  const discMonths = r.discovery.map((d) => d.month)
  const skipMonths = r.skips.map((s) => s.month)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Minutes" value={int(t.minutes)} note={`${f1(t.minutes / Math.max(1, t.days))} min per listening day`} />
        <Stat label="Plays" value={int(t.plays)} note="30s or more" />
        <Stat label="Artists" value={int(t.artists)} note={`${int(t.tracks)} tracks`} />
        <Stat label="New-artist share" value={pct(avgDisc, 1)} note="avg % of monthly minutes" />
        <Stat label="Skip-proxy rate" value={pct(skipAll, 1)} note="streams under 30s" className="col-span-2 md:col-span-1" />
      </div>

      <ChartCard
        title="Monthly minutes"
        subtitle={<>{r.gap ? <>Gray bars: the gap ({r.gap.months.map(fmtMonth).join(', ')}), −{pct((1 - r.gap.ratio) * 100)} vs your usual. </> : null}* partial month at the edge of your export</>}
        option={monthlyOption}
        table={{ columns: ['Month', 'Minutes'], rows: r.monthly.map((m) => [fmtMonth(m.month), int(m.minutes)]) }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Artist share over time" subtitle="Share of each month’s minutes · top 8 artists" option={shareOption(r.artistShare)} height={340} table={shareTable(r.artistShare)} />
        {r.genreShare ? (
          <ChartCard title="Genre share over time" subtitle="Share of each month’s minutes · primary Last.fm tag" option={shareOption(r.genreShare)} height={340} table={shareTable(r.genreShare)} />
        ) : (
          <ChartCard title="Genre share over time" subtitle="Needs genres.json" table={{ columns: [], rows: [] }}>
            <div className="grid h-[340px] place-items-center p-6 text-center text-sm text-muted">
              <p>Genres come from Last.fm tags. Run <code className="rounded bg-ink px-1">pipeline/</code> to build <b>genres.json</b>, then drop it in with your export.</p>
            </div>
          </ChartCard>
        )}
      </div>

      <ChartCard
        title="When you listen"
        subtitle={`Minutes by hour × weekday · ${r.timeZone}`}
        option={heatOption}
        height={320}
        table={{ columns: ['Day', ...Array.from({ length: 24 }, (_, h) => hourLabel(h))], rows: r.heatmap.map((row, d) => [DAYS[d], ...row.map((v) => Math.round(v))]) }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Discovery rate"
          subtitle="% of each month’s minutes on artists first heard that month (first month is the baseline, omitted)"
          option={lineOption('on new artists', r.discovery.map((d) => (d.baseline ? null : +d.pct.toFixed(2))), discMonths, SERIES[2], (i) => `${r.discovery[i].newArtists} new artists`)}
          table={{ columns: ['Month', 'New-artist minutes %', 'New artists'], rows: r.discovery.map((d) => [fmtMonth(d.month), d.baseline ? 'baseline' : f1(d.pct), d.newArtists]) }}
        />
        <ChartCard
          title="Skip-proxy rate"
          subtitle="% of streams that stopped before 30 seconds"
          option={lineOption('skipped', r.skips.map((s) => +s.pct.toFixed(2)), skipMonths, SERIES[1], (i) => `${int(r.skips[i].streams)} streams`)}
          table={{ columns: ['Month', 'Skip %', 'Streams'], rows: r.skips.map((s) => [fmtMonth(s.month), f1(s.pct), s.streams]) }}
        />
      </div>
      <p className="text-center text-xs text-muted">All numbers computed locally with DuckDB-WASM. Nothing was uploaded.</p>
    </div>
  )
}
