import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Set date to today or tomorrow if needed, or just click lookup for default (서울 -> 부산)
  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  // If page says "해당 스케줄에 운행하는 열차가 없습니다.", click "다음날 (26년09월20일) 조회" or similar button
  const isNoTrain = await page.evaluate(() => document.body.innerText.includes('해당 스케줄에 운행하는 열차가 없습니다'));
  console.log('No train on first search:', isNoTrain);

  if (isNoTrain) {
    console.log('Clicking next day button...');
    const nextBtn = page.locator('button, a').filter({ hasText: '다음날' }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(4000);
    }
  }

  // Dump all train list items/tables
  const trainCards = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.tckList > li, table.table_tbl_type2 tr, .train_list_box, ul.list_train > li, .tbl_wrap tbody tr, div[class*="train"], div[class*="ticket"], div[class*="schedule"]');
    return Array.from(nodes).map(n => ({
      tag: n.tagName,
      className: n.className,
      text: n.innerText.replace(/\s+/g, ' ').trim()
    }));
  });

  console.log('Found train cards count:', trainCards.length);
  console.log('Train cards sample:\n', JSON.stringify(trainCards.filter(c => c.text.length > 10).slice(0, 10), null, 2));

  // Let's also grab innerHTML of the main content area
  const contentHTML = await page.evaluate(() => {
    const el = document.querySelector('#content') || document.querySelector('.container') || document.body;
    return el.innerHTML;
  });

  console.log('Content HTML length:', contentHTML.length);
  // Find where train list or table appears
  const match = contentHTML.match(/(<ul[^>]*list[^>]*>|<table[^>]*>|<div[^>]*tck[^>]*>)/gi);
  console.log('Matched list elements in HTML:', match);

  await browser.close();
}

main().catch(console.error);
