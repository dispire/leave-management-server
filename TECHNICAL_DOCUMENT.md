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

## ⚠️ 다른 프로젝트 진행 시 배포 주의사항 (Deployment Rules)
- **프로젝트 작업 경로 및 배포 타겟 엄격 확인**:
  - `LeaveManagementSystem/frontend` 디렉토리는 GitHub 레포지토리 `leave-management-server` (연차관리시스템 배포 URL: `https://dispire.github.io/leave-management-server/`)와 연동되어 있습니다.
  - 별도의 신규 프로젝트(예: `HospitalInventorySystem`, `ImageDownloader` 등) 작업 시에는 절대 `LeaveManagementSystem/frontend` 소스 코드를 덮어쓰거나 해당 위치에서 배포를 진행하지 않고, 작업 대상 프로젝트의 전용 디렉토리 및 개별 배포 경로를 반드시 검증 후 진행합니다.




