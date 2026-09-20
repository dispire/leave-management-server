import { chromium } from 'playwright';
import fs from 'fs';

async function testListParse() {
  console.log('🧪 Testing Exact Search & Parsing for 2026-09-24 12:00...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Open Date Modal
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('.ReactModal__Content').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // 2. Click Day 24 (td:not(.disabled) a)
    const day24 = modal.locator('td:not(.disabled) a').filter({ hasText: /^24$/ }).first();
    if (await day24.count() > 0) {
      await day24.click();
      console.log('✅ Day 24 clicked!');
    } else {
      console.log('⚠️ Day 24 not directly found, trying fallback...');
      await modal.locator('a:has-text("24")').first().click();
    }
    await page.waitForTimeout(500);

    // 3. Click Hour 12 (li a:has-text("12시"))
    const hour12 = modal.locator('li a').filter({ hasText: /^12시$/ }).first();
    if (await hour12.count() > 0) {
      await hour12.click();
      console.log('✅ Hour 12시 clicked!');
    } else {
      await modal.locator('a:has-text("12시")').first().click();
    }
    await page.waitForTimeout(500);

    // 4. Click Apply button
    const applyBtn = modal.locator('button.btn_bn-blue, button:has-text("적용")').first();
    await applyBtn.click();
    await page.waitForTimeout(1000);

    const startDateVal = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
    console.log('📌 Form startDate input value:', startDateVal);

    // 5. Submit search
    console.log('5. Submitting search...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(4000);

    console.log('📌 Current URL:', page.url());

    // 6. Inspect list page DOM
    const pageDOM = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('li, tr, div[class*="tck"], div[class*="train"], div[class*="item"]')).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').slice(0, 150) : '',
      }));
      return rows.filter(r => r.text.includes('KTX') || r.text.includes('무궁화') || r.text.includes('ITX') || r.text.includes('새마을') || r.text.match(/\d{2}:\d{2}/));
    });

    console.log('\n--- MATCHED LIST ROWS ---');
    console.log(JSON.stringify(pageDOM.slice(0, 20), null, 2));

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testListParse();
