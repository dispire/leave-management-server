import { chromium } from 'playwright';
import fs from 'fs';

async function testRealTrainList() {
  console.log('🧪 Testing real train list search for TODAY (2026-09-19 12:00)...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click search button directly for today 11:00/12:00
    console.log('Submitting search for Today...');
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(4000);

    console.log('Page URL after search:', page.url());

    // Dump list HTML
    const html = await page.content();
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_today.html', html, 'utf-8');

    // Inspect list items
    const listSummary = await page.evaluate(() => {
      // Find list elements
      const lis = Array.from(document.querySelectorAll('li, tr, div')).map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '',
      })).filter(r => r.text.includes('KTX') || r.text.includes('무궁화') || r.text.includes('ITX') || r.text.includes('새마을'));

      return lis.slice(0, 30);
    });

    console.log('\n--- TODAY TRAIN LIST SUMMARY ---');
    console.log(JSON.stringify(listSummary, null, 2));

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testRealTrainList();
