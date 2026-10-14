"""
CLI Interface for PortalReviewCollector
Allows running review collection from terminal with arguments or interactive prompt.
"""
import os
import sys
import asyncio
import argparse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collector_service import CollectorService


def main():
    parser = argparse.ArgumentParser(description="3대 포털(네이버/카카오/구글) 리뷰 수집기 CLI")
    parser.add_argument("--query", "-q", type=str, help="사업장명 통합 검색어 (예: '스타벅스 강남R점')")
    parser.add_argument("--naver", "-n", type=str, help="네이버 플레이스 URL 또는 장소 ID")
    parser.add_argument("--kakao", "-k", type=str, help="카카오맵/다음 URL 또는 장소 ID")
    parser.add_argument("--google", "-g", type=str, help="구글 지도 URL 또는 검색어")
    parser.add_argument("--max", "-m", type=int, default=30, help="포털당 최대 수집 리뷰 수 (기본: 30)")
    parser.add_argument("--interactive", "-i", action="store_true", help="대화형 모드로 실행")

    args = parser.parse_args()

    print("=" * 65)
    print(" ⭐ 3대 포털(네이버, 카카오, 구글) 통합 리뷰 수집기 CLI")
    print("=" * 65)

    service = CollectorService()

    if args.interactive or (not args.query and not args.naver and not args.kakao and not args.google):
        print("\n[수집 모드 선택]")
        print("1. 🔗 직접 링크 입력 (네이버, 카카오, 구글 링크)")
        print("2. 🔍 사업장 이름 검색 (3대 포털 자동 검색 및 수집)")
        choice = input("선택 번호 (1 또는 2, 기본 1): ").strip() or "1"

        if choice == "2":
            query = input("수집할 사업장명을 입력하세요 (예: 스타벅스 강남R점): ").strip()
            if not query:
                print("사업장명이 입력되지 않았습니다.")
                return
            max_r = input("포털당 최대 수집 리뷰 수 (기본 30): ").strip()
            max_reviews = int(max_r) if max_r.isdigit() else 30
            asyncio.run(service.collect_by_query(business_name=query, max_reviews_per_portal=max_reviews))
        else:
            n_url = input("네이버 플레이스 링크 (없으면 Enter): ").strip()
            k_url = input("카카오맵 링크 (없으면 Enter): ").strip()
            g_url = input("구글 지도 링크 (없으면 Enter): ").strip()
            max_r = input("포털당 최대 수집 리뷰 수 (기본 30): ").strip()
            max_reviews = int(max_r) if max_r.isdigit() else 30

            asyncio.run(service.collect_by_urls(
                naver_url=n_url,
                kakao_url=k_url,
                google_url=g_url,
                max_reviews_per_portal=max_reviews
            ))
    elif args.query:
        asyncio.run(service.collect_by_query(business_name=args.query, max_reviews_per_portal=args.max))
    else:
        asyncio.run(service.collect_by_urls(
            naver_url=args.naver or "",
            kakao_url=args.kakao or "",
            google_url=args.google or "",
            max_reviews_per_portal=args.max
        ))


if __name__ == "__main__":
    main()
