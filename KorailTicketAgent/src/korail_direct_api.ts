import { chromium } from 'playwright';

async function searchDirectKorail() {
  console.log('==================================================');
  console.log('🚆 [코레일 직접 조회] 서울/청량리 ➔ 양평 (2026-09-12 16시 이후)');
  console.log('==================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. EbizPrd Ticket Search 페이지 접속...');
    await page.goto('https://www.letskorail.com/ebizprd/EbizPrdTicketpr21111_i1.do', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Perform search form fill directly via JS on page
    console.log('2. 출발역: 청량리, 도착역: 양평, 날짜: 2026-09-12 16시 입력...');
    await page.evaluate(() => {
      const start = document.getElementById('txtGoStart') as HTMLInputElement;
      const end = document.getElementById('txtGoEnd') as HTMLInputElement;
      if (start) start.value = '청량리';
      if (end) end.value = '양평';

      const year = document.getElementById('s_year') as HTMLSelectElement;
      const month = document.getElementById('s_month') as HTMLSelectElement;
      const day = document.getElementById('s_day') as HTMLSelectElement;
      const hour = document.getElementById('s_hour') as HTMLSelectElement;

      if (year) year.value = '2026';
      if (month) month.value = '09';
      if (day) day.value = '12';
      if (hour) hour.value = '16';

      // Submit search
      const form = document.forms[0];
      if (form) form.submit();
    });

    await page.waitForTimeout(5000);

    console.log('3. 결과 페이지 URL:', page.url());

    // Extract table rows
    const rows = await page.$$eval('table tbody tr', list => list.map(r => r.textContent?.replace(/\s+/g, ' ').trim()));
    console.log(`\n==================================================`);
    console.log(`📋 [조회 결과 목록] (총 ${rows.length}건)`);
    console.log(`==================================================\n`);

    const resultList: string[] = [];
    rows.forEach((r, idx) => {
      if (r && (r.includes('KTX') || r.includes('무궁화') || r.includes('ITX') || r.includes('누리로') || r.includes('새마을') || r.includes(':'))) {
        console.log(`[${idx + 1}] ${r}`);
        resultList.push(`[${idx + 1}] ${r}`);
      }
    });

    if (resultList.length === 0) {
      console.log('--- 페이지 전체 텍스트 추출 ---');
      const text = await page.innerText('body');
      console.log(text.slice(0, 1500));
    }

  } catch (err: any) {
    console.error('❌ 오류:', err.message);
  } finally {
    await page.waitForTimeout(6000);
    await browser.close();
  }
}

searchDirectKorail();
