import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function testLoginMethod(methodName: string, buttonSelector: string) {
  console.log(`=== Testing Login Method: ${methodName} (${buttonSelector}) ===`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.fill('#id', membershipNo);
  await page.fill('#password', password);
  await page.waitForTimeout(300);

  const btn = page.locator(buttonSelector).first();
  console.log(`Button count for ${buttonSelector}:`, await btn.count());
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(3000);
  }

  console.log(`URL after ${methodName}:`, page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log(`Body snippet after ${methodName}:\n`, bodyText);

  // Now go to search
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Departure & Arrival
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

  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  const rows = await page.evaluate(() => {
    const nodes = document.querySelectorAll('li.tckList, .tckList, table.table_tbl_type2 tr, .list_train li');
    return Array.from(nodes).map(n => (n as HTMLElement).innerText.replace(/\s+/g, ' ').substring(0, 100));
  });

  console.log(`Trains Found (${methodName}): ${rows.length}`);
  if (rows.length > 0) {
    console.log('First train:', rows[0]);
  }

  await browser.close();
}

async function main() {
  await testLoginMethod('a.btnGoLogin', 'a.btnGoLogin');
  await testLoginMethod('button.btn_bn-depblue', 'button.btn_bn-depblue');
}

main().catch(console.error);
