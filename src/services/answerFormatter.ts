import { acceptsEvidence, containsExcluded, matchesApplicationTerm } from './topicPolicy'
import type { AnswerSource, QuestionAnalysis, SearchReport } from '../shared/api'
import type { PipelineResult, VerifiedDocument } from '../types/pipeline'

function displayDate(value: string | null) {
  return value?.replaceAll('-', '.') ?? '확인되지 않음'
}

function sourceFromDocument(document: VerifiedDocument): AnswerSource {
  return {
    title: document.title,
    department: document.department,
    url: document.finalUrl,
    publishedAt: document.publishedAt,
    checkedAt: document.checkedAt,
  }
}

function comparableValue(document: VerifiedDocument, analysis: QuestionAnalysis) {
  if (analysis.intent === 'contact') return document.extracted.phones[0] ?? null
  if (analysis.intent === 'hours') return document.extracted.hours[0] ?? null
  if (analysis.intent === 'schedule' || analysis.intent === 'application') {
    return document.extracted.startDate
      ? `${document.extracted.startDate}/${document.extracted.endDate ?? document.extracted.startDate}`
      : null
  }
  return null
}

function normalizedTitle(value: string) {
  return value.replace(/20\d{2}|제?[12]학기|공지|안내|\s|\[|\]|\(|\)/g, '')
}

function hasConflict(documents: VerifiedDocument[], analysis: QuestionAnalysis) {
  if (documents.length < 2) return false
  for (let leftIndex = 0; leftIndex < documents.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < documents.length; rightIndex += 1) {
      const left = documents[leftIndex]
      const right = documents[rightIndex]
      const leftValue = comparableValue(left, analysis)
      const rightValue = comparableValue(right, analysis)
      if (!leftValue || !rightValue || leftValue === rightValue) continue
      const leftTitle = normalizedTitle(left.title)
      const rightTitle = normalizedTitle(right.title)
      if (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle)) return true
    }
  }
  return false
}

function verifiedFields(document: VerifiedDocument, analysis: QuestionAnalysis) {
  const fields: Array<{ label: string; value: string }> = []
  const { extracted } = document

  if (analysis.intent === 'schedule' || analysis.intent === 'application') {
    fields.push({
      label: analysis.intent === 'application' ? '신청기간' : '기간',
      value: extracted.startDate
        ? `${displayDate(extracted.startDate)}${extracted.endDate && extracted.endDate !== extracted.startDate ? ` ~ ${displayDate(extracted.endDate)}` : ''}`
        : '본문에서 명확한 기간을 추출하지 못함',
    })
  }
  if (analysis.intent === 'hours' && extracted.hours.length > 0) {
    fields.push({ label: '운영시간', value: extracted.hours.join(' · ') })
  }
  if (analysis.intent === 'contact' && extracted.phones.length > 0) {
    fields.push({ label: '전화번호', value: extracted.phones.join(' · ') })
  }
  if (extracted.locations.length > 0) {
    fields.push({ label: '장소', value: extracted.locations[0] })
  }
  if (document.department) fields.push({ label: '담당', value: document.department })
  fields.push({ label: '게시일', value: displayDate(document.publishedAt) })
  fields.push({ label: '확인일', value: displayDate(document.checkedAt) })
  return fields
}

export function formatRuleBasedAnswer(
  analysis: QuestionAnalysis,
  search: SearchReport,
  documents: VerifiedDocument[],
): PipelineResult & { sources: AnswerSource[] } {
  const relevantDocuments = documents.filter((document) => document.relevant
    && acceptsEvidence(document.evidence[0] || document.content, analysis)
    && document.evidence.every(unit => acceptsEvidence(unit, analysis))
    && matchesApplicationTerm(`${document.title} ${document.content}`, analysis)
    && !containsExcluded([document.title, document.content, ...document.evidence,
      ...document.extracted.locations].join(' '), analysis))

  if (!analysis.supported || analysis.ambiguous || relevantDocuments.length === 0) {
    return {
      status: 'not_found',
      title: analysis.ambiguous ? '질문을 한 분야로 좁혀주세요' : '공식 홈페이지에서 정확한 정보를 확인하지 못했습니다',
      content: search.status === 'failed'
        ? '국립순천대학교 공식 출처에 접속하는 과정에서 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : '다른 표현으로 다시 검색하거나 관련 부서에 문의해 주세요. 확인되지 않은 정보는 추측해서 제공하지 않습니다.',
      fields: [
        { label: '확인 상태', value: '공식 원문에서 답변 근거를 찾지 못함' },
        { label: '검색 후보', value: `${search.candidates.length}건` },
      ],
      documents: [],
      sources: [],
    }
  }

  if (hasConflict(relevantDocuments, analysis)) {
    return {
      status: 'conflicting',
      title: '서로 다른 공식 정보가 확인되었습니다',
      content: '공식 자료 사이에 서로 다른 값이 있습니다. 최신 공지 또는 담당 부서에 직접 확인하는 것을 권장합니다.',
      fields: relevantDocuments.slice(0, 2).map((document, index) => ({
        label: `자료 ${String.fromCharCode(65 + index)}`,
        value: `${document.title} — ${comparableValue(document, analysis) ?? '본문 확인 필요'}`,
      })),
      documents: relevantDocuments.slice(0, 2),
      sources: relevantDocuments.slice(0, 2).map(sourceFromDocument),
    }
  }

  const best = relevantDocuments[0]
  const evidence = best.evidence[0] || best.content
  return {
    status: 'verified',
    title: best.title,
    content: evidence.length > 500 ? `${evidence.slice(0, 497)}...` : evidence,
    fields: verifiedFields(best, analysis),
    documents: [best],
    sources: [sourceFromDocument(best)],
  }
}
