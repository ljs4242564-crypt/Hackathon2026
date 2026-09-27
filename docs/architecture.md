# 아키텍처

## 목표

SCNU Campus Assistant는 LLM 없이 규칙 기반으로 질문을 분석하고, 국립순천대학교 공식 출처에서만 근거를 확인해 답변한다. 외부 사이트 장애 때는 사전 검증 스냅샷으로 전환하되 최신성과 확인 방식을 숨기지 않는다.

## 요청 흐름

```text
React UI
→ POST /api/chat
→ 입력 크기·형식 검증
→ 규칙 기반 QuestionAnalysis
→ AnswerResolver (전체 실시간 조회 제한)
   ├─ 공식 출처 검색 → Allowlist/redirect 재검증 → 원문 추출 → verified_live
   └─ timeout/HTTP/파싱 실패 → SnapshotRepository
      ├─ 유효 자료 → verified_snapshot
      ├─ 만료 자료 → stale
      └─ 없음 → upstream_unavailable
→ 상태·출처·확인일·메타데이터 반환
```

## 계층

- `src/routes`: HTTP 입력 검증과 응답 작성
- `src/services/questionAnalyzer.ts`: 카테고리·의도·학기 문맥 규칙
- `src/services/searchService.ts`: 서버에 등록된 공식 출처 선택, 게시판 후보 점수화
- `src/utils/domainValidator.ts`: HTTPS/호스트/경로/포트 검증과 redirect 재검증
- `src/services/pageFetcher.ts`: 공식 JSON·HTML 원문 요청
- `src/services/contentExtractor.ts`: 본문 근거와 날짜·시간·전화번호 추출
- `src/services/answerResolver.ts`: live/fallback 결정과 관측 정보 수집
- `src/services/snapshotRepository.ts`: 저장 방식과 무관한 스냅샷 조회 계약
- `src/data/verifiedSnapshots.ts`: 실제 공식 원문에서 검증한 최소 사실
- `src/services/answerFormatter.ts`: 규칙 기반 문장과 필드 생성
- `src/frontend`: 상태별 색상·경고·출처 표시

## 신뢰 경계

사용자 입력은 질문 분류에만 사용한다. 질문에 포함된 URL은 Fetch하지 않는다. 네트워크 요청 대상은 코드에 등록된 출처에서 생성하며, 모든 최초 URL과 redirect 목적지를 `validateOfficialUrl`로 검사한다.

## 데이터 저장

제출 전에는 정적 `VerifiedSnapshot[]`을 사용하며 사용자 질문과 로그를 영구 저장하지 않는다. `SnapshotRepository` 인터페이스를 유지해 제출 후 D1 구현으로 교체할 수 있다.

## 배포 구조

현재 Hono + React + Vite의 Cloudflare Pages 번들이다. 런타임 파일 시스템이나 Node 전용 API를 사용하지 않는다. D1·R2·Secret은 제출 전 필수 요소가 아니다.
