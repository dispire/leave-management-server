import asyncio, sys
sys.path.insert(0, '.')
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from core.naver_scraper import NaverScraper

async def main():
    s = NaverScraper()
    res = await s.scrape('https://m.place.naver.com/place/1086067689/review/visitor', max_reviews=5)
    print(f'Scraped Naver reviews: {len(res)}')
    for r in res:
        print(' -', r['author'], r['rating'], r['date'], r['content'][:40])

if __name__ == "__main__":
    asyncio.run(main())
