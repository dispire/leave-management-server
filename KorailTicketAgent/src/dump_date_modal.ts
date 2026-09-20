import { chromium } from 'playwright';

async function dumpModal() {
  const browser = await chromium.launch({ channel: 'msedge', headless: false });
  const page = await browser.newPage();
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.locator('a.btn_d-day').click();
  await page.waitForTimeout(1500);

  const modalData = await page.evaluate(() => {
    const modal = document.querySelector('.ReactModal__Content, .layerWrap.type_date-pop_wrap, .type_date-pop');
    if (!modal) return null;
    const btns = Array.from(modal.querySelectorAll('button, a, span, td, li')).map(e => ({
      tag: e.tagName,
      class: e.className,
      text: e.textContent ? e.textContent.trim() : '',
    }));
    return {
      modalClass: modal.className,
      btns: btns.filter(b => b.text.length > 0 && b.text.length < 30),
    };
  });

  console.log('Modal Data:', JSON.stringify(modalData, null, 2));
  await browser.close();
}

dumpModal();
