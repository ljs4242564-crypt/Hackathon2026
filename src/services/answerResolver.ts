import { snapshotCheckDate } from '../utils/koreanDate'
import type { VerifiedSnapshot } from '../data/verifiedSnapshots'
import type {
  AnswerSource,
  ChatStatus,
  QuestionAnalysis,
  SearchReport,
  UpstreamStatus,
} from '../shared/api'
import type { PipelineResult, RequestContext, VerifiedDocument } from '../types/pipeline'
import { formatRuleBasedAnswer } from './answerFormatter'
import { fetchAndVerifyCandidates } from './pageFetcher'
import { searchOfficialSources } from './searchService'
import { staticSnapshotRepository, type SnapshotRepository } from './snapshotRepository'

const DEFAULT_LIVE_TIMEOUT_MS = 2_500

export type ResolvedAnswer = {
  status: Exclude<ChatStatus, 'pending'>
  title: string
  content: string
  fields: PipelineResult['fields']
  sources: AnswerSource[]
  search: SearchReport
  answerMode: 'live' | 'snapshot' | 'unavailable'
  upstreamStatus: UpstreamStatus
  cacheHit: boolean
  lastSuccessfulCheck: string | null
}

type ResolverDependencies = {
  searcher?: typeof searchOfficialSources
  documentFetcher?: typeof fetchAndVerifyCandidates
  snapshotRepository?: SnapshotRepository
  timeoutMs?: number
  now?: () => Date
  fetcher?: typeof fetch
  context?: RequestContext
}

const emptySearch = (status: SearchReport['status'] = 'skipped'): SearchReport => ({
  status,
  queriedSources: [],
  failedSources: [],
  candidates: [],
})

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function classifyFailure(error: unknown): UpstreamStatus {
  if (isAbortError(error)) return 'timeout'
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('timeout') || message.includes('abort')) return 'timeout'
  if (message.includes('parse') || message.includes('json') || message.includes('html')) return 'parse_error'
  return 'http_error'
}

function snapshotSource(snapshot: VerifiedSnapshot): AnswerSource {
  return {
    title: snapshot.sourceTitle,
    department: snapshot.department,
    url: snapshot.sourceUrl,
    publishedAt: null,
    checkedAt: snapshotCheckDate(snapshot.verifiedAt),
  }
}

function snapshotAnswer(snapshot: VerifiedSnapshot, now: Date, upstreamStatus: UpstreamStatus): ResolvedAnswer {
  const stale = Date.parse(`${snapshot.expiresAt}T23:59:59+09:00`) < now.getTime()
  const warning = stale
    ? '공식 사이트를 실시간 확인하지 못해 만료된 마지막 검증본을 표시합니다. 최신 정보는 출처에서 다시 확인하세요.'
    : '공식 사이트를 실시간 확인하지 못해 사전에 검증한 자료를 표시합니다.'

  return {
    status: stale ? 'stale' : 'verified_snapshot',
    title: snapshot.title,
    content: `${warning} ${snapshot.content}`,
    fields: [
      ...snapshot.fields,
      { label: '확인 방식', value: stale ? '오래된 마지막 검증본' : '사전 검증 자료' },
      { label: '마지막 확인일', value: snapshotCheckDate(snapshot.verifiedAt).replaceAll('-', '.') },
    ],
    sources: [snapshotSource(snapshot)],
    search: emptySearch('failed'),
    answerMode: 'snapshot',
    upstreamStatus,
    cacheHit: true,
    lastSuccessfulCheck: snapshotCheckDate(snapshot.verifiedAt),
  }
}

async function runLivePipeline(
  analysis: QuestionAnalysis,
  dependencies: ResolverDependencies,
  signal: AbortSignal,
): Promise<{ search: SearchReport; documents: VerifiedDocument[] }> {
  const searcher = dependencies.searcher ?? searchOfficialSources
  const documentFetcher = dependencies.documentFetcher ?? fetchAndVerifyCandidates

  if (analysis.category === 'academic' && analysis.intent === 'schedule') {
    const search = emptySearch('completed')
    const documents = await documentFetcher(
      search,
      analysis,
      dependencies.fetcher ?? fetch,
      signal,
      dependencies.context,
    )
    return { search, documents }
  }

  const search = await searcher(analysis, {
    fetcher: dependencies.fetcher,
    signal,
    context: dependencies.context,
  })
  const documents = await documentFetcher(
    search,
    analysis,
    dependencies.fetcher ?? fetch,
    signal,
    dependencies.context,
  )
  return { search, documents }
}

export async function resolveAnswer(
  analysis: QuestionAnalysis,
  dependencies: ResolverDependencies = {},
): Promise<ResolvedAnswer> {
  if (!analysis.supported || analysis.ambiguous) {
    const formatted = formatRuleBasedAnswer(analysis, emptySearch(), [])
    return {
      ...formatted,
      status: formatted.status === 'verified' ? 'verified_live' : formatted.status,
      sources: formatted.sources,
      search: emptySearch(),
      answerMode: 'unavailable',
      upstreamStatus: 'skipped',
      cacheHit: false,
      lastSuccessfulCheck: null,
    }
  }

  const controller = new AbortController()
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_LIVE_TIMEOUT_MS
  let rejectOnTimeout: (reason: DOMException) => void = () => undefined
  const timeoutFailure = new Promise<never>((_resolve, reject) => {
    rejectOnTimeout = reject
  })
  const timeout = setTimeout(() => {
    controller.abort('live pipeline timeout')
    rejectOnTimeout(new DOMException(`Live pipeline exceeded ${timeoutMs}ms`, 'AbortError'))
  }, timeoutMs)
  let upstreamStatus: UpstreamStatus = 'ok'
  let search = emptySearch('failed')

  try {
    const live = await Promise.race([
      runLivePipeline(analysis, dependencies, controller.signal),
      timeoutFailure,
    ])
    search = live.search
    const formatted = formatRuleBasedAnswer(analysis, search, live.documents)
    const liveFailed = search.status === 'failed'

    if (formatted.status !== 'not_found' || !liveFailed) {
      return {
        ...formatted,
        status: formatted.status === 'verified' ? 'verified_live' : formatted.status,
        sources: formatted.sources,
        search,
        answerMode: 'live',
        upstreamStatus: 'ok',
        cacheHit: false,
        lastSuccessfulCheck: formatted.sources[0]?.checkedAt ?? null,
      }
    }
    upstreamStatus = 'http_error'
  } catch (error) {
    upstreamStatus = classifyFailure(error)
    console.warn('Live answer pipeline failed', {
      requestId: dependencies.context?.requestId ?? 'untracked',
      upstreamStatus,
      errorCode: error instanceof Error ? error.name : 'UNKNOWN',
    })
  } finally {
    clearTimeout(timeout)
  }

  const repository = dependencies.snapshotRepository ?? staticSnapshotRepository
  const snapshot = await repository.findBest(analysis, analysis.normalizedQuestion)
  if (snapshot) return snapshotAnswer(snapshot, dependencies.now?.() ?? new Date(), upstreamStatus)

  return {
    status: 'upstream_unavailable',
    title: '공식 출처를 현재 확인할 수 없습니다',
    content: '국립순천대학교 공식 사이트에 연결하지 못했고 사전에 검증한 대체 자료도 없습니다. 확인되지 않은 내용은 추측하지 않습니다.',
    fields: [{ label: '확인 상태', value: '공식 출처와 대체 자료 모두 확인 실패' }],
    sources: [],
    search,
    answerMode: 'unavailable',
    upstreamStatus,
    cacheHit: false,
    lastSuccessfulCheck: null,
  }
}
