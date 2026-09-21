# This script generates korail_engine.ts with robust DOM parsing and reliable login flow
output_path = "F:/Antigravity/KorailTicketAgent/src/korail_engine.ts"

code = r"""import { chromium, Browser, Page } from 'playwright';
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
  try {
    const browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
      viewport: { width: 1280, height: 900 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    });

    const page = await context.newPage();
    page.on('dialog', async dialog => {
      console.log('[Korail Alert Dialog]', dialog.type(), dialog.message());
      await dialog.accept().catch(() => {});
    });
    return { browser, page };
  } catch {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
    });
    const page = await context.newPage();
    page.on('dialog', async dialog => {
      console.log('[Korail Alert Dialog]', dialog.type(), dialog.message());
      await dialog.accept().catch(() => {});
    });
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
    await page.goto('https://www.korail.com/ticket/login', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);

    // Check if already authenticated via loginCheck API
    const checkInitial = await page.evaluate(async () => {
      try {
        const res = await fetch('https://www.korail.com/ebizweb/common/loginCheck?Device=BH&Version=999999999');
        return await res.json();
      } catch { return null; }
    });

    if (checkInitial && checkInitial.strResult === 'SUCC' && checkInitial.strCustNm) {
      console.log(`[Login OK] 이미 로그인된 회원 세션입니다. (회원명: ${checkInitial.strCustNm}님)`);
      return;
    }

    const idInput = page.locator('#id, input[name="id"]').first();
    const pwInput = page.locator('#password, input[name="password"]').first();

    if (await idInput.isVisible({ timeout: 4000 }) && await pwInput.isVisible({ timeout: 4000 })) {
      console.log('[Login] 회원 로그인 정보 입력 중...');
      await idInput.click();
      await idInput.fill(membershipNo);
      await page.waitForTimeout(300);

      await pwInput.click();
      await pwInput.fill(password);
      await page.waitForTimeout(300);

      console.log('[Login] 로그인 폼 제출 중...');
      const submitBtn = page.locator('button.btn_bn-depblue').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      } else {
        await pwInput.press('Enter');
      }

      await page.waitForTimeout(3500);
      await dismissPopup(page);

      // Verify authentication session via loginCheck API
      const checkFinal = await page.evaluate(async () => {
        try {
          const res = await fetch('https://www.korail.com/ebizweb/common/loginCheck?Device=BH&Version=999999999');
          return await res.json();
        } catch { return null; }
      });

      if (checkFinal && checkFinal.strResult === 'SUCC' && checkFinal.strCustNm) {
        console.log(`[Login OK] 회원 세션 로그인 성공! (회원명: ${checkFinal.strCustNm}님, 회원번호: ${checkFinal.strMbCrdNo})`);
      } else {
        console.warn('[Login Warning] 로그인 검증 실패 - 비회원 상태일 수 있습니다:', checkFinal?.h_msg_txt || '알 수 없는 응답');
      }
    }
  } catch (err: any) {
    console.warn('[Login Notice] 로그인 과정 안내:', err.message);
  }
}

async function selectStation(page: Page, type: 'departure' | 'arrival', stationName: string) {
  console.log('[Station] ' + (type === 'departure' ? '출발역' : '도착역') + ': ' + stationName);
  await dismissPopup(page);

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
      await page.waitForTimeout(800);
      await dismissPopup(page);
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

  const resultItem = modal.locator('.ReactModal__Content a:has-text("' + stationName + '"), .ReactModal__Content button:has-text("' + stationName + '")').first();
  if (await resultItem.count() > 0) {
    await resultItem.click();
    await page.waitForTimeout(800);
    await dismissPopup(page);
    console.log('[Station OK] 검색 선택: ' + stationName);
    return;
  }

  await page.evaluate((name: string) => {
    const m = document.querySelector('.ReactModal__Content');
    if (!m) return;
    const el = Array.from(m.querySelectorAll('a, button, span')).find(e => e.textContent?.trim() === name) as HTMLElement | undefined;
    if (el) el.click();
  }, stationName);
  await page.waitForTimeout(800);
  await dismissPopup(page);
  console.log('[Station OK] JS 선택: ' + stationName);
}

async function selectDateTime(page: Page, dateStr?: string, timeStr?: string) {
  const { year, month, day } = formatDate(dateStr);
  const now = new Date();
  const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  
  let hour = (timeStr && /^\d{1,2}$/.test(timeStr)) ? timeStr.padStart(2, '0') : '00';
  if ((!dateStr || dateStr === todayStr) && (hour === '00' || parseInt(hour) < now.getHours())) {
    hour = String(now.getHours()).padStart(2, '0');
  }

  const hourInt = parseInt(hour);
  console.log('[DateTime] ' + year + '-' + month + '-' + day + ' ' + hour + ':00');

  await dismissPopup(page);
  await page.locator('a.btn_d-day').click();
  await page.waitForTimeout(1000);

  const modal = page.locator('.ReactModal__Content');
  await modal.waitFor({ state: 'visible', timeout: 8000 });

  const targetDayText = String(parseInt(day));
  
  // Day selection (strictly non-disabled td)
  const dayClicked = await page.evaluate((targetDay: string) => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const links = Array.from(modalEl.querySelectorAll('td:not(.disabled) a, td:not(.disabled) span.day, td:not(.disabled) button'));
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

  // Hour selection (strictly inside .timeSelect container)
  const hourClicked = await page.evaluate((targetHInt: number) => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const timeSelect = modalEl.querySelector('.timeSelect');
    if (!timeSelect) return false;
    const links = Array.from(timeSelect.querySelectorAll('a, button'));
    const targetLabel = `${targetHInt}시`;
    const found = links.find(el => {
      const txt = (el as HTMLElement).innerText.trim();
      return txt === targetLabel || txt === String(targetHInt);
    });
    if (found) {
      (found as HTMLElement).click();
      return true;
    }
    return false;
  }, hourInt);

  if (hourClicked) {
    console.log('[DateTime] 시간 클릭: ' + hourInt + '시');
  }
  await page.waitForTimeout(500);

  // Apply button
  const applied = await page.evaluate(() => {
    const modalEl = document.querySelector('.ReactModal__Content');
    if (!modalEl) return false;
    const btns = Array.from(modalEl.querySelectorAll('button, a'));
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
  await dismissPopup(page);
  console.log('[DateTime OK] 설정 완료: ' + year + '-' + month + '-' + day + ' ' + hour + ':00');
}

async function parseResults(page: Page, departure: string, arrival: string): Promise<TrainResult[]> {
  await dismissPopup(page);
  await page.waitForSelector('li.tckList, div.tck_inner, .tckList', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const results: TrainResult[] = [];

  try {
    const rawTexts = await page.evaluate(() => {
      const container = document.body;
      const nodes = Array.from(container.querySelectorAll('li.tckList, div.tck_inner, ul.list_ticket > li, .list_train > li, tr:has(td)'))
        .map(n => ((n as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim())
        .filter(t => t.length >= 20 && (t.includes('KTX') || t.includes('ITX') || t.includes('무궁화') || t.includes('새마을') || t.includes('누리로')));

      return nodes;
    });

    console.log('[Parse] 텍스트 블록 발견 수:', rawTexts.length);

    const seenKeys = new Set<string>();

    for (const text of rawTexts) {
      const trainNameMatch = text.match(/(KTX[^\s]*|ITX[^\s]*|무궁화[^\s]*|새마을[^\s]*|누리로[^\s]*)\s*(\d+)?/i);
      const times = text.match(/\d{2}:\d{2}/g);

      if (!trainNameMatch || !times || times.length < 2) {
        continue;
      }

      const trainNo = trainNameMatch[0].trim();
      const departTime = times[0];
      const arrivalTime = times[1];

      const durMatch = text.match(/소요시간:\s*([^\s]+)/);
      const duration = durMatch ? durMatch[1] : '';

      const isSoldOut = text.includes('매진') && !text.includes('매진임박') && !text.includes('원');
      const available = !isSoldOut;
      const seatLabel = available
        ? (text.includes('매진임박') ? '매진임박' : '예매가능')
        : '매진';

      const key = `${trainNo}_${departTime}_${arrivalTime}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

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
    await dismissPopup(page);
    const lookupClicked = await page.evaluate(() => {
      const btn = document.querySelector('button.btn_lookup') as HTMLElement;
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!lookupClicked) {
      await page.click('button.btn_lookup').catch(() => {});
    }
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
    await dismissPopup(page);
    const lookupClicked = await page.evaluate(() => {
      const btn = document.querySelector('button.btn_lookup') as HTMLElement;
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!lookupClicked) {
      await page.click('button.btn_lookup').catch(() => {});
    }
    await page.waitForTimeout(4000);

    const results = await parseResults(page, departure, arrival);
    const availableTrain = results.find(t => t.available && (!targetTrainNo || t.trainNo.includes(targetTrainNo)));

    if (!availableTrain) {
      console.log('[Reserve] 조건에 부합하는 예매 가능 좌석이 없습니다.');
      return { success: true, reserved: false, message: '현재 예매 가능한 좌석이 없습니다.' };
    }

    console.log('[Reserve] 좌석 예매 시도: ' + availableTrain.trainNo + ' (' + availableTrain.departTime + ')');
    
    // Locate and click the reservation button in the SPECIFIC matching train row (excluding GNB header)
    const clicked = await page.evaluate(({ targetNo, targetDepTime }: { targetNo: string; targetDepTime: string }) => {
      const container = document.body;
      const cleanTargetNo = (targetNo || '').replace(/\s+/g, '');

      // 1. Find matching train row by departure time or train number
      const rows = Array.from(container.querySelectorAll('li.tckList, div.tck_inner, tr, li, div[class*="tck"]')).filter(r => {
        const isHeader = r.closest('header, nav, .header, .head, .gnb, .top_menu, .path_wrap, .breadcrumb');
        if (isHeader) return false;
        const txt = (r as HTMLElement).innerText || '';
        const cleanTxt = txt.replace(/\s+/g, '');
        return (targetDepTime && txt.includes(targetDepTime)) || (cleanTargetNo && cleanTxt.includes(cleanTargetNo));
      });

      if (rows.length === 0) return false;

      // 2. Find reservation button inside matching row
      const targetRow = rows[0];
      const clickables = Array.from(targetRow.querySelectorAll('button, a, input, span, div, td')) as HTMLElement[];
      const reserveBtn = clickables.find(b => {
        const txt = (b.innerText || b.textContent || '').trim();
        const cls = b.className || '';
        const isTarget = (txt === '예매' || txt === '좌석선택' || txt.includes('예매') || txt.includes('좌석') || txt.includes('일반실') || txt.includes('특실') || cls.includes('res') || cls.includes('reserve')) &&
                         !b.hasAttribute('disabled') && !cls.includes('disabled');
        return isTarget;
      });

      if (reserveBtn) {
        reserveBtn.click();
        return true;
      }

      // Fallback: click first non-disabled button or link in targetRow
      const fallbackBtn = clickables.find(b => (b.tagName === 'BUTTON' || b.tagName === 'A' || b.tagName === 'INPUT') && !b.hasAttribute('disabled') && !b.className.includes('disabled'));
      if (fallbackBtn) {
        fallbackBtn.click();
        return true;
      }

      return false;
    }, { targetNo: availableTrain.trainNo, targetDepTime: availableTrain.departTime });

    if (!clicked) {
      console.log('[Reserve] 해당 열차 항목에서 예매 버튼을 찾지 못했습니다.');
      return {
        success: true,
        reserved: false,
        message: '해당 열차 항목에서 예매 버튼을 클릭하지 못했습니다. (비회원 또는 예약 불가 상태)',
        reservedTrain: availableTrain
      };
    }

    await page.waitForTimeout(4000);
    await dismissPopup(page);

    // Verify true reservation success
    const currentUrl = page.url();
    const contentText = await page.evaluate(() => {
      const contentEl = document.querySelector('#content') || document.querySelector('main') || document.body;
      return contentEl ? (contentEl as HTMLElement).innerText : '';
    });

    const isTrueReservationPage = currentUrl.includes('/reservation/') || currentUrl.includes('/payment/') || currentUrl.includes('/cart');
    const isTrueReservationContent = contentText.includes('결제기한') || 
                                     contentText.includes('예약번호') || 
                                     contentText.includes('예약이 완료') || 
                                     contentText.includes('승차권 예약 완료');

    const isReserved = isTrueReservationPage || isTrueReservationContent;

    if (isReserved) {
      console.log('[Reserve OK] 예매 성공 확인됨! (URL: ' + currentUrl + ')');
      await sendTelegramReservationSuccess(availableTrain, options);
      return {
        success: true,
        reserved: true,
        message: '성공적으로 예매가 진행되었습니다! 텔레그램으로 결제 안내 알림을 발송했습니다.',
        reservedTrain: availableTrain
      };
    }

    console.log('[Reserve Notice] 결제/예약완료 페이지로 전환되지 않음. Current URL:', currentUrl);
    return {
      success: true,
      reserved: false,
      message: '좌석 예매 버튼을 클릭했으나 실제 코레일 예약완료/결제 페이지로 전환되지 않았습니다. (회원 로그인 상태 및 잔여 좌석 확인 필요)',
      reservedTrain: availableTrain
    };

  } catch (error: any) {
    console.error('[Reserve Error]', error.message);
    return { success: false, reserved: false, message: '오류 발생: ' + error.message };
  } finally {
    await browser.close();
  }
}
"""

with open(output_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Generated final korail_engine.ts with waitForSelector & card parsing")
