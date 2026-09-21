import { chromium } from 'playwright';
import fs from 'fs';

async function testAvailableDateSearch() {
  console.log('🧪 Testing Korail Search for TODAY (2026-09-21): 청량리 ➔ 양평...');

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

    // Select Departure: 청량리
    await page.locator('.start a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const modal1 = page.locator('.ReactModal__Content');
    const tag1 = modal1.locator('a:has-text("청량리"), button:has-text("청량리")').first();
    if (await tag1.count() > 0) {
      await tag1.click();
    } else {
      await page.fill('input[name="searchTxt"]', '청량리');
      await page.click('button.btn_sch');
      await page.waitForTimeout(500);
      await page.click('a:has-text("청량리")');
    }
    await page.waitForTimeout(1000);

    // Select Arrival: 양평
    await page.locator('.end a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const modal2 = page.locator('.ReactModal__Content');
    const tag2 = modal2.locator('a:has-text("양평"), button:has-text("양평")').first();
    if (await tag2.count() > 0) {
      await tag2.click();
    } else {
      await page.fill('input[name="searchTxt"]', '양평');
      await page.click('button.btn_sch');
      await page.waitForTimeout(500);
      await page.click('a:has-text("양평")');
    }
    await page.waitForTimeout(1000);

    // Click Search Button (Default date: today)
    console.log('Clicking Search Button (Default Today)...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Current Page URL after lookup:', page.url());

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const nodes = Array.from(document.querySelectorAll('.tckList > li, tr, li[class*="List"], div[class*="tck"]')).map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 10 && (t.includes('무궁화') || t.includes('KTX') || t.includes('ITX') || t.includes('새마을') || t.includes(':')));
      
      return {
        url: location.href,
        trainRowsCount: nodes.length,
        trainRows: nodes.slice(0, 10),
        bodySnippet: bodyText.slice(0, 600)
      };
    });

    fs.writeFileSync('today_search_result.json', JSON.stringify(result, null, 2));
    console.log('Saved today_search_result.json');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testAvailableDateSearch();
