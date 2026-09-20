import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function inspectKorailList() {
  console.log('🔍 [Korail Diagnostic] Launching browser to inspect https://www.korail.com/ticket/search/general...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  });

  const page = await context.newPage();

  try {
    console.log('1. Navigating to general search page...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('2. Page URL:', page.url());

    // Click search button
    console.log('3. Looking for search button...');
    const searchBtn = page.locator('button:has-text("열차 조회"), button.btn_lookup, a:has-text("열차 조회")').first();
    if (await searchBtn.count() > 0) {
      console.log('Clicking search button...');
      await searchBtn.click();
      await page.waitForTimeout(5000);
    }

    console.log('4. Page URL after search:', page.url());

    // Dump text content of body
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n--- BODY TEXT SAMPLE (First 1500 chars) ---');
    console.log(bodyText.slice(0, 1500));
    console.log('-------------------------------------------\n');

    // Check all list items, tables, buttons
    const elemSummary = await page.evaluate(() => {
      const lis = Array.from(document.querySelectorAll('li')).map(el => ({ tag: 'li', class: el.className, text: el.innerText.replace(/\s+/g, ' ').slice(0, 100) }));
      const trs = Array.from(document.querySelectorAll('tr')).map(el => ({ tag: 'tr', class: el.className, text: el.innerText.replace(/\s+/g, ' ').slice(0, 100) }));
      const btns = Array.from(document.querySelectorAll('button, a')).map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim() }));
      return { lis: lis.slice(0, 20), trs: trs.slice(0, 20), btns: btns.slice(0, 30) };
    });

    console.log('Elem Summary:', JSON.stringify(elemSummary, null, 2));

  } catch (err: any) {
    console.error('❌ Error during inspection:', err);
  } finally {
    await browser.close();
  }
}

inspectKorailList();
