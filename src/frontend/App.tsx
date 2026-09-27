import { FormEvent, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  ExternalLink,
  GraduationCap,
  Headphones,
  Landmark,
  Library,
  LoaderCircle,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CampusApiError, submitCampusQuestion } from './lib/api'
import type { ChatStatus, ChatSuccessResponse } from '../shared/api'

type QuickQuestion = {
  label: string
  question: string
  description: string
  icon: LucideIcon
  tone: 'navy' | 'green' | 'amber' | 'violet' | 'blue'
}

const quickQuestions: QuickQuestion[] = [
  {
    label: '학사일정',
    question: '이번 학기 주요 학사일정을 알려줘',
    description: '시험 · 수강 · 휴복학',
    icon: CalendarDays,
    tone: 'navy',
  },
  {
    label: '장학금',
    question: '현재 신청할 수 있는 장학금이 있어?',
    description: '신청 기간 · 지원 대상',
    icon: GraduationCap,
    tone: 'green',
  },
  {
    label: '도서관',
    question: '도서관 주말 운영시간을 알려줘',
    description: '운영시간 · 이용 안내',
    icon: Library,
    tone: 'amber',
  },
  {
    label: '학생지원',
    question: '학생증 재발급 방법을 알려줘',
    description: '학생증 · 증명서 · 상담',
    icon: Users,
    tone: 'violet',
  },
  {
    label: '부서 연락처',
    question: '학사 관련 문의 전화번호를 알려줘',
    description: '담당 부서 · 전화번호',
    icon: Phone,
    tone: 'blue',
  },
]

const popularQuestions = [
  '이번 학기 중간고사 언제야?',
  '국가장학금 신청 기간 알려줘',
  '도서관은 주말에도 운영해?',
]

function Header() {
  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <a className="brand" href="#top" aria-label="SCNU Campus Assistant 홈">
          <span className="brand-mark" aria-hidden="true">
            <Landmark size={22} strokeWidth={2.2} />
          </span>
          <span>
            <strong>SCNU</strong>
            <small>Campus Assistant</small>
          </span>
        </a>
        <div className="header-actions">
          <span className="official-pill">
            <ShieldCheck size={15} />
            공식 정보 전용
          </span>
          <button className="menu-button" type="button" aria-label="메뉴 열기">
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  )
}

function QuickQuestionCard({ item, onSelect }: { item: QuickQuestion; onSelect: (question: string) => void }) {
  const Icon = item.icon

  return (
    <button className="quick-card" type="button" onClick={() => onSelect(item.question)}>
      <span className={`quick-icon quick-icon-${item.tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="quick-copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
      <ArrowRight className="quick-arrow" size={18} aria-hidden="true" />
    </button>
  )
}

function SearchPanel() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<ChatSuccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const remaining = useMemo(() => 160 - question.length, [question])

  const selectQuestion = (value: string) => {
    setQuestion(value)
    setResult(null)
    setError('')
    document.getElementById('campus-question')?.focus()
  }

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = question.trim().replace(/\s+/g, ' ')

    if (!normalized) {
      setError('궁금한 내용을 한 문장으로 입력해 주세요.')
      return
    }

    setError('')
    setResult(null)
    setIsLoading(true)

    try {
      const response = await submitCampusQuestion(normalized)
      setQuestion(response.question)
      setResult(response)
    } catch (caughtError) {
      const message = caughtError instanceof CampusApiError
        ? caughtError.message
        : '질문을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const statusPresentation: Record<ChatStatus, { label: string; icon: LucideIcon }> = {
    verified_live: { label: '실시간 공식 원문 확인', icon: CheckCircle2 },
    verified_snapshot: { label: '사전 검증 자료 사용', icon: ShieldCheck },
    stale: { label: '오래된 마지막 검증본', icon: AlertTriangle },
    conflicting: { label: '서로 다른 공식 자료가 확인됨', icon: AlertTriangle },
    not_found: { label: '정상 조회했지만 관련 자료 없음', icon: CircleX },
    upstream_unavailable: { label: '공식 출처와 대체 자료 확인 실패', icon: CircleX },
    pending: { label: '공식 자료 확인 중', icon: Sparkles },
  }
  const resultStatus = result ? statusPresentation[result.status] : null
  const ResultStatusIcon = resultStatus?.icon

  return (
    <>
      <section className="quick-section" aria-labelledby="quick-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">QUICK SEARCH</span>
            <h2 id="quick-heading">무엇을 찾고 있나요?</h2>
          </div>
          <p>자주 찾는 분야를 선택하면 질문 예시가 자동으로 입력됩니다.</p>
        </div>
        <div className="quick-grid">
          {quickQuestions.map((item) => (
            <QuickQuestionCard key={item.label} item={item} onSelect={selectQuestion} />
          ))}
        </div>
      </section>

      <section className="search-panel" aria-labelledby="search-heading">
        <div className="search-panel-heading">
          <span className="search-symbol" aria-hidden="true">
            <Search size={22} />
          </span>
          <div>
            <span className="eyebrow">ASK SCNU</span>
            <h2 id="search-heading">순천대 생활, 무엇이든 물어보세요</h2>
          </div>
        </div>

        <form onSubmit={submitQuestion} noValidate>
          <label className="sr-only" htmlFor="campus-question">
            순천대학교 생활 관련 질문
          </label>
          <div className={`search-input-wrap ${error ? 'has-error' : ''}`}>
            <textarea
              id="campus-question"
              value={question}
              maxLength={160}
              rows={2}
              onChange={(event) => {
                setQuestion(event.target.value)
                setResult(null)
                setError('')
              }}
              disabled={isLoading}
              placeholder="예: 이번 학기 중간고사 기간은 언제인가요?"
              aria-describedby={error ? 'question-error' : 'question-help'}
              aria-invalid={Boolean(error)}
            />
            <button className="search-button" type="submit" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="loading-spinner" size={19} /> : <Search size={19} />}
              <span>{isLoading ? '질문 확인 중' : '공식 정보 찾기'}</span>
            </button>
          </div>
          <div className="input-meta">
            <p id={error ? 'question-error' : 'question-help'} className={error ? 'error-text' : ''}>
              {error || '공식 홈페이지에서 확인한 정보만 안내합니다.'}
            </p>
            <span>{remaining}자</span>
          </div>
        </form>

        <div className="popular-row" aria-label="인기 질문">
          <span>인기 질문</span>
          <div>
            {popularQuestions.map((item) => (
              <button key={item} type="button" onClick={() => selectQuestion(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {result && resultStatus && ResultStatusIcon && (
          <article className={`phase-notice result-${result.status}`} role="status">
            <ResultStatusIcon size={20} aria-hidden="true" />
            <div>
              <span className="result-status-label">{resultStatus.label}</span>
              <strong>{result.answer.title}</strong>
              <p>{result.answer.content}</p>
              <ul className="api-result-fields">
                {result.answer.fields.map((field) => (
                  <li key={field.label}>
                    <span>{field.label}</span>
                    <b>{field.value}</b>
                  </li>
                ))}
              </ul>
              {result.search.candidates.length > 0 && (
                <div className="candidate-area">
                  <strong>원문 확인 전 검색 후보</strong>
                  <ul className="search-candidate-list">
                    {result.search.candidates.map((candidate) => (
                      <li key={candidate.url}>
                        <a href={candidate.url} target="_blank" rel="noopener noreferrer">
                          <span>{candidate.title}</span>
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        <small>
                          {candidate.sourceName}
                          {candidate.department ? ` · ${candidate.department}` : ''}
                          {candidate.publishedAt ? ` · ${candidate.publishedAt}` : ''}
                        </small>
                      </li>
                    ))}
                  </ul>
                  <p>후보 제목만 수집한 상태입니다. 다음 단계에서 상세 원문을 검증합니다.</p>
                </div>
              )}
              {result.sources.length > 0 && (
                <div className="verified-sources">
                  <strong>확인한 공식 출처</strong>
                  {result.sources.map((source) => (
                    <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                      <span>{source.title}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
              {result.search.failedSources.length > 0 && (
                <p className="partial-search-note">일부 공식 출처는 일시적으로 확인하지 못했습니다.</p>
              )}
              <dl className="response-meta" aria-label="응답 확인 정보">
                <div><dt>답변 방식</dt><dd>{result.meta.answerMode}</dd></div>
                <div><dt>공식 사이트 상태</dt><dd>{result.meta.upstreamStatus}</dd></div>
                <div><dt>처리 시간</dt><dd>{result.meta.durationMs}ms</dd></div>
                {result.meta.lastSuccessfulCheck && (
                  <div><dt>마지막 성공 확인</dt><dd>{result.meta.lastSuccessfulCheck}</dd></div>
                )}
              </dl>
              <small>요청 번호: {result.meta.requestId}</small>
            </div>
          </article>
        )}
      </section>
    </>
  )
}

function ResultPreview() {
  return (
    <section className="result-preview" aria-labelledby="preview-heading">
      <div className="preview-label">
        <span>RESULT PREVIEW</span>
        <p>아래 내용은 결과 화면 구성을 보여주는 예시이며 실제 조회 결과가 아닙니다.</p>
      </div>
      <article className="answer-card">
        <div className="answer-status">
          <span>
            <CheckCircle2 size={17} />
            공식 홈페이지에서 확인됨
          </span>
          <small>화면 예시</small>
        </div>
        <div className="answer-body">
          <div className="answer-title-row">
            <span className="answer-icon" aria-hidden="true">
              <CalendarDays size={24} />
            </span>
            <div>
              <p>학사일정</p>
              <h2 id="preview-heading">중간고사 일정</h2>
            </div>
          </div>
          <dl className="answer-details">
            <div>
              <dt>기간</dt>
              <dd>공식 페이지 확인 후 표시</dd>
            </div>
            <div>
              <dt>담당</dt>
              <dd>담당 부서 확인 후 표시</dd>
            </div>
            <div>
              <dt>출처</dt>
              <dd>공식 자료 제목 표시</dd>
            </div>
          </dl>
          <button className="source-button" type="button" disabled>
            공식 페이지 보기
            <ExternalLink size={16} />
          </button>
        </div>
        <footer className="answer-footer">
          <Clock3 size={15} />
          게시일과 마지막 확인일을 함께 표시합니다.
        </footer>
      </article>
    </section>
  )
}

function App() {
  return (
    <div id="top" className="app-shell">
      <Header />
      <main>
        <section className="hero-section">
          <div className="hero-glow hero-glow-left" aria-hidden="true" />
          <div className="hero-glow hero-glow-right" aria-hidden="true" />
          <div className="page-shell hero-inner">
            <div className="hero-copy">
              <span className="hero-badge">
                <ShieldCheck size={16} />
                국립순천대학교 공식 정보 기반
              </span>
              <h1>
                캠퍼스 생활의 궁금증,
                <br />
                <em>한곳에서 빠르게.</em>
              </h1>
              <p>
                여러 홈페이지를 돌아다닐 필요 없이 질문해 보세요.
                <br className="desktop-break" /> 공식 자료를 확인하고 출처와 함께 정리해 드립니다.
              </p>
              <div className="trust-points" aria-label="서비스 원칙">
                <span><ShieldCheck size={17} /> 공식 도메인만 검색</span>
                <span><BookOpen size={17} /> 원문 확인</span>
                <span><ExternalLink size={17} /> 출처 제공</span>
              </div>
            </div>
            <aside className="hero-visual" aria-label="서비스 특징">
              <div className="visual-orbit" aria-hidden="true" />
              <div className="visual-card visual-card-main">
                <span className="visual-logo"><Landmark size={28} /></span>
                <div>
                  <small>SCNU CAMPUS</small>
                  <strong>학생 생활 도우미</strong>
                </div>
              </div>
              <div className="visual-card visual-card-top">
                <ShieldCheck size={18} /> 검증된 출처
              </div>
              <div className="visual-card visual-card-bottom">
                <Headphones size={18} /> 학생 중심 안내
              </div>
            </aside>
          </div>
        </section>

        <div className="page-shell content-shell">
          <SearchPanel />
        </div>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <div className="footer-brand">
            <span className="brand-mark"><Landmark size={18} /></span>
            <div><strong>SCNU Campus Assistant</strong><small>순천대학교 캠퍼스 생활 도우미</small></div>
          </div>
          <p>본 서비스는 공식 홈페이지의 공개 정보를 찾아 연결하는 학생 프로젝트입니다.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
