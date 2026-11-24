import * as duckdb from '@duckdb/duckdb-wasm'
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import type { Dataset } from '../loaders'
import { PLAY_THRESHOLD_MS } from '../loaders'
import { genresToCsv, PLAY_COLUMNS, playsToCsv } from './prepare'

// Bundles are served from our own origin: no CDN, and nothing about your data is sent anywhere.
const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
}

let dbPromise: Promise<duckdb.AsyncDuckDB> | undefined

function getDb() {
  dbPromise ??= (async () => {
    const bundle = await duckdb.selectBundle(BUNDLES)
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(bundle.mainWorker!))
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
