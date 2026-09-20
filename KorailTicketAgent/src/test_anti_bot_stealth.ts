import { chromium } from 'playwright';

async function testStealthSearch(departure: string, arrival: string) {
  console.log(`=== Testing Stealth Search for ${departure} -> ${arrival} ===`);
  
  // Launch Chromium with anti-detection flags
  const browser = await chromium.launch({
    headless: false, // Headful mode to bypass bot detection checks
    channel: 'msedge',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,900',
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  // Inject script to override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });

  const page = await context.newPage();
  
  console.log('Navigating to Korail search page...');
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Station Selection
  console.log(`Selecting departure: ${departure}...`);
  await page.click('.start a.btn_pop-open');
  await page.waitForTimeout(1000);
  const depTag = page.locator('.ReactModal__Content .ch_tag a').filter({ hasText: departure }).first();
  if (await depTag.isVisible()) {
    await depTag.click();
  } else {
    await page.fill('.ReactModal__Content input[name="searchTxt"]', departure);
    await page.click('.ReactModal__Content button.btn_sch');
    await page.waitForTimeout(800);
    await page.click(`.ReactModal__Content a:has-text("${departure}")`);
  }
  await page.waitForTimeout(1000);

  console.log(`Selecting arrival: ${arrival}...`);
  await page.click('.end a.btn_pop-open');
  await page.waitForTimeout(1000);
  const arrTag = page.locator('.ReactModal__Content .ch_tag a').filter({ hasText: arrival }).first();
  if (await arrTag.isVisible()) {
    await arrTag.click();
  } else {
    await page.fill('.ReactModal__Content input[name="searchTxt"]', arrival);
    await page.click('.ReactModal__Content button.btn_sch');
    await page.waitForTimeout(800);
    await page.click(`.ReactModal__Content a:has-text("${arrival}")`);
  }
  await page.waitForTimeout(1000);

  // Click Search
  console.log('Clicking lookup button...');
  await page.click('button.btn_lookup');
  await page.waitForTimeout(5000);

  console.log('URL after lookup:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body Text Snippet (first 1000 chars):\n', bodyText.substring(0, 1000));

  const isNoTrain = bodyText.includes('해당 스케줄에 운행하는 열차가 없습니다');
  console.log('Is "No Train" message present?:', isNoTrain);

  // Check if any train list items exist
  const trainCount = await page.locator('li.tckList, ul.list_train li, table.table_tbl_type2 tr, .train_list_box').count();
  console.log('Train elements count found:', trainCount);

  await page.screenshot({ path: `stealth_search_${departure}_${arrival}.png` });
  console.log(`Saved screenshot stealth_search_${departure}_${arrival}.png`);

  await browser.close();
}

testStealthSearch('청량리', '양평').catch(console.error);
