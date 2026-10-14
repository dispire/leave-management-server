"""
Test Suite for PortalReviewCollector
Tests URL parsing, Analyzer statistics, DataExporter, and Scraper functionality.
"""
import os
import sys
import asyncio
import tempfile
import unittest

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.naver_scraper import NaverScraper
from core.kakao_scraper import KakaoScraper
from core.google_scraper import GoogleScraper
from core.analyzer import ReviewAnalyzer
from core.data_exporter import DataExporter


class TestPortalReviewCollector(unittest.TestCase):
    def test_naver_url_parsing(self):
        scraper = NaverScraper()
        # Direct ID
        self.assertEqual(scraper.extract_place_id_from_url("1086067689"), "1086067689")
        # Place mobile URL
        self.assertEqual(
            scraper.extract_place_id_from_url("https://m.place.naver.com/place/1086067689/home"),
            "1086067689"
        )
        # Restaurant URL
        self.assertEqual(
            scraper.extract_place_id_from_url("https://m.place.naver.com/restaurant/12345678/review/visitor"),
            "12345678"
        )
        # PC Map Entry URL
        self.assertEqual(
            scraper.extract_place_id_from_url("https://map.naver.com/p/entry/place/98765432"),
            "98765432"
        )

    def test_kakao_url_parsing(self):
        scraper = KakaoScraper()
        self.assertEqual(scraper.extract_place_id_from_url("35026031"), "35026031")
        self.assertEqual(
            scraper.extract_place_id_from_url("https://place.map.kakao.com/35026031"),
            "35026031"
        )
        self.assertEqual(
            scraper.extract_place_id_from_url("https://map.kakao.com/?itemId=35026031"),
            "35026031"
        )

    def test_analyzer_and_exporter(self):
        dummy_reviews = [
            {
                "portal": "Naver",
                "place_name": "테스트 매장",
                "place_id": "111",
                "author": "홍길동",
                "rating": 5.0,
                "date": "2026.10.14",
                "verification": "영수증",
                "content": "정말 친절하고 커피가 맛있어요. 공간도 쾌적하고 깔끔합니다.",
                "tags": "친절해요, 커피가맛있어요"
            },
            {
                "portal": "Kakao",
                "place_name": "테스트 매장",
                "place_id": "222",
                "author": "이몽룡",
                "rating": 4.0,
                "date": "2026.10.10",
                "verification": "카카오맵 인증",
                "content": "분위기 좋고 넓어서 편안합니다. 추천합니다.",
                "tags": ""
            },
            {
                "portal": "Google",
                "place_name": "테스트 매장",
                "place_id": "333",
                "author": "성춘향",
                "rating": 5.0,
                "date": "1주 전",
                "verification": "구글 로컬가이드",
                "content": "최고의 카페입니다. 재방문 의사 있습니다.",
                "tags": ""
            }
        ]

        # Analyze
        analysis = ReviewAnalyzer.analyze(dummy_reviews)
        self.assertEqual(analysis["total_count"], 3)
        self.assertEqual(analysis["portal_breakdown"]["Naver"], 1)
        self.assertEqual(analysis["portal_breakdown"]["Kakao"], 1)
        self.assertEqual(analysis["portal_breakdown"]["Google"], 1)
        self.assertAlmostEqual(analysis["overall_average"], 4.67, places=2)
        self.assertGreater(analysis["sentiment"]["positive_count"], 0)

        # Export test
        tmp_dir = tempfile.mkdtemp()
        excel_path = os.path.join(tmp_dir, "test_report.xlsx")
        csv_path = os.path.join(tmp_dir, "test_report.csv")
        json_path = os.path.join(tmp_dir, "test_report.json")

        DataExporter.export_excel(dummy_reviews, excel_path)
        DataExporter.export_csv(dummy_reviews, csv_path)
        DataExporter.export_json(dummy_reviews, json_path)

        self.assertTrue(os.path.exists(excel_path))
        self.assertTrue(os.path.exists(csv_path))
        self.assertTrue(os.path.exists(json_path))
        self.assertGreater(os.path.getsize(excel_path), 5000)
        self.assertGreater(os.path.getsize(csv_path), 100)
        self.assertGreater(os.path.getsize(json_path), 200)
        print("✅ 단위 테스트 및 엑셀/CSV/JSON 내보내기 검증 완료!")


if __name__ == "__main__":
    unittest.main()
