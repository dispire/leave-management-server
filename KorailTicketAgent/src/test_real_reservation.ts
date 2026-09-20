import { chromium } from 'playwright';
import fs from 'fs';

async function dumpListHTML() {
  console.log('🧪 Dumping search/list page HTML...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Dismiss popups
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // Perform search: 서울 -> 부산
    console.log('Clicking lookup...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    // Click Next Day button twice to get real scheduled trains
    console.log('Clicking Next Day button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const nextBtn = btns.find(b => b.textContent?.includes('다음날'));
      if (nextBtn) (nextBtn as HTMLElement).click();
    });
    await page.waitForTimeout(4000);

    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    const bodyText = await page.evaluate(() => document.body.innerText);

    fs.writeFileSync('page_list.html', bodyHTML);
    fs.writeFileSync('page_text.txt', bodyText);
    console.log('Saved page_list.html & page_text.txt');

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

dumpListHTML();
