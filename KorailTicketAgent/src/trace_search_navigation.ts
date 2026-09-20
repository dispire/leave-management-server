import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('response', resp => {
    if (resp.url().includes('schedule') || resp.url().includes('ticket') || resp.url().includes('korail')) {
      console.log('RESPONSE:', resp.status(), resp.url());
    }
  });

  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Clicking button.btn_lookup...');
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }).catch(e => console.log('No full page navigation occurred:', e.message)),
    page.click('button.btn_lookup')
  ]);

  await page.waitForTimeout(5000);
  console.log('URL after click:', page.url());

  const fullText = await page.evaluate(() => document.body.innerText);
  console.log('Body Text length:', fullText.length);
  console.log('Body Text sample:\n', fullText.substring(0, 2000));

  await browser.close();
}

main().catch(console.error);
