import { chromium } from 'playwright';

async function checkDialog() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  console.log('Navigating to Korail main...');
  await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Clicking button.btn_lookup...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(2000);

  const dialogText = await page.$$eval('div[role="dialog"], .pop_wrap, .popup, .confirm_wrap, div[class*="layer"]', list => 
    list.map(d => d.textContent?.replace(/\s+/g, ' ').trim())
  );
  console.log('Dialog content:', JSON.stringify(dialogText, null, 2));

  await browser.close();
}

checkDialog();
