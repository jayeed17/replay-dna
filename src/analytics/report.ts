import type { Dataset } from '../loaders'
import { createEngine } from './db'
import { findGap } from './gaps'
import * as Q from './queries'

export type Report = Awaited<ReturnType<typeof buildReport>>

/** Run every query once. The connection is serial, so these run in order. */
export async function buildReport(ds: Dataset, timeZone: string) {
  const e = await createEngine(ds, timeZone)
  const totals = await Q.totals(e)
  const monthly = await Q.monthlyMinutes(e)
  const gap = findGap(monthly, totals.first, totals.last)
  const hasGenres = Object.keys(ds.genres).length > 0
  return {
    timeZone,
    totals,
    topArtists: await Q.topArtists(e),
    topTracks: await Q.topTracks(e),
    artistRanks: await Q.artistRanks(e),
    genres: hasGenres ? await Q.genres(e) : undefined,
    clock: await Q.clock(e),
    biggestDay: await Q.biggestDay(e),
    obsession: await Q.obsession(e),
    monthly,
    gap,
    gapSources: gap ? await Q.sourceMinutes(e, gap.months) : [],
    artistShare: await Q.artistShare(e),
    genreShare: hasGenres ? await Q.genreShare(e) : undefined,
    heatmap: await Q.hourWeekday(e),
    discovery: await Q.discoveryRate(e),
    skips: await Q.skipRate(e),
    wrapped: ds.wrapped,
    taste: ds.taste,
    uriNames: ds.uriNames,
  }
}
