# 오매칭 회귀 결과

모든 표는 HTTP fixture이며 실제 학교 서버 응답이라고 해석하지 않는다. finalScope.test.ts에 답변 title/content/fields/sources 검사 포함.

| 사례 | 입력 | 수정 후 |
|---|---|---|
| S1 평일 도서관 | 502 | unavailable, 출처 없음 |
| S2 주말 말고 평일 | 502 | unavailable, 출처 없음 |
| S3 국가장학금 1차 | 502 | 2차 snapshot 차단 |
| S4 복수 장학금 | 502 조건 | 조회 전 질문 축소 not_found/skipped |
| L1 과거 학기 질문 | 다른 학기 공지만 200 | not_found/ok, 출처 없음 |
| L2 최초 학생증 | 재발급 원문만 200 | not_found/ok, 출처 없음 |
| L3 주말 도서관 | 평일 원문만 200 | not_found/ok, 평일 근거 없음 |

반대 방향: 평일/주말 정확한 live, 최초/재발급 정확한 live, 국가장학금 1차/2차·2025년 1학기 정확한 live, 같은 페이지 문장 분리 통과. 적용 학기 없는 장학금 원문은 거절. 1~2월 일정은 이전 학년도에 대응. 경쟁 차수 공지 둘 중 요청 차수 선택 통과.
수정 전 새 15개 중 8실패·7통과. 최종 새 19개 모두 통과. 전체 146개 통과.

source URL, HTTP, Content-Type, status, answerMode, upstreamStatus, cacheHit, durationMs, lastSuccessfulCheck를 포함한 대표/경계 Worker 직접 호출 결과는 demo-results.json. 공개 검증 결과는 아직 없음.
