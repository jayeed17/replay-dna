import ReactECharts from 'echarts-for-react/lib/core'
import type { ReactNode } from 'react'
import type { Report } from '../analytics/report'
import { echarts } from '../charts/echarts'
import { asPercent, fmtDay, fmtMonth, fmtShort, hourLabel, int, monthRange, pct, topPct, weekRange } from './format'
import { ACCENT, StoryFrame, type Theme } from './StoryFrame'

export interface Card { id: string; title: string; node: ReactNode }

const Big = ({ children, color }: { children: ReactNode; color?: string }) => (
  <p className="text-[200px] leading-[0.9] font-black tracking-tight" style={{ color }}>{children}</p>
)
const Sub = ({ children }: { children: ReactNode }) => <p className="mt-[40px] text-[52px] leading-tight font-semibold text-white/85">{children}</p>

function RankList({ items, theme }: { items: { primary: string; secondary: string; stats?: string }[]; theme: Theme }) {
  return (
    <ol className="mt-[24px] flex flex-col gap-[44px]">
      {items.map((it, i) => (
        <li key={i} className="flex items-baseline gap-[36px]">
          <span className="w-[90px] shrink-0 text-[96px] font-black" style={{ color: ACCENT[theme] }}>{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-[66px] leading-tight font-extrabold">{it.primary}</span>
            <span className="block truncate text-[40px] text-white/60">{it.secondary}</span>
            {it.stats && <span className="block text-[36px] font-semibold" style={{ color: ACCENT[theme] }}>{it.stats}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Clock({ data, color }: { data: number[]; color: string }) {
  const option = {
    animation: false,
    polar: { radius: ['16%', '80%'], center: ['50%', '50%'] },
    angleAxis: {
      type: 'category', data: data.map((_, h) => (h % 6 === 0 ? hourLabel(h) : '')), startAngle: 90,
      axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: 'rgba(255,255,255,.7)', fontSize: 34, fontWeight: 700, interval: 0, margin: 24 },
    },
    radiusAxis: { show: false },
    series: [{ type: 'bar', coordinateSystem: 'polar', data, itemStyle: { color, borderRadius: 8 }, barCategoryGap: '18%' }],
  }
  return <ReactECharts echarts={echarts} option={option} opts={{ renderer: 'svg', width: 888, height: 820 }} style={{ width: 888, height: 820 }} />
}

function Compare({ rows }: { rows: { label: string; then?: number; now: number; unit?: string }[] }) {
  return (
    <div className="mt-[10px] flex flex-col gap-[18px]">
      <div className="grid grid-cols-[1fr_220px_220px] text-[34px] font-bold uppercase tracking-widest text-white/50">
        <span /> <span className="text-right">2025</span> <span className="text-right">Now</span>
      </div>
      {rows.map((r) => {
        const up = r.then !== undefined && r.now >= r.then
        return (
          <div key={r.label} className="grid grid-cols-[1fr_220px_220px] items-baseline border-t border-white/15 pt-[18px]">
            <span className="text-[46px] font-semibold">{r.label}</span>
            <span className="text-right text-[50px] text-white/60">{r.then === undefined ? '—' : int(r.then) + (r.unit ?? '')}</span>
            <span className="text-right text-[56px] font-black" style={{ color: r.then === undefined ? '#fff' : up ? ACCENT.lime : ACCENT.pink }}>
              {int(r.now)}{r.unit ?? ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function buildCards(r: Report): Card[] {
  const t = r.totals
  const cards: Card[] = []
  const add = (id: string, title: string, node: ReactNode) => cards.push({ id, title, node })

  add('intro', 'Intro', (
    <StoryFrame theme="sunset" kicker="Your replay">
      <p className="text-[150px] leading-[0.95] font-black tracking-tight">Your year<br />in sound.</p>
      <Sub>{fmtShort(t.first)} → {fmtShort(t.last)}</Sub>
      {r.taste?.musicalIdentity && <p className="mt-[140px] text-[48px] leading-snug text-white/80 italic">“{r.taste.musicalIdentity}”</p>}
    </StoryFrame>
  ))

  add('minutes', 'Total minutes', (
    <StoryFrame theme="lime" kicker="You listened for">
      <Big color={ACCENT.lime}>{int(t.minutes)}</Big>
      <p className="mt-[16px] text-[80px] font-black">minutes</p>
      <Sub>That’s {(t.minutes / 1440).toFixed(1)} days of nonstop music, across {int(t.plays)} plays on {t.days} different days.</Sub>
    </StoryFrame>
  ))

  add('artists', 'Top artists', (
    <StoryFrame theme="pink" kicker="Your top artists">
      <RankList theme="pink" items={r.topArtists.map((a) => ({ primary: a.name, secondary: `${int(a.minutes)} min · ${int(a.plays)} plays` }))} />
    </StoryFrame>
  ))

  add('songs', 'Top songs', (
    <StoryFrame theme="violet" kicker="Your top songs">
      <p className="mb-[30px] text-[36px] text-white/60">Ranked by plays (30s or more)</p>
      <RankList theme="violet" items={r.topTracks.map((s) => ({ primary: s.name, secondary: s.artist ?? "", stats: `${int(s.plays)} plays · ${int(s.minutes)} min` }))} />
    </StoryFrame>
  ))

  if (r.genres?.top.length) {
    const g = r.genres
    add('genres', 'Top genres', (
      <StoryFrame theme="cyan" kicker="Your sound">
        <p className="text-[64px] font-semibold text-white/85">You explored</p>
        <Big color={ACCENT.cyan}>{g.count}</Big>
        <p className="text-[64px] font-semibold text-white/85">genres. The ones on repeat:</p>
        <div className="mt-[70px] flex flex-col gap-[34px]">
          {g.top.map((x) => (
            <div key={x.genre}>
              <div className="flex justify-between text-[54px] font-extrabold capitalize"><span className="truncate">{x.genre}</span><span className="text-white/60">{pct(x.share * 100)}</span></div>
              <div className="mt-[12px] h-[18px] rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(x.share / g.top[0].share) * 100}%`, background: ACCENT.cyan }} /></div>
            </div>
          ))}
        </div>
      </StoryFrame>
    ))
  }

  else {
    add('genres', 'Top genres', (
      <StoryFrame theme="cyan" kicker="Your sound">
        <p className="text-[96px] leading-[1] font-black">Genres are<br />one step away.</p>
        <Sub>Spotify’s export doesn’t include genres. Run the Last.fm pipeline, then drop <b>genres.json</b> in with your export.</Sub>
      </StoryFrame>
    ))
  }

  const peak = r.clock.indexOf(Math.max(...r.clock))
  add('clock', 'Listening clock', (
    <StoryFrame theme="violet" kicker="Your listening clock">
      <p className="text-[96px] leading-none font-black">Peak hour: <span style={{ color: ACCENT.violet }}>{hourLabel(peak)}</span></p>
      <div className="mt-[40px] flex justify-center"><Clock data={r.clock.map(Math.round)} color={ACCENT.violet} /></div>
      <Sub>{pct(t.nightPct)} of your listening happened between 10pm and 5am{t.nightPct > 20 ? '. Certified night owl. 🦉' : '.'}</Sub>
      <p className="mt-[20px] text-[32px] text-white/40">Times in {r.timeZone}</p>
    </StoryFrame>
  ))

  const b = r.biggestDay
  add('biggest-day', 'Biggest day', (
    <StoryFrame theme="sunset" kicker="Your biggest day">
      <p className="text-[96px] leading-[1.02] font-black">{fmtDay(b.day)}</p>
      <Big color={ACCENT.sunset}>{int(b.minutes)}</Big>
      <p className="text-[72px] font-black">minutes in one day</p>
      <Sub>{int(b.plays)} plays, mostly <b>{b.topArtist}</b>.</Sub>
    </StoryFrame>
  ))

  if (r.gap) {
    const g = r.gap
    const max = Math.max(...r.monthly.map((m) => m.minutes))
    // When another source (e.g. Apple Music) has minutes in the gap, show that it filled the silence.
    const others = r.gapSources.filter((x) => x.source !== 'spotifyBasic' && x.source !== 'spotifyExtended')
    add('gap', 'The gap', (
      <StoryFrame theme="cyan" kicker="The gap">
        <p className="text-[104px] leading-[1] font-black">{monthRange(g.months)}</p>
        <p className="mt-[30px] text-[72px] leading-tight font-extrabold" style={{ color: ACCENT.cyan }}>You went quiet…</p>
        <p className="text-[56px] font-semibold text-white/70">{others.length ? `…on Spotify. ${others.map((o) => `${int(o.minutes)} min on ${o.source === 'appleMusic' ? 'Apple Music' : o.source}`).join(', ')}.` : '(Apple Music era?)'}</p>
        <div className="mt-[70px] flex h-[360px] items-end gap-[14px]" aria-hidden>
          {r.monthly.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-[12px]">
              <div className="w-full rounded-t-[10px]" style={{ height: `${Math.max(2, (m.minutes / max) * 300)}px`, background: g.months.includes(m.month) ? ACCENT.cyan : 'rgba(255,255,255,.22)' }} />
              <span className="text-[22px] text-white/50">{fmtMonth(m.month).slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <Sub>
          <b style={{ color: ACCENT.cyan }}>−{pct((1 - g.ratio) * 100)}</b> vs your usual: {int(g.gapPerDay)} min/day instead of {int(g.usualPerDay)}.
        </Sub>
      </StoryFrame>
    ))
  }

  const o = r.obsession
  add('obsession', 'Obsession of the year', (
    <StoryFrame theme="pink" kicker="Obsession of the year">
      <p className="text-[52px] font-semibold text-white/70">{weekRange(o.week)}, you couldn’t stop playing</p>
      <p className="mt-[50px] text-[124px] leading-[0.95] font-black" style={{ color: ACCENT.pink }}>{o.track}</p>
      <p className="mt-[24px] text-[64px] font-bold">{o.artist}</p>
      <Big>{o.plays}×</Big>
      <Sub>in a single week. That’s {(o.plays / 7).toFixed(1)} a day.</Sub>
    </StoryFrame>
  ))

  if (r.wrapped) {
    const w = r.wrapped
    const discovered = r.discovery.filter((m) => !m.baseline).reduce((a, m) => a + m.newArtists, 0)
    const wTop = w.topArtistUris.map((u) => r.uriNames[u]).find(Boolean)
    add('vs-wrapped', 'vs Wrapped 2025', (
      <StoryFrame theme="lime" kicker="Last 12 months vs Wrapped 2025">
        <Compare
          rows={[
            { label: 'Minutes', then: w.totalMinutes, now: t.minutes },
            { label: 'Artists', then: w.uniqueArtists, now: t.artists },
            { label: 'Tracks', then: w.uniqueTracks, now: t.tracks },
            ...(r.genres ? [{ label: 'Genres', then: w.totalGenres, now: r.genres.count }] : []),
            { label: 'New artists', then: w.artistsDiscovered, now: discovered },
            { label: 'Listening days', then: w.listeningDays, now: t.days },
            { label: 'Night listening', then: w.percentNight === undefined ? undefined : asPercent(w.percentNight), now: t.nightPct, unit: '%' },
          ]}
        />
        {wTop && (
          <Sub>
            Your 2025 #1, <b>{wTop}</b>, is now {r.artistRanks[wTop] ? <b style={{ color: ACCENT.lime }}>#{r.artistRanks[wTop]}</b> : 'off your charts'}.
          </Sub>
        )}
        <p className="mt-[50px] text-[32px] text-white/45">* Wrapped ≈ Jan – mid Nov 2025; “Now” = this export’s rolling 12 months.</p>
      </StoryFrame>
    ))
  }

  add('outro', 'Summary', (
    <StoryFrame theme="sunset" kicker="That was your replay">
      <div className="grid grid-cols-2 gap-x-[60px] gap-y-[70px]">
        {[
          ['Minutes', int(t.minutes)],
          ['Top artist', r.topArtists[0]?.name ?? '—'],
          ['Top song', r.topTracks[0]?.name ?? '—'],
          ['Top genre', r.genres?.top[0]?.genre ?? '—'],
          ['Peak hour', hourLabel(peak)],
          ['Obsession', o.track],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <p className="text-[34px] font-bold uppercase tracking-widest text-white/50">{k}</p>
            <p className="mt-[8px] line-clamp-2 text-[64px] leading-tight font-black capitalize">{v}</p>
          </div>
        ))}
        {r.wrapped?.topPercentileFan !== undefined && (
          <div className="col-span-2">
            <p className="text-[34px] font-bold uppercase tracking-widest text-white/50">Superfan · Wrapped 2025</p>
            <p className="mt-[8px] text-[64px] leading-tight font-black">
              Top <span style={{ color: ACCENT.sunset }}>{topPct(r.wrapped.topPercentileFan)}</span> fan of {(r.wrapped.topArtistUris[0] && r.uriNames[r.wrapped.topArtistUris[0]]) || 'your #1 artist'}
            </p>
          </div>
        )}
      </div>
      <p className="mt-[120px] text-[44px] text-white/70">Made with Replay DNA: analyzed in my browser, never uploaded.</p>
    </StoryFrame>
  ))

  return cards
}
