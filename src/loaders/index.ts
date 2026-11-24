import { appleMusic } from './appleMusic'
import { spotifyBasic } from './spotifyBasic'
import { spotifyExtended } from './spotifyExtended'
import { extraKind, parseGenres, parseLibrary, parseTaste, parseWrapped, type GenreMap, type TasteProfile, type Wrapped } from './extras'
import type { Loader, Play } from './types'

export * from './types'
export * from './extras'

export const loaders: Loader[] = [spotifyBasic, spotifyExtended, appleMusic]

/** Minimal file abstraction so this works with browser File objects and in tests. */
export interface InputFile {
  name: string
  text(): Promise<string>
}

export interface Dataset {
  plays: Play[]
  wrapped?: Wrapped
  taste?: TasteProfile
  uriNames: Record<string, string>
  genres: GenreMap
  report: {
    used: { name: string; loader: string; rows: number }[]
    comingSoon: { name: string; loader: string }[]
    ignored: number
    errors: { name: string; message: string }[]
  }
}

const baseName = (n: string) => n.split(/[\\/]/).pop() ?? n

export async function loadFiles(files: InputFile[]): Promise<Dataset> {
  const ds: Dataset = { plays: [], uriNames: {}, genres: {}, report: { used: [], comingSoon: [], ignored: 0, errors: [] } }
  for (const f of files) {
    const name = baseName(f.name)
    const loader = loaders.find((l) => l.matches(name))
    const extra = loader ? null : extraKind(name)
    if (!loader && !extra) {
      ds.report.ignored++ // never read
      continue
    }
    if (loader?.status === 'coming-soon') {
      ds.report.comingSoon.push({ name, loader: loader.label })
      continue
    }
    try {
      const text = await f.text()
      if (loader) {
        const rows = loader.parse(text, name)
        ds.plays.push(...rows)
        ds.report.used.push({ name, loader: loader.id, rows: rows.length })
      } else if (extra === 'wrapped') ds.wrapped = parseWrapped(text)
      else if (extra === 'taste') ds.taste = parseTaste(text)
      else if (extra === 'library') Object.assign(ds.uriNames, parseLibrary(text))
      else if (extra === 'genres') Object.assign(ds.genres, parseGenres(text))
    } catch (e) {
      ds.report.errors.push({ name, message: e instanceof Error ? e.message : String(e) })
    }
  }
  ds.plays.sort((a, b) => a.ts - b.ts)
  return ds
}
