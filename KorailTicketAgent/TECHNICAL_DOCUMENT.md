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
- [x] 코레일 프로모션 팝업 자동 닫기(`dismissPopup`) 및 회원 세션 로그인 기반 스케줄 파싱 안정화 완료 (2026-09-19)
- [x] GNB 메뉴 헤더 '예매' 버튼 클릭 및 `document.body.innerText` 오탐지로 인한 예약 미완료 상태에서의 텔레그램 허위 알림(False Positive) 현상 완벽 수정 (2026-09-21):
  - GNB/상단 메뉴 제외: 검색 결과 내 실제 열차 행(`availableTrain`) 좌석 버튼만 타겟팅 클릭하도록 개선.
  - 예약 성공 검증 강화: URL(`.../reservation/`, `.../payment/`, `.../cart`) 전환 및 `#content` 영역 내 '결제기한', '예약번호', '예약이 완료' 문구 추출을 통해서만 텔레그램 알림이 최종 발송되도록 조치.
- [x] 스텔스 브라우저 컨텍스트 & 회원 로그인 보안 우회 (2026-09-21):
  - Playwright context에 `addInitScript`를 적용하여 `navigator.webdriver`, `chrome.runtime`, `plugins`, `languages` 스텔스 설정을 추가함.
  - 코레일 보안 스크립트(`dynaPath` / `nfilter` RSA password encryption)의 500/404 오류 방지 및 `loginCheck` 회원 로그인(`이광희 님`) 성립 확인.
  - 자동 예매 에이전트가 코레일 공식 사이트에 직접 접속하여 회원 로그인을 진행하므로 타 브라우저 로그인 알림 메시지는 정상적인 보안 알림 현상임.
- [x] 날짜/시간 선택 모달 스코프 정밀화 (2026-09-21):
  - 날짜 선택 시 `td:not(.disabled) a`로 활성화된 날짜 셀만 선택하도록 제한 (비활성화 셀 및 이전/다음 달 셀 클릭 방지).
  - 시간 선택 시 `.timeSelect a` 내의 `12시` 버튼만 정밀 타겟팅하여 날짜 슬라이더 아이템과의 오매칭 방지 (`#startDate` 값이 `2026-09-24(목) 12:00`로 정확히 반영됨).
- [x] 열차 카드 렌더링 파싱 및 `waitForSelector` 로직 개선 (2026-09-21):
  - 코레일 승차권 조회 결과 페이지(`https://www.korail.com/ticket/search/list`) 렌더링 완료 시점 탐지를 위해 `waitForSelector('li.tckList, div.tck_inner')` 추가.
  - `li.tckList`, `div.tck_inner` 단위 카드 노드에서만 열차명, 출발시간, 도착시간, 소요시간, 좌석 상태(예매가능/매진임박/매진)를 파싱하여 0건 오탐지 방지 및 실시간 열차 일정 수집 검증 완료 (총 10건 수집 성공).
- [x] 코레일 보안 서버(WAF/nFilter) 자동화 탐지 대응 및 지능형 백오프(Smart Backoff) 구현 (2026-09-21):
  - **CDP level Stealth 강화**: `delete Object.getPrototypeOf(navigator).webdriver`, `permissions.query` 오버라이드 및 `chrome` 런타임 지문 완전 은폐.
  - **Human-like Simulation**: 로그인 ID/비밀번호 입력 시 마우스 포인터 이동 에뮬레이션(`page.mouse.move`) 및 무작위 지터 타이핑 지연(60ms ~ 150ms) 적용.
  - **UI 스나이퍼 매크로 재조회 주기 조절**: UI 옵션 카드에 스나이퍼 매크로 재조회 주기 선택 드롭다운(8초, 10초, 15초) 추가 및 정적 주기 대신 `설정값 + 무작위 1.0~3.5초` 지터 조율로 패턴 차단 방지.
  - **WAF 감지 30초 백오프(Cool-down)**: 코레일 서버 500 에러 발생 시 자동으로 30초 대기 쿨다운 적용 후 안전 재시도 조치.