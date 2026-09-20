import { chromium } from 'playwright';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

async function runYangpyeongSearch() {
  console.log('==================================================');
  console.log('🚆 [코레일 승차권 실시간 조회] 청량리/서울 ➔ 양평');
  console.log('📅 일시: 2026년 9월 12일(토) 16:00 이후');
  console.log('==================================================\n');

  const tempProfileDir = path.join(os.tmpdir(), 'edge_korail_cdp_profile');
  const targetUrl = 'https://www.korail.com/ticket/main';

  // Launch Native Microsoft Edge
  const edgeCmd = `start msedge "${targetUrl}" --remote-debugging-port=9222 --user-data-dir="${tempProfileDir}" --no-first-run --no-default-browser-check`;
  exec(edgeCmd);

  await new Promise(r => setTimeout(r, 3500));

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (err: any) {
    console.error('❌ Browser connection failed:', err.message);
    return;
  }

  const contexts = browser.contexts();
  const context = contexts[0];
  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Click start station box and select 청량리
    console.log('1. 출발역을 "청량리"로 설정...');
    const startBox = page.locator('#labelstart, label[for="labelstart"], div:has(#labelstart)');
    if (await startBox.count() > 0) {
      await startBox.first().click().catch(() => {});
      await page.waitForTimeout(1000);

      const stationInput = page.locator('input[placeholder*="역명"], input[type="text"]:visible');
      if (await stationInput.count() > 0) {
        await stationInput.first().fill('청량리');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const selBtn = page.locator('text="청량리"');
        if (await selBtn.count() > 0) {
          await selBtn.first().click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    }

    // 2. Click arrival station box and select 양평
    console.log('2. 도착역을 "양평"으로 설정...');
    const endBox = page.locator('#labelend, label[for="labelend"], div:has(#labelend)');
    if (await endBox.count() > 0) {
      await endBox.first().click().catch(() => {});
      await page.waitForTimeout(1000);

      const stationInput = page.locator('input[placeholder*="역명"], input[type="text"]:visible');
      if (await stationInput.count() > 0) {
        await stationInput.first().fill('양평');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const selBtn = page.locator('text="양평"');
        if (await selBtn.count() > 0) {
          await selBtn.first().click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    }

    // 3. Click date/time box and select 2026-09-12 16:00
    console.log('3. 출발일자: 9월 12일(토) 16:00 설정...');
    const dayBox = page.locator('#labelday, label[for="labelday"], div:has(#labelday)');
    if (await dayBox.count() > 0) {
      await dayBox.first().click().catch(() => {});
      await page.waitForTimeout(1000);

      const day12 = page.locator('button:has-text("12"), a:has-text("12"), td:has-text("12")');
      if (await day12.count() > 0) {
        await day12.first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    // 4. Click Search Button
    console.log('4. "열차 조회하기" 버튼 클릭...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    console.log('5. 결과 페이지 URL:', page.url());

    // Extract all rows or train schedule text
    const text = await page.evaluate(() => document.body.innerText);

    console.log('\n==================================================');
    console.log('📋 [청량리/서울 ➔ 양평 2026-09-12 16:00 이후 열차 조회 결과]');
    console.log('==================================================\n');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(l => {
      if (
        l.includes('KTX') || l.includes('무궁화') || l.includes('ITX') || 
        l.includes('새마을') || l.includes('누리로') || l.includes('청량리') || 
        l.includes('서울') || l.includes('양평') || l.includes('예매') || l.includes('좌석') || l.includes('원')
      ) {
        console.log(l);
      }
    });

  } catch (err: any) {
    console.error('❌ 검색 실행 에러:', err.message);
  } finally {
    console.log('\n✨ 조작 완료. 브라우저 창에서 사용자가 원하는 시간 선택 및 결제를 직접 수행할 수 있습니다.');
  }
}

runYangpyeongSearch();
