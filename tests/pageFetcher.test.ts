import { describe, expect, it, vi } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { fetchAndVerifyCandidates } from '../src/services/pageFetcher'
import type { SearchReport } from '../src/shared/api'

const now = new Date('2026-09-19T00:00:00.000Z')
const emptySearch: SearchReport = {
  status: 'completed',
  queriedSources: ['academic-notices'],
  failedSources: [],
  candidates: [],
}

describe('fetchAndVerifyCandidates', () => {
  it('공식 학사일정 JSON에서 현재 학기 중간시험 일정을 확인한다', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(new URL(String(input)).hostname).toBe('www.scnu.ac.kr')
      return new Response(JSON.stringify([
        { bgnde: '2026/04/20', endde: '2026/04/24', schdulTitle: '제1학기 중간시험' },
        { bgnde: '2026/10/19', endde: '2026/10/23', schdulTitle: '제2학기 중간시험' },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch
    const analysis = analyzeQuestion('이번 학기 중간고사 언제야?', now)

    const documents = await fetchAndVerifyCandidates(emptySearch, analysis, fetcher)

    expect(documents).toHaveLength(1)
    expect(documents[0].title).toBe('제2학기 중간시험')
    expect(documents[0].extracted.startDate).toBe('2026-10-19')
    expect(documents[0].extracted.endDate).toBe('2026-10-23')
    expect(documents[0].relevant).toBe(true)
  })
})
