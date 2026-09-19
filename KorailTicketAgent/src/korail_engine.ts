import { chromium, Browser, Page } from 'playwright';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.ALLOWED_CHAT_ID || '';
const bot = telegramToken ? new TelegramBot(telegramToken, { polling: false }) : null;

export interface KorailSearchOptions {
  departure: string;
  arrival: string;
  dateStr?: string;
  timeStr?: string;
  passengers?: number;
  includeAdjacentStation?: boolean;
  includeSeoulGroup?: boolean;
  targetTrainNo?: string;
}

export interface TrainResult {
  trainNo: string;
  departure: string;
  arrival: string;
  departTime: string;
  arrivalTime: string;
  duration: string;
  generalSeat: string;
  specialSeat: string;
  available: boolean;
}

export interface ReserveResult {
  success: boolean;
  reserved: boolean;
  message: string;
  reservedTrain?: TrainResult;
}

async function connectBrowser(): Promise<{ browser: Browser; page: Page }> {
  const tempProfile = path.join(os.tmpdir(), 'korail_agent_profile_' + Date.now());
  try {
    const browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', `--user-data-dir=${tempProfile}`],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    return { browser, page };
  } catch {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    return { browser, page };
  }
}

function formatDate(dateStr?: string): { year: string; month: string; day: string } {
  let d: Date;
  if (dateStr && /^\d{8}$/.test(dateStr)) {
    d = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  } else {
    d = new Date();
  }
  if (isNaN(d.getTime())) d = new Date();
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    day: String(d.getDate()).padStart(2, '0'),
  };
}

async function dismissPopup(page: Page) {
  try {
    const btn = page.locator('.ReactModal__Content button').filter({ hasText: '\uc655\uc778' }).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      console.log('[Popup] closed');
      await page.waitForTimeout(1000);
    }
  } catch { /* ignore */ }
}

async function selectStation(page: Page, type: 'departure' | 'arrival', stationName: string) {
  console.log('[Station] ' + (type === 'departure' ? 'Departure' : 'Arrival') + ': ' + stationName);
  const btnSelector = type === 'departure' ? '.start a.btn_pop-open' : '.end a.btn_pop-open';
  await page.locator(btnSelector).click();
  await page.waitForTimeout(1000);

  const modal = page.locator('.ReactModal__Content');
  await modal.waitFor({ state: 'visible', timeout: 8000 });

  const tagLinks = modal.locator('.ch_tag a');
  const tagCount = await tagLinks.count();
  for (let i = 0; i < tagCount; i++) {
    const txt = (await tagLinks.nth(i).innerText()).trim();
    if (txt === stationName) {
      await tagLinks.nth(i).click();
      await page.waitForTimeout(500);
      console.log('[Station OK] tag click: ' + stationName);
      return;
    }
  }

  const searchInput = modal.locator('input[name="searchTxt"]');
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate((name: string) => {
    const input = document.querySelector('input[name="searchTxt"]') as HTMLInputElement;
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, name);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, stationName);
  await page.waitForTimeout(700);

  const searchBtn = modal.locator('button.btn_sch, .sch_box button').first();
  if (await searchBtn.count() > 0) await searchBtn.click();
  await page.waitForTimeout(800);

  const resultItem = modal.locator('a:has-text("' + stationName + '"), button:has-text("' + stationName + '")').first();
  if (await resultItem.count() > 0) {
    await resultItem.click();
    await page.waitForTimeout(500);
    console.log('[Station OK] search result: ' + stationName);
    return;
  }

  await page.evaluate((name: string) => {
    const m = document.querySelector('.ReactModal__Content');
    if (!m) return;
    const el = Array.from(m.querySelectorAll('a, button, span')).find(e => e.textContent?.trim() === name) as HTMLElement | undefined;
    if (el) el.click();
  }, stationName);
  await page.waitForTimeout(500);
  console.log('[Station OK] JS fallback: ' + stationName);
}

async function selectDateTime(page: Page, dateStr?: string, timeStr?: string) {
  const { year, month, day } = formatDate(dateStr);
  const hour = (timeStr && /^\d{1,2}$/.test(timeStr)) ? timeStr.padStart(2, '0') : '00';
  const hourInt = parseInt(hour);
  console.log('[DateTime] ' + year + '-' + month + '-' + day + ' ' + hour + ':00');

  await page.locator('a.btn_d-day').click();
  await page.waitForTimeout(1000);

  const modal = page.locator('.ReactModal__Content');
  await modal.waitFor({ state: 'visible', timeout: 8000 });

  const targetDayText = String(parseInt(day));
  
  // Day selection
  const dayClicked = await page.evaluate((targetDay: string) => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const links = Array.from(modalEl.querySelectorAll('td:not(.disabled) a, td button:not([disabled])'));
    const found = links.find(el => (el as HTMLElement).innerText.trim() === targetDay);
    if (found) {
      (found as HTMLElement).click();
      return true;
    }
    return false;
  }, targetDayText);

  if (!dayClicked) {
    console.warn('[Warning] day ' + targetDayText + ' button not found or disabled in modal');
  } else {
    console.log('[DateTime] Day clicked: ' + targetDayText);
  }
  await page.waitForTimeout(500);

  // Hour selection
  const hourTarget = String(hourInt) + '시';
  const hourClicked = await page.evaluate((targetH: string) => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const links = Array.from(modalEl.querySelectorAll('li a, .hour_box a, a'));
    const found = links.find(el => (el as HTMLElement).innerText.trim() === targetH);
    if (found) {
      (found as HTMLElement).click();
      return true;
    }
    return false;
  }, hourTarget);

  if (hourClicked) {
    console.log('[DateTime] Hour clicked: ' + hourTarget);
  } else {
    console.warn('[Warning] Hour ' + hourTarget + ' link not found in modal');
  }
  await page.waitForTimeout(500);

  // Apply button
  const applied = await page.evaluate(() => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const btns = Array.from(modalEl.querySelectorAll('button'));
    const applyBtn = btns.find(b => (b as HTMLElement).innerText.includes('적용'));
    if (applyBtn) {
      (applyBtn as HTMLElement).click();
      return true;
    }
    return false;
  });

  if (applied) {
    console.log('[DateTime] Apply button clicked');
  } else {
    const applyBtn = modal.locator('button.btn_bn-blue, button:has-text("\uc801\uc6a9")').first();
    if (await applyBtn.count() > 0) await applyBtn.click();
  }

  await page.waitForTimeout(1000);
  console.log('[DateTime OK] ' + year + '-' + month + '-' + day + ' ' + hour + ':00');
}

async function parseResults(page: Page, departure: string, arrival: string): Promise<TrainResult[]> {
  await dismissPopup(page);
  await page.waitForTimeout(2000);
  const results: TrainResult[] = [];

  // Check if Korail page directly states no trains available
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('해당 스케줄에 운행하는 열차가 없습니다')) {
    console.log('[Parse] Korail reports no trains available for this schedule.');
    return [];
  }

  try {
    const rows = await page.locator('li.tckList, li.tckList.clear, ul.list_train li, table.table_tbl_type2 tr').all();
    console.log('[Parse] rows found: ' + rows.length);

    for (const row of rows.slice(0, 15)) {
      const text = await row.innerText().catch(() => '');
      if (!text.trim()) continue;

      const trainNo    = await row.locator('.numbering, .train_num').innerText().catch(() => '');
      const trainType  = await row.locator('.train_name, [class*="tit_train"]').first().innerText().catch(() => '');
      const departTime = await row.locator('.st_box .time, .depart_time, [class*="depart"] .time').first().innerText().catch(() => '');
      const arrivalTime= await row.locator('.en_box .time, .arrive_time, [class*="arrive"] .time').first().innerText().catch(() => '');
      const duration   = await row.locator('.duration, .time_info').first().innerText().catch(() => '');
      const seatBtns   = await row.locator('.btnWrap button, .btnWrap a').allInnerTexts().catch(() => []);
      const generalSeat= seatBtns.map((s: string) => s.trim()).filter(Boolean).join(' / ');
      const available  = !text.includes('\ub9e4\uc9c4') && (text.includes('\uc608\ub9e4') || seatBtns.length > 0);
      const label      = [trainType.trim(), trainNo.trim()].filter(Boolean).join(' ');

      const result: TrainResult = {
        trainNo: label, departure, arrival,
        departTime: departTime.trim(), arrivalTime: arrivalTime.trim(), duration: duration.trim(),
        generalSeat: generalSeat || (available ? '\uc608\ub9e4\uac00\ub525' : '\ub9e4\uc9c4'),
        specialSeat: '', available,
      };
      if (result.departTime || result.trainNo) results.push(result);
    }
  } catch (err: any) {
    console.warn('[Parse warning]', err.message);
  }

  // NOTE: Strict parsing - do NOT inject bogus rows from header date text!
  return results;
}

// Telegram alert ONLY sent upon actual reservation success!
async function sendTelegramReservationSuccess(train: TrainResult, options: KorailSearchOptions) {
  if (!bot || !chatId) return;
  const { departure, arrival, dateStr, passengers = 1 } = options;
  const dateDisplay = (dateStr && /^\d{8}$/.test(dateStr))
    ? dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8)
    : 'Today';

  let msg = '🎉 *[코레일 열차 예매 성공 알림]*\n\n';
  msg += '• *열차명*: ' + (train.trainNo || '코레일 열차') + '\n';
  msg += '• *구간*: ' + departure + ' ➔ ' + arrival + '\n';
  msg += '• *출발일시*: ' + dateDisplay + ' ' + train.departTime + '\n';
  msg += '• *도착시간*: ' + train.arrivalTime + '\n';
  msg += '• *인원*: ' + passengers + '명\n\n';
  msg += '⚠️ *안내*: 코레일 앱 또는 letskorail.com에 접속하여 10분 이내 결제를 완료해 주세요!';

  await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  console.log('[Telegram Success Alert Sent]');
}

// 1. Pure Search (No Telegram message)
export async function searchKorailTickets(options: KorailSearchOptions): Promise<TrainResult[]> {
  const {
    departure = 'Seoul', arrival = 'Busan',
    dateStr, timeStr = '00', passengers = 1,
    includeAdjacentStation = false, includeSeoulGroup = false,
  } = options;

  console.log('=================================================');
  console.log('[KorailAgent] Search Mode: ' + departure + ' -> ' + arrival);
  console.log('=================================================\n');

  const { browser, page } = await connectBrowser();
  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissPopup(page);

    await selectStation(page, 'departure', departure);
    await selectStation(page, 'arrival', arrival);
    await selectDateTime(page, dateStr, timeStr);

    console.log('[Search] Clicking lookup button...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    const results = await parseResults(page, departure, arrival);
    console.log('[Search OK] found ' + results.length + ' trains');
    return results;
  } catch (error: any) {
    console.error('[Search Error]', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// 2. Reservation Mode (Sends Telegram alert ONLY when reserved === true)
export async function reserveKorailTickets(options: KorailSearchOptions): Promise<ReserveResult> {
  const {
    departure = 'Seoul', arrival = 'Busan',
    dateStr, timeStr = '00', passengers = 1,
    includeAdjacentStation = false, includeSeoulGroup = false,
    targetTrainNo
  } = options;

  console.log('=================================================');
  console.log('[KorailAgent] Reserve Mode: ' + departure + ' -> ' + arrival);
  console.log('=================================================\n');

  const { browser, page } = await connectBrowser();
  try {
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissPopup(page);

    await selectStation(page, 'departure', departure);
    await selectStation(page, 'arrival', arrival);
    await selectDateTime(page, dateStr, timeStr);

    console.log('[Reserve] Clicking lookup button...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    const results = await parseResults(page, departure, arrival);
    const availableTrain = results.find(t => t.available && (!targetTrainNo || t.trainNo.includes(targetTrainNo)));

    if (!availableTrain) {
      console.log('[Reserve] No seats available matching criteria.');
      return { success: true, reserved: false, message: '예약 가능한 좌석이 없습니다.' };
    }

    console.log('[Reserve] Attempting seat reservation for: ' + availableTrain.trainNo + ' (' + availableTrain.departTime + ')');
    
    // Attempt clicking reservation button on Korail search list page
    const reserveBtn = page.locator('button:has-text("\uc608\ub9e4"), a:has-text("\uc608\ub9e4")').first();
    if (await reserveBtn.count() > 0) {
      await reserveBtn.click();
      await page.waitForTimeout(3000);

      // Dismiss login or confirmation popup if needed
      await dismissPopup(page);

      // Confirm reservation state
      const pageContent = await page.evaluate(() => document.body.innerText);
      const isReserved = pageContent.includes('결제') || pageContent.includes('예약') || pageContent.includes('장바구니');

      if (isReserved) {
        await sendTelegramReservationSuccess(availableTrain, options);
        return {
          success: true,
          reserved: true,
          message: '성공적으로 예매가 진행되었습니다! 텔레그램으로 결제 안내 알림을 발송했습니다.',
          reservedTrain: availableTrain
        };
      }
    }

    return {
      success: true,
      reserved: false,
      message: '좌석 예매 시도 중 결제 페이지 전환이 실패하였습니다.',
      reservedTrain: availableTrain
    };

  } catch (error: any) {
    console.error('[Reserve Error]', error.message);
    return { success: false, reserved: false, message: '오류 발생: ' + error.message };
  } finally {
    await browser.close();
  }
}
