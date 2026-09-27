import { describe, expect, it, vi } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { resolveAnswer } from '../src/services/answerResolver'
import { StaticSnapshotRepository } from '../src/services/snapshotRepository'
const now = new Date('2026-09-26T00:00:00Z')

describe('production 2500ms response budget with deterministic upstream', () => {
  it.each([true, false])('deadline settles even when upstream ignores abort (snapshot=%s)', async (available) => {
    vi.useFakeTimers()
    try {
      let settled = false
      const answer = resolveAnswer(analyzeQuestion('중간고사 언제야?', now), {
        documentFetcher: () => new Promise(() => {}),
        snapshotRepository: available ? new StaticSnapshotRepository() : new StaticSnapshotRepository([]),
        now: () => now,
      }).then((result) => { settled = true; return result })
      await vi.advanceTimersByTimeAsync(2499)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      const result = await answer
      expect(settled).toBe(true)
      expect(result.status).toBe(available ? 'verified_snapshot' : 'upstream_unavailable')
      expect(result.upstreamStatus).toBe('timeout')
      expect(vi.getTimerCount()).toBe(0)
    } finally { vi.useRealTimers() }
  })
  it('real scheduler returns within 2250–3250ms with a stalled mock', async () => {
    const started = performance.now()
    const result = await resolveAnswer(analyzeQuestion('중간고사 언제야?', now), {
      documentFetcher: () => new Promise(() => {}), now: () => now,
    })
    const elapsed = performance.now() - started
    console.info('response-budget', { elapsedMs: Math.round(elapsed), budgetMs: 2500 })
    expect(elapsed).toBeGreaterThanOrEqual(2250)
    expect(elapsed).toBeLessThanOrEqual(3250)
    expect(result.status).toBe('verified_snapshot')
  }, 5000)
  // Moved from live tests: production resolver success is independent of public network latency.
  it('production resolver completes verified_live inside its unchanged budget', async () => {
    const started = performance.now()
    const result = await resolveAnswer(analyzeQuestion('2026학년도 2학기 중간고사 언제야?', now), {
      fetcher: async () => new Response(JSON.stringify([
        { bgnde: '2026/10/19', endde: '2026/10/23', schdulTitle: '제2학기 중간시험' },
      ])), now: () => now,
    })
    expect(result.status).toBe('verified_live')
    expect(result.answerMode).toBe('live')
    expect(result.upstreamStatus).toBe('ok')
    expect(performance.now() - started).toBeLessThan(2500)
  })
})
