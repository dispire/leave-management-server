"""
Naver Place Review Scraper
Extracts visitor reviews from Naver Place using Playwright with isolated temporary browser context.
Supports URL parsing (naver.me, map.naver.com, m.place.naver.com), Place ID, or search query.
"""
import re
import asyncio
import tempfile
import urllib.parse
from typing import List, Dict, Any, Optional, Callable
from playwright.async_api import async_playwright, Page, BrowserContext


class NaverScraper:
    def __init__(self, logger: Optional[Callable[[str], None]] = None):
        self.logger = logger or print

    def log(self, msg: str):
        self.logger(f"[NaverScraper] {msg}")

    def extract_place_id_from_url(self, url: str) -> Optional[str]:
        """Extracts numeric place ID from various Naver URL formats."""
        if not url:
            return None
        url = url.strip()
        # Direct numeric ID
        if url.isdigit():
            return url
            
        # Patterns like /place/12345678, /restaurant/12345678, /entry/place/12345678
        patterns = [
            r"/place/(\d+)",
            r"/restaurant/(\d+)",
            r"/hospital/(\d+)",
            r"/hairshop/(\d+)",
            r"/accommodation/(\d+)",
            r"/cafe/(\d+)",
            r"/entry/place/(\d+)",
            r"placeId=(\d+)",
            r"id=(\d+)",
        ]
        for p in patterns:
            match = re.search(p, url)
            if match:
                return match.group(1)
        return None

    async def resolve_url_to_place_id(self, page: Page, input_str: str) -> Optional[str]:
        """Resolves short links (naver.me) or searches by query to get place ID."""
        input_str = input_str.strip()
        pid = self.extract_place_id_from_url(input_str)
        if pid:
            return pid

        # If it's a short URL or non-standard link
        if input_str.startswith("http://") or input_str.startswith("https://"):
            self.log(f"단축 URL 리다이렉트 추적 중: {input_str}")
            try:
                await page.goto(input_str, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                current_url = page.url
                self.log(f"최종 리다이렉트 URL: {current_url}")
                pid = self.extract_place_id_from_url(current_url)
                if pid:
                    return pid
            except Exception as e:
                self.log(f"단축 URL 리다이렉트 실패: {e}")

        # If it's a search keyword
        self.log(f"상호명 검색으로 장소 ID 탐색: '{input_str}'")
        search_url = f"https://m.map.naver.com/search2/search.naver?query={urllib.parse.quote(input_str)}"
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2500)
            
            # Find links containing place ID
            links = await page.locator("a").evaluate_all(
                "els => els.map(e => e.href).filter(h => h && (h.includes('/place/') || h.includes('/entry/place/')))"
            )
            for l in links:
                pid = self.extract_place_id_from_url(l)
                if pid:
                    self.log(f"검색 결과에서 플레이스 ID 발견: {pid}")
                    return pid
        except Exception as e:
            self.log(f"검색어 플레이스 탐색 오류: {e}")

        return None

    async def scrape(self, target_input: str, max_reviews: int = 50) -> List[Dict[str, Any]]:
        """
        Scrapes visitor reviews from Naver Place.
        target_input can be a URL, Place ID, or place name.
        """
        user_data_dir = tempfile.mkdtemp(prefix="playwright_naver_")
        reviews_list: List[Dict[str, Any]] = []

        async with async_playwright() as p:
            browser: BrowserContext = await p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                locale="ko-KR",
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
            )
            page = await browser.new_page()

            try:
                place_id = await self.resolve_url_to_place_id(page, target_input)
                if not place_id:
                    self.log(f"❌ 네이버 플레이스 ID를 식별하지 못했습니다: {target_input}")
                    await browser.close()
                    return []

                target_review_url = f"https://m.place.naver.com/place/{place_id}/review/visitor"
                self.log(f"리뷰 페이지 접속 중: {target_review_url}")
                await page.goto(target_review_url, wait_until="domcontentloaded", timeout=25000)
                
                # Wait for review cards specifically to mount
                try:
                    await page.wait_for_selector("li.place_apply_pui, li.YeINN, div.pui__vn15t2", timeout=10000)
                    self.log("리뷰 카드 DOM 렌더링 확인됨")
                except Exception as e:
                    self.log(f"리뷰 카드 로딩 대기 시간 초과 ({e}), 현재 URL: {page.url}")
                    await page.wait_for_timeout(3500)

                # Extract place title
                place_title = ""
                title_el = page.locator("span.GHAhO, span.Fc1rA, h1, span.YouOG")
                if await title_el.count() > 0:
                    place_title = (await title_el.first.inner_text()).strip()
                if not place_title:
                    raw_title = await page.title()
                    place_title = raw_title.replace("네이버 플레이스", "").replace("네이버 지도", "").strip(" -:")
                if not place_title:
                    place_title = f"네이버장소_{place_id}"

                self.log(f"📍 사업장명: {place_title} (ID: {place_id})")

                # Expand review "더보기" pagination
                load_more_attempts = 0
                max_attempts = (max_reviews // 10) + 4

                while load_more_attempts < max_attempts:
                    current_li_count = await page.locator("li.place_apply_pui, li.YeINN, li.E9Aqx").count()
                    if current_li_count >= max_reviews:
                        break

                    more_btn = page.locator("a.fRowt, a:has-text('더보기'), button:has-text('더보기')")
                    if await more_btn.count() > 0:
                        try:
                            btn = more_btn.last
                            if await btn.is_visible():
                                await btn.click()
                                await page.wait_for_timeout(1500)
                            else:
                                break
                        except Exception:
                            break
                    else:
                        break

                    new_count = await page.locator("li.place_apply_pui, li.YeINN, li.E9Aqx").count()
                    if new_count == current_li_count:
                        load_more_attempts += 1
                    else:
                        load_more_attempts = 0

                # Click individual truncated "더보기" within reviews to reveal full text
                expand_text_btns = page.locator("a.pui__link-more, span.rvCSr, a.xHaSt")
                expand_count = await expand_text_btns.count()
                for i in range(min(expand_count, max_reviews)):
                    try:
                        btn = expand_text_btns.nth(i)
                        if await btn.is_visible():
                            await btn.click(timeout=300)
                    except Exception:
                        pass

                # Extract review items
                review_cards = page.locator("li.place_apply_pui, li.YeINN, li.E9Aqx")
                count = await review_cards.count()
                if count == 0:
                    # Fallback selectors
                    review_cards = page.locator("ul > li:has(div.pui__vn15t2), ul > li:has(span.zPfVt)")
                    count = await review_cards.count()

                self.log(f"화면에 렌더링된 리뷰 카드 수: {count}건 (목표: {max_reviews}건)")

                for i in range(min(count, max_reviews)):
                    card = review_cards.nth(i)
                    try:
                        raw_text = (await card.inner_text()).strip()
                        if not raw_text:
                            continue

                        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

                        # Author
                        author_el = card.locator(".P1zUJ, .sBWyy, .qHQD7, .pui__author, [class*='author']")
                        author = ""
                        if await author_el.count() > 0:
                            author = (await author_el.first.inner_text()).strip()
                        if not author and lines:
                            # Usually first line is author nickname
                            author = lines[0]
                        if not author:
                            author = "익명"

                        # Rating (if present)
                        rating_match = re.search(r"별점\s*([0-9.]+)\s*점?", raw_text)
                        rating = float(rating_match.group(1)) if rating_match else None

                        # Visit Date
                        date_match = re.search(r"(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)", raw_text)
                        if not date_match:
                            date_match = re.search(r"방문일\s*([0-9.]+)", raw_text)
                        if not date_match:
                            date_match = re.search(r"(\d{4}\.\s*\d{1,2}\.\s*\d{1,2})", raw_text)
                        visit_date = date_match.group(1).strip() if date_match else ""

                        # Verification type (영수증 / 예약 / 결제내역 등)
                        verification = ""
                        for v_keyword in ["영수증", "예약", "결제내역", "주문"]:
                            if v_keyword in raw_text:
                                verification = v_keyword
                                break
                        if not verification:
                            verification = "방문자 인증"

                        # Review text
                        content_el = card.locator("div.pui__vn15t2, span.zPfVt, div.zPfVt")
                        content = ""
                        if await content_el.count() > 0:
                            content = (await content_el.first.inner_text()).strip()
                        else:
                            # Extract candidates from lines
                            text_candidates = [
                                l for l in lines 
                                if len(l) > 15 and not any(k in l for k in ["방문일", "영수증", "인증", "더보기", "팔로우", "사진", "리뷰 "])
                            ]
                            if text_candidates:
                                content = " ".join(text_candidates)

                        # Keyword tags
                        tags = []
                        tag_els = card.locator("div.pui__keyword, span.pui__keyword, li.pui__keyword")
                        tag_count = await tag_els.count()
                        for t_idx in range(tag_count):
                            t_text = (await tag_els.nth(t_idx).inner_text()).strip()
                            if t_text and len(t_text) > 1 and t_text not in tags:
                                tags.append(t_text)

                        content = content.replace("더보기", "").strip()

                        reviews_list.append({
                            "portal": "Naver",
                            "place_name": place_title,
                            "place_id": place_id,
                            "author": author,
                            "rating": rating,
                            "date": visit_date,
                            "verification": verification,
                            "content": content,
                            "tags": ", ".join(tags),
                            "raw_snippet": raw_text[:200]
                        })

                    except Exception as e:
                        self.log(f"리뷰 #{i+1} 파싱 중 오류: {e}")

                self.log(f"✅ 네이버 플레이스 리뷰 {len(reviews_list)}건 수집 완료")

            except Exception as e:
                self.log(f"네이버 수집 중 예외 발생: {e}")
            finally:
                await browser.close()

        return reviews_list
