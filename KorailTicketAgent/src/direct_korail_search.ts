import { chromium } from 'playwright';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';

async function runDirectKorailSearch() {
  console.log('==================================================');
  console.log('🚆 [코레일 승차권 조회] 청량리 ➔ 양평 (2026-09-12 16:00 이후)');
  console.log('==================================================\n');

  const tempProfileDir = path.join(os.tmpdir(), 'edge_korail_cdp_profile');
  const targetUrl = 'https://www.korail.com/ticket/main';

  exec(`start msedge "${targetUrl}" --remote-debugging-port=9222 --user-data-dir="${tempProfileDir}" --no-first-run --no-default-browser-check`);
  await new Promise(r => setTimeout(r, 3000));

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (err: any) {
    console.error('❌ 연결 실패:', err.message);
    return;
  }

  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  try {
    console.log('1. Korail 메인 페이지로 이동 중...');
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Set departure to 청량리, arrival to 양평 via DOM
    console.log('2. 출발역: 청량리, 도착역: 양평 입력 중...');
    await page.evaluate(() => {
      const startEl = document.getElementById('labelstart') as HTMLInputElement;
      const endEl = document.getElementById('labelend') as HTMLInputElement;
      if (startEl) {
        startEl.removeAttribute('readonly');
        startEl.removeAttribute('disabled');
        startEl.value = '청량리';
      }
      if (endEl) {
        endEl.removeAttribute('readonly');
        endEl.removeAttribute('disabled');
        endEl.value = '양평';
      }
    });

    // Click lookup button
    console.log('3. "열차 조회하기" 버튼 클릭...');
    await page.evaluate(() => {
      const btn = document.querySelector('button.btn_lookup') as HTMLButtonElement;
      if (btn) btn.click();
    });

    await page.waitForTimeout(4000);

    console.log('4. 결과 페이지 URL:', page.url());

    // Extract all text content
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n==================================================');
    console.log('📋 [청량리 ➔ 양평 실시간 검색 결과 출력]');
    console.log('==================================================\n');

    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
    const resultLines: string[] = [];

    lines.forEach((l) => {
      if (
        l.includes('KTX') || l.includes('무궁화') || l.includes('ITX') || 
        l.includes('새마을') || l.includes('누리로') || l.includes('청량리') || 
        l.includes('양평') || l.includes('예매') || l.includes('좌석') || l.includes(':') || l.includes('원')
      ) {
        resultLines.push(l);
      }
    });

    if (resultLines.length > 0) {
      console.log(resultLines.join('\n'));
    } else {
      console.log('전체 페이지 텍스트 요약:');
      console.log(lines.slice(0, 50).join('\n'));
    }

  } catch (err: any) {
    console.error('❌ 실행 중 에러:', err.message);
  }
}

runDirectKorailSearch();
