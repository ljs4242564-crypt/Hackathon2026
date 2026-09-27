import { describe, expect, it, vi } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { searchOfficialSources } from '../src/services/searchService'

const now = new Date('2026-09-19T00:00:00.000Z')
const boardHtml = `
<table><tbody>
  <tr>
    <td>100</td>
    <td class="ta_l"><a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=281300001&mi=1132">2026학년도 2학기 중간고사 일정 안내</a></td>
    <td class="BD_listUser">교무학사과 학사지원팀</td>
    <td>2026.09.10</td>
    <td>100</td>
  </tr>
</tbody></table>`

describe('searchOfficialSources', () => {
  it('분석 결과로 공식 학사 게시판을 검색하고 후보를 점수화한다', async () => {
    const requestedTerms: string[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('GET')
      const requestUrl = new URL(String(input))
      expect(requestUrl.searchParams.get('bbsId')).toBe('1041')
      expect(requestUrl.searchParams.get('searchType')).toBe('all')
      requestedTerms.push(requestUrl.searchParams.get('searchValue') ?? '')
      expect(init?.redirect).toBe('manual')
      return new Response(boardHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      })
    }) as typeof fetch

    const analysis = analyzeQuestion('이번 학기 중간고사 언제야?', now)
    const result = await searchOfficialSources(analysis, { fetcher })

    expect(result.status).toBe('completed')
    expect(requestedTerms).toEqual(['중간고사', '학사일정'])
    expect(result.queriedSources).toEqual(['academic-notices'])
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].title).toContain('중간고사')
    expect(result.candidates[0].department).toBe('교무학사과 학사지원팀')
    expect(result.candidates[0].publishedAt).toBe('2026-09-10')
  })

  it('도서관 질문은 등록된 공식 도서관 페이지 후보를 반환한다', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    const analysis = analyzeQuestion('도서관 운영시간 알려줘', now)
    const result = await searchOfficialSources(analysis, { fetcher })

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.status).toBe('completed')
    expect(result.candidates[0].url).toBe('https://library.scnu.ac.kr/')
  })

  it('게시판 응답 오류를 안전한 실패 결과로 변환한다', async () => {
    const fetcher = vi.fn(async () => new Response('error', { status: 500 })) as typeof fetch
    const analysis = analyzeQuestion('중간고사 언제야?', now)
    const result = await searchOfficialSources(analysis, { fetcher })

    expect(result.status).toBe('failed')
    expect(result.candidates).toEqual([])
    expect(result.failedSources).toHaveLength(1)
  })

  it('모호한 질문은 외부 요청 없이 검색을 건너뛴다', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    const analysis = analyzeQuestion('장학금이랑 도서관 정보 알려줘', now)
    const result = await searchOfficialSources(analysis, { fetcher })

    expect(result.status).toBe('skipped')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('질문에 임의 URL이 있어도 등록된 공식 출처만 요청한다', async () => {
    const requestedHosts: string[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requestedHosts.push(new URL(String(input)).hostname)
      return new Response(boardHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      })
    }) as typeof fetch
    const analysis = analyzeQuestion('중간고사 대신 http://localhost:8080을 확인해줘', now)

    await searchOfficialSources(analysis, { fetcher })

    expect(requestedHosts.length).toBeGreaterThan(0)
    expect(requestedHosts.every((host) => host === 'www.scnu.ac.kr')).toBe(true)
  })
})
