import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to Korail ticket search...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Open Date Modal
  console.log('Opening date modal...');
  await page.click('a.btn_d-day');
  await page.waitForTimeout(1000);

  // 2. Select Date (e.g. 24)
  const dayStr = '24';
  console.log(`Selecting day ${dayStr}...`);
  const dayLink = page.locator('.ReactModal__Content td:not(.disabled) a').filter({ hasText: new RegExp(`^${dayStr}$`) }).first();
  if (await dayLink.isVisible()) {
    await dayLink.click();
    console.log(`Clicked day ${dayStr}`);
  } else {
    console.log(`Day ${dayStr} not visible, clicking first enabled day...`);
    await page.locator('.ReactModal__Content td:not(.disabled) a').first().click();
  }
  await page.waitForTimeout(500);

  // 3. Select Hour (e.g. 12시)
  console.log('Selecting hour 12시 via evaluate...');
  const hourClicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.ReactModal__Content li a, .ReactModal__Content a'));
    const target = links.find(a => (a as HTMLElement).innerText.trim() === '12시');
    if (target) {
      (target as HTMLElement).click();
      return (target as HTMLElement).innerText.trim();
    }
    return null;
  });
  console.log('Hour click result:', hourClicked);
  await page.waitForTimeout(500);

  // 4. Click 적용 button
  console.log('Clicking 적용 button...');
  const applied = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.ReactModal__Content button'));
    const applyBtn = btns.find(b => (b as HTMLElement).innerText.includes('적용'));
    if (applyBtn) {
      (applyBtn as HTMLElement).click();
      return true;
    }
    return false;
  });
  console.log('Apply button click result:', applied);
  await page.waitForTimeout(1500);

  // Check date banner text
  const bannerText = await page.innerText('a.btn_d-day');
  console.log('Updated Date Banner:', bannerText);

  // 5. Click 열차 조회
  console.log('Clicking button.btn_lookup...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  console.log('URL after lookup:', page.url());

  // Check page text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page Body Text Snippet:\n', bodyText.substring(0, 1500));

  await browser.close();
}

main().catch(console.error);
