import { chromium } from 'playwright';

async function testNetworkAPI() {
  console.log('📡 [Network Interceptor] Capturing Korail API requests during search...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  const capturedAPIs: Array<{ url: string; method: string; postData?: string; status?: number }> = [];

  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('search') || url.includes('ticket') || url.includes('json') || url.includes('ebiz')) {
      capturedAPIs.push({
        url,
        method: req.method(),
        postData: req.postData() || undefined,
      });
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/') || url.includes('search') || url.includes('list') || url.includes('ticket')) {
      try {
        const text = await res.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          console.log('\n🔥 [JSON API Response Captured]', url);
          console.log('Response sample:', text.slice(0, 500));
        }
      } catch {}
    }
  });

  try {
    console.log('Navigating to https://www.korail.com/ticket/search/general...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Clicking Search button...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('\n--- CAPTURED REQUESTS (Filtered) ---');
    capturedAPIs.forEach(r => {
      console.log(`${r.method} ${r.url}`);
      if (r.postData) console.log('  Payload:', r.postData);
    });

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testNetworkAPI();
