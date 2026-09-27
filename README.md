# SCNU Campus Assistant

국립순천대학교 학생의 학사일정·장학금·도서관·학생증·학사 연락처 질문에 공식 근거와 확인 상태를 표시하는 학생 프로토타입입니다. React + Hono + TypeScript 구조이며 런타임 LLM API는 사용하지 않습니다.

## 현재 상태

2026-09-27 최종 로컬 검토: **146개 테스트 통과**, 빌드·TypeScript 5.9.3 대체 검사·Worker 직접 호출 통과. 실시간 일정 조회와 Wrangler 프리뷰는 환경 제약으로 실패했습니다. **이번 변경은 아직 commit/push/Cloudflare 배포/갤러리 등록하지 않았습니다.**

- 최종 공개 앱: 미확정
- 저장소 후보: https://github.com/ljs4242564-crypt/SCNU_OSS_HACK
- 기존 Genspark 주소는 Site Unavailable 상태로 재확인되어 제출용으로 사용하지 않습니다.
- 정확한 검증 및 남은 작업: [SUBMISSION_STATUS.md](SUBMISSION_STATUS.md)
- 과거 README 기록: [history/README-before-final-review.md](docs/history/README-before-final-review.md)

## 실행

검증 환경: Node 24.19.0, npm 11.9.0. lockfile을 유지하세요.

```bash
npm ci
npm test
npm run build
npm run preview
```

정상 환경에서 http://localhost:3000 을 엽니다. API는 GET /api/health 및 POST /api/chat입니다. PM2는 선택 사항이며 ecosystem.config.cjs는 현재 프로젝트 디렉터리를 사용합니다. 이 실행 환경에서는 preview가 uv_interface_addresses 오류로 종료되어 화면 확인을 완료하지 못했습니다. 다른 컴퓨터 또는 Cloudflare에서 검증해야 합니다.

```bash
npx tsc --noEmit
# /proc/self/exe 실행기 panic인 경우에만 대체 검사
npx --yes --package typescript@5.9.3 tsc --noEmit
node scripts/verify-worker.mjs
npm audit --omit=dev
npm run test:live
node scripts/capture-submission-evidence.mjs
```

Worker 직접 호출 검증은 Cloudflare 배포 성공을 의미하지 않습니다. 기본 테스트는 독립 fixture이며 test:live만 실제 학교 서버를 호출합니다.

## 대표 질문과 범위

1. 이번 학기 중간고사 언제야?
2. 국가장학금 신청 기간 알려줘.
3. 도서관은 주말에도 운영해?
4. 학생증 재발급 방법 알려줘.
5. 학사 관련 문의 전화번호 알려줘.

실시간 조회 실패 시 의도·주제·학기·신청 차수·평일/주말·최초/재발급이 일치하는 기존 snapshot만 사용합니다. 국가장학금 snapshot은 2026년 2학기 **2차 종료 자료**, 학생증 재발급은 오래된 자료로 stale입니다. 도서관 snapshot은 주말 시설별 안내이며 평일·일반 운영시간 답변에 재사용하지 않습니다. 복수 장학금 질문은 범위를 좁히도록 안내합니다.

| 상태 | 의미 |
|---|---|
| verified_live | 이번 요청에서 일치하는 공식 원문 근거 추출 |
| verified_snapshot | 유효기간 내 기존 사전 자료 사용 |
| stale | 만료된 기존 자료, 최신 확인 필요 |
| not_found | 정상 조회했으나 일치 근거 없음 또는 질문 축소 필요 |
| upstream_unavailable | 실제 조회 실패, 일치 대체 자료 없음 |
| conflicting | 공식 자료의 비교 가능한 값 충돌 |

snapshot의 verifiedAt은 기존 기록을 보존했습니다. 일부 공식 사실은 이번에 재확인하지 못했으므로 최신성 보장을 하지 않습니다. JSON의 answerMode, upstreamStatus, cacheHit, lastSuccessfulCheck로 확인 방식과 조회 상태를 구분합니다.

## 안전성과 한계

공식 HTTPS hostname/path Allowlist, 수동 redirect 재검증, SSRF·크기 제한, CSP/HSTS, API no-store를 유지합니다. 사용자 입력 URL은 조회하지 않으며 질문·인증 정보·원문 HTML을 운영 로그에 남기지 않습니다. LLM, D1/KV/R2, PDF/HWP/OCR은 구현 범위에 포함하지 않았습니다. 동의어·복잡한 복합 문장은 확인 불가가 될 수 있습니다.

## 제출 자료

- [문제 해결 기록](docs/problem-solving.md)
- [배포 인계](docs/deployment-handoff.md)
- [갤러리 제출 초안](docs/submission-copy.md)
- [3분 발표](docs/presentation-3min.md)
- [1분 데모와 촬영 목록](docs/demo-1min.md)
- [검증 기록](verification/final-review/)

코드는 [MIT License](LICENSE)입니다. 학교 콘텐츠·명칭의 권리는 해당 기관에 있습니다. 생성형 AI는 코드 개발·테스트·문서 작성에 활용했으며 사용자의 질문을 런타임 LLM에 전송하지 않습니다.
