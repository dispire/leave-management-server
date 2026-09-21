import { chromium } from 'playwright';
import fs from 'fs';

async function testAvailableReservation() {
  console.log('🧪 Testing Real Train Reservation Button Location...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to Korail search page
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Dismiss popups
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // Select station: 서울 -> 대전 (popular route with many trains today/tomorrow)
    console.log('Selecting stations: 서울 -> 대전...');
    // Departure: default is 서울
    // Arrival: Select 대전
    await page.locator('.end a.btn_pop-open').click();
    await page.waitForTimeout(1000);
    const stationModal = page.locator('.ReactModal__Content');
    const daejeonTag = stationModal.locator('a:has-text("대전"), button:has-text("대전")').first();
    if (await daejeonTag.count() > 0) {
      await daejeonTag.click();
    } else {
      await page.fill('input[name="searchTxt"]', '대전');
      await page.click('button.btn_sch');
      await page.waitForTimeout(500);
      await page.click('a:has-text("대전")');
    }
    await page.waitForTimeout(1000);

    // Click lookup
    console.log('Clicking lookup...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Search page URL:', page.url());

    // Inspect real train list items
    const trainRowsInspection = await page.evaluate(() => {
      const container = document.querySelector('#content') || document.body;
      const listItems = Array.from(container.querySelectorAll('.tckList > li, table tbody tr, ul.list_train > li, div[class*="schedule_list"] > div, div[class*="train_list"] > div, div[class*="tck"]'));
      
      return listItems.map((row, idx) => {
        const text = (row as HTMLElement).innerText ? (row as HTMLElement).innerText.replace(/\s+/g, ' ').trim() : '';
        const buttons = Array.from(row.querySelectorAll('button, a, input')).map(el => ({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          text: el.textContent?.trim() || '',
          disabled: (el as HTMLButtonElement).disabled,
          outerHTML: el.outerHTML
        }));

        return {
          rowIdx: idx,
          rowText: text.slice(0, 150),
          buttons
        };
      });
    });

    console.log('Train rows count found:', trainRowsInspection.length);
    fs.writeFileSync('train_rows_available.json', JSON.stringify(trainRowsInspection.slice(0, 10), null, 2));
    console.log('Saved train_rows_available.json');

    // Also check how our current row-finding logic handles the first train
    if (trainRowsInspection.length > 0) {
      const firstRowText = trainRowsInspection[0].rowText;
      console.log('\nFirst row text snippet:', firstRowText);

      // Extract time
      const times = firstRowText.match(/\d{2}:\d{2}/g);
      const targetDepTime = times ? times[0] : '';
      console.log('Target departure time extracted:', targetDepTime);

      const clickedTest = await page.evaluate(({ targetDepTime }) => {
        const container = document.querySelector('#content') || document.body;
        const rows = Array.from(container.querySelectorAll('tr, li, div[class*="tck"], div[class*="train"], div[class*="item"], div[class*="list"]')).filter(r => {
          const isHeader = r.closest('header, nav, .header, .head, .gnb, .top_menu');
          if (isHeader) return false;
          const txt = (r as HTMLElement).innerText || '';
          return targetDepTime && txt.includes(targetDepTime);
        });

        if (rows.length === 0) return { foundRow: false };

        const targetRow = rows[0];
        const buttons = Array.from(targetRow.querySelectorAll('button, a, input[type="button"]')) as HTMLElement[];
        const reserveBtn = buttons.find(b => {
          const txt = b.innerText || b.textContent || '';
          const cls = b.className || '';
          return (txt.includes('예매') || txt.includes('좌석') || txt.includes('신청') || cls.includes('res') || cls.includes('reserve')) && !b.hasAttribute('disabled');
        });

        return {
          foundRow: true,
          rowTextSnippet: (targetRow as HTMLElement).innerText.slice(0, 100),
          foundBtnText: reserveBtn ? (reserveBtn.innerText || reserveBtn.textContent) : null,
          foundBtnOuterHTML: reserveBtn ? reserveBtn.outerHTML : null,
          allButtonsInRow: buttons.map(b => ({ text: b.innerText || b.textContent, class: b.className, outer: b.outerHTML }))
        };
      }, { targetDepTime });

      console.log('\nRow finding test result:\n', JSON.stringify(clickedTest, null, 2));
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

testAvailableReservation();
