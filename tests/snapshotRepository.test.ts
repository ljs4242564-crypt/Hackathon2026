import { describe, expect, it } from 'vitest'
import { VERIFIED_SNAPSHOTS } from '../src/data/verifiedSnapshots'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { StaticSnapshotRepository } from '../src/services/snapshotRepository'
import { resolveAnswer } from '../src/services/answerResolver'

const future = new Date('2027-04-01T00:00:00Z')
const current = new Date('2026-09-26T00:00:00Z')
const cases = [
  [future, '중간고사 언제야?', null],
  [future, '국가장학금 신청 기간 알려줘', null],
  [current, '중간고사 언제야?', 'academic-midterm-2026-2'],
  [future, '2026학년도 2학기 중간고사 언제야?', 'academic-midterm-2026-2'],
  [current, '2026학년도 1학기 중간고사 언제야?', null],
  [current, '2027학년도 2학기 국가장학금 신청 기간 알려줘', null],
] as const

describe('snapshot academic term gate precedes expiration handling', () => {
  it.each(cases)('repository %s %s', async (now, question, expected) => {
    const analysis = analyzeQuestion(question, now)
    const result = await new StaticSnapshotRepository().findBest(analysis, question)
    expect(result?.id ?? null).toBe(expected)
  })
  it.each(cases)('resolver %s %s', async (now, question, expected) => {
    const result = await resolveAnswer(analyzeQuestion(question, now), {
      now: () => now,
      searcher: async () => { throw new Error('fixture upstream failure') },
      documentFetcher: async () => { throw new Error('fixture upstream failure') },
    })
    if (expected) {
      expect(['verified_snapshot', 'stale']).toContain(result.status)
      expect(result.cacheHit).toBe(true)
    } else {
      expect(result.status).toBe('upstream_unavailable')
      expect(result.sources).toEqual([])
      expect(result.cacheHit).toBe(false)
    }
  })
  it('matching inferred future-term fixture is returned, not the old term', async () => {
    const matching = { ...VERIFIED_SNAPSHOTS[0], id: 'fixture-2027-1', academicTerm: { year: 2027, semester: 1 as const } }
    const analysis = analyzeQuestion('중간고사 언제야?', future)
    const result = await new StaticSnapshotRepository([VERIFIED_SNAPSHOTS[0], matching]).findBest(analysis, analysis.normalizedQuestion)
    expect(result?.id).toBe('fixture-2027-1')
  })
})
