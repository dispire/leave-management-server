import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function main() {
  console.log('=== Testing Real Korail Login (https://www.korail.com/ticket/login) ===');
  console.log('Membership ID:', membershipNo ? 'Loaded' : 'Missing');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    viewport: { width: 1280, height: 900 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  if (membershipNo && password) {
    console.log('Navigating to https://www.korail.com/ticket/login...');
    await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Filling login form...');
    await page.fill('#id', membershipNo);
    await page.fill('#password', password);
    await page.waitForTimeout(500);

    console.log('Clicking login button...');
    const loginBtn = page.locator('button, a').filter({ hasText: /^로그인$/ }).first();
    await loginBtn.click();
    await page.waitForTimeout(3000);

    console.log('URL after login submit:', page.url());
  } else {
    console.log('No Korail credentials found in .env');
  }

  // Now go to search
  console.log('Navigating to search page...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Search 청량리 -> 양평
  console.log('Setting departure: 청량리...');
  await page.click('.start a.btn_pop-open');
  await page.waitForTimeout(1000);
  let depTag = page.locator('.ReactModal__Content .ch_tag a').filter({ hasText: '청량리' }).first();
  if (await depTag.isVisible()) {
    await depTag.click();
  } else {
    await page.fill('.ReactModal__Content input[name="searchTxt"]', '청량리');
    await page.click('.ReactModal__Content button.btn_sch');
    await page.waitForTimeout(800);
    await page.click('.ReactModal__Content a:has-text("청량리")');
  }
  await page.waitForTimeout(1000);

  console.log('Setting arrival: 양평...');
  await page.click('.end a.btn_pop-open');
  await page.waitForTimeout(1000);
  let arrTag = page.locator('.ReactModal__Content .ch_tag a').filter({ hasText: '양평' }).first();
  if (await arrTag.isVisible()) {
    await arrTag.click();
  } else {
    await page.fill('.ReactModal__Content input[name="searchTxt"]', '양평');
    await page.click('.ReactModal__Content button.btn_sch');
    await page.waitForTimeout(800);
    await page.click('.ReactModal__Content a:has-text("양평")');
  }
  await page.waitForTimeout(1000);

  console.log('Clicking lookup button...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  console.log('List Page URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body Text Snippet (first 1000 chars):\n', bodyText.substring(0, 1000));

  const rows = await page.evaluate(() => {
    const nodes = document.querySelectorAll('li.tckList, .tckList, table.table_tbl_type2 tr, .list_train li');
    return Array.from(nodes).map(n => n.innerText.replace(/\s+/g, ' ').substring(0, 100));
  });

  console.log('Found Train Rows Count:', rows.length);
  console.log('Train Rows Sample:', JSON.stringify(rows.slice(0, 5), null, 2));

  await browser.close();
}

main().catch(console.error);
