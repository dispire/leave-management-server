import { chromium } from 'playwright';

async function inspectKorailListDOM() {
  console.log('🔍 Running Korail DOM Inspection for Reservation Flow...');
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Dismiss promo popup if any
    const modalClose = page.locator('.ReactModalPortal button, .ReactModalPortal a').first();
    if (await modalClose.count() > 0 && await modalClose.isVisible()) {
      await modalClose.click().catch(() => {});
    }

    // Click search directly (default: 서울 -> 부산)
    console.log('Clicking lookup...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(5000);

    console.log('Current URL:', page.url());

    // Dump all buttons/links in train list table
    const buttonsInfo = await page.evaluate(() => {
      const trainRows = Array.from(document.querySelectorAll('tr, li, div[class*="train"], div[class*="item"], div[class*="list"]'));
      
      const buttons = Array.from(document.querySelectorAll('button, a')).map(el => {
        const text = el.textContent?.trim() || '';
        const parentText = el.parentElement?.textContent?.replace(/\s+/g, ' ').trim() || '';
        return {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: text,
          href: (el as HTMLAnchorElement).href || '',
          parentSnippet: parentText.slice(0, 100),
          onclick: el.getAttribute('onclick') || ''
        };
      }).filter(b => b.text.includes('예매') || b.text.includes('좌석') || b.text.includes('신청') || b.className.includes('btn'));

      return buttons;
    });

    console.log('Found reservation/action buttons count:', buttonsInfo.length);
    console.log('Sample buttons:\n', JSON.stringify(buttonsInfo.slice(0, 15), null, 2));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

inspectKorailListDOM();
