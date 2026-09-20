import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click lookup for default 서울 -> 부산
  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  console.log('URL:', page.url());

  // Check where "해당 스케줄에 운행하는 열차가 없습니다" is located
  const matchInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const matches = all.filter(el => {
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent)
        .join('');
      return directText.includes('해당 스케줄에 운행하는 열차가 없습니다') || el.innerHTML.includes('해당 스케줄에 운행하는 열차가 없습니다');
    });

    return matches.slice(0, 10).map(m => ({
      tag: m.tagName,
      className: m.className,
      id: m.id,
      text: m.innerText.substring(0, 150),
      isVisible: (m as HTMLElement).offsetWidth > 0 && (m as HTMLElement).offsetHeight > 0
    }));
  });

  console.log('Match info count:', matchInfo.length);
  console.log('Match info:', JSON.stringify(matchInfo, null, 2));

  // Check actual train list elements on page
  const trainListItems = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('ul.list_ticket > li, .tckList, .list_train li, table.table_tbl_type2 tr, .tbl_wrap tr, div.train_info'));
    return list.map(item => ({
      tag: item.tagName,
      className: item.className,
      text: item.innerText.replace(/\s+/g, ' ').substring(0, 150),
      isVisible: (item as HTMLElement).offsetWidth > 0 && (item as HTMLElement).offsetHeight > 0
    }));
  });

  console.log('Train list items count:', trainListItems.length);
  console.log('Train list items sample:', JSON.stringify(trainListItems.slice(0, 10), null, 2));

  await browser.close();
}

main().catch(console.error);
