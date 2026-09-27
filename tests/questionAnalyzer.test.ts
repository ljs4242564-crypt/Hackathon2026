import { describe, expect, it } from 'vitest'
import { analyzeQuestion } from '../src/services/questionAnalyzer'
import { normalizeQuestion } from '../src/utils/textNormalizer'

const secondSemester = new Date('2026-09-19T00:00:00.000Z')

describe('normalizeQuestion', () => {
  it('공백, 제어문자, 반복 문장부호를 정리한다', () => {
    expect(normalizeQuestion('  중간고사\n 언제야???  ')).toBe('중간고사 언제야?')
  })
})

describe('analyzeQuestion', () => {
  it('중간고사 질문을 학사일정과 일정 문의로 분류한다', () => {
    const result = analyzeQuestion('이번 학기 중간고사 언제야?', secondSemester)

    expect(result.category).toBe('academic')
    expect(result.intent).toBe('schedule')
    expect(result.supported).toBe(true)
    expect(result.ambiguous).toBe(false)
    expect(result.context).toEqual({
      year: 2026,
      semester: 2,
      yearWasExplicit: false,
      semesterWasExplicit: false,
    })
    expect(result.searchKeywords).toContain('중간고사')
    expect(result.searchKeywords).toContain('학사일정')
    expect(result.searchKeywords).toContain('2026학년도')
    expect(result.searchKeywords).toContain('2학기')
  })

  it('장학금 신청 기간 질문을 장학금과 신청 문의로 분류한다', () => {
    const result = analyzeQuestion('국가장학금 신청 기간 알려줘', secondSemester)

    expect(result.category).toBe('scholarship')
    expect(result.intent).toBe('application')
    expect(result.confidence).toBe('high')
  })

  it('도서관 운영시간 질문을 도서관과 운영시간 문의로 분류한다', () => {
    const result = analyzeQuestion('도서관은 주말에 몇 시까지 운영해?', secondSemester)

    expect(result.category).toBe('library')
    expect(result.intent).toBe('hours')
    expect(result.searchKeywords).toContain('운영시간')
  })

  it('학생증 재발급 질문을 학생지원과 방법 문의로 분류한다', () => {
    const result = analyzeQuestion('학생증 재발급은 어떻게 해?', secondSemester)

    expect(result.category).toBe('student_support')
    expect(result.intent).toBe('procedure')
  })

  it('다른 업무 키워드가 있으면 연락처를 질문 의도로 처리한다', () => {
    const result = analyzeQuestion('장학금 문의 전화번호 알려줘', secondSemester)

    expect(result.category).toBe('scholarship')
    expect(result.intent).toBe('contact')
    expect(result.alternatives.some((item) => item.category === 'contact')).toBe(true)
  })

  it('전화번호만 묻는 질문은 부서 연락처로 분류한다', () => {
    const result = analyzeQuestion('학사지원과 전화번호 알려줘', secondSemester)

    expect(result.category).toBe('contact')
    expect(result.intent).toBe('contact')
  })

  it('명시한 연도와 학기를 검색 문맥에 반영한다', () => {
    const result = analyzeQuestion('2025학년도 1학기 학사일정 알려줘', secondSemester)

    expect(result.context).toEqual({
      year: 2025,
      semester: 1,
      yearWasExplicit: true,
      semesterWasExplicit: true,
    })
  })

  it('다음 학기를 연도 경계까지 계산한다', () => {
    const result = analyzeQuestion('다음 학기 수강신청 언제야?', secondSemester)

    expect(result.context.year).toBe(2027)
    expect(result.context.semester).toBe(1)
  })

  it('서로 다른 분야 점수가 같으면 모호한 질문으로 표시한다', () => {
    const result = analyzeQuestion('장학금이랑 도서관 정보 알려줘', secondSemester)

    expect(result.supported).toBe(true)
    expect(result.ambiguous).toBe(true)
    expect(result.confidence).toBe('low')
  })

  it('지원 범위 밖의 질문은 검색 키워드를 만들지 않는다', () => {
    const result = analyzeQuestion('오늘 순천 날씨 어때?', secondSemester)

    expect(result.category).toBe('unknown')
    expect(result.supported).toBe(false)
    expect(result.searchKeywords).toEqual([])
  })

  it.each([
    ['2026-02-28T14:59:59.000Z', 2025, 2],
    ['2026-02-28T15:00:00.000Z', 2026, 1],
    ['2026-08-31T14:59:59.000Z', 2026, 1],
    ['2026-08-31T15:00:00.000Z', 2026, 2],
    ['2026-12-31T14:59:59.000Z', 2026, 2],
    ['2026-12-31T15:00:00.000Z', 2026, 2],
    ['2027-02-28T14:59:59.000Z', 2026, 2],
    ['2027-02-28T15:00:00.000Z', 2027, 1],
  ] as const)('KST 기준 시각 %s의 학년도·학기를 계산한다', (iso, year, semester) => {
    const result = analyzeQuestion('학사일정 알려줘', new Date(iso))

    expect(result.context.year).toBe(year)
    expect(result.context.semester).toBe(semester)
  })

  it.each([
    ['이번 학기 중간고사 말고 기말고사 언제야?', '중간고사'],
    ['국가장학금 말고 외부장학금 신청 기간 알려줘', '국가장학금'],
    ['학생증 재발급이 아니라 처음 발급받는 방법 알려줘', '재발급'],
  ])('제외 표현 앞의 경쟁 주제를 식별한다: %s', (question, excludedKeyword) => {
    const result = analyzeQuestion(question, secondSemester)

    expect(result.excludedKeywords).toContain(excludedKeyword)
  })
})
