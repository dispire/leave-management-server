import { chromium } from 'playwright';

async function inspectPage() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  console.log('Navigating to https://www.korail.com/ticket/main...');
  await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  console.log('Page title:', await page.title());
  console.log('Current URL:', page.url());

  const textInputs = await page.$$eval('input[type="text"], input[type="search"], input:not([type="hidden"])', list => 
    list.map(i => { const el = i as HTMLInputElement; return { id: el.id, name: el.name, placeholder: el.placeholder, value: el.value, class: el.className }; })
  );
  console.log('Text Inputs:', JSON.stringify(textInputs, null, 2));

  const buttons = await page.$$eval('button, a, input[type="button"], input[type="submit"]', list => 
    list.map(b => ({ tag: b.tagName, id: b.id, class: b.className, text: b.textContent?.replace(/\s+/g, ' ').trim() }))
        .filter(x => x.text && x.text.length > 0 && x.text.length < 30)
  );
  console.log('Buttons/Links:', JSON.stringify(buttons.slice(0, 30), null, 2));

  await browser.close();
}

inspectPage();
