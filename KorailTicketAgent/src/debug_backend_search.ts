import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

const korailId = process.env.KORAIL_MEMBERSHIP_NO || '';
const korailPw = process.env.KORAIL_PASSWORD || '';

async function main() {
  console.log('=== Debugging Backend Search Step by Step ===');

  const tempProfile = path.join(os.tmpdir(), 'korail_agent_profile_' + Date.now());
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true, // test in headless to match server
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });

  const page = await context.newPage();

  // 1. Login
  if (korailId && korailPw) {
    console.log('[Step 1] Logging in at https://www.korail.com/ticket/login ...');
    await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#id', korailId);
    await page.fill('#password', korailPw);
    await page.click('button:has-text("로그인")');
    await page.waitForTimeout(3000);
    console.log('After login URL:', page.url());
  }

  // 2. Go to Search
  console.log('[Step 2] Navigating to search page...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Dismiss popup
  try {
    const btn = page.locator('.ReactModal__Content button').filter({ hasText: '확인' }).first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
  } catch {}

  // 3. Select Station: 청량리 -> 양평
  console.log('[Step 3] Setting station 청량리 -> 양평...');
  await page.click('.start a.btn_pop-open');
  await page.waitForTimeout(500);
  await page.click('.ReactModal__Content a:has-text("청량리")');
  await page.waitForTimeout(500);

  await page.click('.end a.btn_pop-open');
  await page.waitForTimeout(500);
  await page.fill('.ReactModal__Content input[name="searchTxt"]', '양평');
  await page.click('.ReactModal__Content button.btn_sch');
  await page.waitForTimeout(500);
  await page.click('.ReactModal__Content a:has-text("양평")');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'debug_step3_station.png' });

  // 4. Select Date: 2026-09-19 or 2026-09-24
  console.log('[Step 4] Opening date modal...');
  await page.click('a.btn_d-day');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'debug_step4_date_modal.png' });

  // Check date modal contents
  const modalText = await page.evaluate(() => {
    const m = document.querySelector('.ReactModal__Content');
    return m ? m.innerHTML : '';
  });
  console.log('Modal HTML length:', modalText.length);

  // Try clicking 적용 button
  const applied = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.ReactModal__Content button'));
    const btn = btns.find(b => b.textContent?.includes('적용'));
    if (btn) { (btn as HTMLElement).click(); return true; }
    return false;
  });
  console.log('Applied date modal:', applied);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'debug_step5_after_date.png' });

  // 5. Click Lookup
  console.log('[Step 5] Clicking lookup button...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'debug_step6_result_page.png' });

  console.log('Final URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Final Body Snippet:\n', bodyText.substring(0, 1200));

  await browser.close();
}

main().catch(console.error);
