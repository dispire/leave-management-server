import { chromium } from 'playwright';

async function testRoute(departure: string, arrival: string) {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Departure
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

  // Arrival
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

  // Click Lookup
  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const isNoTrain = bodyText.includes('해당 스케줄에 운행하는 열차가 없습니다');
  const items = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, tr, div')).filter(el => el.innerText.includes('KTX') || el.innerText.includes('ITX') || el.innerText.includes('무궁화') || el.innerText.includes('새마을'));
    return list.map(el => el.innerText.replace(/\s+/g, ' ').substring(0, 100));
  });

  console.log(`Route [${departure} -> ${arrival}]: NoTrainMsg=${isNoTrain}, MatchCount=${items.length}`);
  if (items.length > 0) {
    console.log(`Sample item 0:`, items[0]);
  }

  await browser.close();
}

async function main() {
  await testRoute('서울', '부산');
  await testRoute('청량리', '강릉');
  await testRoute('서울', '대전');
}

main().catch(console.error);
