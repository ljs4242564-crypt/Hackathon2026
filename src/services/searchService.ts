import { containsExcluded, matchesPositive } from './topicPolicy'
import {
  OFFICIAL_SEARCH_SOURCES,
  SEARCH_LIMITS,
  type BoardSource,
  type OfficialSearchSource,
  type SearchableCategory,
} from '../config/sources'
import type { QuestionAnalysis, SearchCandidate, SearchReport } from '../shared/api'
import type { RequestContext } from '../types/pipeline'
import { readResponseText, validateOfficialUrl, safeFetchOfficial } from '../utils/domainValidator'
import { parseScnuBoardList, type ParsedBoardItem } from './boardParser'

export type SearchDependencies = {
  fetcher?: typeof fetch
  signal?: AbortSignal
  context?: RequestContext
}

function includesKeyword(value: string, keyword: string) {
  return value.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR'))
}

function selectSources(analysis: QuestionAnalysis) {
  const category = analysis.category as SearchableCategory
  const categorySources = OFFICIAL_SEARCH_SOURCES
    .filter((source) => source.categories.includes(category))
    .filter((source) => source.id !== 'department-directory' || analysis.intent === 'contact')
    .sort((left, right) => right.priority - left.priority)

  const triggered = categorySources.filter(
    (source) => source.kind === 'board'
      && source.triggerKeywords?.some((keyword) => analysis.matchedKeywords.some((matched) => includesKeyword(matched, keyword))),
  )

  if (triggered.length > 0) {
    const staticSources = categorySources.filter((source) => source.kind === 'static')
    return [...triggered, ...staticSources].slice(0, SEARCH_LIMITS.maxSourcesPerQuestion)
  }

  return categorySources.slice(0, SEARCH_LIMITS.maxSourcesPerQuestion)
}

function buildSearchTerms(analysis: QuestionAnalysis) {
  const primaryTerm = analysis.positiveKeywords
    .filter((keyword) => !['학기', '일정', '신청', '문의', '전화'].includes(keyword))
    .sort((left, right) => right.length - left.length)[0]
    ?? analysis.categoryLabel

  return [...new Set([primaryTerm, analysis.categoryLabel])]
    .slice(0, SEARCH_LIMITS.maxQueriesPerSource)
}

function scoreCandidate(item: ParsedBoardItem, analysis: QuestionAnalysis) {
  if (containsExcluded(item.title, analysis) && !matchesPositive(item.title, analysis)) {
    return { score: -1, matchedKeywords: [] }
  }
  const searchableText = `${item.title} ${item.department ?? ''}`
  const matchedKeywords = analysis.searchKeywords.filter((keyword) => includesKeyword(searchableText, keyword))
  const coreKeywords = analysis.matchedKeywords.filter(
    (keyword) => !['학기', '일정', '신청', '문의', '전화', '도서'].includes(keyword),
  )
  let score = 0

  for (const keyword of matchedKeywords) {
    score += coreKeywords.includes(keyword) ? 6 : 1
  }

  const titleYear = item.title.match(/20\d{2}/)?.[0]
  const publishedYear = item.publishedAt?.slice(0, 4)
  const candidateYear = titleYear ?? publishedYear
  if (candidateYear === String(analysis.context.year)) {
    score += 12
  } else if (candidateYear) {
    score -= Math.min(10, Math.abs(Number(candidateYear) - analysis.context.year) * 3 + 2)
  }

  if (includesKeyword(item.title, analysis.categoryLabel)) score += 2
  if (includesKeyword(item.title, `${analysis.context.semester}학기`)) score += 3
  if (item.department) score += 1
  if (/OCU|학점교류|교과목|특강|대학원|수학 안내/.test(item.title)) score -= 12

  return { score, matchedKeywords }
}

function staticCandidate(source: Extract<OfficialSearchSource, { kind: 'static' }>, analysis: QuestionAnalysis): SearchCandidate {
  const searchableText = `${source.title} ${source.tags.join(' ')}`
  const matchedKeywords = analysis.searchKeywords.filter((keyword) => includesKeyword(searchableText, keyword))

  return {
    sourceId: source.id,
    sourceName: source.name,
    title: source.title,
    department: source.department,
    url: source.url,
    publishedAt: null,
    relevanceScore: source.priority + matchedKeywords.length * 3,
    matchedKeywords,
  }
}

async function fetchBoard(
  source: BoardSource,
  searchTerm: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
  context?: RequestContext,
): Promise<ParsedBoardItem[]> {
  if (!validateOfficialUrl(source.url).valid) {
    throw new Error('등록된 공식 출처 URL이 안전하지 않습니다.')
  }

  const requestUrl = new URL(source.url)
  requestUrl.searchParams.set('mi', source.menuId)
  requestUrl.searchParams.set('bbsId', source.boardId)
  requestUrl.searchParams.set('listCo', '10')
  requestUrl.searchParams.set('searchType', 'all')
  requestUrl.searchParams.set('searchValue', searchTerm)

  const { response, finalUrl } = await safeFetchOfficial(requestUrl, {
      method: 'GET',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Referer: `${source.url}?bbsId=${source.boardId}&mi=${source.menuId}`,
        'User-Agent': 'Mozilla/5.0 (compatible; SCNUCampusAssistant/0.5; +https://www.scnu.ac.kr/)',
      },
    }, fetcher, context)

  if (!response.ok) {
    throw new Error(`공식 게시판 응답 오류(${response.status})`)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/html')) {
    throw new Error('공식 게시판이 HTML 문서를 반환하지 않았습니다.')
  }

  const html = await readResponseText(response, SEARCH_LIMITS.maxHtmlCharacters)

  return parseScnuBoardList(html, finalUrl.toString(), source.name)
}

export async function searchOfficialSources(
  analysis: QuestionAnalysis,
  dependencies: SearchDependencies = {},
): Promise<SearchReport> {
  if (!analysis.supported || analysis.ambiguous || analysis.category === 'unknown') {
    return {
      status: 'skipped',
      queriedSources: [],
      failedSources: [],
      candidates: [],
    }
  }

  const selectedSources = selectSources(analysis)
  if (selectedSources.length === 0) {
    return {
      status: 'failed',
      queriedSources: [],
      failedSources: [],
      candidates: [],
    }
  }

  const fetcher = dependencies.fetcher ?? fetch
  const searchTerms = buildSearchTerms(analysis)
  const candidates: SearchCandidate[] = []
  const failedSources: SearchReport['failedSources'] = []
  const sourceStartedAt = new Map<string, number>()

  const results = await Promise.allSettled(
    selectedSources.map(async (source) => {
      sourceStartedAt.set(source.id, Date.now())
      if (!validateOfficialUrl(source.url).valid) {
        throw new Error('등록된 출처가 공식 호스트 검사를 통과하지 못했습니다.')
      }

      if (source.kind === 'static') {
        return [staticCandidate(source, analysis)]
      }

      const pages = await Promise.all(
        searchTerms.map((searchTerm) => fetchBoard(
          source,
          searchTerm,
          fetcher,
          dependencies.signal,
          { ...dependencies.context, requestId: dependencies.context?.requestId ?? 'untracked', sourceId: source.id },
        )),
      )
      return pages.flat().map((item) => {
        const relevance = scoreCandidate(item, analysis)
        return {
          sourceId: source.id,
          sourceName: source.name,
          title: item.title,
          department: item.department,
          url: item.url,
          publishedAt: item.publishedAt,
          relevanceScore: relevance.score,
          matchedKeywords: relevance.matchedKeywords,
        } satisfies SearchCandidate
      })
    }),
  )

  results.forEach((result, index) => {
    const sourceId = selectedSources[index].id
    const durationMs = Date.now() - (sourceStartedAt.get(sourceId) ?? Date.now())
    if (result.status === 'fulfilled') {
      candidates.push(...result.value)
      console.info('Official source search completed', {
        requestId: dependencies.context?.requestId ?? 'untracked',
        sourceId,
        durationMs,
        parserResultCount: result.value.length,
      })
    } else {
      console.warn('Official source search failed', {
        requestId: dependencies.context?.requestId ?? 'untracked',
        sourceId,
        durationMs,
        parserResultCount: 0,
        errorCode: result.reason instanceof Error ? result.reason.name : 'UNKNOWN',
      })
      failedSources.push({
        sourceId,
        reason: '공식 출처 검색에 실패했습니다.',
      })
    }
  })

  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()]
    .filter((candidate) => candidate.relevanceScore > 0)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore
      return (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
    })
    .slice(0, SEARCH_LIMITS.maxCandidatesPerResponse)

  const status: SearchReport['status'] = failedSources.length === 0
    ? 'completed'
    : uniqueCandidates.length > 0
      ? 'partial'
      : 'failed'

  return {
    status,
    queriedSources: selectedSources.map((source) => source.id),
    failedSources,
    candidates: uniqueCandidates,
  }
}
