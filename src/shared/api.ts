export const CHAT_QUESTION_MAX_LENGTH = 160
export const CHAT_QUESTION_MIN_LENGTH = 2

export type ChatStatus =
  | 'pending'
  | 'verified_live'
  | 'verified_snapshot'
  | 'stale'
  | 'conflicting'
  | 'not_found'
  | 'upstream_unavailable'

export type UpstreamStatus = 'ok' | 'timeout' | 'http_error' | 'parse_error' | 'skipped'

export type ResponseMeta = {
  requestId: string
  processedAt: string
  answerMode: 'live' | 'snapshot' | 'unavailable'
  durationMs: number
  upstreamStatus: UpstreamStatus
  cacheHit: boolean
  lastSuccessfulCheck: string | null
}

export type QuestionCategory =
  | 'academic'
  | 'scholarship'
  | 'library'
  | 'student_support'
  | 'contact'
  | 'unknown'

export type QuestionIntent =
  | 'schedule'
  | 'application'
  | 'hours'
  | 'contact'
  | 'procedure'
  | 'location'
  | 'general'

export type QuestionAnalysis = {
  normalizedQuestion: string
  excludedKeywords: string[]
  positiveKeywords: string[]
  neutralKeywords: string[]
  positiveQuestion: string
  category: QuestionCategory
  categoryLabel: string
  intent: QuestionIntent
  intentLabel: string
  confidence: 'high' | 'medium' | 'low'
  supported: boolean
  ambiguous: boolean
  matchedKeywords: string[]
  searchKeywords: string[]
  alternatives: Array<{
    category: Exclude<QuestionCategory, 'unknown'>
    categoryLabel: string
    score: number
  }>
  context: {
    year: number
    semester: 1 | 2
    yearWasExplicit: boolean
    semesterWasExplicit: boolean
  }
}

export type ChatRequest = {
  question: string
}

export type AnswerField = {
  label: string
  value: string
}

export type AnswerSource = {
  title: string
  department: string | null
  url: string
  publishedAt: string | null
  checkedAt: string
}

export type SearchCandidate = {
  sourceId: string
  sourceName: string
  title: string
  department: string | null
  url: string
  publishedAt: string | null
  relevanceScore: number
  matchedKeywords: string[]
}

export type SearchReport = {
  status: 'completed' | 'partial' | 'skipped' | 'failed'
  queriedSources: string[]
  failedSources: Array<{
    sourceId: string
    reason: string
  }>
  candidates: SearchCandidate[]
}

export type ChatSuccessResponse = {
  ok: true
  status: ChatStatus
  question: string
  analysis: QuestionAnalysis
  search: SearchReport
  answer: {
    title: string
    content: string
    fields: AnswerField[]
  }
  sources: AnswerSource[]
  meta: ResponseMeta
}

export type ApiErrorCode =
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_JSON'
  | 'INVALID_QUESTION'
  | 'QUESTION_TOO_SHORT'
  | 'QUESTION_TOO_LONG'
  | 'PAYLOAD_TOO_LARGE'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

export type ApiErrorResponse = {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
  }
  meta: {
    requestId: string
    processedAt: string
  }
}

export type ChatResponse = ChatSuccessResponse | ApiErrorResponse

export type HealthResponse = {
  status: 'ok'
  service: 'SCNU Campus Assistant API'
  appVersion: string
  releaseId: string
  commitSha: string
  builtAt: string
  timestamp: string
}
