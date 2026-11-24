import ReactECharts from 'echarts-for-react/lib/core'
import { useState, type ReactNode } from 'react'
import { echarts } from '../charts/echarts'

export interface TableData { columns: string[]; rows: (string | number)[][] }

interface Props {
  title: string
  subtitle?: ReactNode
  option?: object
  height?: number
  table: TableData
  className?: string
  children?: ReactNode
}

/** A chart panel with a chart/table toggle (the table is the accessible view of the same data). */
export function ChartCard({ title, subtitle, option, height = 300, table, className = '', children }: Props) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className={`rounded-2xl border border-line bg-panel p-4 ${className}`} aria-label={title}>
      <header className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <button onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-white">
          {asTable ? 'Chart' : 'Table'}
        </button>
      </header>
      {asTable ? (
        <div className="overflow-auto" style={{ maxHeight: height }}>
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="sticky top-0 bg-panel text-muted">
              <tr>{table.columns.map((c) => <th key={c} className="px-2 py-1 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : option ? (
        <ReactECharts echarts={echarts} option={option} style={{ height }} notMerge />
      ) : (
        children
      )}
    </section>
  )
}
