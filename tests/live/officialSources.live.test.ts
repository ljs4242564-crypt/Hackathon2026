import { describe, expect, it } from 'vitest'
import { URL_SECURITY_LIMITS } from '../../src/config/domains'
import { analyzeQuestion } from '../../src/services/questionAnalyzer'
import { fetchAndVerifyCandidates } from '../../src/services/pageFetcher'

// Opt-in suite; failures remain failures and carry a diagnostic category.
describe('official SCNU live source availability', () => {
  it('학사일정 공식 원문에서 2026년 2학기 중간시험을 확인한다', async () => {
    const networkTimeoutMs = URL_SECURITY_LIMITS.timeoutMs
    const overallTimeoutMs = 15000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), overallTimeoutMs)
    const started = performance.now()
    let failureKind = 'unexpected response'
    try {
      const measuredFetch: typeof fetch = async (input, init) => {
        const requestStarted = performance.now()
        try {
          const response = await fetch(input, init)
          console.info('live-network', { status: response.status, elapsedMs: Math.round(performance.now() - requestStarted), networkTimeoutMs, overallTimeoutMs })
          if (!response.ok) failureKind = 'unexpected response'
          return response
        } catch (error) {
          failureKind = (controller.signal.aborted || init?.signal?.aborted) ? 'timeout' : 'network unavailable'
          throw error
        }
      }
      const analysis = analyzeQuestion('2026학년도 2학기 중간고사 언제야?', new Date('2026-09-26T00:00:00Z'))
      const documents = await fetchAndVerifyCandidates(
        { status: 'completed', candidates: [], queriedSources: [], failedSources: [] },
        analysis, measuredFetch, controller.signal,
      )
      expect(documents.some((document) => document.title.includes('중간시험') && document.extracted.startDate === '2026-10-19')).toBe(true)
      console.info('live-result', { status: 'available', elapsedMs: Math.round(performance.now() - started), networkTimeoutMs, overallTimeoutMs })
    } catch (error) {
      const category = controller.signal.aborted ? 'timeout' : failureKind
      console.error('live-result', { status: category, elapsedMs: Math.round(performance.now() - started), networkTimeoutMs, overallTimeoutMs })
      throw new Error(`${category}: official calendar availability check failed`, { cause: error })
    } finally { clearTimeout(timer) }
  }, 18000)
})
