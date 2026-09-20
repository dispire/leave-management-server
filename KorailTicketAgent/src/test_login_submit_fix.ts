import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const membershipNo = process.env.KORAIL_MEMBERSHIP_NO || '';
const password = process.env.KORAIL_PASSWORD || '';

async function main() {
  console.log('Testing login submit with button.btn_bn-depblue ...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle' });
  await page.fill('#id', membershipNo);
  await page.fill('#password', password);
  await page.waitForTimeout(300);

  console.log('Clicking button.btn_bn-depblue ...');
  await page.click('button.btn_bn-depblue');
  await page.waitForTimeout(3000);

  console.log('URL after login:', page.url());

  // Check login cookies / session state
  const cookies = await page.context().cookies();
  console.log('Cookies count:', cookies.length);
  const authCookie = cookies.find(c => c.name.includes('JSESSION') || c.name.includes('SSO') || c.name.includes('USER') || c.name.includes('Token'));
  console.log('Sample Auth Cookie:', authCookie);

  // Now search 청량리 -> 양평 for TODAY
  console.log('Navigating to search page...');
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

  const trains = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('div, li, tr')).filter(el => {
      const txt = (el as HTMLElement).innerText || '';
      return (txt.includes('→') || txt.includes('소요시간')) && 
             (txt.includes('KTX') || txt.includes('ITX') || txt.includes('무궁화') || txt.includes('새마을') || txt.includes('누리로'));
    });
    const leafItems = list.filter(parent => !list.some(child => child !== parent && parent.contains(child)));
    return leafItems.map(item => ((item as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim());
  });

  console.log(`FOUND ${trains.length} TRAINS!`);
  trains.forEach((t, i) => console.log(`Train ${i}:`, t.substring(0, 100)));

  await browser.close();
}

main().catch(console.error);
