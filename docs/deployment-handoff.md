# 외부 작업 인계 — 승인 후 실행

## 검토 대상

수정 내용: snapshot/live 범위 검증 공통화, 차수 메타데이터, 도서관 빠른 질문, 정상 무결과 상태 교정, 학년도 경계, PM2 경로, 회귀 테스트 및 제출 문서.
예정 커밋: `fix: enforce question scope and prepare verified submission`.
대상: https://github.com/ljs4242564-crypt/SCNU_OSS_HACK, 검토 브랜치 fix/submission-scope-20260927, 배포 기준 main.
원격 확인 HEAD c1907b3183d5d4012e80bb30e3894a6a512eaf38. ZIP과 원격 소스/테스트/설정 47개 중 26개가 달라 단순 덮어쓰기를 금지한다. remote-comparison.json은 ZIP 원본 대비 원격 비교이며 이번 수정 diff는 changes.patch이다.

1. 원격 fetch 후 최신 main과 ZIP 기반 변경을 비교한다. 새 사용자 변경은 보존하고 충돌별 통합한다.
2. 통합 작업본에서 npm ci, npm test, 타입 검사, npm run build, Worker 검사 수행.
3. 승인된 브랜치 commit/push 후 main 반영. force push/reset --hard/rebase 금지.
4. 사용자 Cloudflare 계정에서 Pages 프로젝트 생성 또는 기존 프로젝트 선택. 권장 이름 scnu-campus-assistant는 제안일 뿐 실제 URL이 아니다.
5. GitHub 저장소 연결, production branch main, build `npm run build`, output `dist`, Node 검증 버전 24.19.0. wrangler.jsonc의 nodejs_compat 및 compatibility_date 확인.
6. dist/_worker.js의 Pages advanced mode로 Hono API가 실행된다. 정적 호스팅만 연결하면 안 된다. 별도 functions 디렉터리 추가는 필요하지 않다.
7. 새 Secret, DNS 변경, LLM 키, DB 바인딩은 필요 없다. CF_PAGES_COMMIT_SHA는 플랫폼 빌드 메타데이터를 사용한다. 직접 Wrangler 배포 시 현재 실제 Git SHA를 빌드 환경에 전달하고 빌드 후 승인된 프로젝트에 배포한다.
8. 배포 URL·배포 ID·빌드 로그를 기록한다. 루트 앱/JS/CSS/Health JSON/Chat JSON 확인 후 health commitSha와 실행 소스 커밋을 대조한다.
9. 새 비로그인 세션, 데스크톱 및 390px 화면에서 대표 5개와 S1~S4/L1~L3 질문을 확인한다. API 보안 헤더·출처·확인일·stale 경고 포함. 공개 결과는 로컬 mock과 분리한다.
10. 실패 시 직전 실제 정상 Cloudflare 배포가 있으면 Dashboard rollback. 없으면 배포 완료 표시를 철회하고 갤러리 설명을 수정한다. 고장난 Genspark로 복귀하지 않는다.
11. README와 제출 초안의 미확정 URL을 실제 값으로 바꾸고 갤러리 등록 후 확인 화면 확보. 최종 소스/배포 대응을 기록하여 ZIP 재생성.

현재 접근 가능한 인증된 Cloudflare 프로젝트와 쓰기 승인이 확인되지 않았다. 이 문서는 실행 완료 보고가 아니다.
