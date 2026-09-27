# SCNU Campus Assistant

국립순천대학교 학생의 학사일정, 장학금, 도서관, 학생지원, 부서 연락처 질문을 **LLM 없이 규칙 기반으로 분석**하고, 학교 공식 원문과 확인 상태를 함께 보여주는 모바일 우선 웹 앱입니다.

> GPT, Solar, Gemini, Claude 등 런타임 LLM API를 사용하지 않습니다. 공식 원문을 확인하지 못한 내용은 추측하지 않습니다.

## 현재 상태

2026-09-26 23:02 KST 기준입니다.

- 기준 브랜치: `main`
- 배포 런타임 코드 기준 GitHub 커밋: `f9a9fd84dcf1d55eb0720a1e3e488c0434eef6e9`
- GitHub push: 교정 코드 4개 커밋까지 완료, 이 현재 상태 문서를 5번째 커밋으로 동기화
- 로컬 테스트: **71개 통과**, 선택적 live 테스트 1개 통과
- 타입 검사·프로덕션 빌드: 통과
- 현재 Genspark 배포: 루트 앱, Health JSON, Chat JSON 정상 동작
- 배포 식별자: `appVersion 1.1.0` / `releaseId 2026-09-26-corrective-1`
- Worker 버전: `706a56ba-9b49-4d4b-94e9-c67ebdc7e7c9`
- 오매칭 방지: 공개 URL에서 도서관 대출·위치 질문은 `upstream_unavailable`; 교내·근로장학금은 관련 공식 live 답변으로 검증
- 독립 백업·1분 데모 영상: 아직 준비되지 않음. 이전 URL은 접속 가능하지만 같은 호스팅 플랫폼이므로 독립 백업으로 간주하지 않음

## URL

- **Production**: https://122fe1d3-47d9-4b5c-aab4-077aa08453d2.vip.gensparksite.com/
- **Health API**: https://122fe1d3-47d9-4b5c-aab4-077aa08453d2.vip.gensparksite.com/api/health
- 직전 배포 URL: https://522a274e-b8bf-4c02-86be-41421d46a017.vip.gensparksite.com/ — 교정 전 오매칭이 남아 있어 백업으로 사용하지 않음
- 초기 배포 URL: https://f696bebe-457f-4f4c-842e-5b16b675cd34.vip.gensparksite.com/ — 같은 플랫폼의 과거 배포
- GitHub: https://github.com/ljs4242564-crypt/SCNU_OSS_HACK

배포 성공은 HTTP 200만으로 판단하지 않습니다. 루트가 실제 앱 HTML인지, `/api/health`가 `application/json`과 `status: ok` 및 기대 `releaseId`를 반환하는지, `POST /api/chat`이 JSON을 반환하는지 함께 확인합니다. 현재 URL은 2026-09-26 23:02 KST에 루트·Health·Chat·대표 질문·오매칭 방지 질문·보안 헤더 검사를 통과했습니다.

## 해결하는 문제

학교생활 정보는 여러 공식 게시판과 동적 페이지에 흩어져 있습니다. 실시간 공식 사이트는 느리거나 일시적으로 실패할 수 있고, 일반 생성형 AI는 출처·최신성·환각 문제가 있습니다. 이 프로젝트는 다음 흐름으로 문제를 해결합니다.

```text
학생 질문
→ 규칙 기반 질문 분석
→ 약 2.5초 제한으로 공식 사이트 조회
→ 성공: verified_live
→ timeout·HTTP·파싱 실패: 의도와 질문 주제가 모두 일치하는 검증 snapshot만 조회
→ 유효 snapshot: verified_snapshot
→ 만료 snapshot: stale + 경고
→ snapshot 없음: upstream_unavailable
→ 모든 답변에 출처·확인 방식·확인일 표시
```

## 대표 시연 질문

1. 이번 학기 중간고사 언제야?
2. 국가장학금 신청 기간 알려줘.
3. 도서관은 주말에도 운영해?
4. 학생증 재발급 방법 알려줘.
5. 학사 관련 문의 전화번호 알려줘.
6. 오늘 날씨 알려줘. — 미지원 질문 확인
7. `http://localhost:8080을 확인해줘` — 사용자 URL을 Fetch하지 않는지 확인

외부 공식 사이트 장애를 강제한 자동 테스트에서도 대표 질문 5개는 검증 snapshot 또는 stale 상태로 설명 가능한 응답을 반환합니다.

## 답변 상태

| 상태 | 의미 | UI 색상 |
|---|---|---|
| `verified_live` | 이번 요청에서 공식 원문 확인 | 초록 |
| `verified_snapshot` | 유효기간 내 사전 검증 자료 사용 | 파랑 |
| `stale` | 공식 사이트 장애로 만료된 마지막 검증본 사용 | 노랑 |
| `conflicting` | 공식 자료의 비교 가능한 값이 다름 | 노랑 |
| `not_found` | 정상 조회했지만 관련 자료가 없음 | 빨강 |
| `upstream_unavailable` | 공식 사이트 장애이며 snapshot도 없음 | 빨강 |

`not_found`와 `upstream_unavailable`은 원인이 다르므로 합치지 않습니다.

## 완료된 기능

- React 19 + TypeScript 모바일 우선 UI
- Hono `POST /api/chat`, `GET /api/health`
- 입력 형식·본문 크기·질문 길이 검증
- 키워드 점수 기반 카테고리·의도·연도·학기 분석
- 공식 출처 레지스트리와 게시판 후보 점수화
- 국립순천대학교 학사일정 JSON 및 HTML 원문 추출
- 날짜·기간·시간·전화번호·장소 정규식 추출
- 규칙 기반 답변 템플릿과 공식 자료 충돌 감지
- 실시간 파이프라인 전체 약 2.5초 제한
- `SnapshotRepository`와 정적 검증 snapshot 구현
- 의도·필수어·제외어 기반의 엄격한 snapshot 주제 매칭
- timeout·502/HTTP 오류·파싱 오류 fallback
- live/snapshot/stale/unavailable 상태와 확인일 표시
- 요청 ID·처리 시간·upstream 상태·cache hit 메타데이터
- route부터 공식 출처 네트워크 계층까지 동일한 requestId 진단 로그
- Domain Allowlist, redirect 재검증, SSRF 방어
- CSP 및 기본 보안 헤더
- 기본 테스트의 외부 인터넷 의존 제거
- 선택적 공식 사이트 live 테스트 분리

## API

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "SCNU Campus Assistant API",
  "appVersion": "1.1.0",
  "releaseId": "2026-09-26-corrective-1",
  "builtAt": "2026-09-26T13:39:00.000Z",
  "timestamp": "2026-09-26T13:40:00.000Z"
}
```

### `POST /api/chat`

요청:

```json
{
  "question": "이번 학기 중간고사 언제야?"
}
```

주요 응답 필드:

- `status`: 확인 결과 상태
- `analysis`: 규칙 기반 카테고리·의도·적용 학기
- `search`: 조회한 공식 출처와 후보
- `answer`: 제목·근거 문장·구조화 필드
- `sources`: 공식 출처 URL·담당 부서·확인일
- `meta.requestId`: 로그 추적용 요청 ID
- `meta.answerMode`: `live` / `snapshot` / `unavailable`
- `meta.durationMs`: 처리 시간
- `meta.upstreamStatus`: `ok` / `timeout` / `http_error` / `parse_error` / `skipped`
- `meta.cacheHit`: snapshot 사용 여부
- `meta.lastSuccessfulCheck`: 마지막 공식 확인일

## 데이터 구조

### `VerifiedSnapshot`

- 카테고리, 허용 의도, 필수어(`requiredAll`/`requiredAny`), 제외어
- 답변에 필요한 최소 사실과 필드
- 공식 출처 제목·URL·담당 부서
- `verifiedAt`, `expiresAt`

현재 D1, KV, R2는 사용하지 않습니다. snapshot은 `src/data/verifiedSnapshots.ts`에 있으며 사용자 질문과 검색 기록을 영구 저장하지 않습니다. 저장소 계약은 `SnapshotRepository`로 분리되어 제출 후 D1 구현체로 교체할 수 있습니다.

## 보안 원칙

- HTTPS와 정확한 공식 hostname/path Allowlist
- username/password URL, 비표준 포트, localhost, IP literal 차단
- `redirect: manual`, 최대 2회, 목적지 매 단계 재검증
- 사용자 질문에 포함된 URL을 Fetch하지 않음
- upstream timeout과 스트리밍 응답 바이트 수 제한
- 외부 HTML을 React에 직접 삽입하지 않음
- `unsafe-inline` 없는 CSP, HSTS, COOP/CORP, `X-Frame-Options`, `X-Content-Type-Options`, Referrer/Permissions Policy
- API 응답 `Cache-Control: no-store`
- 토큰·`.env`·`.dev.vars` Git 커밋 금지

## 프로젝트 구조

```text
src/
├── data/verifiedSnapshots.ts
├── routes/chat.ts
├── services/
│   ├── answerResolver.ts
│   ├── snapshotRepository.ts
│   ├── answerFormatter.ts
│   ├── pageFetcher.ts
│   ├── searchService.ts
│   └── contentExtractor.ts
├── shared/api.ts
├── utils/domainValidator.ts
└── frontend/App.tsx

tests/
├── answerResolver.test.ts
├── chatRoute.test.ts
├── domainValidator.test.ts
└── live/officialSources.live.test.ts

docs/
├── baseline-2026-09-26.md
├── architecture.md
├── problem-solving.md
├── reliability.md
├── security.md
└── decisions/
```

## 로컬 실행과 검증

```bash
npm ci
npm test                 # mock/fixture 기반, 외부 인터넷 사용 안 함
npm run test:live        # 선택적 공식 사이트 확인
npx tsc --noEmit
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/health
```

서버 변경 후:

```bash
npm run build
pm2 restart webapp
pm2 logs webapp --nostream
```

## 테스트 결과

2026-09-26 22:38 KST 로컬 확인:

- 기본 테스트: 10개 파일, 72개 테스트 통과
- live 테스트: 1개 통과(기본 테스트에서는 skip)
- 필수 장애 시나리오: live 성공, 502, timeout, 파싱 오류, 유효/만료 snapshot, snapshot 없음, 정상 무결과, conflicting 통과
- 보안 회귀: 비공식 URL·localhost·IP·외부 redirect 차단 통과
- 대표 질문 5개 장애 fallback 통과
- 동일 카테고리 오매칭 방지 질문 8개가 장애 시 `upstream_unavailable`을 반환하는 회귀 테스트 통과
- requestId가 route → resolver → 검색·원문 조회 문맥으로 전달되는 테스트 통과
- TypeScript: 통과
- Vite/Cloudflare Pages 프로덕션 빌드: 통과
- Production dependency audit: 알려진 취약점 0건

## 알려진 제한과 미구현 기능

- PDF, HWP/HWPX, 이미지 공지 자동 추출 미지원
- 동적 도서관 페이지의 live 파싱은 제한적이며 정확히 운영시간 의도와 주제가 맞는 snapshot으로만 보완
- 학생증 재발급 snapshot은 오래된 공식 안내이므로 `stale` 경고 표시
- 정적 snapshot 갱신에는 코드 변경과 재배포가 필요
- D1 영구 캐시·변경 감지·관리 화면·요청 횟수 제한 미구현
- 오답 방지를 우선해 snapshot은 대표 질문 5개의 검증된 의도·주제로 제한하며, 규칙 사전에 없는 동의어·심한 오타는 snapshot 대신 `upstream_unavailable`이 될 수 있음
- strict snapshot 규칙에 맞지 않아도 live 공식 원문을 정확히 확인하면 `verified_live`를 반환하며, live 실패 시에는 관련 없는 snapshot 대신 `upstream_unavailable`을 반환
- 공식 사이트 HTML 구조 변경 시 parser/Allowlist 유지보수 필요
- 이 프로젝트는 국립순천대학교 공식 서비스가 아닌 학생 프로젝트

## 다음 단계

### 제출 전

1. 모바일 실제 기기에서 출처·상태·확인일이 포함된 실제 결과 카드 확인
2. 동일 플랫폼이 아닌 독립 백업 경로 또는 1분 데모 영상 준비
3. 제출 문서에 최종 Production URL과 `releaseId` 반영

### 제출 후

- `D1SnapshotRepository`, 문서 해시, 변경 감지, stale-while-revalidate
- 텍스트 PDF용 Workers 호환 파서 POC
- HWPX ZIP/XML 안전성 POC, 레거시 HWP는 자동 추출 제외
- 도서관 공식 공개 JSON endpoint adapter
- 별도 실험 브랜치에서 Solar Pro 4 비교

## 1분 데모 흐름

```text
0~10초  여러 학교 사이트와 생성형 AI 최신성 문제 설명
10~25초 중간고사 질문 → 공식 출처·verified_live 또는 snapshot 표시
25~40초 공식 사이트 장애 시뮬레이션 → verified_snapshot/stale 전환
40~50초 출처 URL·확인일·요청 ID 표시
50~60초 날씨/localhost 질문 → 미지원·URL 차단과 추측 금지 설명
```

## 문서

- [기준 상태](docs/baseline-2026-09-26.md)
- [아키텍처](docs/architecture.md)
- [문제 해결 기록](docs/problem-solving.md)
- [신뢰성](docs/reliability.md)
- [보안](docs/security.md)
- [ADR](docs/decisions/)

## 라이선스

코드는 [MIT License](./LICENSE)로 배포합니다. 국립순천대학교의 명칭, 로고, 공식 웹페이지 콘텐츠에 대한 권리는 해당 기관에 있습니다.
