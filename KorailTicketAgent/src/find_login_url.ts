import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to Korail general search...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Finding login link...');
  const loginLink = page.locator('a, button').filter({ hasText: /^로그인$/ }).first();
  if (await loginLink.count() > 0) {
    console.log('Clicking 로그인 link...');
    await loginLink.click();
    await page.waitForTimeout(3000);
  }

  console.log('Current URL after login click:', page.url());

  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      className: i.className
    }));
  });

  console.log('Inputs found:', JSON.stringify(inputs, null, 2));

  const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Body snippet:\n', bodySnippet);

  await browser.close();
}

main().catch(console.error);
