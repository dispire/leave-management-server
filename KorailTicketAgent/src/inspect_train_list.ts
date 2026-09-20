import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click search button directly for today's default search (서울 -> 부산)
  await page.click('button.btn_lookup');
  // Wait for network response or content to render
  await page.waitForTimeout(5000);
  console.log('Current URL:', page.url());

  // Print text content of main section
  const containerText = await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('#content') || document.querySelector('.container') || document.body;
    return main ? main.innerText : '';
  });

  console.log('--- Container Inner Text ---');
  console.log(containerText);
  console.log('---------------------------');

  // Let's inspect HTML structure inside container
  const htmlSnippet = await page.evaluate(() => {
    const container = document.querySelector('.container') || document.body;
    return container.innerHTML;
  });

  console.log('HTML snippet length:', htmlSnippet.length);
  // print first 2000 chars of HTML snippet
  console.log('HTML head snippet:\n', htmlSnippet.substring(0, 2000));

  await browser.close();
}

main().catch(console.error);
