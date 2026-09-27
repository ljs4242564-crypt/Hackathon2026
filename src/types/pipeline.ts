import type { QuestionAnalysis, SearchCandidate } from '../shared/api'

export type RequestContext = {
  requestId: string
  sourceId?: string
}

export type ExtractedInformation = {
  startDate: string | null
  endDate: string | null
  dates: string[]
  phones: string[]
  hours: string[]
  locations: string[]
}

export type VerifiedDocument = {
  candidate: SearchCandidate
  finalUrl: string
  title: string
  department: string | null
  publishedAt: string | null
  checkedAt: string
  content: string
  evidence: string[]
  extracted: ExtractedInformation
  relevant: boolean
}

export type PipelineResult = {
  status: 'verified' | 'conflicting' | 'not_found'
  title: string
  content: string
  fields: Array<{ label: string; value: string }>
  documents: VerifiedDocument[]
}

export type ExtractionContext = {
  analysis: QuestionAnalysis
  checkedAt: string
}
