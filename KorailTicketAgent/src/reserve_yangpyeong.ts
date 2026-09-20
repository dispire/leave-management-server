import { chromium } from 'playwright';

export interface TrainOption {
  id: number;
  trainType: string;
  trainNo: string;
  depStation: string;
  depTime: string;
  arrStation: string;
  arrTime: string;
  standardSeat: string;
  firstClassSeat: string;
  fare: string;
}

async function searchYangpyeongTrains() {
  console.log('==================================================');
  console.log('🚆 코레일 [서울 / 청량리 ➔ 양평] 2026년 9월 12일(토) 16:00 이후 열차 조회');
  console.log('==================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Korail 예매 접속 중...');
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. Set arrival station to 양평
    console.log('2. 도착역 "양평" 설정...');
    await page.evaluate(() => {
      const endEl = document.getElementById('labelend') as HTMLInputElement;
      if (endEl) {
        endEl.value = '양평';
        endEl.dispatchEvent(new Event('input', { bubbles: true }));
        endEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 3. Click search button
    console.log('3. "열차 조회하기" 버튼 클릭...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    console.log('4. 결과 페이지 URL:', page.url());

    // Extract table rows if present
    const rows = await page.$$('table tbody tr');
    console.log(`\n📋 조회 결과 (총 ${rows.length}건):`);

    const resultList: string[] = [];

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const text = await rows[i].innerText();
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText) {
        console.log(`[${i + 1}] ${cleanText}`);
        resultList.push(`[${i + 1}] ${cleanText}`);
      }
    }

  } catch (err: any) {
    console.error('❌ 검색 중 오류:', err.message);
  } finally {
    await page.waitForTimeout(6000);
    await browser.close();
  }
}

searchYangpyeongTrains();
