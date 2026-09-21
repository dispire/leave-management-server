import { chromium } from 'playwright';
import fs from 'fs';

async function testSeoulDaejeonSearch() {
  console.log('🧪 Testing Korail Search: 서울 ➔ 대전...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Dismiss popups
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // Departure default is 서울
    // Select Arrival: 대전
    await page.locator('.end a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const modal2 = page.locator('.ReactModal__Content');
    const tag2 = modal2.locator('a:has-text("대전"), button:has-text("대전")').first();
    if (await tag2.count() > 0) {
      await tag2.click();
    } else {
      await page.fill('input[name="searchTxt"]', '대전');
      await page.click('button.btn_sch');
      await page.waitForTimeout(500);
      await page.click('a:has-text("대전")');
    }
    await page.waitForTimeout(1000);

    // Click Search Button
    console.log('Clicking Search Button (서울 -> 대전)...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Current Page URL after lookup:', page.url());

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const nodes = Array.from(document.querySelectorAll('.tckList > li, tr, li[class*="List"], div[class*="tck"]')).map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 10 && (t.includes('무궁화') || t.includes('KTX') || t.includes('ITX') || t.includes('새마을') || t.includes(':')));
      
      return {
        url: location.href,
        trainRowsCount: nodes.length,
        trainRowsSample: nodes.slice(0, 5),
        bodySnippet: bodyText.slice(0, 800)
      };
    });

    fs.writeFileSync('seoul_daejeon_result.json', JSON.stringify(result, null, 2));
    console.log('Saved seoul_daejeon_result.json');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testSeoulDaejeonSearch();
