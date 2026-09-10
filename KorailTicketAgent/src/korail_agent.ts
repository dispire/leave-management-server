import { chromium } from 'playwright';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const korailId = process.env.KORAIL_MEMBERSHIP_NO || '';
const korailPw = process.env.KORAIL_PASSWORD || '';
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.ALLOWED_CHAT_ID || '';

const bot = telegramToken ? new TelegramBot(telegramToken, { polling: false }) : null;

export interface TrainSearchOptions {
  departure: string;
  arrival: string;
  dateStr?: string; // YYYYMMDD
  timeStr?: string; // HH
}

export async function searchAndReserveKorail(options: TrainSearchOptions) {
  const { departure = '서울', arrival = '부산', dateStr = '', timeStr = '08' } = options;

  console.log(`==================================================`);
  console.log(`🚆 Korail Ticket Agent Starting...`);
  console.log(`📍 Departure: ${departure} -> Arrival: ${arrival}`);
  console.log(`==================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
    });
  } catch {
    browser = await chromium.launch({ headless: false });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Visit LetsKorail main page
    console.log(`📌 Navigating to LetsKorail main site...`);
    await page.goto('https://www.letskorail.com/', { waitUntil: 'domcontentloaded' });

    // 2. Perform Login if credentials are set
    if (korailId && korailPw) {
      console.log(`🔑 Performing Korail Membership Login...`);
      await page.goto('https://www.letskorail.com/ebizprd/prdMain.do', { waitUntil: 'domcontentloaded' });
      // Navigate to login frame/page if present
    } else {
      console.log(`ℹ️ No Korail credentials set in .env. Proceeding in guest search mode.`);
    }

    // 3. Search Train Tickets
    console.log(`🔍 Searching trains from ${departure} to ${arrival}...`);
    await page.goto('https://www.letskorail.com/ebizprd/EbizPrdTicketpr21111_i1.do', { waitUntil: 'domcontentloaded' });

    // Fill departure and arrival
    await page.fill('#txtGoStart', departure);
    await page.fill('#txtGoEnd', arrival);

    // Click search button
    await page.click('img[alt="조회하기"]');
    await page.waitForTimeout(3000);

    console.log(`✅ Train search results loaded.`);

    // 4. Parse availability
    const rows = await page.$$('table.table_tbl_type2 tbody tr');
    let foundTrainInfo = '';

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const rowText = await rows[i].innerText();
      const cleanText = rowText.replace(/\s+/g, ' ');
      foundTrainInfo += `${i + 1}. ${cleanText}\n`;
    }

    console.log(`\n📋 Search Summary:\n${foundTrainInfo}`);

    // 5. Send Notification via Telegram
    if (bot && chatId) {
      const noticeText = 
        `🚆 *[코레일 열차 조회 결과]*\n\n` +
        `• *구간*: ${departure} ➔ ${arrival}\n` +
        `• *조회 결과 Summary*:\n\`\`\`\n${foundTrainInfo.slice(0, 800)}\n\`\`\``;
      await bot.sendMessage(chatId, noticeText, { parse_mode: 'Markdown' });
      console.log(`📲 Telegram notice sent successfully!`);
    }

  } catch (err: any) {
    console.error(`❌ Korail search error:`, err.message);
    if (bot && chatId) {
      await bot.sendMessage(chatId, `❌ *[코레일 예매 오류]* ${err.message}`);
    }
  } finally {
    await browser.close();
  }
}

// Direct execution test
if (process.argv[1]?.includes('korail_agent')) {
  searchAndReserveKorail({
    departure: process.argv[2] || '서울',
    arrival: process.argv[3] || '부산',
  });
}
