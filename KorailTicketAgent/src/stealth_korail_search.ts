import { chromium } from 'playwright';

async function stealthSearch() {
  console.log('==================================================');
  console.log('🚆 [스텔스 자동화] 코레일 승차권 조회: 청량리/서울 ➔ 양평');
  console.log('📅 일시: 2026년 9월 12일(토) 16:00 이후');
  console.log('==================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0'
  });

  // Stealth script evaluation
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    console.log('1. https://www.korail.com/ticket/main 접속 중...');
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Close any popup modals if present
    const closeBtn = page.locator('button:has-text("닫기"), .topclose_btn, a:has-text("닫기")');
    if (await closeBtn.count() > 0) {
      console.log('팝업 닫기 클릭...');
      await closeBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 2. Select Departure Station: 청량리 (or 서울)
    console.log('2. 출발역 선택 중...');
    const startInput = page.locator('#labelstart, .start_btn, div:has(#labelstart)');
    if (await startInput.count() > 0) {
      await startInput.first().click();
      await page.waitForTimeout(1500);

      // Search for 청량리 in modal
      const stationSearch = page.locator('input[placeholder*="역명"], input[type="text"]:visible');
      if (await stationSearch.count() > 0) {
        await stationSearch.first().fill('청량리');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const targetStation = page.locator('text="청량리"');
        if (await targetStation.count() > 0) {
          await targetStation.first().click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // 3. Select Arrival Station: 양평
    console.log('3. 도착역 선택 중...');
    const endInput = page.locator('#labelend, .end_btn, div:has(#labelend)');
    if (await endInput.count() > 0) {
      await endInput.first().click();
      await page.waitForTimeout(1500);

      const stationSearch = page.locator('input[placeholder*="역명"], input[type="text"]:visible');
      if (await stationSearch.count() > 0) {
        await stationSearch.first().fill('양평');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const targetStation = page.locator('text="양평"');
        if (await targetStation.count() > 0) {
          await targetStation.first().click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // 4. Select Departure Date: 2026-09-12 16:00
    console.log('4. 날짜/시간 선택 중 (9월 12일 16시)...');
    const dayInput = page.locator('#labelday, div:has(#labelday)');
    if (await dayInput.count() > 0) {
      await dayInput.first().click();
      await page.waitForTimeout(1500);

      // Select Day 12
      const day12 = page.locator('button:has-text("12"), a:has-text("12"), td:has-text("12")');
      if (await day12.count() > 0) {
        await day12.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
      }

      // Select Hour 16
      const hour16 = page.locator('option[value="16"], select:has-text("16")');
      if (await hour16.count() > 0) {
        await hour16.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    // 5. Click Search Button
    console.log('5. "열차 조회하기" 클릭...');
    const searchBtn = page.locator('button.btn_lookup');
    if (await searchBtn.count() > 0) {
      await searchBtn.first().click();
      await page.waitForTimeout(5000);
    }

    console.log('6. 결과 페이지:', page.url());

    // Extract text summary
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n==================================================');
    console.log('📋 코레일 열차 조회 결과');
    console.log('==================================================');

    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(l => {
      if (l.includes('KTX') || l.includes('무궁화') || l.includes('ITX') || l.includes('누리로') || l.includes('새마을') || l.includes('예매')) {
        console.log(l);
      }
    });

  } catch (err: any) {
    console.error('❌ 검색 중 오류:', err.message);
  } finally {
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

stealthSearch();
