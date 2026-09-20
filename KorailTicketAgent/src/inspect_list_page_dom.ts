import { chromium } from 'playwright';
import fs from 'fs';

async function inspectListDOM() {
  console.log('🔍 Inspecting list page DOM...');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Submit search
    await page.locator('button.btn_lookup').click();
    await page.waitForTimeout(5000);

    console.log('List page URL:', page.url());

    // Dump full HTML of list page
    const listHtml = await page.content();
    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_full.html', listHtml, 'utf-8');

    // Extract structure of list items or message
    const domStructure = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, ul, li, section, table')).map(el => ({
        tag: el.tagName,
        id: el.id,
        class: el.className,
        textSample: el.innerText ? el.innerText.replace(/\s+/g, ' ').slice(0, 100) : '',
      }));
      return allDivs.filter(d => d.class.length > 0 || d.id.length > 0);
    });

    fs.writeFileSync('f:/Antigravity/KorailTicketAgent/scratch_list_classes.json', JSON.stringify(domStructure.slice(0, 100), null, 2), 'utf-8');
    console.log('Saved scratch_list_full.html and scratch_list_classes.json!');

  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

inspectListDOM();
