import type { QuestionAnalysis } from '../shared/api'

// Canonical topics are shared by queries, calendar items, evidence and final output.
export function canonicalTopic(value: string) {
  return value.toLocaleLowerCase('ko-KR').replace(/중간시험/g, '중간고사')
    .replace(/기말시험/g, '기말고사').replace(/교외장학금/g, '외부장학금')
    .replace(/(?:처음|신규)\s*발급/g, '최초발급').replace(/\s+/g, '')
}

export function containsExcluded(value: string, analysis: QuestionAnalysis) {
  const text = canonicalTopic(value)
  return analysis.excludedKeywords.some((term) => text.includes(canonicalTopic(term)))
}

export function matchesPositive(value: string, analysis: QuestionAnalysis) {
  const topics = analysis.positiveKeywords ?? analysis.matchedKeywords
  return topics.length > 0 && topics.some((term) => canonicalTopic(value).includes(canonicalTopic(term)))
}

export function acceptsEvidence(value: string, analysis: QuestionAnalysis) {
  return !containsExcluded(value, analysis) && matchesScope(value, analysis)
    && matchesPositive(value, analysis)
}

export function evidenceUnits(value: string) {
  // Do not split decimal dates. Mixed-topic units that cannot be separated are rejected.
  return value.split(/\n+|;|(?<=[.!?])\s+(?=[가-힣])/).map((unit) => unit.trim()).filter(Boolean)
}

// Scope dimensions apply to positive requests and to individual evidence units.
export function requestedScope(analysis: QuestionAnalysis) {
  const text = canonicalTopic(analysis.positiveQuestion ?? analysis.normalizedQuestion)
  return {
    day: text.includes('평일') ? '평일' : text.includes('주말') ? '주말' : null,
    round: text.match(/([12])차/)?.[1] ?? null,
    procedure: text.includes('최초발급') ? '최초발급' : text.includes('재발급') ? '재발급' : null,
  }
}

export function matchesScope(value: string, analysis: QuestionAnalysis) {
  const text = canonicalTopic(value)
  const scope = requestedScope(analysis)
  for (const [requested, other] of [[scope.day, scope.day === '평일' ? '주말' : '평일'],
    [scope.procedure, scope.procedure === '최초발급' ? '재발급' : '최초발급']] as const) {
    if (requested && (!text.includes(requested) || text.includes(other))) return false
  }
  if (scope.round && (!text.includes(`${scope.round}차`) || text.includes(`${scope.round === '1' ? '2' : '1'}차`))) return false
  const topics = ['국가장학금','주거안정장학금','교내장학금','근로장학금','외부장학금','봉사장학금']
  const requested = topics.filter(t => canonicalTopic(analysis.positiveQuestion).includes(t))
  if (requested.length > 1) return false
  if (requested.length && (!text.includes(requested[0]) || topics.some(t => t !== requested[0] && text.includes(t)))) return false
  return true
}

export function matchesApplicationTerm(value: string, analysis: QuestionAnalysis) {
  if (analysis.category !== 'scholarship' || !['application','schedule'].includes(analysis.intent)) return true
  const years = [...value.matchAll(/(20\d{2})\s*(?:학년도|년)/g)].map(m => Number(m[1]))
  const semesters = [...value.matchAll(/(?:제\s*)?([12])\s*학기/g)].map(m => Number(m[1]))
  return years.length > 0 && semesters.length > 0
    && years.every(y => y === analysis.context.year) && semesters.every(s => s === analysis.context.semester)
}
