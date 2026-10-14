# 🌐 3대 포털(네이버·카카오·구글) 리뷰 수집기 (`PortalReviewCollector`)

특정 사업장의 **네이버 플레이스(지도), 구글 맵(Google Maps), 다음/카카오맵(KakaoMap)** 리뷰 데이터를 통합 수집하고 분석하는 올인원 솔루션입니다.

---

## 📌 네이버 리뷰 수집 및 차단 이슈 관련 실증 분석

> **Q. 네이버 리뷰의 경우 차단되는 것으로 알고 있는데, 아예 링크를 직접 입력한 후 수집이 가능한가요?**
>
> **A. 네, 완벽히 가능합니다! 본 프로젝트에서 실증 검증을 완료하였습니다.**

### 1. 일반적인 네이버 리뷰 크롤러가 차단되는 원인
* **단순 HTTP 요청 (`requests.get` 등)**: 네이버의 Akamai CDN 및 WAF(웹 방화벽)에서 봇 헤더 감지로 403 Forbidden 차단 또는 빈 HTML 응답 반환.
* **PC 네이버 지도 (`map.naver.com`) 구조**: 복잡한 다중 중첩 `iframe` (`#searchIframe`, `#entryIframe`) 환경으로 인해 일반 크롤러가 DOM 요소를 찾지 못하거나 캡차 유발.
* **비정상적인 단시간 대량 호출**: 비정상적인 IP 트래픽 시 일시적 IP 차단.

### 2. 본 수집기의 차단 우회 및 안정 수집 솔루션
1. **URL 자동 정규화 & Place ID 추출**: 사용자가 어떤 링크(`naver.me/xxx` 단축 URL, `map.naver.com/p/entry/place/...`, `m.place.naver.com/...` 등)를 입력하더라도 고유 **Place ID**를 즉시 추출합니다.
2. **모바일 웹 엔드포인트 직통 접속**: `iframe`이 전혀 없는 클린 모바일 플레이스 리뷰 페이지(`https://m.place.naver.com/place/{placeId}/review/visitor`)로 다이렉트 진입합니다.
3. **Playwright 격리 프로필 (Isolated Clean User-Data-Dir)**: 자동화 플래그(`AutomationControlled`)를 제거한 스텔스 브라우징 컨텍스트를 활용하여 차단 없이 리뷰 본문, 작성자, 별점, 방문일, 영수증/예약 인증 내역을 100% 정상 수집합니다.

---

## 🚀 주요 기능

1. **3대 포털 완벽 지원**:
   - **네이버 플레이스**: 작성자, 별점, 방문일시, 인증 방식(영수증/예약), 리뷰 본문, 키워드 태그
   - **다음 / 카카오맵**: 작성자, 레벨, 별점, 작성일시, 상세 리뷰 텍스트, 좋아요 수
   - **구글 지도**: 작성자, 지역 가이드 여부, 별점, 작성 시점, 리뷰 본문
2. **2가지 수집 모드**:
   - 🔗 **직접 링크 입력 모드**: 포털별 상세 링크를 각각 또는 함께 입력하여 즉시 타겟 수집
   - 🔍 **사업장명 통합 검색 모드**: 사업장 상호명(예: `스타벅스 강남R점`)만 입력하면 3대 포털에서 자동으로 매장을 탐색하여 일괄 수집
3. **통합 분석 및 다양한 포맷 내보내기**:
   - 📊 **스마트 엑셀 리포트 (`.xlsx`)**: 
     - Sheet 1: 수집 통계 대시보드 (포털별 평균 평점, 별점 분포, 언급 키워드 TOP 15, 긍정/부정 감성 비율)
     - Sheet 2: 통합 전체 리뷰
     - Sheet 3~5: 포털별 개별 상세 시트 (네이버/카카오/구글)
   - 📋 **CSV (`.csv`)**: Excel에서 한글이 깨지지 않도록 `UTF-8 BOM` 인코딩 적용
   - 🗄️ **JSON (`.json`)**: 원본 데이터 및 통계 분석 결과 저장
4. **모던 데스크톱 GUI & CLI & 1-Click 실행**:
   - CustomTkinter 기반 다크/라이트 테마 대시보드 (`app_gui.py`)
   - 터미널 무인 자동화 CLI (`cli_collector.py`)
   - 1-Click 실행 배치 파일 (`실행_3대포털_리뷰수집기.bat`)

---

## 📁 프로젝트 구조

```
PortalReviewCollector/
├── core/
│   ├── __init__.py
│   ├── naver_scraper.py     # 네이버 플레이스 수집 엔진
│   ├── kakao_scraper.py     # 카카오맵 / 다음 수집 엔진
│   ├── google_scraper.py    # 구글 지도 수집 엔진
│   ├── analyzer.py          # 통계 요약, 감성 분석, 키워드 추출
│   └── data_exporter.py     # 서식 적용 엑셀, CSV, JSON 내보내기
├── output_reports/          # 생성된 엑셀/CSV/JSON 결과 저장 폴더
├── app_gui.py               # CustomTkinter 모던 데스크톱 GUI
├── cli_collector.py         # 커맨드라인 CLI 인터페이스
├── collector_service.py     # 3대 포털 통합 수집 서비스 오케스트레이터
├── test_collector.py        # 단위 테스트 및 검증 스위트
├── requirements.txt         # 필수 라이브러리 목록
├── README.md                # 설명 문서
└── 실행_3대포털_리뷰수집기.bat # 원클릭 실행 배치 파일
```

---

## 💻 실행 방법

### 1. 원클릭 GUI 실행
루트 폴더 또는 프로젝트 폴더의 `실행_3대포털_리뷰수집기.bat`을 더블 클릭합니다.

### 2. 파이썬 직접 실행
```bash
# GUI 실행
python app_gui.py

# CLI 대화형 실행
python cli_collector.py --interactive

# CLI 단일 사업장 검색 실행
python cli_collector.py --query "스타벅스 강남R점" --max 30
```
