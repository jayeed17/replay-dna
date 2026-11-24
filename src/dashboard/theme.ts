// Validated (dataviz validate_palette.js, dark, surface #15151f): all checks pass,
// worst adjacent CVD ΔE 8.4, so identity is never color-alone (legend + tooltips + table).
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
export const OTHER = '#5b5b6e'
export const SURFACE = '#15151f'
export const TEXT = '#f0efec'
export const TEXT_2 = '#b9b9c8'
export const GRID = 'rgba(255,255,255,0.08)'
/** Sequential blue, dark surface: low values recede toward the surface. */
export const SEQ = ['#1b2236', '#104281', '#1c5cab', '#3987e5', '#86b6ef', '#cde2fb']

/** Color follows the entity: a stable name -> color map, "Other" always gray. */
export function colorMap(names: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  let k = 0
  for (const n of names) out[n] = n === 'Other' ? OTHER : SERIES[k++ % SERIES.length]
  return out
}

export const axisCommon = {
  axisLine: { lineStyle: { color: GRID } },
  axisTick: { show: false },
  axisLabel: { color: TEXT_2, fontSize: 11 },
  splitLine: { lineStyle: { color: GRID } },
}

export const tooltipCommon = {
  backgroundColor: '#1f1f2c',
  borderColor: '#33334a',
  textStyle: { color: TEXT, fontSize: 12 },
  confine: true,
}
