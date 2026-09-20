import { chromium } from 'playwright';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

async function runKorailCDP() {
  console.log('==================================================');
  console.log('🚀 [코레일 네이티브 CDP 엔진] 실행 개시');
  console.log('📍 여정: 서울 / 청량리 ➔ 양평');
  console.log('📅 일시: 2026년 9월 12일(토) 16:00 이후');
  console.log('==================================================\n');

  const tempProfileDir = path.join(os.tmpdir(), 'edge_korail_cdp_profile');
  const targetUrl = 'https://www.korail.com/ticket/main';

  // 1. Launch Native Microsoft Edge Process
  console.log('1. 네이티브 Microsoft Edge 브라우저 프로세스 실행 중...');
  const edgeCmd = `start msedge "${targetUrl}" --remote-debugging-port=9222 --user-data-dir="${tempProfileDir}" --no-first-run --no-default-browser-check`;
  exec(edgeCmd);

  // Wait for CDP port to open
  await new Promise(r => setTimeout(r, 4000));

  // 2. Connect Playwright over CDP
  console.log('2. Playwright CDP 포트(9222) 연결 중...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (err: any) {
    console.error('❌ CDP 연결 실패:', err.message);
    return;
  }

  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0] || await context.newPage();

  try {
    console.log('3. 코레일 예매 메인 확인 중 (URL:', page.url(), ')');
    await page.waitForTimeout(2000);

    // Close any popup overlay
    const popClose = page.locator('.topclose_btn, button:has-text("팝업 닫기"), button:has-text("닫기")');
    if (await popClose.count() > 0) {
      await popClose.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // Click "열차 조회하기" button
    console.log('4. "열차 조회하기" 버튼 클릭...');
    const searchBtn = page.locator('button.btn_lookup');
    if (await searchBtn.count() > 0) {
      await searchBtn.first().click();
      await page.waitForTimeout(4000);
    }

    console.log('5. 결과 페이지 URL:', page.url());

    // Extract search result text
    const text = await page.evaluate(() => document.body.innerText);
    console.log('\n==================================================');
    console.log('📋 코레일 승차권 조회 결과 추출');
    console.log('==================================================\n');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(l => {
      if (l.includes('KTX') || l.includes('무궁화') || l.includes('ITX') || l.includes('새마을') || l.includes('누리로') || l.includes('서울') || l.includes('청량리') || l.includes('양평') || l.includes('예매')) {
        console.log(l);
      }
    });

  } catch (err: any) {
    console.error('❌ 자동화 조작 에러:', err.message);
  } finally {
    console.log('\n✨ 조작 완료. 브라우저 창은 사용자를 위해 유지됩니다.');
  }
}

runKorailCDP();
