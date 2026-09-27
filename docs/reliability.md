# 신뢰성 설계

## 서비스 수준 목표

대표 질문 5개는 공식 사이트가 정상일 때 실시간 원문으로 답하고, timeout·HTTP 오류·파싱 오류 때 검증 스냅샷으로 설명 가능한 결과를 반환한다. 외부 장애가 API 500이나 빈 화면으로 번지지 않아야 한다.

## 상태 의미

- `verified_live`: 이번 요청에서 공식 원문 확인
- `verified_snapshot`: 유효기간 내 사전 검증 자료 사용
- `stale`: 공식 사이트 장애로 만료된 마지막 검증본 사용
- `conflicting`: 공식 자료의 비교 가능한 값이 서로 다름
- `not_found`: 정상 조회했지만 관련 자료가 없음
- `upstream_unavailable`: 공식 사이트 장애이며 대체 자료도 없음

`not_found`와 `upstream_unavailable`은 운영 원인과 사용자 행동이 다르므로 합치지 않는다.

## 제한 시간과 fallback

전체 실시간 파이프라인은 약 2.5초 제한을 갖는다. 내부 개별 Fetch도 AbortSignal을 사용하며 `finally`에서 타이머를 정리한다. resolver는 실패를 `timeout`, `http_error`, `parse_error`로 분류하고 스냅샷을 조회한다.

스냅샷에는 공식 URL, 출처명, 담당 부서, 검증일, 만료일을 포함한다. 만료 자료는 숨기지 않고 경고와 마지막 확인일을 표시한다. 스냅샷이 없으면 사실을 추측하지 않는다.

## 관측성

응답 메타데이터:

- `requestId`, `processedAt`, `durationMs`
- `answerMode`: live/snapshot/unavailable
- `upstreamStatus`: ok/timeout/http_error/parse_error/skipped
- `cacheHit`, `lastSuccessfulCheck`

내부 구조화 로그에는 sourceId, HTTP 상태, redirect 횟수, parser 결과 수, cache hit, errorCode를 가능한 범위에서 기록한다. 사용자 응답에는 스택·내부 URL 정책 등 불필요한 정보를 노출하지 않는다.

## 테스트 전략

- 기본 `npm test`: mock/fixture만 사용, 외부 네트워크 금지
- `npm run test:live`: 공식 사이트 연결 확인용, 선택 실행
- `npm run build`: Pages Worker와 클라이언트 번들 확인
- 보안 회귀: 비공식 URL과 외부 redirect 차단을 항상 기본 테스트에 포함

## 장애 대응 순서

1. 요청 ID와 `upstreamStatus` 확인
2. 실시간 공식 출처 실패인지 정상 무결과인지 구분
3. 스냅샷 hit/만료 여부 확인
4. 공식 출처 구조 변경이면 parser/Allowlist를 최소 변경
5. 배포 장애는 상태 코드뿐 아니라 Content-Type과 본문을 확인
