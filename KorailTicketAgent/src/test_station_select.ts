import { chromium } from 'playwright';

async function testStationSelect() {
  console.log('🧪 Testing Station Selection: Departure=서울, Arrival=부산...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 1. Departure Station: 서울
    console.log('1. Setting Departure Station...');
    await page.locator('.start a.btn_pop-open, button:has-text("출발역 선택")').first().click();
    await page.waitForTimeout(1000);

    let modal = page.locator('.ReactModal__Content').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Click '서울' inside modal
    await modal.locator('a, button, span').filter({ hasText: /^서울$/ }).first().click();
    await page.waitForTimeout(1000);

    const depVal = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="출발"]') as HTMLInputElement;
      return input ? input.value : 'N/A';
    });
    console.log('📌 Departure Station Input Value:', depVal);

    // 2. Arrival Station: 부산
    console.log('2. Setting Arrival Station...');
    await page.locator('.end a.btn_pop-open, button:has-text("도착역 선택")').first().click();
    await page.waitForTimeout(1000);

    modal = page.locator('.ReactModal__Content').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Click '부산' inside modal
    await modal.locator('a, button, span').filter({ hasText: /^부산$/ }).first().click();
    await page.waitForTimeout(1000);

    const arrVal = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="도착"]') as HTMLInputElement;
      return input ? input.value : 'N/A';
    });
    console.log('📌 Arrival Station Input Value:', arrVal);

    // 3. Select Date 24일 & Hour 12시
    console.log('3. Setting Date 24일 12시...');
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

    // 4. Submit Search
    console.log('4. Clicking Search button...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('📌 URL after search:', page.url());

    // Dump body snippet & train list
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('\n--- BODY SNIPPET AFTER SEARCH ---');
    console.log(bodySnippet);

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testStationSelect();
