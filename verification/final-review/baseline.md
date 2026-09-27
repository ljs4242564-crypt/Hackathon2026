# W0 기준

입력 ZIP 안전 검사: 절대 경로, .., 역슬래시, 심볼릭 링크 없음. 별도 work/project에 해제, 원본 보존. SHA-256과 전체 파일 목록은 input-manifest.json.
ZIP에는 .git 없음. 새 Git 저장소/가짜 커밋 생성 안 함. 원격 main 읽기 전용 조회와 별도 shallow clone으로 비교만 수행.
Node 24.19.0 / npm 11.9.0. npm ci exit 0, 수정 전 npm test exit 0(127통과), build exit 0.
최초 작업 시작 2026-09-27 14:52 KST. 사용자 재개 시각 19:20 KST. 테스트 러너 시계 문자열은 현지 시각으로 해석하지 않음.
교육 PDF 1권 11쪽 및 실제 갤러리 공개 안내: 9월 27일 22:00. 내부 목표 19:00과 구분.
