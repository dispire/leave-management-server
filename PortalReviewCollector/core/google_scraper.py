"""
Google Maps Review Scraper
Extracts reviews from Google Maps using Playwright with isolated temporary browser context.
Supports Google Maps URLs (google.com/maps, maps.app.goo.gl), short links, or business name search.
"""
import re
import asyncio
import tempfile
import urllib.parse
from typing import List, Dict, Any, Optional, Callable
from playwright.async_api import async_playwright, Page, BrowserContext


class GoogleScraper:
    def __init__(self, logger: Optional[Callable[[str], None]] = None):
        self.logger = logger or print

    def log(self, msg: str):
        self.logger(f"[GoogleScraper] {msg}")

    async def scrape(self, target_input: str, max_reviews: int = 50) -> List[Dict[str, Any]]:
        """
        Scrapes visitor reviews from Google Maps.
        target_input can be a Google Maps URL or place search query.
        """
        user_data_dir = tempfile.mkdtemp(prefix="playwright_google_")
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
                target_input = target_input.strip()
                if target_input.startswith("http://") or target_input.startswith("https://"):
                    nav_url = target_input
                else:
                    nav_url = f"https://www.google.com/maps/search/{urllib.parse.quote(target_input)}"

                self.log(f"구글 지도 접속 중: {nav_url}")
                await page.goto(nav_url, wait_until="domcontentloaded", timeout=25000)
                await page.wait_for_timeout(3000)

                # Consent / Cookie popup check
                consent_btn = page.locator("button:has-text('모두 동의'), button:has-text('동의'), button:has-text('Accept all')")
                if await consent_btn.count() > 0:
                    try:
                        await consent_btn.first.click()
                        await page.wait_for_timeout(1500)
                    except Exception:
                        pass

                # If multiple search results, click the first place card
                first_card = page.locator("a.hfpxzc, div.Nv2PK a")
                if await first_card.count() > 0:
                    try:
                        self.log("검색 목록에서 첫 번째 장소 선택...")
                        await first_card.first.click()
                        await page.wait_for_timeout(2500)
                    except Exception:
                        pass

                # Extract place title
                place_title = ""
                title_el = page.locator("h1.DUwDvf, div.tAiLnf, h1")
                if await title_el.count() > 0:
                    place_title = (await title_el.first.inner_text()).strip()
                if not place_title:
                    raw_title = await page.title()
                    place_title = raw_title.replace("- Google 지도", "").replace("Google Maps", "").strip(" -:")
                if not place_title:
                    place_title = target_input

                self.log(f"📍 사업장명: {place_title}")

                # Switch to Review tab
                review_tab = page.locator("button[role='tab']:has-text('리뷰'), div[role='tab']:has-text('리뷰'), button:has-text('리뷰')")
                if await review_tab.count() > 0:
                    self.log("리뷰 탭 클릭...")
                    await review_tab.first.click()
                    await page.wait_for_timeout(2000)

                # Scroll down in the reviews panel to load reviews
                self.log("리뷰 스크롤 로딩 중...")
                prev_review_count = 0
                scroll_attempts = 0
                max_scroll_attempts = (max_reviews // 5) + 5

                while scroll_attempts < max_scroll_attempts:
                    current_count = await page.locator("div.jftiEf, div[data-review-id]").count()
                    if current_count >= max_reviews:
                        break

                    # Scroll the review container or page
                    scrolled = await page.evaluate("""() => {
                        const containers = document.querySelectorAll('div.m6QErb[aria-label], div.m6QErb.DxyBCb, div[role="feed"]');
                        if (containers.length > 0) {
                            const lastContainer = containers[containers.length - 1];
                            lastContainer.scrollTop += 2000;
                            return true;
                        }
                        window.scrollBy(0, 1000);
                        return false;
                    }""")

                    await page.wait_for_timeout(1500)
                    new_count = await page.locator("div.jftiEf, div[data-review-id]").count()
                    if new_count == prev_review_count:
                        scroll_attempts += 1
                    else:
                        scroll_attempts = 0
                    prev_review_count = new_count

                # Click "자세히" / "더보기" within review text to expand truncated text
                more_btns = page.locator("button.w8nwRe.kyuRq, button:has-text('자세히'), button:has-text('더보기')")
                more_count = await more_btns.count()
                for idx in range(min(more_count, max_reviews)):
                    try:
                        btn = more_btns.nth(idx)
                        if await btn.is_visible():
                            await btn.click(timeout=400)
                    except Exception:
                        pass

                # Extract reviews
                review_elements = page.locator("div.jftiEf, div[data-review-id]")
                count = await review_elements.count()
                self.log(f"화면에 렌더링된 구글 리뷰 카드 수: {count}건 (목표: {max_reviews}건)")

                for i in range(min(count, max_reviews)):
                    el = review_elements.nth(i)
                    try:
                        raw_text = (await el.inner_text()).strip()
                        if not raw_text:
                            continue

                        # Author
                        author_el = el.locator("div.d4r55, button.al6Kxe, div.WNx5W")
                        author = "익명"
                        if await author_el.count() > 0:
                            author = (await author_el.first.inner_text()).strip()

                        # Rating (aria-label: 별표 5개 중 5개 / Rated 5.0 out of 5)
                        rating = None
                        star_el = el.locator("span.kvMYJc")
                        if await star_el.count() > 0:
                            aria_label = await star_el.first.get_attribute("aria-label") or ""
                            r_match = re.search(r"([0-9.]+)", aria_label)
                            if r_match:
                                rating = float(r_match.group(1))
                        if rating is None:
                            # Count star icons in the element
                            star_icons = await el.locator(".elHjhb, span[class*='star']").count()
                            if star_icons > 0:
                                rating = float(star_icons)

                        # Date / Time relative (e.g. 3개월 전, 1년 전, 어제)
                        date_el = el.locator("span.rsqaWe")
                        date_str = ""
                        if await date_el.count() > 0:
                            date_str = (await date_el.first.inner_text()).strip()

                        # Review text
                        content_el = el.locator("span.wiI7pd, div.MyEned")
                        content = ""
                        if await content_el.count() > 0:
                            content = (await content_el.first.inner_text()).strip()
                        else:
                            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
                            text_candidates = [l for l in lines if len(l) > 10 and not any(k in l for k in ["개월 전", "년 전", "리뷰", "사진", "가이드"])]
                            if text_candidates:
                                content = " ".join(text_candidates)

                        content = content.replace("자세히", "").replace("더보기", "").strip()

                        # Local Guide check
                        is_local_guide = "지역 가이드" in raw_text or "Local Guide" in raw_text
                        verification = "구글 로컬가이드" if is_local_guide else "구글 일반리뷰"

                        reviews_list.append({
                            "portal": "Google",
                            "place_name": place_title,
                            "place_id": target_input if len(target_input) < 50 else "",
                            "author": author,
                            "rating": rating,
                            "date": date_str,
                            "verification": verification,
                            "content": content,
                            "tags": "",
                            "raw_snippet": raw_text[:200]
                        })

                    except Exception as e:
                        self.log(f"구글 리뷰 #{i+1} 파싱 중 오류: {e}")

                self.log(f"✅ 구글 지도 리뷰 {len(reviews_list)}건 수집 완료")

            except Exception as e:
                self.log(f"구글 수집 중 예외 발생: {e}")
            finally:
                await browser.close()

        return reviews_list
