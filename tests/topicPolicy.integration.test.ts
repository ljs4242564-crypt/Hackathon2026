import { describe, expect, it, vi } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { resolveAnswer } from '../src/services/answerResolver'
import { searchOfficialSources } from '../src/services/searchService'
import { StaticSnapshotRepository } from '../src/services/snapshotRepository'

const now = new Date('2026-09-26T00:00:00Z')
const html = (text: string) => new Response(text, { headers: { 'Content-Type': 'text/html' } })
const board = (titles: string[]) => `<table>${titles.map((title, i) => `<tr><td>1</td><td class="ta_l"><a href="/SCNU/na/ntt/selectNttInfo.do?nttSn=${i + 1}">${title}</a></td><td>학생지원과</td><td>2026.09.20</td></tr>`).join('')}</table>`
const calendar = (includePositive: boolean) => new Response(JSON.stringify([
  { bgnde: '2026/10/19', endde: '2026/10/23', schdulTitle: '제2학기 중간시험' },
  ...(includePositive ? [{ bgnde: '2026/12/14', endde: '2026/12/18', schdulTitle: '제2학기 기말시험' }] : []),
]), { headers: { 'Content-Type': 'application/json' } })

function fixture(kind: string, includePositive: boolean, queries: string[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (kind === 'academic') return calendar(includePositive)
    if (url.searchParams.has('searchValue')) {
      queries.push(url.searchParams.get('searchValue')!)
      return html(board(kind === 'scholarship'
        ? ['2026 국가장학금 신청 안내', ...(includePositive ? ['2026 외부장학금 신청 안내'] : [])]
        : ['학생증 최초 발급 및 재발급 안내']))
    }
    if (kind === 'scholarship') return html('<p>국가장학금 신청기간은 2026.09.01 ~ 2026.09.09입니다.</p>'
      + (includePositive ? '<p>외부장학금 신청기간은 2026.10.01 ~ 2026.10.15입니다.</p>' : ''))
    return html('<p>학생증 재발급 수수료는 3,000원이며 학생지원과에 방문합니다.</p>'
      + (includePositive ? '<p>학생증 최초 발급은 신입생이 온라인으로 신청하며 학생지원과에서 수령합니다.</p>' : ''))
  }) as typeof fetch
}

const cases = [
  ['academic', '이번 학기 중간고사 말고 기말고사', '기말시험', /중간고사|중간시험/],
  ['scholarship', '국가장학금 말고 외부장학금', '외부장학금', /국가장학금/],
  ['student', '학생증 재발급이 아니라 처음 발급', '최초 발급', /재발급/],
] as const

describe('successful upstream topic selection', () => {
  it.each(cases)('%s: mixed successful responses return only requested evidence', async (kind, question, positive, excluded) => {
    const queries: string[] = []
    const analysis = analyzeQuestion(question, now)
    expect(analysis.searchKeywords.join(' ')).not.toMatch(excluded)
    const fetcher = fixture(kind, true, queries)
    if (kind === 'scholarship') {
      const search = await searchOfficialSources(analysis, { fetcher })
      expect(search.candidates.some((item) => item.title.includes('외부장학금'))).toBe(true)
      expect(search.candidates.some((item) => item.title.includes('국가장학금'))).toBe(false)
      expect(analysis.excludedKeywords).toEqual(['국가장학금'])
      expect(analysis.searchKeywords).toContain('장학금')
    }
    if (kind === 'student') {
      expect(analysis.excludedKeywords).toEqual(['재발급'])
      expect(analysis.searchKeywords).toContain('발급')
    }
    const result = await resolveAnswer(analysis, { fetcher, now: () => now })
    expect(result.status).toBe('verified_live')
    expect(result.content).toContain(positive)
    expect(JSON.stringify({ title: result.title, content: result.content, fields: result.fields, sources: result.sources })).not.toMatch(excluded)
    expect(queries.join(' ')).not.toMatch(excluded)
    if (kind === 'academic') expect(JSON.stringify(result.fields)).toContain('2026.12.14')
  })

  it.each(cases)('%s: successful excluded-only response is not_found', async (kind, question) => {
    const result = await resolveAnswer(analyzeQuestion(question, now), {
      fetcher: fixture(kind, false, []), now: () => now,
    })
    expect(result.status).toBe('not_found')
    expect(result.upstreamStatus).toBe('ok')
    expect(result.sources).toEqual([])
    expect(result.sources).toEqual([])
  })

  it('same-line sentences are selected separately', async () => {
    const result = await resolveAnswer(analyzeQuestion(cases[2][1], now), {
      fetcher: vi.fn(async (input: RequestInfo | URL) => new URL(String(input)).searchParams.has('searchValue')
        ? html(board(['학생증 안내']))
        : html('<p>학생증 재발급 수수료는 3000원입니다. 학생증 최초 발급은 온라인 신청 후 학생지원과에서 수령합니다.</p>')) as typeof fetch,
      now: () => now,
    })
    expect(result.status).toBe('verified_live')
    expect(result.content).not.toContain('재발급')
    expect(result.content).toContain('최초 발급')
  })

  it('mixed unseparable evidence is rejected by final validation', async () => {
    const { extractOfficialDocument } = await import('../src/services/contentExtractor')
    const analysis = analyzeQuestion(cases[2][1], now)
    const candidate = { sourceId: 'fixture', sourceName: '공식', title: '학생증 안내', department: null,
      url: 'https://www.scnu.ac.kr/', publishedAt: null, relevanceScore: 1, matchedKeywords: ['학생증'] }
    const document = extractOfficialDocument('<p>학생증 최초 발급 및 재발급은 3000원입니다.</p>', candidate, analysis, candidate.url, '2026-09-26')
    expect(document.relevant).toBe(false)
    const result = await resolveAnswer(analysis, {
      searcher: async () => ({ status: 'completed', candidates: [], queriedSources: [], failedSources: [] }),
      documentFetcher: async () => [{ ...document, relevant: true, content: '학생증 재발급 3000원', evidence: ['학생증 재발급 3000원'] }],
      snapshotRepository: new StaticSnapshotRepository([]),
    })
    expect(result.status).toBe('not_found')
    expect(result.upstreamStatus).toBe('ok')
    expect(result.sources).toEqual([])
  })
})
