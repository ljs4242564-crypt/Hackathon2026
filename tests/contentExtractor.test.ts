import { describe, expect, it } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { extractOfficialDocument, extractStructuredInformation } from '../src/services/contentExtractor'
import type { SearchCandidate } from '../src/shared/api'

const now = new Date('2026-09-19T00:00:00.000Z')

describe('extractStructuredInformation', () => {
  it('날짜 범위, 시간, 전화번호를 구조화한다', () => {
    const result = extractStructuredInformation(
      '신청기간 2026.10.19. ~ 2026.10.23. 운영시간 09:00 ~ 18:00 문의 061-750-3061',
      2026,
    )
    expect(result.startDate).toBe('2026-10-19')
    expect(result.endDate).toBe('2026-10-23')
    expect(result.hours).toContain('09:00 ~ 18:00')
    expect(result.phones).toContain('061-750-3061')
  })

  it('두 자리 연도를 월로 잘못 해석하지 않는다', () => {
    const result = extractStructuredInformation(
      '국가장학금 2차 신청 ’26. 8. 12.(수) 9시 ~ 9. 9.(수) 18시',
      2026,
    )

    expect(result.dates).not.toContain('2026-26-08')
    expect(result.dates).toContain('2026-08-12')
    expect(result.dates).toContain('2026-09-09')
  })

  it('전화번호가 있는 조직도 행을 연락처 근거로 선택한다', () => {
    const candidate: SearchCandidate = {
      sourceId: 'directory', sourceName: '전화번호 안내', title: '학생지원과 전화번호',
      department: '학생지원과', url: 'https://www.scnu.ac.kr/SCNU/og/organiz/selectOrganizList.do?menuCode=A&mi=1214',
      publishedAt: null, relevanceScore: 100, matchedKeywords: ['전화번호'],
    }
    const document = extractOfficialDocument(
      '<main><table><tr><th>부서명</th><th>주요업무</th><th>전화번호</th></tr><tr><td>학생지원과</td><td>장학 업무</td><td>061-750-3061</td></tr></table></main>',
      candidate,
      analyzeQuestion('학생지원과 전화번호 알려줘', now),
      candidate.url,
      '2026-09-19',
    )

    expect(document.relevant).toBe(true)
    expect(document.extracted.phones).toContain('061-750-3061')
  })
})
