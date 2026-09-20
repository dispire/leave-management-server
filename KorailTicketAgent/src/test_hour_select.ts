import { chromium } from 'playwright';

async function testHourSelect() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Open Date Modal
  await page.locator('a.btn_d-day').click();
  await page.waitForTimeout(1000);

  const modal = page.locator('.ReactModal__Content').first();

  // 2. Click Day 24
  console.log('Clicking Day 24...');
  await page.evaluate(() => {
    const modal = document.querySelector('.ReactModal__Content');
    if (!modal) return;
    const td24 = Array.from(modal.querySelectorAll('td:not(.disabled) a, td:not(.disabled) span')).find(
      el => el.textContent?.trim() === '24'
    ) as HTMLElement | undefined;
    if (td24) td24.click();
  });
  await page.waitForTimeout(1000);

  // 3. Click Hour 12
  console.log('Clicking Hour 12...');
  const hourResult = await page.evaluate(() => {
    const modal = document.querySelector('.ReactModal__Content');
    if (!modal) return 'No modal';
    const hour12El = Array.from(modal.querySelectorAll('li, a')).find(
      el => el.textContent?.trim() === '12시' && !el.classList.contains('disabled') && !el.getAttribute('aria-disabled')
    ) as HTMLElement | undefined;

    if (hour12El) {
      hour12El.click();
      return 'Clicked 12시';
    }

    // Try finding any 12시 element
    const any12 = Array.from(modal.querySelectorAll('li, a, span')).find(el => el.textContent?.trim() === '12시') as HTMLElement | undefined;
    if (any12) {
      any12.click();
      return 'Clicked fallback 12시: ' + any12.className;
    }
    return '12시 element not found';
  });

  console.log('Hour result:', hourResult);
  await page.waitForTimeout(1000);

  // 4. Click Apply (적용) button
  console.log('Clicking Apply...');
  await page.evaluate(() => {
    const modal = document.querySelector('.ReactModal__Content');
    if (!modal) return;
    const apply = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.trim() === '적용') as HTMLElement | undefined;
    if (apply) apply.click();
  });
  await page.waitForTimeout(1000);

  // Check #startDate value
  const val = await page.locator('#startDate').getAttribute('value').catch(() => 'N/A');
  console.log('📌 #startDate value:', val);

  // 5. Submit Search
  console.log('Clicking Search...');
  await page.locator('button.btn_lookup').click();
  await page.waitForTimeout(5000);

  console.log('📌 Final Page URL:', page.url());

  // Dump actual train list elements on list page!
  const listDetails = await page.evaluate(() => {
    const body = document.body.innerText;
    const lis = Array.from(document.querySelectorAll('li, tr')).map(el => ({
      class: el.className,
      text: el.innerText.replace(/\s+/g, ' ').slice(0, 150),
    })).filter(item => item.text.includes('KTX') || item.text.includes('ITX') || item.text.includes('무궁화') || item.text.includes('새마을') || item.text.match(/\d{2}:\d{2}/));

    return {
      url: window.location.href,
      bodyHead: body.slice(0, 1000),
      trainRows: lis,
    };
  });

  console.log('\n--- LIST DETAILS ---');
  console.log(JSON.stringify(listDetails, null, 2));

  await browser.close();
}

testHourSelect();
