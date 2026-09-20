import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log('Navigating to http://localhost:3840 ...');
  await page.goto('http://localhost:3840', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'ui_new_vertical_layout.png', fullPage: true });
  console.log('Saved screenshot: ui_new_vertical_layout.png');

  await browser.close();
}

main().catch(console.error);
