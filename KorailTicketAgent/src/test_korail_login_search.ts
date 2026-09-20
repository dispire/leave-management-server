import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function main() {
  console.log('=== Testing Korail Login & Search Flow ===');
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

  // 1. Go to Login Page
  console.log('Going to Korail Login Page...');
  await page.goto('https://www.korail.com/user/login', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('Login URL:', page.url());

  // Dump inputs on login page
  const inputInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder }));
  });
  console.log('Login Inputs:', JSON.stringify(inputInfo, null, 2));

  // Fill credentials if inputs found
  if (membershipNo && password) {
    const idInput = page.locator('input[name="txtMemberNo"], input#txtMemberNo, input[name="userId"], input#userId').first();
    const pwInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("로그인"), a:has-text("로그인")').first();

    if (await idInput.count() > 0 && await pwInput.count() > 0) {
      console.log('Filling login credentials...');
      await idInput.fill(membershipNo);
      await pwInput.fill(password);
      await page.waitForTimeout(500);

      if (await loginBtn.count() > 0) {
        console.log('Clicking Login button...');
        await loginBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  }

  console.log('URL after login attempt:', page.url());

  // 2. Go to Search Page
  console.log('Navigating to Search page...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Search default (서울 -> 부산)
  console.log('Clicking lookup button...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  console.log('List Page URL:', page.url());

  // Check train rows
  const rows = await page.evaluate(() => {
    const nodes = document.querySelectorAll('li.tckList, .tckList, table.table_tbl_type2 tr, .list_train li');
    return Array.from(nodes).map(n => n.innerText.replace(/\s+/g, ' ').substring(0, 100));
  });

  console.log('Found Train Rows Count:', rows.length);
  console.log('Train Rows Sample:', JSON.stringify(rows.slice(0, 5), null, 2));

  await browser.close();
}

main().catch(console.error);
