import { describe, expect, it } from 'vitest'
import { coveredDays, findGap } from './gaps'

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const months = (vals: Record<string, number>) => Object.entries(vals).map(([month, minutes]) => ({ month, minutes }))

describe('coveredDays', () => {
  it('handles partial edge months', () => {
    expect(coveredDays('2025-11', d('2025-11-23'), d('2026-11-23'))).toBe(8)
    expect(coveredDays('2026-02', d('2025-11-23'), d('2026-11-23'))).toBe(28)
    expect(coveredDays('2026-11', d('2025-11-23'), d('2026-11-23'))).toBe(23)
  })
})

describe('findGap', () => {
  const base = { '2026-01': 3100, '2026-02': 2800, '2026-03': 3100, '2026-04': 3000, '2026-05': 3100, '2026-06': 3000, '2026-07': 3100 }

  it('finds a consecutive quiet stretch', () => {
    const g = findGap(months({ ...base, '2026-08': 600, '2026-09': 300, '2026-10': 3100 }), d('2026-01-01'), d('2026-10-31'))
    expect(g?.months).toEqual(['2026-08', '2026-09'])
    expect(g!.ratio).toBeLessThan(0.2)
  })

  it('does not flag a short partial edge month', () => {
    expect(findGap(months({ '2025-11': 200, '2025-12': 3000, ...base }), d('2025-11-27'), d('2026-07-31'))).toBeUndefined()
  })

  it('counts a fully silent (missing) month', () => {
    const g2 = findGap(months({ '2026-01': 3100, '2026-02': 2800, '2026-03': 3100, '2026-05': 3000, '2026-06': 3100 }), d('2026-01-01'), d('2026-06-30'))
    expect(g2?.months).toEqual(['2026-04'])
  })

  it('returns nothing for steady listening', () => {
    expect(findGap(months(base), d('2026-01-01'), d('2026-07-31'))).toBeUndefined()
  })
})
