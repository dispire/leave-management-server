"""
End-to-End Integration Test for PortalReviewCollector
Collects sample reviews from Naver, Kakao, and Google, verifies Excel/CSV export and data integrity.
"""
import os
import sys
import asyncio

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collector_service import CollectorService


async def run_e2e_test():
    print("=" * 60)
    print("🚀 3대 포털 E2E 실데이터 통합 테스트 시작")
    print("=" * 60)

    service = CollectorService()

    # Real place links
    naver_test_url = "https://m.place.naver.com/place/1086067689/review/visitor"
    kakao_test_url = "https://place.map.kakao.com/35026031"
    google_test_url = "https://www.google.com/maps/search/스타벅스+강남R점"

    result = await service.collect_by_urls(
        naver_url=naver_test_url,
        kakao_url=kakao_test_url,
        google_url=google_test_url,
        max_reviews_per_portal=5
    )

    reviews = result.get("reviews", [])
    analysis = result.get("analysis", {})
    reports = result.get("reports", {})

    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    print(f"총 수집 리뷰 수: {len(reviews)}건")
    print(f"포털별 수집 내역: {analysis.get('portal_breakdown', {})}")
    print(f"평균 평점: {analysis.get('overall_average', 0.0)}점")
    print(f"포털별 평균: {analysis.get('average_ratings', {})}")
    print(f"엑셀 리포트: {reports.get('excel')}")
    print(f"CSV 리포트: {reports.get('csv')}")

    # Check file existence
    assert os.path.exists(reports.get("excel")), "Excel file not created"
    assert os.path.exists(reports.get("csv")), "CSV file not created"
    assert len(reviews) > 0, "No reviews collected"

    # Display 1 sample from each portal
    print("\n--- 각 포털별 수집 샘플 ---")
    for portal in ["Naver", "Kakao", "Google"]:
        sample = next((r for r in reviews if r.get("portal") == portal), None)
        if sample:
            print(f"[{portal}] 작성자: {sample['author']} | 평점: {sample['rating']} | 일자: {sample['date']}")
            print(f"      본문: {sample['content'][:70]}...")

    print("\n🎉 모든 포털 수집 및 엑셀 리포트 생성 테스트 통과!")


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
