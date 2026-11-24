/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "cdn" to load DuckDB-WASM from jsDelivr instead of bundling it. */
  readonly VITE_DUCKDB_SOURCE?: 'cdn' | 'local'
}
