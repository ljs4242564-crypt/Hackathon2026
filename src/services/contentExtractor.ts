import { acceptsEvidence, containsExcluded, evidenceUnits, matchesApplicationTerm, matchesScope } from './topicPolicy'
import { DomUtils, ElementType, parseDocument } from 'htmlparser2'
import type { AnyNode, Element } from 'domhandler'
import type { QuestionAnalysis, SearchCandidate } from '../shared/api'
import type { ExtractedInformation, VerifiedDocument } from '../types/pipeline'

function isElement(node: AnyNode): node is Element {
  return node.type === ElementType.Tag
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function normalizeDate(year: string, month: string, day: string) {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function extractDates(text: string, fallbackYear: number) {
  const dates: string[] = []
  const fullDate = /(20\d{2})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|[.\/-])\s*(\d{1,2})\s*(?:일)?/g
  const abbreviatedDate = /(?:^|[^\d])(?:['’])?(\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})(?:\.|\D|$)/g
  const shortDate = /(?<!\d)(\d{1,2})\s*(?:월|[.\/])\s*(\d{1,2})\s*(?:일)?/g

  for (const match of text.matchAll(fullDate)) {
    const value = normalizeDate(match[1], match[2], match[3])
    if (value) dates.push(value)
  }
  for (const match of text.matchAll(abbreviatedDate)) {
    const value = normalizeDate(`20${match[1]}`, match[2], match[3])
    if (value && !dates.includes(value)) dates.push(value)
  }
  for (const match of text.matchAll(shortDate)) {
    const value = normalizeDate(String(fallbackYear), match[1], match[2])
    if (value && !dates.includes(value)) dates.push(value)
  }
  return dates.slice(0, 10)
}

export function extractStructuredInformation(text: string, fallbackYear: number): ExtractedInformation {
  const dates = extractDates(text, fallbackYear)
  const phones = [...new Set(text.match(/(?:0\d{1,2}[-)]?\s*)?\d{3,4}[-)]\d{4}/g) ?? [])]
    .map((value) => value.replace(/\s+/g, '').replace(')', '-'))
    .slice(0, 8)
  const hours = [...new Set(text.match(/(?:오전|오후)?\s*\d{1,2}(?::\d{2}|시)(?:\s*~\s*(?:오전|오후)?\s*\d{1,2}(?::\d{2}|시))?/g) ?? [])]
    .map((value) => cleanText(value))
    .slice(0, 8)
  const locations = text
    .split('\n')
    .map(cleanText)
    .filter((line) => /(?:장소|위치|방문)\s*[:：]/.test(line))
    .slice(0, 5)

  return {
    startDate: dates[0] ?? null,
    endDate: dates[1] ?? dates[0] ?? null,
    dates,
    phones,
    hours,
    locations,
  }
}

function collectContentLines(html: string) {
  const document = parseDocument(html, { decodeEntities: true })
  const imgAlt = DomUtils.getElementById('imgAlt', document.children)
  const roots: AnyNode[] = imgAlt ? [imgAlt] : document.children
  const blocks = DomUtils.findAll(
    (node) => isElement(node) && ['p', 'li', 'tr', 'dd'].includes(node.name),
    roots,
  )

  return [...new Set(blocks
    .filter((block) => !DomUtils.hasAttrib(block, 'aria-hidden'))
    .map((block) => cleanText(DomUtils.textContent(block)))
    .filter((line) => line.length >= 2 && line.length <= 1_500))]
}

function relevantLines(lines: string[], analysis: QuestionAnalysis) {
  const keywords = [...analysis.matchedKeywords, analysis.categoryLabel]
  return lines.flatMap(evidenceUnits)
    .filter((line) => acceptsEvidence(line, analysis))
    .map((line) => {
      let score = keywords.reduce((total, keyword) => total + (line.includes(keyword) ? 1 : 0), 0)
      if (analysis.intent === 'contact' && /(?:0\d{1,2}[-)]?\s*)?\d{3,4}[-)]\d{4}/.test(line)) score += 2
      if (analysis.intent === 'hours' && /\d{1,2}(?::\d{2}|시)/.test(line)) score += 2
      if (analysis.intent === 'location' && /장소|위치|방문/.test(line)) score += 2
      return { line, score }
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ line }) => line)
}

export function extractOfficialDocument(
  html: string,
  candidate: SearchCandidate,
  analysis: QuestionAnalysis,
  finalUrl: string,
  checkedAt: string,
): VerifiedDocument {
  const lines = collectContentLines(html)
  if (lines.length === 0) throw new Error('parse_error: no readable content blocks')
  const evidence = relevantLines(lines, analysis).filter(line => matchesApplicationTerm(`${candidate.title} ${line}`, analysis))
  const content = cleanText(evidence.join('\n'))
  const extracted = extractStructuredInformation(content, analysis.context.year)
  const relevant = evidence.length > 0 && (
    extracted.dates.length > 0
    || extracted.phones.length > 0
    || extracted.hours.length > 0
    || content.length >= 20
  )

  return {
    candidate,
    finalUrl,
    title: (containsExcluded(candidate.title, analysis) || !matchesScope(candidate.title, analysis)) ? `${analysis.positiveKeywords.join(' · ')} 공식 안내` : candidate.title,
    department: candidate.department,
    publishedAt: candidate.publishedAt,
    checkedAt,
    content,
    evidence,
    extracted,
    relevant,
  }
}
