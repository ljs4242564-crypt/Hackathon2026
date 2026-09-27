import { describe, expect, it } from 'vitest'
import { formatRuleBasedAnswer } from '../src/services/answerFormatter'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import type { SearchReport } from '../src/shared/api'
import type { VerifiedDocument } from '../src/types/pipeline'

const now = new Date('2026-09-19T00:00:00.000Z')
const search: SearchReport = { status: 'completed', queriedSources: [], failedSources: [], candidates: [] }

function calendarDocument(start: string, end: string): VerifiedDocument {
  return {
    candidate: {
      sourceId: 'calendar', sourceName: '학사일정', title: '제2학기 중간시험',
      department: '교무학사과 학사지원팀', url: 'https://www.scnu.ac.kr/haksa/sv/schdulView/schdulCalendarView.do?mi=1416',
      publishedAt: null, relevanceScore: 200, matchedKeywords: ['중간고사'],
    },
    finalUrl: 'https://www.scnu.ac.kr/haksa/sv/schdulView/schdulCalendarView.do?mi=1416',
    title: '제2학기 중간시험', department: '교무학사과 학사지원팀', publishedAt: null,
    checkedAt: '2026-09-19', content: `제2학기 중간시험: ${start} ~ ${end}`,
    evidence: [`제2학기 중간시험: ${start} ~ ${end}`],
    extracted: { startDate: start, endDate: end, dates: [start, end], phones: [], hours: [], locations: [] },
    relevant: true,
  }
}

describe('formatRuleBasedAnswer', () => {
  it('확인된 학사일정을 템플릿 답변으로 만든다', () => {
    const analysis = analyzeQuestion('이번 학기 중간고사 언제야?', now)
    const result = formatRuleBasedAnswer(analysis, search, [calendarDocument('2026-10-19', '2026-10-23')])

    expect(result.status).toBe('verified')
    expect(result.fields).toContainEqual({ label: '기간', value: '2026.10.19 ~ 2026.10.23' })
    expect(result.sources).toHaveLength(1)
  })

  it('유사한 공식 자료의 날짜가 다르면 충돌로 표시한다', () => {
    const analysis = analyzeQuestion('이번 학기 중간고사 언제야?', now)
    const result = formatRuleBasedAnswer(analysis, search, [
      calendarDocument('2026-10-19', '2026-10-23'),
      calendarDocument('2026-10-20', '2026-10-24'),
    ])

    expect(result.status).toBe('conflicting')
    expect(result.sources).toHaveLength(2)
  })

  it('본문 근거가 없으면 추측하지 않는다', () => {
    const analysis = analyzeQuestion('이번 학기 중간고사 언제야?', now)
    const result = formatRuleBasedAnswer(analysis, search, [])

    expect(result.status).toBe('not_found')
    expect(result.sources).toEqual([])
  })
})
