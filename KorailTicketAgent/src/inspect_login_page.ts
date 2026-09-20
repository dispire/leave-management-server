import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to Korail login page...');
  await page.goto('https://www.korail.com/user/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Login URL:', page.url());

  // Print all input tags and buttons
  const elements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, button, a')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: (el as HTMLInputElement).name || '',
      type: (el as HTMLInputElement).type || '',
      placeholder: (el as HTMLInputElement).placeholder || '',
      text: el.innerText.trim().substring(0, 50)
    }));
    return inputs.filter(i => i.id || i.name || i.text);
  });

  console.log('Login Elements Count:', elements.length);
  console.log('Login Elements Sample:\n', JSON.stringify(elements.slice(0, 20), null, 2));

  // Let's also print full body text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Login Body Text Snippet:\n', bodyText.substring(0, 1500));

  await browser.close();
}

main().catch(console.error);
