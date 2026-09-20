import { chromium } from 'playwright';
import fs from 'fs';

async function testCompareSites() {
  console.log('🔬 Testing LetsKorail (letskorail.com) vs Korail (korail.com)...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Visit LetsKorail (https://www.letskorail.com)
    console.log('\n--- 1. Testing LetsKorail (letskorail.com) ---');
    await page.goto('https://www.letskorail.com/ebizprd/EbizPrdTicketpr21111_i1.do', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('LetsKorail Title:', await page.title());
    console.log('LetsKorail URL:', page.url());

    // Fill departure/arrival
    await page.fill('#txtGoStart', '서울').catch(() => {});
    await page.fill('#txtGoEnd', '부산').catch(() => {});

    // Select date 24 if available
    const selectMonth = page.locator('select[name="s_month"]').first();
    if (await selectMonth.count() > 0) {
      console.log('LetsKorail Month Select found!');
    }
    const selectDay = page.locator('select[name="s_day"]').first();
    if (await selectDay.count() > 0) {
      console.log('LetsKorail Day Select found!');
      await selectDay.selectOption('24').catch(() => {});
    }
    const selectHour = page.locator('select[name="s_hour"]').first();
    if (await selectHour.count() > 0) {
      console.log('LetsKorail Hour Select found!');
      await selectHour.selectOption('12').catch(() => {});
    }

    // Click search on letskorail
    const letsSearchBtn = page.locator('img[alt="조회하기"], a:has-text("조회하기"), input[value="조회"]').first();
    if (await letsSearchBtn.count() > 0) {
      console.log('Clicking LetsKorail Search button...');
      await letsSearchBtn.click();
      await page.waitForTimeout(4000);

      const tableRows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('table.table_tbl_type2 tr, table tr')).map(tr => ({
          text: (tr as HTMLElement).innerText.replace(/\s+/g, ' ').trim()
        }));
        return trs.filter(t => t.text.includes('KTX') || t.text.includes('무궁화') || t.text.includes('ITX') || t.text.includes('예매'));
      });
      console.log('LetsKorail Train Rows Found:', tableRows.length);
      console.log('Sample LetsKorail Rows:', JSON.stringify(tableRows.slice(0, 5), null, 2));
    }

  } catch (err: any) {
    console.error('Error on LetsKorail test:', err);
  } finally {
    await browser.close();
  }
}

testCompareSites();
