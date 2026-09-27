import { describe, expect, it, vi } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { resolveAnswer } from '../src/services/answerResolver'
import { StaticSnapshotRepository, type SnapshotRepository } from '../src/services/snapshotRepository'
import type { QuestionAnalysis, SearchReport } from '../src/shared/api'
import type { VerifiedDocument } from '../src/types/pipeline'

const now = new Date('2026-09-26T11:00:00.000Z')
const completedSearch: SearchReport = {
  status: 'completed',
  queriedSources: ['fixture-source'],
  failedSources: [],
  candidates: [{
    sourceId: 'fixture-source',
    sourceName: '국립순천대학교 공식 출처',
    title: '2026학년도 제2학기 중간시험',
    department: '교무학사과 학사지원팀',
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=1',
    publishedAt: '2026-09-01',
    relevanceScore: 100,
    matchedKeywords: ['중간고사'],
  }],
}

function academicAnalysis() {
  return analyzeQuestion('이번 학기 중간고사 언제야?', now)
}

function document(startDate = '2026-10-19', title = '2026학년도 제2학기 중간시험'): VerifiedDocument {
  return {
    candidate: completedSearch.candidates[0],
    finalUrl: completedSearch.candidates[0].url,
    title,
    department: '교무학사과 학사지원팀',
    publishedAt: '2026-09-01',
    checkedAt: '2026-09-26',
    content: `${title}: ${startDate} ~ 2026-10-23`,
    evidence: [`${title}: ${startDate} ~ 2026-10-23`],
    extracted: {
      startDate,
      endDate: '2026-10-23',
      dates: [startDate, '2026-10-23'],
      phones: [],
      hours: [],
      locations: [],
    },
    relevant: true,
  }
}

const noSnapshotRepository: SnapshotRepository = {
  findBest: vi.fn(async () => null),
}

const failingDocumentFetcher = vi.fn(async () => {
  throw new Error('http_error: upstream 502')
})

describe('resolveAnswer', () => {
  it('live 성공을 verified_live로 반환한다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: vi.fn(async () => [document()]),
      snapshotRepository: noSnapshotRepository,
      now: () => now,
    })

    expect(result.status).toBe('verified_live')
    expect(result.answerMode).toBe('live')
    expect(result.upstreamStatus).toBe('ok')
    expect(result.cacheHit).toBe(false)
  })

  it('requestId 문맥을 검색과 원문 조회 계층에 전달한다', async () => {
    const context = { requestId: 'request-context-test' }
    const searcher = vi.fn(async () => completedSearch)
    const documentFetcher = vi.fn(async () => [document()])

    await resolveAnswer(analyzeQuestion('도서관 운영시간 알려줘', now), {
      searcher,
      documentFetcher,
      snapshotRepository: noSnapshotRepository,
      context,
      now: () => now,
    })

    expect(searcher).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ context }),
    )
    expect(documentFetcher).toHaveBeenCalledWith(
      completedSearch,
      expect.any(Object),
      expect.any(Function),
      expect.any(AbortSignal),
      context,
    )
  })

  it('502 오류에서 유효 snapshot으로 전환한다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.status).toBe('verified_snapshot')
    expect(result.answerMode).toBe('snapshot')
    expect(result.upstreamStatus).toBe('http_error')
    expect(result.cacheHit).toBe(true)
  })

  it('timeout에서 snapshot으로 전환한다', async () => {
    const documentFetcher = vi.fn((
      _search: SearchReport,
      _analysis: QuestionAnalysis,
      _fetcher: typeof fetch,
      signal?: AbortSignal,
    ) => new Promise<VerifiedDocument[]>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = await resolveAnswer(academicAnalysis(), {
      documentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      timeoutMs: 5,
      now: () => now,
    })

    expect(result.status).toBe('verified_snapshot')
    expect(result.upstreamStatus).toBe('timeout')
  })

  it('production 기본 timeout에서 정확한 snapshot으로 전환한다', async () => {
    vi.useFakeTimers()
    try {
      const documentFetcher = vi.fn((
        _search: SearchReport,
        _analysis: QuestionAnalysis,
        _fetcher: typeof fetch,
        signal?: AbortSignal,
      ) => new Promise<VerifiedDocument[]>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }))
      const resultPromise = resolveAnswer(academicAnalysis(), {
        documentFetcher,
        snapshotRepository: new StaticSnapshotRepository(),
        now: () => now,
      })

      await vi.advanceTimersByTimeAsync(2_500)
      const result = await resultPromise

      expect(result.status).toBe('verified_snapshot')
      expect(result.answerMode).toBe('snapshot')
      expect(result.upstreamStatus).toBe('timeout')
    } finally {
      vi.useRealTimers()
    }
  })

  it('파싱 오류에서 snapshot으로 전환한다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: vi.fn(async () => { throw new Error('parse_error: fixture') }),
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.status).toBe('verified_snapshot')
    expect(result.upstreamStatus).toBe('parse_error')
  })

  it('만료 snapshot은 stale과 경고를 반환한다', async () => {
    const analysis = analyzeQuestion('국가장학금 신청 기간 알려줘', now)
    const result = await resolveAnswer(analysis, {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.status).toBe('stale')
    expect(result.content).toContain('만료된 마지막 검증본')
  })

  it('upstream 실패와 snapshot 없음은 upstream_unavailable이다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: noSnapshotRepository,
      now: () => now,
    })

    expect(result.status).toBe('upstream_unavailable')
    expect(result.answerMode).toBe('unavailable')
  })

  it('정상 조회에 후보가 없으면 not_found를 유지한다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => ({ ...completedSearch, candidates: [] })),
      documentFetcher: vi.fn(async () => []),
      snapshotRepository: noSnapshotRepository,
      now: () => now,
    })

    expect(result.status).toBe('not_found')
    expect(result.upstreamStatus).toBe('ok')
  })

  it('서로 다른 공식 값은 conflicting이다', async () => {
    const result = await resolveAnswer(academicAnalysis(), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: vi.fn(async () => [document('2026-10-19'), document('2026-10-20')]),
      snapshotRepository: noSnapshotRepository,
      now: () => now,
    })

    expect(result.status).toBe('conflicting')
  })

  it.each([
    '이번 학기 중간고사 언제야?',
    '국가장학금 신청 기간 알려줘.',
    '도서관은 주말에도 운영해?',
    '학생증 재발급 방법 알려줘.',
    '학사 관련 문의 전화번호 알려줘.',
  ])('대표 질문이 장애 시 설명 가능한 snapshot을 반환한다: %s', async (question) => {
    const result = await resolveAnswer(analyzeQuestion(question, now), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(['verified_snapshot', 'stale']).toContain(result.status)
    expect(result.sources[0]?.url).toMatch(/^https:\/\/(?:www\.)?(?:scnu\.ac\.kr|library\.scnu\.ac\.kr)/)
    expect(result.lastSuccessfulCheck).not.toBeNull()
  })

  it('도서관 주말 snapshot은 운영·휴관 시설을 구분한다', async () => {
    const result = await resolveAnswer(analyzeQuestion('도서관은 주말에도 운영해?', now), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.content).toContain('일부 시설만 운영')
    expect(result.content).toContain('자료관은 주말 및 법정공휴일에 휴관')
    expect(result.content).toContain('201·202 열람실')
    expect(result.content).toContain('401·402 열람실')
    expect(result.content).toContain('연중무휴')
  })

  it('넓은 학사 문의 snapshot은 업무별 번호를 함께 안내한다', async () => {
    const result = await resolveAnswer(analyzeQuestion('학사 관련 문의 전화번호 알려줘.', now), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.fields).toEqual(expect.arrayContaining([
      { label: '수강신청·수업·시험', value: '061-750-3032' },
      { label: '학적·등록·휴학·복학·전과', value: '061-750-3033' },
      { label: '졸업·다전공·재입학', value: '061-750-3035' },
      { label: '성적·계절학기·전자출결', value: '061-750-3036' },
    ]))
    expect(result.sources[0]?.url).toContain('/og/organiz/selectOrganizList.do')
  })

  it.each([
    '도서관에서 책 빌리는 방법 알려줘',
    '도서관 위치 알려줘',
    '도서관 좌석 예약 방법 알려줘',
    '교내장학금 신청 방법 알려줘',
    '근로장학금 모집 기간 알려줘',
    '외부장학금 알려줘',
    '학생증을 처음 발급받는 방법 알려줘',
    '성적 문의 전화번호 알려줘',
  ])('관련 없는 같은 카테고리 질문에는 snapshot을 반환하지 않는다: %s', async (question) => {
    const result = await resolveAnswer(analyzeQuestion(question, now), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.status).toBe('upstream_unavailable')
    expect(result.answerMode).toBe('unavailable')
    expect(result.cacheHit).toBe(false)
    expect(result.sources).toEqual([])
  })

  it.each([
    '2025학년도 1학기 중간고사 언제야?',
    '다음 학기 중간고사 언제야?',
    '이번 학기 중간고사 말고 기말고사 언제야?',
    '2025학년도 1학기 국가장학금 신청 기간 알려줘',
    '국가장학금 말고 외부장학금 신청 기간 알려줘',
    '국가장학금 말고 봉사장학금 신청 기간 알려줘',
    '도서관 예약 가능 시간 알려줘',
    '주말 도서관 분실물 접수 시간 알려줘',
    '학생증 재발급이 아니라 처음 발급받는 방법 알려줘',
  ])('경계 질문에는 관련 없는 snapshot을 반환하지 않는다: %s', async (question) => {
    const result = await resolveAnswer(analyzeQuestion(question, now), {
      searcher: vi.fn(async () => completedSearch),
      documentFetcher: failingDocumentFetcher,
      snapshotRepository: new StaticSnapshotRepository(),
      now: () => now,
    })

    expect(result.status).toBe('upstream_unavailable')
    expect(result.answerMode).toBe('unavailable')
    expect(result.cacheHit).toBe(false)
    expect(result.sources).toEqual([])
  })
})
