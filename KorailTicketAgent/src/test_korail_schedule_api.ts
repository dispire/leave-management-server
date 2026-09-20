import { chromium } from 'playwright';

async function testScheduleAPI() {
  console.log('📡 Capturing ALL com.korail.mobile.schedule API calls...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('schedule') || url.includes('trn') || url.includes('ticket') || url.includes('classes')) {
      console.log(`[REQ] ${req.method()} ${url}`);
      if (req.postData()) {
        console.log(`      Payload:`, req.postData());
      }
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('schedule') || url.includes('trn') || url.includes('classes')) {
      try {
        const text = await res.text();
        console.log(`[RES ${res.status()}] ${url}`);
        console.log(`      Response:`, text.slice(0, 800));
      } catch {}
    }
  });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Search Today
    console.log('\n--- CLICKING SEARCH BUTTON ---');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(6000);

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testScheduleAPI();
