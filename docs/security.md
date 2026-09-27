# 보안 설계와 검토

## 위협 모델

- 질문에 삽입된 URL을 통한 SSRF
- 공식 페이지 redirect를 통한 Allowlist 우회
- 위장 hostname, IP literal, localhost, 비표준 포트 접근
- 과도한 요청 본문과 큰 upstream 응답
- 외부 HTML의 스크립트·마크업 주입
- 오류 메시지와 로그를 통한 내부 정보 노출
- API 토큰·환경파일의 Git 유출

## 적용된 통제

- HTTPS만 허용
- 정확한 hostname과 경로 정규식 Allowlist
- URL username/password, 포트, IP literal, localhost 차단
- `redirect: manual`, 최대 2회, 목적지 매 단계 재검증
- 사용자 입력 URL 직접 Fetch 금지
- Hono streaming body-limit으로 요청 4 KiB 제한, 질문 160자 제한
- `application/json` 미디어 타입 정확 일치 검사
- upstream timeout과 스트리밍 응답 바이트 수 제한
- 파싱한 텍스트만 React에서 렌더링하며 외부 HTML 직접 삽입 금지
- `unsafe-inline` 없는 CSP, HSTS, COOP/CORP, frame 차단, MIME sniffing 차단, Referrer/Permissions Policy
- API `Cache-Control: no-store`
- `.env`, `.dev.vars`, `.wrangler`, 로그를 `.gitignore` 처리

## 유지해야 할 테스트

- 비공식 hostname 및 유사 hostname 차단
- HTTP, 인증정보, 비표준 포트, IP, localhost 차단
- 비허용 공식 경로 차단
- 공식 redirect 허용과 외부 redirect 차단
- 질문에 URL이 있어도 등록된 공식 출처만 요청

## 로그 원칙

요청 ID, 처리 시간, 상태 코드, 오류 분류만 기록한다. 질문 원문, 쿠키, 토큰, 전체 공식 문서 본문은 기본 로그에 남기지 않는다. 사용자에게는 일반화된 오류와 확인 상태만 제공한다.

## 2026-09-26 GitHub 업로드 전 검사

- 현재 파일 55개 및 Git 과거 text blob 76개 Secret 패턴 검사: 발견 0건
- `.env`, `.dev.vars`, `.wrangler`, `dist`, `node_modules` Git 제외 확인
- `npm audit` 전체 및 production 의존성: 취약점 0건
- npm registry signature: 117개 패키지 검증, 66개 attestation 확인
- 기본 테스트: 60개 통과, 선택적 live 테스트 1개 통과
- TypeScript 검사와 production build 통과
- `eval`, `new Function`, `dangerouslySetInnerHTML`, Node 프로세스 실행 API 사용 없음
- 비공식 URL, 외부 redirect, localhost/IP/비표준 포트 차단 회귀 테스트 통과
- 4 KiB 초과 chunked 요청 413, 잘못된 JSON 미디어 타입 415 확인

## 남은 위험

- 애플리케이션 자체의 분산 rate limit이 없어 대량 요청 방어는 배포 플랫폼 정책에 의존함
- 공식 호스트가 침해되거나 허용 경로에서 악성 redirect 없이 비정상 콘텐츠를 반환하는 경우
- HTML 구조 변경에 따른 오탐·미탐
- 저장소가 공개되므로 정적 스냅샷에는 공개된 최소 사실만 포함해야 함
- 요청 횟수 제한은 영구 저장소 없이 인스턴스 간 일관되게 적용하기 어려움

새 출처는 공식성·필요 경로·redirect 동작을 확인하고 테스트를 추가한 뒤 Allowlist에 등록한다.
