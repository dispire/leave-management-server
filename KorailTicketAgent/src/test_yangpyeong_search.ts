import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing 청량리 -> 양평 search on Korail...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Select Departure: 청량리
  console.log('Selecting departure: 청량리...');
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

  // 2. Select Arrival: 양평
  console.log('Selecting arrival: 양평...');
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

  // 3. Click Lookup
  console.log('Clicking lookup button...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page Body Text Snippet:\n', bodyText.substring(0, 1500));

  // Check rows
  const rows = await page.locator('li.tckList, ul.list_train li, table.table_tbl_type2 tr').allInnerTexts();
  console.log('Found rows count:', rows.length);
  rows.forEach((r, idx) => console.log(`Row ${idx}:`, r.replace(/\s+/g, ' ').substring(0, 100)));

  await browser.close();
}

main().catch(console.error);
