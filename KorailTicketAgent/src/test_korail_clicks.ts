import { chromium } from 'playwright';

async function testNaturalClicks() {
  console.log('==================================================');
  console.log('🚆 [코레일 UI 클릭 조작 테스트]');
  console.log('==================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.korail.com/ticket/main', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Close top popup if exists
    const closeBtn = page.locator('.topclose_btn, button:has-text("닫기")');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    console.log('1. 도착역 상자 주변 클릭 시도...');
    // Find all clickable elements around arrival station
    const endLabels = page.locator('#labelend, label[for="labelend"], .end_btn, div:has(#labelend)');
    for (let i = 0; i < await endLabels.count(); i++) {
      console.log(`Clicking candidate ${i}...`);
      await endLabels.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);

      // Check if modal or search input appeared
      const popups = await page.$$eval('div[class*="pop"], div[class*="layer"], div[class*="modal"]', list => 
        list.map(d => ({ class: d.className, text: d.textContent?.replace(/\s+/g, ' ').slice(0, 100) }))
            .filter(x => x.text && x.text.length > 5)
      );
      if (popups.length > 0) {
        console.log('Popups detected:', JSON.stringify(popups, null, 2));
        break;
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testNaturalClicks();
