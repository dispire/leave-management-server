import { chromium } from 'playwright';

async function dumpResults() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  console.log('1. Navigating to Korail main...');
  await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Set departure/arrival
  await page.evaluate(() => {
    const endEl = document.getElementById('labelend') as HTMLInputElement;
    if (endEl) endEl.value = '양평';
  });

  console.log('2. Clicking btn_lookup...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  console.log('3. Extracting all text content from page body...');
  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- BODY TEXT START ---');
  console.log(text);
  console.log('--- BODY TEXT END ---');

  await browser.close();
}

dumpResults();
