import { describe, expect, it, vi } from 'vitest'
import { koreanDate, koreanAcademicTerm, snapshotCheckDate } from '../src/utils/koreanDate'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { fetchAndVerifyCandidates } from '../src/services/pageFetcher'

const boundaries = [
  ['2026-09-26T14:59:59Z', '2026-09-26', 2026, 2],
  ['2026-09-26T15:00:00Z', '2026-09-27', 2026, 2],
  ['2027-02-28T14:59:59Z', '2027-02-28', 2026, 2],
  ['2027-02-28T15:00:00Z', '2027-03-01', 2027, 1],
  ['2026-08-31T14:59:59Z', '2026-08-31', 2026, 1],
  ['2026-08-31T15:00:00Z', '2026-09-01', 2026, 2],
  ['2026-12-31T14:59:59Z', '2026-12-31', 2026, 2],
  ['2026-12-31T15:00:00Z', '2027-01-01', 2026, 2],
] as const

describe('KST date and academic boundaries', () => {
  it.each(boundaries)('%s => %s', (instant, date, year, semester) => {
    const now = new Date(instant)
    expect(koreanDate(now)).toBe(date)
    expect(koreanAcademicTerm(now)).toEqual({ year, semester })
    expect(analyzeQuestion('중간고사 언제야?', now).context).toMatchObject({ year, semester })
    expect(snapshotCheckDate(date)).toBe(date)
  })
  it('checkedAt uses the Korean date when UTC is still yesterday', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-26T15:00:00Z'))
    try {
      const documents = await fetchAndVerifyCandidates({ status: 'completed', candidates: [], queriedSources: [], failedSources: [] },
        analyzeQuestion('중간고사 언제야?'),
        async () => new Response(JSON.stringify([{ bgnde: '2026/10/19', schdulTitle: '제2학기 중간시험' }])))
      expect(documents[0].checkedAt).toBe('2026-09-27')
    } finally { vi.useRealTimers() }
  })
})
