import { chromium } from 'playwright';
import fs from 'fs';

async function debugSearchFlow() {
  console.log('🧪 Debugging Korail Search Flow: 청량리 ➔ 양평 (20260924 08:00)...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to https://www.korail.com/ticket/search/general ...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Dismiss popups
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // 2. Select Departure: 청량리
    console.log('2. Selecting Departure: 청량리');
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

    // 3. Select Arrival: 양평
    console.log('3. Selecting Arrival: 양평');
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

    // 4. Select Date: 2026-09-24 & Hour: 08
    console.log('4. Selecting Date: 2026-09-24, Hour: 08...');
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const dateModal = page.locator('.ReactModal__Content');
    await dateModal.waitFor({ state: 'visible', timeout: 5000 });

    // Select Day 24
    const dayClicked = await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return false;
      const links = Array.from(modalEl.querySelectorAll('td:not(.disabled) a, td button:not([disabled])'));
      const found = links.find(el => (el as HTMLElement).innerText.trim() === '24');
      if (found) {
        (found as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('Day 24 clicked:', dayClicked);
    await page.waitForTimeout(500);

    // Select Hour 08
    const hourClicked = await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return false;
      const links = Array.from(modalEl.querySelectorAll('li a, .hour_box a, a'));
      const found = links.find(el => (el as HTMLElement).innerText.trim() === '8시' || (el as HTMLElement).innerText.trim() === '08시');
      if (found) {
        (found as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('Hour 08시 clicked:', hourClicked);
    await page.waitForTimeout(500);

    // Click Apply button
    const applyClicked = await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return false;
      const btns = Array.from(modalEl.querySelectorAll('button'));
      const applyBtn = btns.find(b => (b as HTMLElement).innerText.includes('적용'));
      if (applyBtn) {
        (applyBtn as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('Apply button clicked:', applyClicked);
    await page.waitForTimeout(1500);

    // Inspect inputs on the search form before clicking lookup
    const formValues = await page.evaluate(() => {
      const depEl = document.querySelector('.start input, #txtGoStart, [class*="start"] input') as HTMLInputElement;
      const arrEl = document.querySelector('.end input, #txtGoEnd, [class*="end"] input') as HTMLInputElement;
      const dateEl = document.querySelector('#startDate, input[name*="date"], [class*="date"] input') as HTMLInputElement;
      return {
        depValue: depEl ? depEl.value : 'N/A',
        arrValue: arrEl ? arrEl.value : 'N/A',
        dateValue: dateEl ? dateEl.value : 'N/A',
      };
    });

    console.log('\n--- FORM VALUES BEFORE LOOKUP ---');
    console.log(JSON.stringify(formValues, null, 2));

    // 5. Click Search Button
    console.log('5. Clicking Search Button (button.btn_lookup)...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Current Page URL after lookup:', page.url());

    // Inspect body text and DOM after search
    const searchResultDOM = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const contentEl = document.querySelector('#content') || document.body;
      const contentText = (contentEl as HTMLElement).innerText;

      return {
        url: location.href,
        hasNoTrainText: bodyText.includes('해당 스케줄에 운행하는 열차가 없습니다') || bodyText.includes('조회된 열차가 없습니다'),
        bodySnippet: bodyText.slice(0, 800),
        contentTextSnippet: contentText.slice(0, 1000)
      };
    });

    fs.writeFileSync('debug_flow_result.json', JSON.stringify(searchResultDOM, null, 2));
    console.log('Saved debug_flow_result.json');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

debugSearchFlow();
