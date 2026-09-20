import { chromium } from 'playwright';

async function testSearch() {
  console.log('==================================================');
  console.log('🚆 코레일 열차 조회 시작 (서울 ➔ 양평, 2026-09-12 16시 이후)');
  console.log('==================================================\n');

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
    });
  } catch {
    browser = await chromium.launch({ headless: false });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. LetsKorail 예매 페이지 접속 중...');
    await page.goto('https://www.letskorail.com/ebizprd/EbizPrdTicketpr21111_i1.do', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 출발역 / 도착역
    console.log('2. 출발역: 서울, 도착역: 양평 입력 중...');
    await page.fill('#txtGoStart', '서울');
    await page.fill('#txtGoEnd', '양평');

    // 날짜 선택 (2026년 9월 12일)
    const yearSelect = page.locator('#s_year');
    if (await yearSelect.count() > 0) {
      await yearSelect.selectOption('2026');
    }

    const monthSelect = page.locator('#s_month');
    if (await monthSelect.count() > 0) {
      await monthSelect.selectOption('09');
    }

    const daySelect = page.locator('#s_day');
    if (await daySelect.count() > 0) {
      await daySelect.selectOption('12');
    }

    // 시간 선택 (16시)
    const hourSelect = page.locator('#s_hour');
    if (await hourSelect.count() > 0) {
      await hourSelect.selectOption('16');
    }

    console.log('3. 조회하기 버튼 클릭...');
    const searchBtn = page.locator('img[alt="조회하기"], a.btn_inq img');
    if (await searchBtn.count() > 0) {
      await searchBtn.first().click();
    } else {
      await page.evaluate(() => {
        if (typeof (window as any).send_fn === 'function') (window as any).send_fn();
      });
    }

    await page.waitForTimeout(4000);

    // 열차 목록 파싱
    const rows = await page.$$('table.table_tbl_type2 tbody tr');
    console.log(`\n==================================================`);
    console.log(`📋 [2026년 9월 12일 서울 ➔ 양평 16시 이후 열차 목록] (총 ${rows.length}건)`);
    console.log(`==================================================\n`);

    const resultList: string[] = [];

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const text = await rows[i].innerText();
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText) {
        console.log(`[${i + 1}] ${cleanText}`);
        resultList.push(`[${i + 1}] ${cleanText}`);
      }
    }

    if (rows.length === 0) {
      console.log('⚠️ 조회된 열차 목록이 없거나 테이블 형식이 다릅니다.');
    }

  } catch (err: any) {
    console.error('❌ Error during search:', err.message);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testSearch();
