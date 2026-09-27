import type { QuestionCategory } from '../shared/api'

export type SearchableCategory = Exclude<QuestionCategory, 'unknown'>

export type BoardSource = {
  kind: 'board'
  id: string
  name: string
  categories: SearchableCategory[]
  url: string
  boardId: string
  menuId: string
  triggerKeywords?: string[]
  priority: number
}

export type StaticSource = {
  kind: 'static'
  id: string
  name: string
  categories: SearchableCategory[]
  url: string
  title: string
  department: string | null
  tags: string[]
  priority: number
}

export type OfficialSearchSource = BoardSource | StaticSource

export const OFFICIAL_SEARCH_SOURCES: OfficialSearchSource[] = [
  {
    kind: 'board',
    id: 'academic-notices',
    name: '국립순천대학교 학사 게시판',
    categories: ['academic'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '1041',
    menuId: '1132',
    priority: 100,
  },
  {
    kind: 'board',
    id: 'national-scholarship-notices',
    name: '국립순천대학교 국가장학금 게시판',
    categories: ['scholarship'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '4487',
    menuId: '8690',
    triggerKeywords: ['국가장학금', '학자금대출', '한국장학재단'],
    priority: 100,
  },
  {
    kind: 'board',
    id: 'campus-scholarship-notices',
    name: '국립순천대학교 교내장학금 게시판',
    categories: ['scholarship'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '4488',
    menuId: '8691',
    triggerKeywords: ['교내장학금', '성적우수장학금'],
    priority: 90,
  },
  {
    kind: 'board',
    id: 'external-scholarship-notices',
    name: '국립순천대학교 외부장학금 게시판',
    categories: ['scholarship'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '4489',
    menuId: '8692',
    triggerKeywords: ['교외장학금', '외부장학금', '재단'],
    priority: 80,
  },
  {
    kind: 'board',
    id: 'work-scholarship-notices',
    name: '국립순천대학교 근로 및 봉사장학금 게시판',
    categories: ['scholarship'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '4490',
    menuId: '8694',
    triggerKeywords: ['근로장학', '봉사장학'],
    priority: 85,
  },
  {
    kind: 'board',
    id: 'general-notices',
    name: '국립순천대학교 공지 게시판',
    categories: ['student_support'],
    url: 'https://www.scnu.ac.kr/SCNU/na/ntt/selectNttList.do',
    boardId: '1040',
    menuId: '1131',
    priority: 100,
  },
  {
    kind: 'static',
    id: 'library-home',
    name: '국립순천대학교 도서관',
    categories: ['library'],
    url: 'https://library.scnu.ac.kr/',
    title: '국립순천대학교 도서관 이용 안내',
    department: '국립순천대학교 도서관',
    tags: ['도서관', '운영시간', '이용시간', '열람실', '자료실', '대출', '반납'],
    priority: 100,
  },
  {
    kind: 'static',
    id: 'department-directory',
    name: '국립순천대학교 전화번호 안내',
    categories: ['contact', 'academic', 'scholarship', 'library', 'student_support'],
    url: 'https://www.scnu.ac.kr/SCNU/og/organiz/selectOrganizList.do?menuCode=A&mi=1214',
    title: '국립순천대학교 대학본부 전화번호 안내',
    department: '국립순천대학교',
    tags: ['전화번호', '연락처', '문의처', '담당부서', '조직도'],
    priority: 100,
  },
]

export const SEARCH_LIMITS = {
  maxSourcesPerQuestion: 4,
  maxQueriesPerSource: 2,
  maxCandidates: 8,
  maxCandidatesPerResponse: 5,
  timeoutMs: 6_000,
  maxHtmlCharacters: 500_000,
} as const
