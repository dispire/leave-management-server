# Technical Document: KorailTicketAgent

## 1. Project Overview
- **Project Name**: KorailTicketAgent
- **Description**: Microsoft Edge / Chromium 브라우저 자동화를 이용하여 코레일(letskorail.com) 기차표 승차권 조회 및 자동 예매를 수행하고 결과를 텔레그램으로 전송하는 데스크톱 GUI 프로그램.
- **Goal**: 사용자가 로그인 정보 및 여정 조건을 입력할 수 있는 전용 UI와 원클릭 실행이 가능한 Windows 실행 파일(`KorailTicketAgent.exe`) 제공.

## 2. Architecture & Design
- **Runtime**: Node.js v24+ / Electron / TypeScript
- **Automation Framework**: Playwright (`chromium` with `channel: 'msedge'`)
- **Desktop UI**: Glassmorphism/Dark Mode Premium Desktop Interface (로그인 폼, 여정 입력 폼, 실시간 로그 콘솔)
- **Messaging Integration**: Telegram Bot API
- **Security & Profile**: AGENTS.md 규정에 따라 사용자의 개인 브라우저 세션을 침범하지 않는 독립 임시 프로필 사용

## 3. UI Components
1. **로그인 & 보안 설정**: 멤버십 번호, 비밀번호, 텔레그램 토큰, Chat ID 입력 및 `.env` 자동 저장
2. **승차권 예매 정보 입력**: 출발역, 도착역, 출발일(날짜 선택), 출발시간(시/분), 좌석 종류(일반실/특실)
3. **실시간 로그 및 진행 상황 콘솔**: 브라우저 조작 상태, 열차 조회 목록, 좌석 잔여량, 텔레그램 전송 상태 실시간 표시

## 4. Implementation Progress
- [x] 프로젝트 기술 문서(`TECHNICAL_DOCUMENT.md`) 작성 및 요구사항 정의
- [x] `package.json` 및 `tsconfig.json` 개발 환경 구성
- [x] 코레일 자동 예매 엔진 소스코드(`src/korail_agent.ts`) 작성
- [x] TypeScript 빌드 컴파일 (`dist/korail_agent.js`, `dist/main.js`, `dist/server.js`) 검증 완료
- [x] 데스크톱 GUI 인터페이스 (`src/ui/index.html`, `src/ui/styles.css`, `src/ui/app.js`) 구현 완료
- [x] Express 백엔드 API & Electron 프로세스 (`src/server.ts`, `src/main.ts`) 구현 완료
- [x] Windows standalone executable 빌드 script (`build_exe.js`) 생성 및 실행
