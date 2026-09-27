import { koreanAcademicTerm } from '../utils/koreanDate'
import {
  CATEGORY_RULES,
  INTENT_LABELS,
  INTENT_RULES,
  type CategoryRule,
  type SupportedCategory,
} from '../config/keywords'
import type { QuestionAnalysis, QuestionCategory, QuestionIntent } from '../shared/api'
import { normalizeQuestion } from '../utils/textNormalizer'

const MIN_SUPPORTED_SCORE = 4
const AMBIGUITY_SCORE_DIFFERENCE = 2
const EXCLUSION_MARKERS = ['말고', '아니라', '제외', '빼고'] as const

const INTENT_SEARCH_TERMS: Partial<Record<QuestionIntent, string>> = {
  schedule: '일정',
  application: '신청',
  hours: '운영시간',
  contact: '연락처',
  procedure: '신청 방법',
  location: '위치',
}

type CategoryScore = {
  rule: CategoryRule
  score: number
  strongMatches: string[]
  relatedMatches: string[]
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function includesKeyword(question: string, keyword: string) {
  return question.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR'))
}

function findDistinctMatches(question: string, keywords: string[]) {
  const matches = keywords
    .filter((keyword) => includesKeyword(question, keyword))
    .sort((left, right) => right.length - left.length)

  return matches.filter(
    (keyword, index) => !matches.slice(0, index).some((longerKeyword) => longerKeyword.includes(keyword)),
  )
}

function scoreCategory(question: string, rule: CategoryRule): CategoryScore {
  const strongMatches = findDistinctMatches(question, rule.strongKeywords)
  const relatedMatches = findDistinctMatches(question, rule.relatedKeywords)

  return {
    rule,
    score: strongMatches.length * 5 + relatedMatches.length * 2,
    strongMatches,
    relatedMatches,
  }
}

function rankCategories(question: string) {
  const scores = CATEGORY_RULES.map((rule) => scoreCategory(question, rule))
  const hasSpecificCategory = scores.some(
    ({ rule, strongMatches }) => rule.id !== 'contact' && strongMatches.length > 0,
  )

  if (hasSpecificCategory) {
    const contact = scores.find(({ rule }) => rule.id === 'contact')
    if (contact) {
      contact.score = Math.min(contact.score, 3)
    }
  }

  return scores.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return CATEGORY_RULES.findIndex((rule) => rule.id === left.rule.id)
      - CATEGORY_RULES.findIndex((rule) => rule.id === right.rule.id)
  })
}

function detectIntent(question: string, category: QuestionCategory): QuestionIntent {
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((pattern) => includesKeyword(question, pattern))) {
      return rule.id
    }
  }

  return category === 'contact' ? 'contact' : 'general'
}

function inferAcademicContext(question: string, now: Date) {
  const explicitYear = question.match(/\b(20\d{2})(?:\s*학년도|\s*년)?\b/)
  const explicitSemester = question.match(/(?:제\s*)?([12])\s*학기/)
  const koreanSemester = question.includes('첫 학기') || question.includes('1학기')
    ? 1
    : question.includes('두 번째 학기') || question.includes('2학기')
      ? 2
      : null
  const currentTerm = koreanAcademicTerm(now)

  let year = explicitYear ? Number(explicitYear[1]) : currentTerm.year
  let semester = (explicitSemester ? Number(explicitSemester[1]) : koreanSemester) as 1 | 2 | null
  let semesterWasExplicit = Boolean(explicitSemester || koreanSemester)

  if (!semester && question.includes('다음 학기')) {
    semesterWasExplicit = true
    if (currentTerm.semester === 1) {
      semester = 2
    } else {
      semester = 1
      year += 1
    }
  }

  if (!semester && (question.includes('지난 학기') || question.includes('이전 학기'))) {
    semesterWasExplicit = true
    if (currentTerm.semester === 2) {
      semester = 1
    } else {
      semester = 2
      year -= 1
    }
  }

  return {
    year,
    semester: semester ?? currentTerm.semester,
    yearWasExplicit: Boolean(explicitYear),
    semesterWasExplicit,
  } as const
}

function detectExcludedKeywords(question: string) {
  const lowerQuestion = question.toLocaleLowerCase('ko-KR')
  const excluded = new Set<string>()

  for (const marker of EXCLUSION_MARKERS) {
    let markerIndex = lowerQuestion.indexOf(marker)
    while (markerIndex >= 0) {
      const beforeMarker = lowerQuestion.slice(0, markerIndex).trimEnd()
      for (const rule of CATEGORY_RULES) {
        for (const keyword of [...rule.strongKeywords, ...rule.relatedKeywords]) {
          const normalizedKeyword = keyword.toLocaleLowerCase('ko-KR')
          if (['', '이', '가', '은', '는', '을', '를'].some(
            (particle) => beforeMarker.endsWith(`${normalizedKeyword}${particle}`),
          )) excluded.add(keyword)
        }
      }
      markerIndex = lowerQuestion.indexOf(marker, markerIndex + marker.length)
    }
  }

  return [...excluded].filter((term) => ![...excluded].some((longer) => longer !== term && longer.includes(term)))
}

function buildSearchKeywords(
  category: CategoryRule,
  intent: QuestionIntent,
  matches: string[],
  context: QuestionAnalysis['context'],
) {
  const intentTerm = INTENT_SEARCH_TERMS[intent]

  return unique([
    ...matches,
    ...category.searchTerms,
    intentTerm ?? '',
    `${context.year}학년도`,
    `${context.semester}학기`,
  ]).slice(0, 7)
}

export function analyzeQuestion(rawQuestion: string, now = new Date()): QuestionAnalysis {
  const question = normalizeQuestion(rawQuestion)
  const hasDayExclusion = /(주말|평일)(?:\s*(?:운영|이용)시간)?\s*(?:말고|아니라|제외|빼고)/.test(question)
  const excludedKeywords = detectExcludedKeywords(question).filter(term => !hasDayExclusion || !['운영시간', '이용시간'].includes(term))
  for (const match of question.matchAll(/(주말|평일)(?:\s*(?:운영|이용)시간)?\s*(?:말고|아니라|제외|빼고)/g)) {
    if (!excludedKeywords.includes(match[1])) excludedKeywords.push(match[1])
  }
  // Remove only the explicitly negated occurrence, preserving shared context and later positive mentions.
  let positiveQuestion = question
  for (const keyword of excludedKeywords) {
    positiveQuestion = positiveQuestion.replace(new RegExp(`${keyword}(?:이|가|은|는|을|를)?\\s*(?:말고|아니라|제외|빼고)`, 'g'), ' ')
  }
  positiveQuestion = positiveQuestion.replace(/(주말|평일)(?:\s*(?:운영|이용)시간)?\s*(?:말고|아니라|제외|빼고)/g, ' ')
  const ranked = rankCategories(positiveQuestion)
  const top = ranked[0]
  const second = ranked[1]
  const supported = Boolean(top && top.score >= MIN_SUPPORTED_SCORE)
  const category: QuestionCategory = supported ? top.rule.id : 'unknown'
  const categoryLabel = supported ? top.rule.label : '지원하지 않는 질문'
  const intent = detectIntent(positiveQuestion, category)
  const context = inferAcademicContext(question, now)
  const scholarshipTopics = ['국가장학금', '주거안정장학금', '교내장학금', '근로장학금', '외부장학금', '교외장학금', '봉사장학금']
  const ambiguous = scholarshipTopics.filter(t => positiveQuestion.includes(t)).length > 1 || Boolean(
    supported
      && second
      && second.score >= MIN_SUPPORTED_SCORE
      && top.score - second.score <= AMBIGUITY_SCORE_DIFFERENCE,
  )
  const matchedKeywords = supported
    ? unique([...top.strongMatches, ...top.relatedMatches])
    : []
  const neutralKeywords = matchedKeywords.filter((term) => ['학기', '일정', '시험', '신청기간', '발급'].includes(term))
  let positiveKeywords = matchedKeywords.filter((term) => !neutralKeywords.includes(term))
  if (/처음\s*발급|최초\s*발급|신규\s*발급/.test(positiveQuestion)) positiveKeywords = ['최초 발급']
  const searchKeywords = supported
    ? buildSearchKeywords(top.rule, intent, matchedKeywords, context)
    : []

  let confidence: QuestionAnalysis['confidence'] = 'low'
  const hasSpecificIntent = intent !== 'general'
  if (supported && !ambiguous && (top.score >= 7 || (top.strongMatches.length > 0 && hasSpecificIntent))) {
    confidence = 'high'
  } else if (supported && !ambiguous) {
    confidence = 'medium'
  }

  return {
    normalizedQuestion: question,
    excludedKeywords,
    positiveKeywords,
    neutralKeywords,
    positiveQuestion,
    category,
    categoryLabel,
    intent,
    intentLabel: INTENT_LABELS[intent],
    confidence,
    supported,
    ambiguous,
    matchedKeywords,
    searchKeywords,
    alternatives: ranked
      .filter(({ rule, score }) => rule.id !== category && score > 0)
      .slice(0, 2)
      .map(({ rule, score }) => ({
        category: rule.id as SupportedCategory,
        categoryLabel: rule.label,
        score,
      })),
    context,
  }
}
