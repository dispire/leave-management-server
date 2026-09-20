import { chromium } from 'playwright';

async function testAvailableDate() {
  console.log('🧪 Testing Search for TOMORROW (2026-09-20 12:00: 서울 -> 부산)...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Departure Station: 서울
    await page.locator('.start a.btn_pop-open, button:has-text("출발역 선택")').first().click();
    await page.waitForTimeout(1000);
    let modal = page.locator('.ReactModal__Content').first();
    await modal.locator('a, button, span').filter({ hasText: /^서울$/ }).first().click();
    await page.waitForTimeout(500);

    // 2. Arrival Station: 부산
    await page.locator('.end a.btn_pop-open, button:has-text("도착역 선택")').first().click();
    await page.waitForTimeout(1000);
    modal = page.locator('.ReactModal__Content').first();
    await modal.locator('a, button, span').filter({ hasText: /^부산$/ }).first().click();
    await page.waitForTimeout(500);

    // 3. Date 20일 & Hour 12시
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);
    const dateModal = page.locator('.ReactModal__Content').first();
    await dateModal.waitFor({ state: 'visible', timeout: 5000 });

    // Click Day 20
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const day20 = Array.from(modal.querySelectorAll('td:not(.disabled) a, td:not(.disabled) span')).find(
        el => el.textContent?.trim() === '20'
      ) as HTMLElement | undefined;
      if (day20) day20.click();
    });
    await page.waitForTimeout(500);

    // Click Hour 12시
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const hour12 = Array.from(modal.querySelectorAll('li a')).find(
        el => el.textContent?.trim() === '12시'
      ) as HTMLElement | undefined;
      if (hour12) hour12.click();
    });
    await page.waitForTimeout(500);

    // Click Apply
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const applyBtn = Array.from(modal.querySelectorAll('button')).find(
        el => el.textContent?.trim() === '적용'
      ) as HTMLElement | undefined;
      if (applyBtn) applyBtn.click();
    });
    await page.waitForTimeout(1000);

    const startDateVal = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
    console.log('📌 #startDate Value:', startDateVal);

    // 4. Submit Search
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('📌 URL after search:', page.url());

    // Extract list items from list page
    const listResults = await page.evaluate(() => {
      // Look for train list items or rows
      const items = Array.from(document.querySelectorAll('li, tr, div')).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '',
      })).filter(r => r.text.includes('KTX') || r.text.includes('무궁화') || r.text.includes('ITX') || r.text.includes('새마을'));

      return {
        bodySnippet: document.body.innerText.slice(0, 1500),
        rowsCount: items.length,
        sampleRows: items.slice(0, 15),
      };
    });

    console.log('\n--- SEARCH RESULTS FOR 2026-09-20 ---');
    console.log('Body Text Snippet:\n', listResults.bodySnippet);
    console.log('\nSample Rows:', JSON.stringify(listResults.sampleRows, null, 2));

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testAvailableDate();
