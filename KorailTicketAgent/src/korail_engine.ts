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
  korailId?: string;
  korailPw?: string;
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
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
      viewport: { width: 1280, height: 900 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
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
    await page.evaluate(() => {
      const modals = document.querySelectorAll('.ReactModalPortal');
      modals.forEach(m => {
        const text = m.textContent || '';
        if (!text.includes('출발역') && !text.includes('도착역') && !text.includes('일정선택') && !text.includes('달력')) {
          const btns = Array.from(m.querySelectorAll('button, a'));
          const closeBtn = btns.find(b => {
            const txt = (b as HTMLElement).innerText || '';
            const cls = (b as HTMLElement).className || '';
            return txt.includes('닫기') || txt.includes('확인') || cls.includes('close') || cls.includes('topclose');
          });
          if (closeBtn) (closeBtn as HTMLElement).click();
          else if (btns.length > 0) (btns[0] as HTMLElement).click();
        }
      });
    });
    await page.waitForTimeout(500);
  } catch { /* ignore */ }
}

async function loginKorail(page: Page, id?: string, pw?: string) {
  const membershipNo = id || process.env.KORAIL_MEMBERSHIP_NO || '';
  const password = pw || process.env.KORAIL_PASSWORD || '';
  if (!membershipNo || !password) {
    console.log('[Login] 계정 정보 미입력 - 비회원 상태로 조회를 진행합니다.');
    return;
  }

  console.log('[Login] 코레일 로그인 페이지 접속 중...');
  try {
    await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const idInput = page.locator('#id, input[name="id"]').first();
    const pwInput = page.locator('#password, input[name="password"]').first();

    if (await idInput.isVisible({ timeout: 4000 }) && await pwInput.isVisible({ timeout: 4000 })) {
      console.log('[Login] 회원 로그인 정보 입력 중...');
      await idInput.fill(membershipNo);
      await pwInput.fill(password);
      await page.waitForTimeout(300);

      const loginBtn = page.locator('a.btnGoLogin, button.btn_bn-depblue').first();
      if (await loginBtn.isVisible({ timeout: 3000 })) {
        await loginBtn.click();
        await page.waitForTimeout(3000);
        console.log('[Login OK] 회원 세션 로그인 완료!');
      }
    }
  } catch (err: any) {
    console.warn('[Login Notice] 로그인 과정 안내:', err.message);
  }
}

async function selectStation(page: Page, type: 'departure' | 'arrival', stationName: string) {
  console.log('[Station] ' + (type === 'departure' ? '출발역' : '도착역') + ': ' + stationName);
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
      console.log('[Station OK] 태그 선택: ' + stationName);
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
    console.log('[Station OK] 검색 선택: ' + stationName);
    return;
  }

  await page.evaluate((name: string) => {
    const m = document.querySelector('.ReactModal__Content');
    if (!m) return;
    const el = Array.from(m.querySelectorAll('a, button, span')).find(e => e.textContent?.trim() === name) as HTMLElement | undefined;
    if (el) el.click();
  }, stationName);
  await page.waitForTimeout(500);
  console.log('[Station OK] JS 선택: ' + stationName);
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
    console.warn('[Warning] 날짜 모달에서 ' + targetDayText + '일 클릭 대기');
  } else {
    console.log('[DateTime] 일자 클릭: ' + targetDayText + '일');
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
    console.log('[DateTime] 시간 클릭: ' + hourTarget);
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

  if (!applied) {
    const applyBtn = modal.locator('button.btn_bn-blue, button:has-text("적용")').first();
    if (await applyBtn.count() > 0) await applyBtn.click();
  }

  await page.waitForTimeout(1000);
  console.log('[DateTime OK] 설정 완료: ' + year + '-' + month + '-' + day + ' ' + hour + ':00');
}

async function parseResults(page: Page, departure: string, arrival: string): Promise<TrainResult[]> {
  await dismissPopup(page);
  await page.waitForTimeout(2000);
  const results: TrainResult[] = [];

  try {
    const rawTexts = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.tckList, li[class*="List"], tr, div[class*="tck_box"], div[class*="ticket_box"], ul.list_ticket > li, .list_train li'));
      if (nodes.length > 0) {
        return nodes.map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 10);
      }
      
      const allDivs = Array.from(document.querySelectorAll('div, li')).filter(el => {
        const txt = (el as HTMLElement).innerText || '';
        return (txt.includes('→') || txt.includes('->') || txt.includes('소요시간')) && 
               (txt.includes('KTX') || txt.includes('ITX') || txt.includes('무궁화') || txt.includes('새마을') || txt.includes('누리로'));
      });
      return allDivs.map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 10);
    });

    console.log('[Parse] 텍스트 블록 발견 수:', rawTexts.length);

    for (const text of rawTexts.slice(0, 30)) {
      if (!text || text.includes('해당 스케줄에 운행하는 열차가 없습니다')) continue;

      const trainNameMatch = text.match(/(KTX[^\s]*|ITX[^\s]*|무궁화[^\s]*|새마을[^\s]*|누리로[^\s]*)\s*(\d+)?/i);
      const trainNo = trainNameMatch ? trainNameMatch[0].trim() : '코레일 열차';

      const times = text.match(/\d{2}:\d{2}/g);
      const departTime = times ? times[0] : '';
      const arrivalTime = (times && times.length > 1) ? times[1] : '';

      const durMatch = text.match(/소요시간:\s*([^\s]+)/);
      const duration = durMatch ? durMatch[1] : '';

      const isSoldOut = text.includes('매진') && !text.includes('매진임박') && !text.includes('원');
      const available = !isSoldOut;
      const seatLabel = available
        ? (text.includes('매진임박') ? '매진임박' : '예매가능')
        : '매진';

      if (departTime || trainNo !== '코레일 열차') {
        results.push({
          trainNo,
          departure,
          arrival,
          departTime,
          arrivalTime,
          duration,
          generalSeat: seatLabel,
          specialSeat: '',
          available
        });
      }
    }
  } catch (err: any) {
    console.warn('[Parse warning]', err.message);
  }

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
    departure = '서울', arrival = '부산',
    dateStr, timeStr = '00', passengers = 1,
    includeAdjacentStation = false, includeSeoulGroup = false,
    korailId, korailPw
  } = options;

  console.log('=================================================');
  console.log('[KorailAgent] 열차 조회 모드: ' + departure + ' -> ' + arrival);
  console.log('=================================================\n');

  const { browser, page } = await connectBrowser();
  try {
    // 회원 로그인 시도
    await loginKorail(page, korailId, korailPw);

    console.log('[Search] 코레일 예매 조회 페이지 이동...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissPopup(page);

    await selectStation(page, 'departure', departure);
    await selectStation(page, 'arrival', arrival);
    await selectDateTime(page, dateStr, timeStr);

    console.log('[Search] 조회 버튼 클릭...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    const results = await parseResults(page, departure, arrival);
    console.log('[Search OK] 총 ' + results.length + '건의 열차 발견');
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
    departure = '서울', arrival = '부산',
    dateStr, timeStr = '00', passengers = 1,
    includeAdjacentStation = false, includeSeoulGroup = false,
    targetTrainNo, korailId, korailPw
  } = options;

  console.log('=================================================');
  console.log('[KorailAgent] 자동 예매 모드: ' + departure + ' -> ' + arrival);
  console.log('=================================================\n');

  const { browser, page } = await connectBrowser();
  try {
    // 회원 로그인 시도
    await loginKorail(page, korailId, korailPw);

    console.log('[Reserve] 코레일 예매 조회 페이지 이동...');
    await page.goto('https://www.korail.com/ticket/search/general', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissPopup(page);

    await selectStation(page, 'departure', departure);
    await selectStation(page, 'arrival', arrival);
    await selectDateTime(page, dateStr, timeStr);

    console.log('[Reserve] 조회 버튼 클릭...');
    await page.click('button.btn_lookup');
    await page.waitForTimeout(4000);

    const results = await parseResults(page, departure, arrival);
    const availableTrain = results.find(t => t.available && (!targetTrainNo || t.trainNo.includes(targetTrainNo)));

    if (!availableTrain) {
      console.log('[Reserve] 조건에 부합하는 예매 가능 좌석이 없습니다.');
      return { success: true, reserved: false, message: '현재 예매 가능한 좌석이 없습니다.' };
    }

    console.log('[Reserve] 좌석 예매 시도: ' + availableTrain.trainNo + ' (' + availableTrain.departTime + ')');
    
    // Attempt clicking reservation button on Korail search list page
    const reserveBtn = page.locator('button:has-text("예매"), a:has-text("예매")').first();
    if (await reserveBtn.count() > 0) {
      await reserveBtn.click();
      await page.waitForTimeout(3000);

      await dismissPopup(page);

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
      message: '좌석 예매 시도 중 결제 페이지 전환이 완료되지 않았습니다.',
      reservedTrain: availableTrain
    };

  } catch (error: any) {
    console.error('[Reserve Error]', error.message);
    return { success: false, reserved: false, message: '오류 발생: ' + error.message };
  } finally {
    await browser.close();
  }
}
