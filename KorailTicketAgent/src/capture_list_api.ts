import { chromium } from 'playwright';

async function captureListAPI() {
  console.log('📡 Capturing network requests on korail.com/ticket/search/general & /list...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  page.on('response', async res => {
    const url = res.url();
    const status = res.status();
    if (url.includes('ebiz') || url.includes('biz') || url.includes('search') || url.includes('sch') || url.includes('ticket') || url.includes('json') || url.includes('.do')) {
      try {
        const text = await res.text();
        if (text.length > 5 && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.svg')) {
          console.log(`\n--------------------------------------------------`);
          console.log(`📡 [HTTP ${status}] ${url}`);
          console.log(`Payload/Text Sample:`, text.slice(0, 600));
        }
      } catch {}
    }
  });

  try {
    console.log('Navigating to https://www.korail.com/ticket/search/general...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open Date Modal
    await page.locator('a.btn_d-day').click();
    await page.waitForTimeout(1000);

    const modal = page.locator('.ReactModal__Content').first();

    // Click Day 24
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const td24 = Array.from(modal.querySelectorAll('td:not(.disabled) a, td:not(.disabled) span')).find(
        el => el.textContent?.trim() === '24'
      ) as HTMLElement | undefined;
      if (td24) td24.click();
    });
    await page.waitForTimeout(500);

    // Click Hour 12
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const hour12 = Array.from(modal.querySelectorAll('li a')).find(
        el => el.textContent?.trim() === '12시'
      ) as HTMLElement | undefined;
      if (hour12) hour12.click();
    });
    await page.waitForTimeout(500);

    // Click Apply
    await page.evaluate(() => {
      const modal = document.querySelector('.ReactModal__Content');
      if (!modal) return;
      const apply = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.trim() === '적용') as HTMLElement | undefined;
      if (apply) apply.click();
    });
    await page.waitForTimeout(1000);

    // Submit Search
    console.log('Clicking Search button...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(6000);

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

captureListAPI();
