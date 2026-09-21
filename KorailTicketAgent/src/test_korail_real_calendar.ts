import { chromium } from 'playwright';
import fs from 'fs';

async function testKorailRealCalendar() {
  console.log('🧪 Checking Korail Real Calendar Dates...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Read default startDate input on general page
    const startDateVal = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
    console.log('Korail default #startDate value:', startDateVal);

    // Open date modal and dump calendar dates
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const calendarInfo = await page.evaluate(() => {
      const modalEl = document.querySelector('.ReactModal__Content');
      if (!modalEl) return { html: 'N/A' };
      
      const title = modalEl.querySelector('h2, .title, .month_title, [class*="month"], [class*="head"]')?.textContent?.trim() || '';
      const enabledDays = Array.from(modalEl.querySelectorAll('td:not(.disabled) a, td:not(.disabled) button, td:not(.disabled) span')).map(el => el.textContent?.trim() || '');

      return {
        title,
        enabledDaysCount: enabledDays.length,
        enabledDaysSample: enabledDays.slice(0, 20),
        modalInnerText: modalEl.innerText.slice(0, 500)
      };
    });

    console.log('Calendar Info:\n', JSON.stringify(calendarInfo, null, 2));
    fs.writeFileSync('calendar_info.json', JSON.stringify({ startDateVal, calendarInfo }, null, 2));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testKorailRealCalendar();
