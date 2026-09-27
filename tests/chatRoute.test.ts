import { describe, expect, it, vi } from 'vitest'
import { createChatRoute } from '../src/routes/chat'
import type { ChatResponse } from '../src/shared/api'
import type { ResolvedAnswer } from '../src/services/answerResolver'

const deterministicResult: ResolvedAnswer = {
  status: 'verified_snapshot',
  title: '국립순천대학교 도서관 시설 이용시간',
  content: '사전에 검증한 도서관 이용시간입니다.',
  fields: [{ label: '확인 방식', value: '사전 검증 자료' }],
  sources: [{
    title: '국립순천대학교 도서관 이용시간',
    department: '국립순천대학교 도서관',
    url: 'https://library.scnu.ac.kr/facility/avaliable-time',
    publishedAt: null,
    checkedAt: '2026-09-26',
  }],
  search: { status: 'failed', queriedSources: [], failedSources: [], candidates: [] },
  answerMode: 'snapshot',
  upstreamStatus: 'timeout',
  cacheHit: true,
  lastSuccessfulCheck: '2026-09-26',
}

const resolver = vi.fn(async () => deterministicResult)
const route = createChatRoute({ resolver })

async function readChatResponse(response: Response) {
  return (await response.json()) as ChatResponse
}

describe('POST /chat', () => {
  it('정상 질문에 네트워크 없이 분석 결과와 메타데이터를 반환한다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '도서관 몇 시까지 운영해?' }),
    })
    const body = await readChatResponse(response)

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    if (body.ok) {
      expect(body.status).toBe('verified_snapshot')
      expect(body.analysis.category).toBe('library')
      expect(body.analysis.intent).toBe('hours')
      expect(body.meta.answerMode).toBe('snapshot')
      expect(body.meta.upstreamStatus).toBe('timeout')
      expect(body.meta.cacheHit).toBe(true)
      expect(resolver).toHaveBeenCalledWith(
        expect.any(Object),
        { context: { requestId: body.meta.requestId } },
      )
    }
  })

  it('지원하지 않는 질문은 검색 키워드를 반환하지 않는다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '오늘 날씨 알려줘' }),
    })
    const body = await readChatResponse(response)

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    if (body.ok) {
      expect(body.analysis.supported).toBe(false)
      expect(body.analysis.searchKeywords).toEqual([])
    }
  })

  it('application/jsonp처럼 유사하지만 잘못된 Content-Type을 거부한다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/jsonp' },
      body: JSON.stringify({ question: '도서관 운영시간 알려줘' }),
    })

    expect(response.status).toBe(415)
  })

  it('4KiB를 넘는 요청 본문을 읽기 전에 거부한다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '가'.repeat(5_000) }),
    })
    const body = await readChatResponse(response)

    expect(response.status).toBe(413)
    expect(body.ok).toBe(false)
    if (!body.ok) expect(body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('JSON이 아닌 요청을 거부한다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      body: 'question=test',
    })
    const body = await readChatResponse(response)

    expect(response.status).toBe(415)
    expect(body.ok).toBe(false)
    if (!body.ok) expect(body.error.code).toBe('INVALID_CONTENT_TYPE')
  })

  it('160자를 초과한 질문을 거부한다', async () => {
    const response = await route.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '가'.repeat(161) }),
    })
    const body = await readChatResponse(response)

    expect(response.status).toBe(400)
    expect(body.ok).toBe(false)
    if (!body.ok) expect(body.error.code).toBe('QUESTION_TOO_LONG')
  })
})
