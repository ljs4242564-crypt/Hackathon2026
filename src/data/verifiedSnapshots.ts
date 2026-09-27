import type { AnswerField, QuestionCategory, QuestionIntent } from '../shared/api'

export type SnapshotMatchRule = {
  intents: QuestionIntent[]
  requiredAll?: string[]
  requiredAny?: string[]
  excluded?: string[]
}

export type VerifiedSnapshot = {
  id: string
  category: QuestionCategory
  academicTerm?: {
    year: number
    semester: 1 | 2
  }
  applicationRound?: 1 | 2
  match: SnapshotMatchRule
  title: string
  content: string
  fields: AnswerField[]
  sourceTitle: string
  sourceUrl: string
  department: string | null
  verifiedAt: string
  expiresAt: string
}

// Every entry below was checked against the linked official SCNU source on 2026-09-26.
// Keep only the minimum facts needed for the five demonstration questions.
export const VERIFIED_SNAPSHOTS: VerifiedSnapshot[] = [
  {
    id: 'academic-midterm-2026-2',
    category: 'academic',
    academicTerm: { year: 2026, semester: 2 },
    match: {
      intents: ['schedule'],
      requiredAny: ['중간고사', '중간시험'],
      excluded: ['기말고사', '기말시험'],
    },
    title: '2026학년도 제2학기 중간시험',
    content: '국립순천대학교 학사일정에서 제2학기 중간시험은 2026년 10월 19일부터 10월 23일까지로 확인되었습니다.',
    fields: [
      { label: '기간', value: '2026.10.19 ~ 2026.10.23' },
      { label: '담당', value: '교무학사과 학사지원팀' },
    ],
    sourceTitle: '국립순천대학교 학사일정',
    sourceUrl: 'https://www.scnu.ac.kr/haksa/sv/schdulView/schdulCalendarView.do?mi=1416',
    department: '교무학사과 학사지원팀',
    verifiedAt: '2026-09-26',
    expiresAt: '2026-10-23',
  },
  {
    id: 'scholarship-national-2026-2-second',
    applicationRound: 2,
    category: 'scholarship',
    academicTerm: { year: 2026, semester: 2 },
    match: {
      intents: ['application'],
      requiredAll: ['국가장학금'],
      excluded: [
        '교내장학금', '근로장학금', '근로장학', '교외장학금', '외부장학금',
        '봉사장학금', '봉사장학', '주거안정장학금',
      ],
    },
    title: '2026학년도 2학기 국가장학금 2차 신청 안내',
    content: '2차 신청 기간은 2026년 8월 12일 09:00부터 9월 9일 18:00까지였습니다. 현재는 안내된 신청 기간이 지났으므로 새 공지를 확인해야 합니다.',
    fields: [
      { label: '신청기간', value: '2026.08.12 09:00 ~ 2026.09.09 18:00' },
      { label: '담당', value: '학생지원과' },
    ],
    sourceTitle: '2026학년도 2학기 국가장학금 2차 신청 안내',
    sourceUrl: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=281317355&mi=8690',
    department: '학생지원과',
    verifiedAt: '2026-09-26',
    expiresAt: '2026-09-09',
  },
  {
    id: 'library-hours-2026-09',
    category: 'library',
    match: {
      intents: ['hours'],
      requiredAll: ['주말'],
      excluded: ['위치', '대출', '반납', '예약', '좌석', '분실', '분실물'],
    },
    title: '국립순천대학교 도서관 주말 시설 이용시간',
    content: '주말에는 일부 시설만 운영합니다. 자료관은 주말 및 법정공휴일에 휴관하고, 학습관 1층·3층 일부 시설도 주말에 휴관합니다. 학습관 2층 201·202 열람실과 We 라운지, 학습관 4층 401·402 열람실과 개인캐럴은 06:00~24:00 연중무휴로 안내되어 있습니다.',
    fields: [
      { label: '주말 운영', value: '일부 시설만 운영' },
      { label: '학습관 2층', value: '201·202 열람실·We 라운지 06:00 ~ 24:00 · 연중무휴' },
      { label: '학습관 4층', value: '401·402 열람실·개인캐럴 06:00 ~ 24:00 · 연중무휴' },
      { label: '주말 휴관', value: '자료관 및 학습관 1층·3층 일부 시설' },
    ],
    sourceTitle: '국립순천대학교 도서관 이용시간',
    sourceUrl: 'https://library.scnu.ac.kr/facility/avaliable-time',
    department: '국립순천대학교 도서관',
    verifiedAt: '2026-09-26',
    expiresAt: '2026-10-03',
  },
  {
    id: 'student-card-reissue-last-verified',
    category: 'student_support',
    match: {
      intents: ['procedure'],
      requiredAll: ['학생증', '재발급'],
      excluded: ['처음 발급', '신규 발급', '최초 발급'],
    },
    title: '학생증 재발급 마지막 확인 자료',
    content: '공식 학생증 안내에는 일반 학생증 재발급 수수료 3천 원, 교통카드·현금입출납 기능이 있는 IC 학생증은 카드 구입 수수료 5천 원으로 구분되어 있습니다. 이 snapshot의 기준 안내는 오래되었으므로 방문 전 학생지원과에 최신 절차와 비용을 다시 확인하세요.',
    fields: [
      { label: '일반 학생증 재발급', value: '3,000원' },
      { label: 'IC 학생증 카드 구입', value: '5,000원' },
      { label: '최신 절차 확인', value: '학생지원과 061-750-3062' },
    ],
    sourceTitle: '2024학년도 학부·대학원 신입생 및 편입생 학생증 발급 안내',
    sourceUrl: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttInfo.do?nttSn=281210005&mi=1131',
    department: '학생지원과',
    verifiedAt: '2024-03-08',
    expiresAt: '2024-12-31',
  },
  {
    id: 'academic-contact-2026',
    category: 'contact',
    match: {
      intents: ['contact'],
      requiredAny: ['학사', '교무학사과'],
    },
    title: '교무학사과 업무별 학사 문의 연락처',
    content: '학사 문의는 업무별 담당 번호가 다릅니다. 수강신청·수업·시험은 061-750-3032, 학적·등록·휴학·복학·전과는 061-750-3033, 졸업·다전공·재입학은 061-750-3035, 성적·계절학기·전자출결은 061-750-3036으로 안내되어 있습니다.',
    fields: [
      { label: '수강신청·수업·시험', value: '061-750-3032' },
      { label: '학적·등록·휴학·복학·전과', value: '061-750-3033' },
      { label: '졸업·다전공·재입학', value: '061-750-3035' },
      { label: '성적·계절학기·전자출결', value: '061-750-3036' },
    ],
    sourceTitle: '국립순천대학교 조직도 - 교무처',
    sourceUrl: 'https://www.scnu.ac.kr/SCNU/og/organiz/selectOrganizList.do?menuCode=A&mi=1214&prntDeptCode=2',
    department: '교무학사과(학사)',
    verifiedAt: '2026-09-26',
    expiresAt: '2026-12-31',
  },
]
