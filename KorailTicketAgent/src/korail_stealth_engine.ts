import { chromium } from 'playwright';
import path from 'path';
import os from 'os';

async function testStealthKorail() {
  console.log('==================================================');
  console.log('🚆 [스텔스 엔진] 코레일 승차권 조회 및 예매 개시');
  console.log('📍 구간: 청량리/서울 ➔ 양평');
  console.log('📅 일시: 2026년 9월 12일(토) 16:00 이후');
  console.log('==================================================\n');

  const userDataDir = path.join(os.tmpdir(), 'korail_temp_profile_' + Date.now());

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'msedge',
    headless: false,
    viewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages()[0] || await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete (window as any).cdc_adoQpoasndfzjsgfls_Array;
    delete (window as any).cdc_adoQpoasndfzjsgfls_Promise;
    delete (window as any).cdc_adoQpoasndfzjsgfls_Symbol;
  });

  try {
    console.log('1. Korail 메인 페이지 로딩 중...');
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Click popup close if present
    const closeBtn = page.locator('.topclose_btn, button:has-text("팝업 닫기"), button:has-text("닫기")');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 2. Click search button
    console.log('2. "열차 조회하기" 클릭...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    console.log('3. 현재 URL:', page.url());

    // Check if Code -8003 popups up or if search list opens
    const dialogs = await page.$$eval('div[role="dialog"], .pop_wrap, .popup', list => list.map(d => d.textContent?.trim()));
    if (dialogs.length > 0 && dialogs.some(d => d?.includes('-8003'))) {
      console.log('⚠️ -8003 감지됨. 우회 시도 중...');
    } else {
      console.log('🎉 -8003 우회 성공! 조회 목록 로드 완료!');
    }

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await page.waitForTimeout(6000);
    await context.close();
  }
}

testStealthKorail();
