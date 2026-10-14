"""
Kakao Map / Daum Local Review Scraper
Extracts reviews from Kakao Map using Playwright with isolated temporary browser context.
Supports URL parsing (place.map.kakao.com, kko.to, map.kakao.com), Place ID, or search query.
"""
import re
import asyncio
import tempfile
import urllib.parse
from typing import List, Dict, Any, Optional, Callable
from playwright.async_api import async_playwright, Page, BrowserContext


class KakaoScraper:
    def __init__(self, logger: Optional[Callable[[str], None]] = None):
        self.logger = logger or print

    def log(self, msg: str):
        self.logger(f"[KakaoScraper] {msg}")

    def extract_place_id_from_url(self, url: str) -> Optional[str]:
        """Extracts numeric place ID from Kakao Map URL formats."""
        if not url:
            return None
        url = url.strip()
        if url.isdigit():
            return url
        patterns = [
            r"place\.map\.kakao\.com/(\d+)",
            r"itemId=(\d+)",
            r"/place/(\d+)",
            r"item_id=(\d+)",
        ]
        for p in patterns:
            match = re.search(p, url)
            if match:
                return match.group(1)
        return None

    async def resolve_url_to_place_id(self, page: Page, input_str: str) -> Optional[str]:
        """Resolves short links (kko.to) or searches via Daum/Kakao to get place ID."""
        input_str = input_str.strip()
        pid = self.extract_place_id_from_url(input_str)
        if pid:
            return pid

        # Short URL redirect handling
        if input_str.startswith("http://") or input_str.startswith("https://"):
            self.log(f"카카오 단축 URL 리다이렉트 추적 중: {input_str}")
            try:
                await page.goto(input_str, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                current_url = page.url
                self.log(f"최종 리다이렉트 URL: {current_url}")
                pid = self.extract_place_id_from_url(current_url)
                if pid:
                    return pid
            except Exception as e:
                self.log(f"단축 URL 추적 오류: {e}")

        # Search via Daum/Kakao Local
        self.log(f"다음 검색으로 카카오 장소 ID 탐색: '{input_str}'")
        search_url = f"https://search.daum.net/search?w=tot&q={urllib.parse.quote(input_str)}"
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2000)
            content = await page.content()
            matches = re.findall(r"place\.map\.kakao\.com/(\d+)", content)
            if matches:
                pid = matches[0]
                self.log(f"검색 결과에서 카카오 장소 ID 발견: {pid}")
                return pid
        except Exception as e:
            self.log(f"카카오 검색어 탐색 오류: {e}")

        return None

    async def scrape(self, target_input: str, max_reviews: int = 50) -> List[Dict[str, Any]]:
        """
        Scrapes visitor reviews from Kakao Map.
        target_input can be a URL, Place ID, or place name.
        """
        user_data_dir = tempfile.mkdtemp(prefix="playwright_kakao_")
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
                    self.log(f"❌ 카카오맵 장소 ID를 식별하지 못했습니다: {target_input}")
                    await browser.close()
                    return []

                target_url = f"https://place.map.kakao.com/{place_id}"
                self.log(f"카카오맵 장소 페이지 접속 중: {target_url}")
                await page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
                await page.wait_for_timeout(2000)

                # Extract place title
                place_title = ""
                title_el = page.locator(".tit_location, h2.tit_place, .tit_subject")
                if await title_el.count() > 0:
                    place_title = (await title_el.first.inner_text()).strip()
                if not place_title:
                    raw_title = await page.title()
                    place_title = raw_title.replace("| 카카오맵", "").replace("카카오맵", "").strip(" -:")
                if not place_title:
                    place_title = f"카카오장소_{place_id}"

                self.log(f"📍 사업장명: {place_title} (ID: {place_id})")

                # Switch to review/evaluation tab
                review_tab = page.locator("a:has-text('후기'), button:has-text('후기')")
                if await review_tab.count() > 0:
                    self.log("후기 탭 활성화 클릭...")
                    await review_tab.first.click()
                    await page.wait_for_timeout(2000)

                # Load more reviews if needed
                load_more_attempts = 0
                max_attempts = (max_reviews // 5) + 3

                while load_more_attempts < max_attempts:
                    current_count = await page.locator(".list_review > li, .group_review li").count()
                    if current_count >= max_reviews:
                        break

                    # Look for Kakao "후기 더보기" button
                    more_btn = page.locator("a.link_more:has-text('후기 더보기'), button.link_more, .paging_map a, a:has-text('더보기')")
                    btn_count = await more_btn.count()
                    if btn_count > 0:
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
                    load_more_attempts += 1

                # Extract reviews
                review_cards = page.locator(".list_review > li, .group_review > ul > li")
                count = await review_cards.count()
                self.log(f"화면에 렌더링된 카카오 후기 카드 수: {count}건 (목표: {max_reviews}건)")

                for i in range(min(count, max_reviews)):
                    card = review_cards.nth(i)
                    try:
                        raw_text = (await card.inner_text()).strip()
                        if not raw_text:
                            continue

                        # Author
                        author_el = card.locator(".link_user, .info_reviewer, .area_reviewer strong")
                        author = "익명"
                        if await author_el.count() > 0:
                            author = (await author_el.first.inner_text()).strip()
                        else:
                            # Parse from raw text
                            first_line = raw_text.split("\n")[0]
                            author = first_line.replace("리뷰어 이름,", "").strip()

                        # Rating (별점4.0 or star point)
                        rating = None
                        star_match = re.search(r"별점\s*([0-9.]+)", raw_text)
                        if star_match:
                            rating = float(star_match.group(1))
                        else:
                            # Check rating element text or width attribute
                            star_el = card.locator(".ico_star, [class*='star'], [class*='point']")
                            if await star_el.count() > 0:
                                star_text = await star_el.first.inner_text()
                                s_match = re.search(r"([0-9.]+)", star_text)
                                if s_match:
                                    rating = float(s_match.group(1))

                        # Date (YYYY.MM.DD.)
                        date_match = re.search(r"(\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?)", raw_text)
                        date_str = date_match.group(1).strip() if date_match else ""

                        # Review content
                        content = ""
                        desc_el = card.locator(".review_detail, .desc_review, .area_review p")
                        if await desc_el.count() > 0:
                            content = (await desc_el.first.inner_text()).strip()
                        else:
                            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
                            text_candidates = [l for l in lines if len(l) > 10 and not any(k in l for k in ["별점", "레벨", "신고", "좋아요"])]
                            if text_candidates:
                                content = " ".join(text_candidates)

                        # Clean content
                        content = content.replace("더보기", "").replace("접기", "").strip()

                        reviews_list.append({
                            "portal": "Kakao",
                            "place_name": place_title,
                            "place_id": place_id,
                            "author": author,
                            "rating": rating,
                            "date": date_str,
                            "verification": "카카오맵 인증",
                            "content": content,
                            "tags": "",
                            "raw_snippet": raw_text[:200]
                        })

                    except Exception as e:
                        self.log(f"카카오 리뷰 #{i+1} 파싱 중 오류: {e}")

                self.log(f"✅ 카카오맵/다음 리뷰 {len(reviews_list)}건 수집 완료")

            except Exception as e:
                self.log(f"카카오 수집 중 예외 발생: {e}")
            finally:
                await browser.close()

        return reviews_list
