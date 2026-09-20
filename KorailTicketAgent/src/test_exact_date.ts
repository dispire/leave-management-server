import { chromium } from 'playwright';
import fs from 'fs';

async function testExactDate() {
  console.log('🧪 Testing exact selector: a.btn_d-day...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    console.log('1. Navigating to general search page...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click top popup close if present
    const popupClose = page.locator('.topclose_btn, .toppopclose').first();
    if (await popupClose.isVisible().catch(() => false)) {
      await popupClose.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    console.log('2. Clicking a.btn_d-day...');
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1500);

    // Wait for modal
    const modal = page.locator('.ReactModal__Content, .layerWrap.type_date-pop_wrap').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Date Modal Opened successfully!');

    // Take screenshot of opened modal
    await page.screenshot({ path: 'f:/Antigravity/KorailTicketAgent/scratch_date_modal.png' });

    // Select Day 24
    console.log('3. Clicking Day 24...');
    // Look for button or td with 24
    const day24Btn = modal.locator('button, td, a').filter({ hasText: /^24$/ }).first();
    if (await day24Btn.count() > 0) {
      await day24Btn.click();
      console.log('Clicked 24 button!');
    } else {
      console.log('Fallback: Clicking text 24');
      await modal.locator('text="24"').first().click();
    }
    await page.waitForTimeout(1000);

    // Select Hour 12
    console.log('4. Clicking Hour 12...');
    const hour12Btn = modal.locator('button, a, span').filter({ hasText: /^12시$/ }).first();
    if (await hour12Btn.count() > 0) {
      await hour12Btn.click();
      console.log('Clicked 12시 button!');
    } else {
      await modal.locator('text="12시"').first().click().catch(() => {});
    }
    await page.waitForTimeout(1000);

    // Click Apply (적용) button inside modal
    console.log('5. Clicking Apply (적용) button...');
    const applyBtn = modal.locator('button:has-text("적용"), a:has-text("적용"), button.btn_bn-blue').first();
    await applyBtn.click();
    await page.waitForTimeout(1000);

    // Check value of #startDate input
    const startDateVal = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
    console.log('📌 #startDate value after modal:', startDateVal);

    // Click Search button (btn_lookup)
    console.log('6. Clicking button.btn_lookup...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('7. Current Page URL:', page.url());

    // Take screenshot of search list
    await page.screenshot({ path: 'f:/Antigravity/KorailTicketAgent/scratch_search_results.png', fullPage: true });

    // Inspect list page DOM structure for trains
    const trainRows = await page.evaluate(() => {
      // Find list items or table rows
      const listWrapper = document.querySelector('ul.list_train, ul.tckList, .tckListWrap, .train_list, table.table_tbl_type2');
      if (listWrapper) {
        return {
          wrapperClass: listWrapper.className,
          html: listWrapper.innerHTML.slice(0, 2000),
          text: listWrapper.innerText,
        };
      }
      return { text: document.body.innerText.slice(0, 2000) };
    });

    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_train_rows.json', JSON.stringify(trainRows, null, 2), 'utf-8');
    console.log('✅ trainRows saved to scratch_train_rows.json!');

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testExactDate();
