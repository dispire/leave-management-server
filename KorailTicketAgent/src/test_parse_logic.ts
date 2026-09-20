import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
  await page.fill('#id', membershipNo);
  await page.fill('#password', password);
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(3000);

  // Search 청량리 -> 양평 for TODAY
  await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.click('.start a.btn_pop-open');
  await page.waitForTimeout(500);
  await page.click('.ReactModal__Content a:has-text("청량리")');
  await page.waitForTimeout(500);

  await page.click('.end a.btn_pop-open');
  await page.waitForTimeout(500);
  await page.fill('.ReactModal__Content input[name="searchTxt"]', '양평');
  await page.click('.ReactModal__Content button.btn_sch');
  await page.waitForTimeout(500);
  await page.click('.ReactModal__Content a:has-text("양평")');
  await page.waitForTimeout(500);

  await page.click('button.btn_lookup');
  await page.waitForTimeout(4000);

  // Dump all DOM elements containing KTX or ITX
  const cardCandidates = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = (el as HTMLElement).innerText || '';
      return text.includes('KTX') || text.includes('ITX') || text.includes('무궁화') || text.includes('새마을');
    });

    return list.slice(0, 15).map(el => ({
      tag: el.tagName,
      className: el.className,
      id: el.id,
      childCount: el.childElementCount,
      innerTextSnippet: ((el as HTMLElement).innerText || '').replace(/\s+/g, ' ').substring(0, 150)
    }));
  });

  console.log('Candidates count:', cardCandidates.length);
  console.log('Candidates:', JSON.stringify(cardCandidates, null, 2));

  await browser.close();
}

main().catch(console.error);
