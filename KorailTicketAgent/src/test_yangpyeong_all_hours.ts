import { chromium } from 'playwright';
import fs from 'fs';

async function testYangpyeongAllHours() {
  console.log('🧪 Testing Korail Trains for 청량리 ➔ 양평 on 2026-09-24 (All Hours)...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Dismiss popups
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // Departure: 청량리
    await page.locator('.start a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const modal1 = page.locator('.ReactModal__Content');
    const tag1 = modal1.locator('a:has-text("청량리"), button:has-text("청량리")').first();
    if (await tag1.count() > 0) {
      await tag1.click();
    }
    await page.waitForTimeout(1000);

    // Arrival: 양평
    await page.locator('.end a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const modal2 = page.locator('.ReactModal__Content');
    const tag2 = modal2.locator('a:has-text("양평"), button:has-text("양평")').first();
    if (await tag2.count() > 0) {
      await tag2.click();
    }
    await page.waitForTimeout(1000);

    // Select Date: 24, Hour: 00 (Default midnight to get full day)
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const dateModal = page.locator('.ReactModal__Content');
    await dateModal.waitFor({ state: 'visible', timeout: 5000 });

    // Click Day 24
    await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return;
      const links = Array.from(modalEl.querySelectorAll('td:not(.disabled) a, td button:not([disabled])'));
      const found = links.find(el => (el as HTMLElement).innerText.trim() === '24');
      if (found) (found as HTMLElement).click();
    });
    await page.waitForTimeout(500);

    // Click Hour 00시 or 0시
    await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return;
      const links = Array.from(modalEl.querySelectorAll('li a, .hour_box a, a'));
      const found = links.find(el => (el as HTMLElement).innerText.trim().includes('00시') || (el as HTMLElement).innerText.trim().includes('0시'));
      if (found) (found as HTMLElement).click();
    });
    await page.waitForTimeout(500);

    // Click Apply
    await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return;
      const btns = Array.from(modalEl.querySelectorAll('button'));
      const applyBtn = btns.find(b => (b as HTMLElement).innerText.includes('적용'));
      if (applyBtn) (applyBtn as HTMLElement).click();
    });
    await page.waitForTimeout(1500);

    const dateValue = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
    console.log('Selected date value in input:', dateValue);

    // Click Lookup
    console.log('Clicking Lookup...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Page URL after lookup:', page.url());

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const nodes = Array.from(document.querySelectorAll('tr, li, div[class*="tck"], div[class*="train"], div[class*="item"]')).map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 10 && (t.includes('KTX') || t.includes('무궁화') || t.includes('ITX') || t.includes('새마을') || t.includes('누리로') || t.includes(':')));

      return {
        url: location.href,
        dateValueInDOM: document.body.innerText.match(/\d{4}-\d{2}-\d{2}[^\n]*/)?.[0] || 'N/A',
        rowsCount: nodes.length,
        rowsSample: nodes.slice(0, 15),
        hasNoTrainNotice: bodyText.includes('해당 스케줄에 운행하는 열차가 없습니다') || bodyText.includes('조회된 열차가 없습니다'),
        fullBodySnippet: bodyText.slice(0, 800)
      };
    });

    fs.writeFileSync('yangpyeong_all_hours.json', JSON.stringify(result, null, 2));
    console.log('Saved yangpyeong_all_hours.json');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testYangpyeongAllHours();
