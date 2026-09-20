import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function main() {
  console.log('Testing selector fix for Korail search results...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
  await page.fill('#id', membershipNo);
  await page.fill('#password', password);
  await page.click('button.btn_bn-depblue');
  await page.waitForTimeout(3000);

  // Search 청량리 -> 양평 for TODAY
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

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

  // Selector 1: Standard selector
  const rows1 = await page.evaluate(() => {
    const nodes = document.querySelectorAll('li.tckList, .tckList, ul.list_ticket > li, .list_train li, table.table_tbl_type2 tr');
    return Array.from(nodes).map(n => (n as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).filter(t => t.length > 10);
  });

  console.log(`Selector 1 Found: ${rows1.length} trains`);
  if (rows1.length > 0) {
    console.log('Sample train 0:', rows1[0]);
    console.log('Sample train 1:', rows1[1]);
  }

  await browser.close();
}

main().catch(console.error);
