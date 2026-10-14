"""
Collector Service
Orchestrates multi-portal review collection from Naver, Kakao, and Google.
Supports both direct URL inputs and unified place name search.
"""
import os
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable

from core.naver_scraper import NaverScraper
from core.kakao_scraper import KakaoScraper
from core.google_scraper import GoogleScraper
from core.data_exporter import DataExporter
from core.analyzer import ReviewAnalyzer


class CollectorService:
    def __init__(self, 
                 log_callback: Optional[Callable[[str], None]] = None,
                 progress_callback: Optional[Callable[[float, str], None]] = None):
        self.log_cb = log_callback or print
        self.progress_cb = progress_callback or (lambda p, m: None)

    def log(self, msg: str):
        self.log_cb(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

    def progress(self, pct: float, msg: str):
        self.progress_cb(pct, msg)

    async def collect_by_urls(self, 
                              naver_url: str = "",
                              kakao_url: str = "",
                              google_url: str = "",
                              max_reviews_per_portal: int = 30) -> Dict[str, Any]:
        """Collects reviews from provided direct portal URLs."""
        self.log("🚀 [직접 링크 수집 모드] 수집 작업을 시작합니다...")
        all_reviews: List[Dict[str, Any]] = []

        active_targets = []
        if naver_url.strip():
            active_targets.append(("Naver", naver_url.strip()))
        if kakao_url.strip():
            active_targets.append(("Kakao", kakao_url.strip()))
        if google_url.strip():
            active_targets.append(("Google", google_url.strip()))

        if not active_targets:
            self.log("⚠️ 입력된 포털 링크가 없습니다.")
            return {"reviews": [], "analysis": {}, "reports": {}}

        total_steps = len(active_targets)
        for idx, (portal, target) in enumerate(active_targets, 1):
            base_pct = (idx - 1) / total_steps * 100
            self.progress(base_pct, f"{portal} 리뷰 수집 준비 중...")
            self.log(f"▶️ [{portal}] 수집 시작: {target}")

            try:
                if portal == "Naver":
                    scraper = NaverScraper(logger=self.log)
                    results = await scraper.scrape(target, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
                elif portal == "Kakao":
                    scraper = KakaoScraper(logger=self.log)
                    results = await scraper.scrape(target, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
                elif portal == "Google":
                    scraper = GoogleScraper(logger=self.log)
                    results = await scraper.scrape(target, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
            except Exception as e:
                self.log(f"❌ [{portal}] 수집 실패: {e}")

            self.progress(idx / total_steps * 100, f"{portal} 수집 완료")

        return self._finalize_results(all_reviews)

    async def collect_by_query(self, 
                               business_name: str,
                               portals: Optional[List[str]] = None,
                               max_reviews_per_portal: int = 30) -> Dict[str, Any]:
        """Collects reviews across chosen portals by searching business name."""
        portals = portals or ["Naver", "Kakao", "Google"]
        self.log(f"🔍 [통합 검색 수집 모드] 대상 사업장: '{business_name}' (포털: {', '.join(portals)})")
        all_reviews: List[Dict[str, Any]] = []

        total_steps = len(portals)
        for idx, portal in enumerate(portals, 1):
            base_pct = (idx - 1) / total_steps * 100
            self.progress(base_pct, f"{portal} 탐색 및 수집 중...")
            self.log(f"▶️ [{portal}] '{business_name}' 검색 및 수집 시작...")

            try:
                if portal == "Naver":
                    scraper = NaverScraper(logger=self.log)
                    results = await scraper.scrape(business_name, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
                elif portal == "Kakao":
                    scraper = KakaoScraper(logger=self.log)
                    results = await scraper.scrape(business_name, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
                elif portal == "Google":
                    scraper = GoogleScraper(logger=self.log)
                    results = await scraper.scrape(business_name, max_reviews=max_reviews_per_portal)
                    all_reviews.extend(results)
            except Exception as e:
                self.log(f"❌ [{portal}] 검색 수집 실패: {e}")

            self.progress(idx / total_steps * 100, f"{portal} 수집 완료")

        return self._finalize_results(all_reviews)

    def _finalize_results(self, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyzes and exports the collected reviews."""
        self.progress(95, "통계 분석 및 리포트 파일 생성 중...")
        analysis = ReviewAnalyzer.analyze(reviews)

        # Output paths
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_dir = os.path.join(os.getcwd(), "output_reports")
        os.makedirs(out_dir, exist_ok=True)

        excel_path = os.path.join(out_dir, f"포털리뷰수집결과_{timestamp}.xlsx")
        csv_path = os.path.join(out_dir, f"포털리뷰수집결과_{timestamp}.csv")
        json_path = os.path.join(out_dir, f"포털리뷰수집결과_{timestamp}.json")

        DataExporter.export_excel(reviews, excel_path)
        DataExporter.export_csv(reviews, csv_path)
        DataExporter.export_json(reviews, json_path)

        self.log(f"📁 엑셀 리포트 저장 완료: {excel_path}")
        self.log(f"📁 CSV 리포트 저장 완료: {csv_path}")
        self.progress(100, f"수집 완료 (총 {len(reviews)}건)")

        return {
            "reviews": reviews,
            "analysis": analysis,
            "reports": {
                "excel": excel_path,
                "csv": csv_path,
                "json": json_path
            }
        }
