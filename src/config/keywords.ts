import type { QuestionCategory, QuestionIntent } from '../shared/api'

export type SupportedCategory = Exclude<QuestionCategory, 'unknown'>

export type CategoryRule = {
  id: SupportedCategory
  label: string
  strongKeywords: string[]
  relatedKeywords: string[]
  searchTerms: string[]
}

export type IntentRule = {
  id: QuestionIntent
  label: string
  patterns: string[]
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    id: 'academic',
    label: '학사일정',
    strongKeywords: [
      '학사일정', '중간고사', '중간시험', '기말고사', '기말시험', '수강신청',
      '수강정정', '개강', '종강', '휴학', '복학', '등록금', '성적', '졸업', '계절학기',
    ],
    relatedKeywords: ['시험', '일정', '학기', '수업', '신청기간', '등록', '학점', '강의'],
    searchTerms: ['학사일정'],
  },
  {
    id: 'scholarship',
    label: '장학금',
    strongKeywords: [
      '장학금', '장학', '국가장학금', '교내장학금', '교외장학금', '외부장학금', '봉사장학금', '근로장학', '학자금대출',
    ],
    relatedKeywords: ['선발', '지급', '소득분위', '한국장학재단', '생활비대출', '등록금지원'],
    searchTerms: ['장학금', '장학 안내'],
  },
  {
    id: 'library',
    label: '도서관',
    strongKeywords: [
      '도서관', '열람실', '자료실', '대출', '반납', '연장', '좌석', '학술정보', '전자책',
    ],
    relatedKeywords: ['운영시간', '개관', '휴관', '주말', '책', '도서', '이용시간'],
    searchTerms: ['도서관', '이용 안내'],
  },
  {
    id: 'student_support',
    label: '학생지원',
    strongKeywords: [
      '학생지원', '학생증', '증명서', '제증명', '상담센터', '학생상담', '장애학생',
      '인권센터', '보건진료실', '인터넷증명발급', '재발급',
    ],
    relatedKeywords: ['발급', '상담', '복지', '도움', '신청방법', '지원센터', '분실'],
    searchTerms: ['학생지원', '이용 안내'],
  },
  {
    id: 'contact',
    label: '부서 연락처',
    strongKeywords: [
      '전화번호', '연락처', '담당부서', '담당 부서', '문의처', '조직도', '부서전화',
    ],
    relatedKeywords: ['학사', '교무학사과', '전화', '문의', '어디로', '담당자', '부서', '연락'],
    searchTerms: ['전화번호 안내', '담당 부서'],
  },
]

export const INTENT_RULES: IntentRule[] = [
  {
    id: 'contact',
    label: '연락처 문의',
    patterns: ['전화번호', '연락처', '문의처', '어디로 문의', '누구에게 문의', '전화', '연락'],
  },
  {
    id: 'hours',
    label: '운영시간 문의',
    patterns: ['운영시간', '이용시간', '몇 시', '몇시', '언제 열', '언제 닫', '개관', '폐관', '주말', '운영'],
  },
  {
    id: 'application',
    label: '신청 문의',
    patterns: ['신청기간', '신청 기간', '신청 언제', '접수기간', '접수 기간', '신청할 수', '신청 가능'],
  },
  {
    id: 'procedure',
    label: '방법 문의',
    patterns: ['어떻게', '방법', '절차', '발급', '재발급', '신청하려면'],
  },
  {
    id: 'location',
    label: '장소 문의',
    patterns: ['어디에', '어디서', '위치', '장소', '찾아가'],
  },
  {
    id: 'schedule',
    label: '일정 문의',
    patterns: ['언제', '일정', '기간', '며칠', '날짜', '학기'],
  },
]

export const INTENT_LABELS: Record<QuestionIntent, string> = {
  schedule: '일정 문의',
  application: '신청 문의',
  hours: '운영시간 문의',
  contact: '연락처 문의',
  procedure: '방법 문의',
  location: '장소 문의',
  general: '일반 정보 문의',
}
