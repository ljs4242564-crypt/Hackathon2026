import { acceptsEvidence, containsExcluded, requestedScope } from './topicPolicy'
import { VERIFIED_SNAPSHOTS, type VerifiedSnapshot } from '../data/verifiedSnapshots'
import type { QuestionAnalysis } from '../shared/api'

export interface SnapshotRepository {
  findBest(analysis: QuestionAnalysis, normalizedQuestion: string): Promise<VerifiedSnapshot | null>
}

function normalizeMatchTerm(value: string) {
  return value.toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim()
}

function matchesAcademicTerm(
  snapshot: VerifiedSnapshot,
  analysis: QuestionAnalysis,
) {
  if (!snapshot.academicTerm) return true

  return (
    snapshot.academicTerm.year === analysis.context.year
    && snapshot.academicTerm.semester === analysis.context.semester
  )
}

function matchesRule(
  snapshot: VerifiedSnapshot,
  analysis: QuestionAnalysis,
  normalizedQuestion: string,
) {
  if (!snapshot.match.intents.includes(analysis.intent)) return false
  if (!matchesAcademicTerm(snapshot, analysis)) return false
  const round = requestedScope(analysis).round
  if (round && Number(round) !== snapshot.applicationRound) return false

  const snapshotText = [snapshot.title, snapshot.content, snapshot.sourceTitle,
    ...snapshot.fields.map((field) => `${field.label} ${field.value}`)].join(' ')
  if (!acceptsEvidence(snapshotText, analysis)) return false
  const question = normalizeMatchTerm(analysis.positiveQuestion ?? normalizedQuestion)
  const analysisTerms = new Set(
    [...analysis.matchedKeywords, ...analysis.searchKeywords].map(normalizeMatchTerm),
  )
  const excludedTerms = new Set(analysis.excludedKeywords.map(normalizeMatchTerm))
  const hasTerm = (term: string) => {
    const normalizedTerm = normalizeMatchTerm(term)
    return !containsExcluded(term, analysis) && (analysisTerms.has(normalizedTerm) || question.includes(normalizedTerm))
  }
  const wasExcluded = (term: string) => excludedTerms.has(normalizeMatchTerm(term))

  if (snapshot.match.excluded?.some(hasTerm)) return false
  if (snapshot.match.requiredAll?.some((term) => !hasTerm(term) || wasExcluded(term))) return false
  if (snapshot.match.requiredAny && !snapshot.match.requiredAny.some(
    (term) => hasTerm(term) && !wasExcluded(term),
  )) return false

  return true
}

export class StaticSnapshotRepository implements SnapshotRepository {
  constructor(private readonly snapshots: VerifiedSnapshot[] = VERIFIED_SNAPSHOTS) {}

  async findBest(analysis: QuestionAnalysis, normalizedQuestion: string) {
    if (!analysis.supported || analysis.ambiguous) return null

    return this.snapshots.find(
      (snapshot) => snapshot.category === analysis.category
        && matchesRule(snapshot, analysis, normalizedQuestion),
    ) ?? null
  }
}

export const staticSnapshotRepository = new StaticSnapshotRepository()
