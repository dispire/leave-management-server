import { chromium } from 'playwright';

async function testFullReservationFlow() {
  console.log('🧪 Testing Complete Flow: 서울 -> 부산 | 24일 12시');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    console.log('1. Navigating to https://www.korail.com/ticket/search/general');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. Select Departure Station: 서울
    console.log('2. Selecting Departure Station: 서울');
    await page.locator('.start a.btn_pop-open, .start_btn, [class*="start"]').first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const stationModal1 = page.locator('.ReactModal__Content').first();
    if (await stationModal1.isVisible().catch(() => false)) {
      await stationModal1.locator('a:has-text("서울"), button:has-text("서울")').first().click();
      await page.waitForTimeout(800);
      console.log('✅ Departure Station 서울 selected');
    }

    // 3. Select Arrival Station: 부산
    console.log('3. Selecting Arrival Station: 부산');
    await page.locator('.end a.btn_pop-open, .end_btn, [class*="end"]').first().click().catch(() => {});
    await page.waitForTimeout(1000);
    const stationModal2 = page.locator('.ReactModal__Content').first();
    if (await stationModal2.isVisible().catch(() => false)) {
      await stationModal2.locator('a:has-text("부산"), button:has-text("부산")').first().click();
      await page.waitForTimeout(800);
      console.log('✅ Arrival Station 부산 selected');
    }

    // 4. Select Date: 24일 & Hour: 12시
    console.log('4. Selecting Date 24일 & Hour 12시...');
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const dateModal = page.locator('.ReactModal__Content').first();
    await dateModal.waitFor({ state: 'visible', timeout: 5000 });

    // Click Day 24
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const day24 = Array.from(modal.querySelectorAll('td:not(.disabled) a, td:not(.disabled) span')).find(
        el => el.textContent?.trim() === '24'
      ) as HTMLElement | undefined;
      if (day24) day24.click();
    });
    await page.waitForTimeout(800);

    // Click Hour 12시
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const hour12 = Array.from(modal.querySelectorAll('li a')).find(
        el => el.textContent?.trim() === '12시'
      ) as HTMLElement | undefined;
      if (hour12) hour12.click();
    });
    await page.waitForTimeout(800);

    // Click Apply (적용)
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

    // 5. Click Search Button
    console.log('5. Clicking Search Button (btn_lookup)...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('📌 Final Page URL:', page.url());

    // 6. Extract list items from search/list page
    const listResults = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('li, tr, div')).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '',
      })).filter(r => r.text.includes('KTX') || r.text.includes('무궁화') || r.text.includes('ITX') || r.text.includes('새마을') || r.text.includes(':'));

      return {
        bodySnippet: document.body.innerText.slice(0, 1500),
        rows: rows.slice(0, 15),
      };
    });

    console.log('\n--- LIST RESULTS SNIPPET ---');
    console.log('Body Text Snippet:\n', listResults.bodySnippet);
    console.log('\nTrain Rows:', JSON.stringify(listResults.rows, null, 2));

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testFullReservationFlow();
