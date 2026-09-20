import { chromium } from 'playwright';

async function inspectJS() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const keys = await page.evaluate(() => {
    return Object.keys(window).filter(k => 
      k.includes('search') || k.includes('Search') || k.includes('station') || 
      k.includes('Station') || k.includes('ticket') || k.includes('Ticket') || 
      k.includes('fn') || k.includes('go') || k.includes('reserve')
    );
  });

  console.log('Global JS functions & objects found:');
  console.log(JSON.stringify(keys, null, 2));

  await browser.close();
}

inspectJS();
