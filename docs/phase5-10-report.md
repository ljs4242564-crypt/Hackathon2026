1. **최종 판정: READY FOR DEPLOYMENT — 로컬 배포 준비 기준**

요청한 완료 판정 체크리스트를 충족했습니다. 실제 Cloudflare 배포 성공이나 공식 서버의 현재 가용성을 보증하는 판정은 아닙니다. 별도 라이브 테스트는 timeout으로 실패했고, Wrangler 프리뷰는 실행 환경 오류로 실패했습니다. 이 두 실패를 통과로 처리하지 않았습니다. Git push, PR 생성 및 배포는 수행하지 않았습니다.

2. **Phase별 완료 여부**

| Phase | 결과 | 근거 |
|---|---|---|
| 5 | 완료 | 필수 파일 10종과 excludedKeywords, academicTerm, CF_PAGES_COMMIT_SHA, Asia/Seoul 확인. 업로드 ZIP 기준 |
| 6 | 완료 | 관련 테스트 76개 통과. 성공 HTTP mock에서 세 질문, 제외 자료만 있는 경우, 혼합 문장, 기존 경계 질문 검증 |
| 7 | 완료 | 관련 테스트 55개 통과. 직접 저장소·resolver 통합에서 추론/명시 학기 일치 검증 |
| 8 | 완료 | 관련 테스트 38개 통과. 일반/라이브 실행 분리. 2500ms 응답 제한 유지 |
| 9 | 완료 | 관련 테스트 68개와 빌드 통과. KST 경계와 빌드된 Worker 메타데이터 주입 확인 |
| 10 | 로컬 필수 검사 완료 | 기본 127개 통과, 대체 타입 검사 통과, 빌드 통과, 프로덕션 취약점 0, Worker 13그룹 통과. 별도 live 및 preview 실패는 아래 기록 |

작업 기준점: genspark-fde23fcc-731d-4c63-96c4-5668c8627003-main(4).zip. GitHub main을 내려받거나 덮어쓰지 않았습니다. ZIP에 Git 이력이 없어 최초 git status/rev-parse는 not a git repository로 실패했습니다. 비교용으로 업로드 원본만 로컬 Git에 기록한 커밋은 00bc51d16251fc35874ec57ba6c6a9b31514b592입니다. 이것은 원격 저장소 커밋이 아닙니다. 원본 파일 목록은 verification/baseline-files.txt에 있습니다.

최초 npm test는 vitest: not found, 최초 npm run build는 vite: not found로 실패했습니다. npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 실행 후 수정 전 기준선은 92 passed, 2 skipped, 빌드 성공이었습니다. 초기 건너뜀 2개는 기존 live 테스트입니다.

package.json 스크립트는 변경하지 않았습니다:

```json
{
  "dev": "vite",
  "build": "vite build --mode client && vite build",
  "test": "vitest run",
  "test:live": "RUN_LIVE_TESTS=1 vitest run tests/live",
  "preview": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
  "deploy": "npm run build && wrangler pages deploy dist",
  "cf-typegen": "wrangler types --env-interface CloudflareBindings"
}
```

3. **변경 파일과 변경 이유**

| 파일 | 변경 이유 |
|---|---|
| src/services/topicPolicy.ts | 시험·장학금·최초 발급 표현 정규화, 긍정/제외 주제 판별, 문장 단위 분리 공통화 |
| src/services/questionAnalyzer.ts | 가장 구체적인 제외 주제만 기록하고 positiveQuestion, positiveKeywords, neutralKeywords 분리 |
| src/config/keywords.ts | 외부장학금·봉사장학금의 명시적인 주제 인식 |
| src/shared/api.ts | 분석 결과의 의미 필드 선언 |
| src/services/searchService.ts | 긍정 검색어 사용, 제외 자료만 있는 게시물 후보 제거. 혼합 문서는 본문 검증으로 전달 |
| src/services/pageFetcher.ts | 일정 항목에 같은 주제 규칙 적용, 검증 일정 근거 사용, checkedAt KST 통일 |
| src/services/contentExtractor.ts | 문장별 긍정/제외 판별. 혼합 문서에서도 요청 문장 추출. 표시 제목에 제외 주제 혼입 방지 |
| src/services/answerFormatter.ts | 답변 직전 근거·제목·본문의 제외 주제 재검사 |
| src/services/answerResolver.ts | 제외 자료만 있는 정상 조회도 안전한 폴백으로 처리, 스냅샷 날짜 헬퍼 적용 |
| src/services/snapshotRepository.ts | 긍정 질문으로 매칭, 제외 내용 차단, 추론 학기에도 항상 academicTerm 대조 |
| src/utils/koreanDate.ts | Asia/Seoul 날짜·학기·스냅샷 확인 날짜 공통 함수 |
| src/config/buildMetadata.ts, src/routes/health.ts | package 버전과 빌드 상수 사용, 런타임 비밀 환경 변수 미노출 |
| vite.config.ts | 빌드 프로세스에서 CF_PAGES_COMMIT_SHA/RELEASE_ID와 빌드 시각을 Worker 번들 상수로 주입 |
| package.json, package-lock.json, tsconfig.json | 기존 health 버전인 1.1.0을 package에 명시, 빌드 설정용 @types/node 추가 |
| vitest.config.ts | 일반 테스트에서 live 경로 제외, opt-in live 실행 범위 분리 |
| tests/live/officialSources.live.test.ts | 실제 요청 시간·타임아웃·실패 분류 기록. 실패 재throw 유지 |
| tests/topicPolicy.integration.test.ts | 세 질문의 성공 HTTP mock 및 제외 자료만 있는 응답 검증 |
| tests/snapshotRepository.test.ts | 고정 시각 학기 매칭과 resolver 폴백 검증 |
| tests/responseBudget.test.ts | 기존 live의 resolver 성공 검증을 결정론적 mock으로 이동, 기본 제한·실제 스케줄러 검증 추가 |
| tests/koreanDate.test.ts, tests/buildMetadata.test.ts | 날짜 경계, checkedAt, health allowlist·버전·고정 메타데이터 검증 |
| scripts/verify-worker.mjs | dist/_worker.js 직접 호출 재현용 검증 |
| docs/phase5-10-report.md, verification/* | 기준점·실행 결과·실패 원문·검증 보고 보존 |

기존 프런트엔드 UI, 스냅샷의 공식 사실 데이터, 보안 헤더 정책은 재설계하지 않았습니다.

4. **부정 표현 처리 전후**

| 질문 | 수정 전 코드의 문제 | 수정 후 검증 결과 |
|---|---|---|
| 이번 학기 중간고사 말고 기말고사 | 중간고사가 matched/searchKeywords와 일정 매칭에 잔류 | 같은 학사일정 JSON에서 기말시험 항목과 12월 날짜만 반환 |
| 국가장학금 말고 외부장학금 | 국가장학금 검색·평가 경로가 남고 일반 장학금도 제외될 수 있음 | 정확히 국가장학금만 제외. 장학금 문맥 유지. 외부장학금 게시물과 본문 선택 |
| 학생증 재발급이 아니라 처음 발급 | 재발급과 발급의 포함 관계로 제외 범위가 과도하거나 재발급 근거 선택 가능 | 재발급만 제외, 발급 유지. 최초/처음/신규 발급 표현을 같은 긍정 주제로 처리 |

혼합 문서 전체를 폐기하지 않고 항목/문장을 선택합니다. 분리할 수 없는 혼합 문장은 안전하게 거절합니다. 긍정 근거가 없고 제외 자료만 있으면 upstream_unavailable입니다. 요청 질문과 analysis에는 사용자 원문/제외 주제 기록이 남지만 answer와 sources에는 잘못된 제외 주제 답변이 나오지 않는지 검증했습니다.

5. **학기 스냅샷 처리 전후**

수정 전에는 명시한 연도/학기 또는 상대 학기 표현이 있어야 스냅샷 학기를 강제 대조했습니다. 수정 후에는 academicTerm이 있으면 항상 분석 결과의 연도와 학기를 모두 비교합니다. 일치 검사 후에만 만료 여부를 판정합니다. 2027년 1학기에 연도 없이 물은 중간고사·국가장학금 질문에는 2026년 2학기 자료를 stale로도 반환하지 않습니다. 현재 학기 또는 명시적으로 요청한 과거 학기와 일치하면 기존 만료 정책을 유지합니다.

6. **추가·수정 테스트 목록**

- topicPolicy.integration: 8개. 세 긍정 성공 mock, 세 제외 자료만 있는 mock, 한 문단 문장 분리, 최종 안전 검증.
- snapshotRepository: 13개. 저장소 6개, resolver 6개, 미래 학기에 일치하는 fixture 선택 1개.
- responseBudget: 4개. 2499ms 미완료/2500ms 완료 두 경우, 실제 스케줄러 2250~3250ms, 즉시 성공 mock의 verified_live.
- koreanDate: 9개. KST 자정·3월·9월·연말연초 경계 8개와 checkedAt 통합 1개.
- buildMetadata: 1개. package 버전, 출력 키 allowlist, 비밀값 미노출, no-store.
- live: 공식 일정 원문 검증 1개 유지. 기존 두 번째 resolver 성공 검증은 responseBudget에 이동하고 verified_live/live/ok 조건 유지.
- 기존 기본 테스트 92개와 기존 9개 경계 질문은 그대로 통과. 테스트 삭제·단언 완화·강제 통과 처리 없음. 일반 실행에서 live를 분리한 것은 요청된 테스트 목적 분리입니다.

7. **실행한 명령과 실제 결과**

| 명령 | 실제 결과 |
|---|---|
| ZIP 목록 조회·안전한 압축 해제·필수 파일/키워드 검사 | 성공 |
| 최초 git status --short / git rev-parse HEAD | Git 저장소 없음으로 실패 |
| 최초 npm test / npm run build | vitest / vite 미설치로 실패 |
| npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 | 성공, 118 packages 설치 |
| 기준선 npm test / npm run build | 92 passed, 2 skipped / 빌드 성공 |
| Phase 6 관련 vitest 7개 파일 | 최종 76 passed |
| Phase 7 관련 vitest 3개 파일 | 55 passed |
| Phase 8 관련 vitest 2개 파일 | 38 passed |
| Phase 9 관련 vitest 5개 파일 및 build | 68 passed / 성공 |
| CF_PAGES_COMMIT_SHA와 RELEASE_ID를 fixture로 주입한 npm run build 및 Node Worker 호출 | 성공: 40자리 커밋, 지정 release, 1.1.0, 고정 builtAt, 비밀값 미노출 |
| npm install --save-dev @types/node@24 --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 | 성공 |
| 최종 npm test | exit 0, 127 passed |
| npx tsc --noEmit | exit 2, 아래 실행 환경 panic |
| npx --yes --package typescript@5.9.3 tsc --noEmit | Node 타입 보완 후 exit 0 |
| 최종 npm run build | exit 0 |
| npm audit --omit=dev | exit 0, found 0 vulnerabilities |
| npm run test:live | exit 1, timeout. 실패 유지 |
| node scripts/verify-worker.mjs | exit 0, 13그룹 통과 |
| npm run preview | exit 1, Worker compile 이후 실행 환경 오류 |

기본 타입 검사 실행기 오류 원문:

```text
panic: vfs: failed to get executable path: readlink /proc/self/exe: no such file or directory
```

기본 명령 자체가 실행되지 않아 사용자 지정 예외대로 TypeScript 5.9.3을 사용했습니다. 최초 대체 검사에서는 node:fs/process 타입 선언 누락 오류가 발견됐으며 @types/node와 tsconfig의 node types 추가 후 통과했습니다.

추가 테스트 초기에는 게시판 fixture의 td 열이 부족해 후보가 0개였고 3개가 실패했습니다. 실제 파서의 최소 4열 구조에 맞게 fixture를 수정했습니다. 애플리케이션 파서나 통과 단언을 완화하지 않았습니다. 실패 로그는 verification/phase6-fixture-failure.log에 보존했습니다.

8. **기본 테스트 개수**

15 test files, 127 passed, 0 failed, 0 skipped. 소요 시간 2.90초. 일반 테스트에서 실네트워크 테스트는 실행 대상이 아니며 건너뛴 테스트로 통계를 숨기지 않았습니다. 로그: verification/final-test.log.

9. **라이브 테스트 결과와 실제 시간**

0 passed, 1 failed, 0 skipped. 마지막 요청 계층 측정 6001ms, 전체 가용성 측정 6006ms, 테스트 전체 6010ms. 실패 분류 timeout. 내부 공식 요청 제한 6000ms, 테스트 전체 상한용 타이머 15000ms. HTTP 응답을 수신하지 못했으므로 정상 응답 시간이나 공식 정보의 최신성을 확인한 값이 아닙니다.

최초 실행은 6010ms에 network unavailable로 잘못 분류했으나 원인은 official fetch timeout이었습니다. 내부 요청 signal의 aborted 상태도 검사하도록 수정한 후 재실행했고 timeout으로 정확히 기록했습니다. 두 실행 원문을 모두 보존했습니다. 앱의 2500ms 사용자 응답 제한은 늘리지 않았습니다.

10. **빌드 및 보안 검사**

클라이언트 번들: client.css 19.18kB, client.js 237.76kB. Worker 번들: 118.31kB. npm audit --omit=dev: 취약점 0개.

빌드된 Worker에서 /와 /api/health 모두 HTTP 200, health JSON 및 Cache-Control: no-store를 확인했습니다. 두 경로에서 CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy를 확인했습니다. 502 폴백, 세 부정 표현의 실패·성공 경로, 미래 학기 질문 3개에서 과거 자료 차단도 확인했습니다.

Wrangler 프리뷰는 Compiled Worker successfully 이후 다음 오류로 종료했습니다:

```text
A system error occurred: uv_interface_addresses returned Unknown system error 1 (Unknown system error 1)
```

이는 프로덕션 빌드 실패가 아닙니다. Node에서 실제 dist/_worker.js를 가져와 fetch를 직접 호출한 검증은 통과했습니다. Cloudflare workerd 런타임 자체의 검증을 대체해 완료했다고 주장하지 않습니다.

11. **남아 있는 문제와 배포 전 수동 확인**

- 공식 소스 정상 가용성은 이 환경에서 미확인입니다. 네트워크 접근이 가능한 환경에서 npm run test:live를 다시 실행해 정상 응답·현재 게시물 구조를 확인해야 합니다.
- 정상 환경에서 Wrangler 프리뷰와 Cloudflare 계정 설정을 확인해야 합니다. 계정에 접속하거나 배포하지 않았습니다.
- Pages의 빌드 명령은 npm run build, 출력은 dist입니다. Pages 빌드 프로세스의 CF_PAGES_COMMIT_SHA를 vite.config.ts가 읽어 Worker에 주입합니다. 수동 로컬 빌드에서는 필요하면 비밀값이 아닌 RELEASE_ID/CF_PAGES_COMMIT_SHA를 빌드 때 제공해야 합니다. 런타임 바인딩 자동 전달에 의존하지 않습니다.
- 이번 최종 산출물은 로컬 빌드이므로 releaseId/commitSha는 local-development이고 builtAt은 실제 빌드 시각입니다. 사용자 계정에서 새 빌드를 수행한 뒤 /api/health의 커밋과 빌드 시각을 확인해야 합니다.
- 저장된 스냅샷의 사실이나 확인 날짜를 새로 검증한 것으로 갱신하지 않았습니다. 만료 경고는 기존 정책대로 유지합니다.
- TypeScript 7 실행 환경 문제는 미해결이며, 허용된 5.9.3 대체 검사만 통과했습니다. 실행 환경의 /proc 지원을 확인하십시오.

12. **git diff --stat**

전체 출력은 verification/git-diff-stat.txt에 있습니다. 변경 비교 기준은 위의 업로드 원본 로컬 커밋이며 GitHub main이 아닙니다. 신규 파일도 intent-to-add로 diff에 포함했습니다. 재적용 가능한 변경은 verification/source-changes.patch에 있습니다. node_modules와 .git은 전달 ZIP에서 제외했고, 실제 검증한 dist와 실행 로그는 포함했습니다.

13. **외부 변경 여부**

Git push 없음. PR 생성 없음. Cloudflare 배포 없음. 원격 저장소 소스 다운로드/덮어쓰기 없음. 수행한 변경과 검증은 모두 로컬 작업과 수정 결과물 저장에 한정됩니다.
