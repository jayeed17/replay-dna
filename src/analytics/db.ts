import * as duckdb from '@duckdb/duckdb-wasm'
import type { Dataset } from '../loaders'
import { PLAY_THRESHOLD_MS } from '../loaders'
import { genresToCsv, PLAY_COLUMNS, playsToCsv } from './prepare'

/**
 * Where the DuckDB engine *code* comes from (your data is never sent anywhere either way):
 *  - default: bundled and served from this site's own origin
 *  - VITE_DUCKDB_SOURCE=cdn: fetched from cdn.jsdelivr.net (smaller deploy, e.g. if a host rejects ~35 MB .wasm files)
 * The env var is inlined at build time, so the unused branch (and its .wasm files) is dropped.
 */
export const DUCKDB_SOURCE: 'local' | 'cdn' = import.meta.env.VITE_DUCKDB_SOURCE === 'cdn' ? 'cdn' : 'local'

async function bundles(): Promise<duckdb.DuckDBBundles> {
  if (import.meta.env.VITE_DUCKDB_SOURCE === 'cdn') return duckdb.getJsDelivrBundles()
  const [mvpWasm, mvpWorker, ehWasm, ehWorker] = await Promise.all([
    import('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'),
    import('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'),
    import('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'),
    import('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'),
  ])
  return {
    mvp: { mainModule: mvpWasm.default, mainWorker: mvpWorker.default },
    eh: { mainModule: ehWasm.default, mainWorker: ehWorker.default },
  }
}

/** Cross-origin workers can't be constructed directly; wrap the CDN script in a same-origin blob. */
function makeWorker(url: string): Worker {
  if (new URL(url, location.href).origin === location.origin) return new Worker(url)
  const blob = URL.createObjectURL(new Blob([`importScripts(${JSON.stringify(url)});`], { type: 'text/javascript' }))
  const w = new Worker(blob)
  URL.revokeObjectURL(blob)
  return w
}

let dbPromise: Promise<duckdb.AsyncDuckDB> | undefined

function getDb() {
  dbPromise ??= (async () => {
    const bundle = await duckdb.selectBundle(await bundles())
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), makeWorker(bundle.mainWorker!))
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    await db.open({ query: { castBigIntToDouble: true } })
    return db
  })()
  return dbPromise
}

export type Row = Record<string, unknown>

export interface Engine {
  query<T = Row>(sql: string): Promise<T[]>
}

const cols = (c: Record<string, string>) => `{${Object.entries(c).map(([k, v]) => `'${k}': '${v}'`).join(', ')}}`

/** Strict, non-sniffing CSV read. An empty file yields an empty table with the right schema. */
const readCsv = (file: string, empty: boolean, columns: Record<string, string>) =>
  empty
    ? `SELECT ${Object.entries(columns).map(([k, v]) => `NULL::${v} AS ${k}`).join(', ')} WHERE false`
    : `SELECT * FROM read_csv('${file}', auto_detect = false, header = false, delim = ',', quote = '"', escape = '"', columns = ${cols(columns)})`
const GENRE_COLUMNS = { artist_key: 'VARCHAR', genre: 'VARCHAR', rnk: 'INTEGER' }

/** Load a dataset into a fresh in-memory DuckDB and return a query handle. */
export async function createEngine(ds: Dataset, timeZone: string): Promise<Engine> {
  const db = await getDb()
  const conn = await db.connect()
  await conn.query(`SET autoinstall_known_extensions = false; SET autoload_known_extensions = false;`)

  const playsCsv = playsToCsv(ds.plays, timeZone)
  const genresCsv = genresToCsv(ds.genres)
  await db.registerFileText('plays.csv', playsCsv)
  await db.registerFileText('genres.csv', genresCsv)
  await conn.query(`
    CREATE OR REPLACE TABLE streams AS ${readCsv('plays.csv', !playsCsv, PLAY_COLUMNS)};
    CREATE OR REPLACE TABLE artist_genre AS ${readCsv('genres.csv', !genresCsv, GENRE_COLUMNS)};
    -- music streams with handy derived columns
    CREATE OR REPLACE VIEW s AS
      SELECT *, ms / 60000.0 AS mins, ms >= ${PLAY_THRESHOLD_MS} AS is_play, lower(artist) AS artist_key,
             CAST(lt AS DATE) AS day, date_trunc('month', lt) AS month, hour(lt) AS hr, isodow(lt) AS dow
      FROM streams;
    CREATE OR REPLACE VIEW plays AS SELECT * FROM s WHERE is_play;
    CREATE OR REPLACE VIEW primary_genre AS SELECT artist_key, genre FROM artist_genre WHERE rnk = 1;
  `)

  return {
    async query<T>(sql: string) {
      const res = await conn.query(sql)
      return res.toArray().map((r) => r.toJSON() as T)
    },
  }
}
