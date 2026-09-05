# 원내 모바일 웹 재고 관리 시스템 기술 문서 (Technical Document)

## 📌 프로젝트 개요
- **프로젝트명**: 원내 모바일 웹 재고 관리 시스템 (Hospital Mobile Inventory System)
- **주요 용도**: 모바일 웹 카메라를 활용한 1D 바코드 & 2D QR 코드 기반 원내 자산/소모품/의약품 실시간 입출고 및 재고 관리
- **백엔드 DB**: **Google Drive / Sheets (Google Apps Script REST API)**
- **웹 배포**: **GitHub Pages (`gh-pages`)**

---

## 🚀 구현된 핵심 기능 사양

### 1. Google Drive / Sheets 백엔드 DB 연동 (`google_apps_script.gs`)
- 구글 드라이브의 구글 스프레드시트를 데이터베이스로 사용합니다.
- `Company`, `Products`, `Users`, `History` 시트 자동 생성 및 실시간 Read/Write 연동.
- 앱 내 **[설정] → [Google Drive DB 연동]** 화면에서 구글 앱스 스크립트 배포 URL 입력 및 연동 테스트 지원.

### 2. 바코드 & QR 코드 통합 실시간 카메라 스캐너 (`SCAN`)
- 모바일 웹 HTML5 Camera API (`navigator.mediaDevices.getUserMedia`) 연동.
- 1D 바코드(Code 128, Code 39, EAN-13 등) 및 2D QR 코드의 **듀얼 실시간 스캔 디코딩**.
- iOS Safari 및 Android Chrome용 **카메라 접근 권한 설정 안내 및 가이드 UI** 수록.

### 3. 원내 회사 / 기관 정보 관리 (`COMPANY`)
- 기관/회사명, 기관 코드, 사업자/등록번호, 대표자명, 대표전화, 주소 관리.
- **원내 부서 목록 설정**: 부서 신규 추가 및 삭제 기능.

### 4. 직원 상세 정보 관리 (`MEMBERS`)
- **직원 속성 관리**: 사원번호, 성명, 이메일, 전화번호, 소속 부서, 직급/직책, 권한(관리자 / 일반직원), 재직 상태(재직 / 휴직 / 퇴사).

### 5. 바코드 & QR 코드 라벨 생성 및 출력 (`LABEL`)
- 각 등록 상품 카드에서 **"🏷️ 라벨"** 버튼 제공.
- 1D 바코드 및 2D QR 코드 이미지 자동 생성 및 **라벨 인쇄 (Print)** 지원.

---

## 📋 Google Apps Script (GAS) 연동 5단계 설치 방법

1. **Google 스프레드시트 생성**: 구글 드라이브(drive.google.com)에서 새로운 스프레드시트를 생성합니다.
2. **Apps Script 메뉴 이동**: 상단 메뉴 `확장 프로그램` → `Apps Script`를 클릭합니다.
3. **코드 적용**: 프로젝트 내 `google_apps_script.gs` 파일의 코드를 복사하여 붙여넣고 저장합니다.
4. **웹 앱 배포**:
   - 우측 상단 `배포` → `새 배포` 선택
   - 유형: **웹 앱 (Web App)**
   - 다음 사용자 권한으로 실행: **나 (Me)**
   - 액세스 권한 있는 사용자: **모든 사용자 (Anyone)**
5. **URL 등록**: 발급된 웹 앱 URL을 웹 앱 [설정] 메뉴의 Google Drive DB 연동 입력창에 저장합니다.

---

## 📝 Git & Deployment Status
- `google_apps_script.gs` 백엔드 스크립트 파일 작성 완료.
- `App.tsx` 구글 시트 API 연동 및 자동 동기화 기능 구현.
- Production Vite 빌드 검증 완료 (`✓ built in 369ms`).

---

## 📸 신규 프로젝트: Instagram Downloader (`insta_downloader`)

### 📌 프로젝트 개요 및 분석
- **프로젝트명**: `insta_downloader` (경로: `f:\Antigravity\insta_downloader`)
- **분석 대상**:
  - `G:\Locker\Hitomi_Downloader Insta\hitomi_downloader_GUI.exe`
  - `G:\Locker\Hitomi_Downloader Insta\hitomi_downloader_GUI.ini` (SQLite3 DB)
- **핵심 요구사항**:
  - 인스타그램 미디어(게시물/릴스/스토리/프로필/슬라이드 카루셀) 다운로드 파이썬 스크립트 작성
  - 최신 인스타그램 인증 강화 정책에 대응하여 쿠키 기반(`sessionid`, `ds_user_id`, `csrftoken`) 자동/수동 인증 처리 지원
  - Hitomi Downloader `.ini` 데이터베이스 쿠키 자동 추출 지원

### 🛠️ 구현 단계
1. **`cookie_helper.py`**: 브라우저(Chrome/Edge/Firefox) 자동 쿠키 추출, Hitomi Downloader SQLite DB 쿠키 복원, 수동 세션 ID 설정
2. **`insta_downloader.py`**: 인스타그램 REST API/GraphQL 연동 및 미디어(JPG/MP4) 고화질 다운로드 엔진
3. **`requirements.txt` & `README.md`**: 사용 방법 및 의존성 관리
4. **완료 여부**: ✅ 개발, 검증 및 프로젝트 문서화 완료

---

## 📦 직원 배포용 ver 2.0 백업 및 GitHub Pages 배포 완료 (2026-08-31)

### 📌 백업 및 배포 현황
- **버전**: `ver 2.0` (Git Tag: `v2.0`)
- **로컬 백업 경로**: `LeaveManagementSystem/backups/ver_2.0/`
- **배포 URL**: `https://dispire.github.io/leave-management-server/`
- **주요 내용**:
  1. `npm run build` 검증 및 `npm run deploy` 실행으로 GitHub Pages 최신 브랜치 배포
  2. 로컬 백업 `backups/ver_2.0/` 폴더에 `src`, `package.json`, `TECHNICAL_DOCUMENT.md` 보존 완료
  3. Git 태그 `v2.0` 부여 및 origin master/tags 푸시 완료

---

## 🔄 복구 및 배포: 연차관리시스템 (Leave Management System) GitHub Pages 복원

### 📌 이슈 분석
- `LeaveManagementSystem/frontend` 디렉토리(연차관리시스템)가 병원 재고관리 시스템 구현 시 잘못 덮어씌워져 `https://dispire.github.io/leave-management-server/`에 메디컬 원내 중앙재고센터 화면이 배포됨.

### 🛠️ 복구 계획 및 단계
1. `LeaveManagementSystem/frontend` 내에서 오염 이전의 최신 연차관리시스템 커밋(`95c5152`)으로 코드 복원 (`git checkout 95c5152 -- .`)
2. `npm run build`를 통해 연차관리시스템 프론트엔드 정상 빌드 검증
3. `npm run deploy` 실행하여 `gh-pages` 브랜치에 연차관리시스템 재배포
4. 변경 사항 `git commit` 및 `git push origin master` 수행

---

## 🔐 직원 본인 개인 정보 수정 및 비밀번호 확인/변경 기능 반영 (2026-09-01)

### 📌 요구사항 및 구현 현황
- **상단 헤더 전용 버튼 추가**: 로그인된 모든 직원(일반 사원 및 관리자) 상단 헤더에 `[👤 내 정보 / 비밀번호 변경]` 버튼 및 아바타/이름 직관적 클릭 트리거 연동.
- **개인 정보 수정 탭**: 성명, 연락처(전화번호 자동 포맷팅), 소속 부서, 이메일 수정 지원. (입사일/권한은 보안 읽기 전용 표출)
- **비밀번호 확인 및 변경 탭**:
  1. 현재 비밀번호 👁️ 눈 모양 토글(시각적 문자 직접 확인) + `[현재 비밀번호 확인]` 백엔드 실시간 검증 버튼 제공.
  2. 신규 비밀번호 영문/숫자 혼합 8자 이상 유효성 정규식 실시간 알림.
  3. 비밀번호 재입력 확인 일치 여부 실시간 안내 및 `employeeAPI.updateEmployee` 백엔드 동기화.

---

## 🕸️ 신규 프로젝트: 페이지 자동 수집용 Python 프로그램 (`PageCollector`) (2026-09-02)

### 📌 프로젝트 개요 및 분석
- **프로젝트명**: `PageCollector` (경로: `f:\Antigravity\PageCollector`)
- **핵심 요구사항**:
  - 임의의 메인 웹 URL(예: `https://blog.newswire.co.kr/?cat=6`)을 입력받아 전체 페이지에 위치한 게시글의 제목과 링크를 수집.
  - **저장 파일명 형식**: `웹주소_일자.xlsx` (예: `blog.newswire.co.kr_cat6_20260903.xlsx`).
  - 제미나이 기존 순차 스크립트 대비 수집 효율성 및 속도 극대화 요구.

### 🛠️ 구현 핵심 사양
1. **`generate_filename_from_url()`**: 입력 URL 분석을 통한 도메인/카테고리 슬러그 추출 및 `YYYYMMDD` 날짜 조합 파일명 (`.xlsx`) 자동 생성.
2. **`detect_max_pages()` & `ThreadPoolExecutor`**: 첫 페이지 분석으로 전체 페이지 수(20페이지) 자동 감지 후 10개 병렬 스레드로 2.97초 만에 233건 전수 수집 완료.
3. **`extract_articles()`**: 다양한 블로그/뉴스 테마에 대응하는 다중 선택자(`article h2 a`, `.entry-title a` 등) 및 절대 경로 자동 변환.
4. **`openpyxl` 통합 서식 엑셀 저장**: 기존 CSV 저장 시 사용자 수정사항 유실 문제 해소를 위해 `.xlsx` 서식 포맷으로 변경.
   - 다크 네이비 헤더 강조 스타일 적용
   - 엑셀 열 너비 한글/영문 자동맞춤 (Auto-fit)
   - 링크 클릭 시 브라우저 자동 이동 하이퍼링크 지정

### 📄 생성 및 수집 검증
- **수집 대상**: `https://blog.newswire.co.kr/?cat=6`
- **수집 항목**: 총 233건 (1페이지 ~ 20페이지)
- **검증 첫 번째 게시글**: `명사를 줄줄이 잇지 말고, 동사로 풀어 쓰자` (`https://blog.newswire.co.kr/?p=19136`)
- **검증 완료 파일**: `PageCollector/blog.newswire.co.kr_cat6_20260903.xlsx`

---

## ⚡ 신규 프로젝트: Windows PC 최적화 및 저용량 디스크/메모리 관리 시스템 (`PCOptimizer`) (2026-09-03)

### 📌 프로젝트 개요 및 분석
- **프로젝트명**: `PCOptimizer` (경로: `f:\Antigravity\PCOptimizer`)
- **주요 목적**: AI 작업(PyTorch, HuggingFace, Ollama 등) 및 다중 브라우저 탭 사용 시 발생하는 메모리/CPU 속도 저하를 해소하고, Windows 저장공간(C드라이브) 부족 문제를 해결하는 원클릭 GUI 최적화 프로그램 개발.

### 🛠️ 주요 기능 사양
1. **실시간 리소스 모니터링 & 원클릭 메모리 최적화**:
   - Win32 `EmptyWorkingSet` API 호출로 사용하지 않는 메모리를 OS로 실시간 즉시 환수 (RAM 2~8GB 확보).
2. **AI / 개발자 / Windows 시스템 특화 클리너**:
   - HuggingFace 모델 캐시 (`~/.cache/huggingface`), PyTorch/Pip/NPM 빌드 캐시 탐지 및 용량 확보.
   - Windows Temp, 업데이트 다운로드 찌꺼기, 브라우저 캐시 정돈.
   - **`hiberfil.sys` 원클릭 비활성화** 지원 (최대 절전 미사용 시 15~30GB 공간 즉시 확보).
3. **CompactOS & 무손실 파일 압축 모듈**:
   - Windows 시스템 파일 및 응용 프로그램 압축을 통해 5~15GB 디스크 용량 자동 절감.
4. **다크 모드 데스크톱 GUI (`CustomTkinter`)**:
   - 세련된 프리미엄 다크모드 인터페이스 제공.

---

## 🏢 네이버 부동산 데이터 수집 프로젝트 점검 및 성산동 아파트 매매 수집 (`NaverRealEstate`) (2026-09-03)

### 📌 프로젝트 개요 및 점검 결과
- **프로젝트명**: `NaverRealEstate` (경로: `f:\Antigravity\NaverRealEstate`)
- **점검 배경**: 네이버 부동산 웹사이트 도메인 및 API 구조 개편(기존 URL 404 리다이렉트 발생)으로 인한 작동 여부 점검 및 원인 수정.
- **지역 수집 검증**: **서울특별시 마포구 성산동 아파트 매매** 데이터 수집 요구사항 실행.

### 🛠️ 점검 및 수정 결과 사양
1. **네이버 부동산 웹 URL 및 API 구조 변경 대처**:
   - 기존 `new.land.naver.com/houses?...` 방식의 구 단지/매물 주소가 Naver 차단 및 404 리다이렉트 처리되는 현상 확인.
   - **Playwright / Chromium 엔진 기반 브라우저 세션 자동화 (`naver_land_playwright.py`)** 도입으로 네이버 신규 검색 인프라에 대응하여 안정적인 데이터 수집 체계 완성.
2. **원하는 지역(서울특별시 마포구 성산동) 아파트 매매 수집 성공**:
   - `서울특별시 마포구 성산동` 지역 탐색 및 성산동 소재 아파트 매매 물량 전수 수집 완료.
   - **수집 항목**: 단지/매물명, 거래방식, 매매 가격, 면적(공급/전용 m²), 층수, 방향, 매물 특징, 공인중개사 정보.
   - **주요 수집 아파트 단지**: 성산시영아파트 (3,710세대 33개동), 상암월드컵아이파크1차, 월드타운대림, 성산월드타운, KCC오피스텔 등 51건 수집.
3. **사용자 전용 데스크톱 GUI 프로그램 (`app_gui.py`) 및 원클릭 실행 파일 (`run_app.bat`)**:
   - **수집 희망 지역**: 자유 텍스트 입력 (예: 서울특별시 마포구 성산동, 마포구 공덕동, 강남구 대치동 등).
   - **네이버 부동산 매물 유형 11종 지원**: `아파트`, `재건축`, `오피스텔`, `빌라`, `아파트 분양권`, `오피스텔 분양권`, `원룸`, `단독/다가구`, `전원주택`, `상가주택`, `재개발`.
   - **네이버 부동산 거래 유형 4종 지원**: `매매`, `전세`, `월세`, `단기임대`.
   - 실시간 진행 상황 및 로그 모니터링 텍스트 박스 제공.
   - 더블 클릭으로 누구나 간편하게 실행할 수 있는 `run_app.bat` 아이콘 파일 구성.
4. **`지역_매물조건_수집일자` 표준 파일 저장 규칙 구현**:
   - 데이터 저장 시 파일명 규격을 **`지역_매물조건_수집일자`** 형식으로 자동 조합 지정.
   - 생성 예시: `서울특별시마포구성산동_아파트_매매_20260903.csv`, `서울특별시마포구성산동_빌라_연립_매매_20260903.xlsx`, `서울특별시마포구성산동_원룸_월세_20260903.json`.
5. **슬래시(`/`) 특수문자 치환 예외 처리 & 배치 파일 인코딩 보완**:
   - `빌라/연립`, `단독/다가구` 등 매물/지역 유형에 슬래시(`/`)가 들어갈 경우 윈도우 파일 경로 탐색 에러(`FileNotFoundError: [Errno 2] No such file or directory`)가 발생하는 현상을 방지하도록 `sanitize_filename_part()` 치환기 적용 (`빌라_연립`, `단독_다가구` 형태로 안전 자동 변환).
   - `run_app.bat` 배치 파일 실행 시 Windows CMD 한글 인코딩 오작동을 완전히 방지하도록 배치 명령어 표준화 완료.
6. **단지별 개별 실제 매물 (동, 층, 가격, 면적, 향, 특징, 중개업소) 400건 전수 수집 파이프라인 완성 (2026-09-03)**:
   - 기존 단지 개요(Complex Overview)에 그치던 한계를 해소하고, 네이버 부동산 보안 인증 Bearer 토큰 동적 수집 엔진을 탑재.
   - 해당 지역 모든 단지(성산시영, 월드타운대림, 성산e편한세상, 상암월드컵아이파크 등)의 **실제 개별 매물 400건 전수**(동 번호, 층수, 매매가/보증금, 공급/전용면적, 향, 매물 특징/태그, 담당 중개업소, 확인일자)를 완벽히 정밀 추출하여 CSV, Excel, JSON에 저장 완료.

---

## 📚 신규 프로젝트: 폴더 간 작가명 중복 검색 시스템 (`AuthorDuplicateFinder`) (2026-09-05)

### 📌 프로젝트 개요 및 분석
- **프로젝트명**: `AuthorDuplicateFinder` (경로: `f:\Antigravity\AuthorDuplicateFinder`)
- **핵심 목적**: 서로 다른 두 폴더(폴더 A, 폴더 B)에 저장된 파일들의 파일명 규칙(`[작가명]...`)에 따라 정규표현식으로 작가명을 추출하고, 두 폴더 간 중복(교집합) 존재하는 작가명 및 매칭 파일 목록을 한눈에 비교 분석하며 CSV/Excel로 추출하는 GUI 프로그램 개발.

### 🛠️ 구현 핵심 사양
1. **정규표현식 기반 작가명 파싱 엔진 (`^\[(.*?)\]`)**:
   - 파일명 맨 앞의 대괄호 내 작가명을 자동 추출 및 공백 정돈 처리.
   - 하위 폴더 포함 스캔 옵션(재귀 탐색) 지원.
2. **직관적인 Tkinter/TTK GUI 시스템 (`app_gui.py`)**:
   - 폴더 A, B 경로 선택 다이얼로그 및 검색 키워드 필터링 지원.
   - 중복 작가명, 폴더 A 매칭 파일 수/목록, 폴더 B 매칭 파일 수/목록 Treeview 표 정렬 표출.
   - 더블 클릭 시 선택 항목 파일 상세 보기 및 윈도우 탐색기(`explorer`) 위치 바로가기 연동.
3. **엑셀 완벽 호환 데이터 내보내기**:
   - `utf-8-sig` (BOM 포함 UTF-8) 인코딩 CSV 파일 생성으로 Excel에서 한글 깨짐 완전 방지.
4. **원클릭 배치 파일 지원 (`run_app.bat`)**:
   - Windows 사용자 누구나 간편하게 앱을 즉시 실행할 수 있는 실행 환경 구성.
