import { chromium } from 'playwright';

async function executeSearch() {
  console.log('==================================================');
  console.log('🚆 Korail Ticket Search Form Inspection');
  console.log('==================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating directly to https://www.korail.com/ticket/search/list...');
    await page.goto('https://www.korail.com/ticket/search/list', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Dump all form inputs, selects, buttons
    const elements = await page.$$eval('input, select, button, a', list => 
      list.map(el => ({
        tag: el.tagName,
        id: el.id,
        name: (el as any).name || '',
        class: el.className,
        type: (el as any).type || '',
        value: (el as any).value || '',
        text: el.textContent?.replace(/\s+/g, ' ').trim() || ''
      })).filter(x => x.id || x.name || (x.text && x.text.length > 0 && x.text.length < 30))
    );

    console.log('Controls on search list page:');
    console.log(JSON.stringify(elements, null, 2));

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

executeSearch();
