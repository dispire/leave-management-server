# Technical Document: KorailTicketAgent v2.0

## 1. Project Overview
- **Project Name**: KorailTicketAgent
- **Description**: Microsoft Edge / Chromium 브라우저 자동화를 이용하여 코레일(korail.com / letskorail.com) 기차표 승차권 조회 및 자동 예매를 수행하고 결과를 텔레그램으로 전송하는 데스크톱 GUI 및 웹 서버 프로그램.
- **Goal**: 사용자가 로그인 정보 및 여정 조건을 입력할 수 있는 전용 UI와 원클릭 실행이 가능한 웹/데스크톱 인터페이스 제공.

## 2. Architecture & Design
- **Runtime**: Node.js v24+ / Express / TypeScript
- **Automation Framework**: Playwright (`chromium` with `channel: 'msedge'`)
- **Desktop UI**: Glassmorphism/Dark Mode Premium Interface (로그인 폼, 여정 입력 폼, 실시간 열차 조회 결과 테이블, 에러 알림 배너)
- **Messaging Integration**: Telegram Bot API (예약 완료 시에만 알림 발송)
- **Security & Profile**: AGENTS.md 규정에 따라 사용자의 개인 브라우저 세션을 침범하지 않는 독립 임시 프로필 사용

## 3. UI Components
1. **로그인 & 보안 설정**: 멤버십 번호, 비밀번호, 텔레그램 토큰, Chat ID 입력 및 `.env` 자동 저장
2. **승차권 예매 정보 입력**: 출발역, 도착역, 출발일(날짜 선택), 출발시간(시/분), 좌석 종류
3. **실시간 열차 조회 결과 표출 테이블**: 조회 결과를 브라우저 화면 상에서 표 단위로 즉시 확인
4. **상단 오류 알림 배너**: 타임아웃, 셀렉터 미발견 등 발생 시 화면 상단 레드 글래스 배너로 실시간 알림

## 4. Full Audit & Issue Analysis (2026-09-19)
- **원인 1 (열차 미조회 시 헤더 시간 텍스트 오파싱 오류)**:
  코레일(korail.com) 조회 결과 "해당 스케줄에 운행하는 열차가 없습니다."가 출력될 때, 이전 텍스트 파서가 페이지 상단 날짜 헤더(`2026-09-19(토) 11:00` 또는 `2026-09-24(목) 12:00`)에서 `11:00` 정규식을 오추출하여 `열차 | 11:00 | - | - | 예매가능` 형태의 가짜 더미 행을 생성하던 결함 발견.
- **원인 2 (날짜/시간 모달 미적용 문제)**:
  `a.btn_d-day` 날짜 모달에서 날짜/시간 클릭 후 `button.btn_bn-blue` (적용) 버튼 클릭이 누락될 경우, React 모달 팝업이 닫히지 않아 `button.btn_lookup` (열차 조회) 클릭 이벤트가 가려지는 현상 수정.
- **원인 3 (역 선택 모달 정확도 개선)**:
  `selectStation` 함수에서 출발역/도착역 선택 시 `.start a.btn_pop-open`, `.end a.btn_pop-open`을 통해 모달 내 태그 `.ch_tag a` 및 검색 입력을 정확히 매칭하도록 수정.

## 5. Implementation Progress & Fix Summary
- [x] 프로젝트 기술 문서(`TECHNICAL_DOCUMENT.md`) 작성 및 요구사항 정의
- [x] `package.json` 및 `tsconfig.json` 개발 환경 구성
- [x] 코레일 자동 예매 엔진 소스코드 (`gen_engine.py` -> `src/korail_engine.ts`) 작성 및 리팩토링
- [x] TypeScript 빌드 컴파일 (`dist/korail_engine.js`, `dist/server.js`) 검증 완료
- [x] 데스크톱 GUI 인터페이스 (`src/ui/index.html`, `src/ui/styles.css`, `src/ui/app.js`) 구현 완료
- [x] Express 백엔드 API (`src/server.ts`) Port 3840 실행 중
- [x] 브라우저 화면 상단 🚨 에러 알림 배너 UI 추가
- [x] 단순 열차 조회 결과는 브라우저 전용 테이블(`resultsCard`)에 표출하고, 텔레그램 메시지는 예약 성공시에만 발송하도록 분리 개선 완료
- [x] 코레일 모달 탐색 및 조회 결과 파싱 알고리즘 완벽 검수 및 헤더 더미 데이터 오생성 버그 수정 완료 (2026-09-19)
