import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Find all buttons and links in main container
  const btnDetails = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
    return list.map(el => ({
      tag: el.tagName,
      id: el.id,
      className: el.className,
      text: (el as HTMLElement).innerText.trim(),
      isVisible: (el as HTMLElement).offsetWidth > 0 && (el as HTMLElement).offsetHeight > 0
    })).filter(b => b.text.includes('로그인') || b.className.includes('login') || b.className.includes('btn'));
  });

  console.log('Login Button Details:', JSON.stringify(btnDetails, null, 2));

  await browser.close();
}

main().catch(console.error);
