import { chromium } from 'playwright';
import fs from 'fs';

async function deepInspect() {
  console.log('🔬 [Deep Inspection] Starting Korail Ticket Search Flow...');

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
    console.log('Step 1: Navigating to https://www.korail.com/ticket/search/general');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Save initial DOM structure of general search page
    const generalButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, input, select')).map(el => ({
        tag: el.tagName,
        id: el.id,
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').slice(0, 50) : '',
        placeholder: (el as HTMLInputElement).placeholder || '',
        value: (el as HTMLInputElement).value || '',
      }));
    });
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_general_elements.json', JSON.stringify(generalButtons, null, 2), 'utf-8');
    console.log('Saved general search elements count:', generalButtons.length);

    // Let's test opening date modal
    console.log('\nStep 2: Testing Date/Time trigger element...');
    const dateBtn = page.locator('a.btn_d-day, button:has-text("2026"), [class*="date"], [class*="day"]').first();
    console.log('Date button text:', await dateBtn.innerText().catch(() => 'N/A'));
    await dateBtn.click().catch(e => console.log('Click dateBtn error:', e.message));
    await page.waitForTimeout(2000);

    // Check if modal opened
    const modals = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ReactModal__Content, [class*="modal"], [class*="pop"]')).map(el => ({
        class: el.className,
        text: el.innerText ? el.innerText.replace(/\s+/g, ' ').slice(0, 300) : '',
      }));
    });
    console.log('Modals found:', JSON.stringify(modals, null, 2));

    // Fill search and submit
    console.log('\nStep 3: Submitting Search...');
    const searchBtn = page.locator('button.btn_lookup, button:has-text("열차 조회"), a:has-text("열차 조회")').first();
    await searchBtn.click();
    await page.waitForTimeout(5000);

    console.log('\nStep 4: Current URL after search:', page.url());

    // Inspect list page DOM
    const listDOM = await page.evaluate(() => {
      const lists = Array.from(document.querySelectorAll('ul, ol, table, div[class*="list"], div[class*="train"]')).map(el => ({
        tag: el.tagName,
        class: el.className,
        id: el.id,
        childCount: el.children.length,
        sampleText: el.innerText ? el.innerText.replace(/\s+/g, ' ').slice(0, 200) : '',
      }));
      return lists;
    });
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_dom.json', JSON.stringify(listDOM, null, 2), 'utf-8');
    console.log('Saved list DOM elements count:', listDOM.length);

    const bodyText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_body.txt', bodyText, 'utf-8');
    console.log('Body text saved to scratch_list_body.txt (length:', bodyText.length, ')');

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

deepInspect();
