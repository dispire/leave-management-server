import { chromium } from 'playwright';
import fs from 'fs';

async function testRealDateSearch() {
  console.log('🧪 Testing real date selection: 2026-09-24 12:00...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Click Date Selector button
    console.log('1. Opening Date Modal...');
    // Look for button opening date modal
    const dateTrigger = page.locator('.btn_d-day, [class*="d-day"], button:has-text("2026"), div:has-text("출발일") button').first();
    await dateTrigger.click();
    await page.waitForTimeout(1500);

    // 2. Select Day 24 in Modal (.layerWrap.type_date-pop_wrap or .ReactModal__Content)
    console.log('2. Selecting Day 24...');
    const modal = page.locator('.layerWrap.type_date-pop_wrap, .ReactModal__Content, .type_date-pop').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Find Day 24 button inside modal
    const day24 = modal.locator('button, td, a').filter({ hasText: /^24$/ }).first();
    if (await day24.count() > 0) {
      console.log('Found Day 24 button, clicking...');
      await day24.click();
      await page.waitForTimeout(800);
    } else {
      console.log('Day 24 button not matched by regex, searching all buttons...');
      const allBtns = await modal.locator('button').all();
      for (const btn of allBtns) {
        const txt = (await btn.innerText()).trim();
        if (txt === '24') {
          console.log('Clicked 24 button!');
          await btn.click();
          break;
        }
      }
    }

    // 3. Select Hour 12 in Modal
    console.log('3. Selecting Hour 12...');
    const hourBtns = await modal.locator('button, li, a').all();
    for (const btn of hourBtns) {
      const txt = (await btn.innerText()).trim();
      if (txt === '12시' || txt === '12') {
        console.log('Clicked Hour 12 button!');
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(800);

    // 4. Click Apply Button (적용) in Modal
    console.log('4. Clicking Apply button...');
    const applyBtn = modal.locator('button:has-text("적용"), button.btn_bn-blue, a:has-text("적용")').first();
    if (await applyBtn.count() > 0) {
      await applyBtn.click();
      await page.waitForTimeout(1000);
    }

    // 5. Submit Search (열차 조회)
    console.log('5. Clicking Search button...');
    const searchBtn = page.locator('button.btn_lookup, button:has-text("열차 조회")').first();
    await searchBtn.click();
    await page.waitForTimeout(5000);

    console.log('6. Current URL after search:', page.url());

    // Dump search list HTML and DOM
    const listBodyHtml = await page.content();
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_page.html', listBodyHtml, 'utf-8');

    // Extract list items text
    const listItems = await page.evaluate(() => {
      // Find all rows in search list
      const rows = Array.from(document.querySelectorAll('li, tr, div[class*="train"], div[class*="tck"]')).map(el => ({
        class: el.className,
        tag: el.tagName,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ') : '',
      }));
      return rows.filter(r => r.text.includes('KTX') || r.text.includes('무궁화') || r.text.includes('ITX') || r.text.includes('새마을') || r.text.includes(':'));
    });

    console.log('\n--- MATCHED TRAIN LIST ROWS ---');
    console.log(JSON.stringify(listItems.slice(0, 15), null, 2));

  } catch (err: any) {
    console.error('Error in real date search test:', err);
  } finally {
    await browser.close();
  }
}

testRealDateSearch();
