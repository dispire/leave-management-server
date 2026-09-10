// Desktop App Frontend Script
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const consoleBody = document.getElementById('consoleBody');

const korailId = document.getElementById('korailId');
const korailPw = document.getElementById('korailPw');
const telegramToken = document.getElementById('telegramToken');
const telegramChatId = document.getElementById('telegramChatId');

const departure = document.getElementById('departure');
const arrival = document.getElementById('arrival');
const departDate = document.getElementById('departDate');
const departTime = document.getElementById('departTime');

const btnSaveEnv = document.getElementById('btnSaveEnv');
const btnSearch = document.getElementById('btnSearch');
const btnReserve = document.getElementById('btnReserve');
const btnClearLog = document.getElementById('btnClearLog');

// Set default date to today
const today = new Date().toISOString().split('T')[0];
departDate.value = today;

function log(message, type = 'info') {
  const now = new Date().toLocaleTimeString('ko-KR');
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = `[${now}] ${message}`;
  consoleBody.appendChild(div);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function setStatus(text, isBusy = false) {
  statusText.textContent = text;
  if (isBusy) {
    statusBadge.style.borderColor = '#3b82f6';
    statusBadge.style.color = '#3b82f6';
  } else {
    statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    statusBadge.style.color = '#10b981';
  }
}

// Clear log button
btnClearLog.addEventListener('click', () => {
  consoleBody.innerHTML = '';
  log('로그가 초기화되었습니다.', 'info');
});

// Load Env Settings from Local API
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.korailId) korailId.value = data.korailId;
      if (data.korailPw) korailPw.value = data.korailPw;
      if (data.telegramToken) telegramToken.value = data.telegramToken;
      if (data.telegramChatId) telegramChatId.value = data.telegramChatId;
      log('기존 환경 변수 설정(.env)을 성공적으로 로드했습니다.', 'success');
    }
  } catch {
    log('로컬 API 서버 연결 중...', 'info');
  }
}

// Save Env Settings
btnSaveEnv.addEventListener('click', async () => {
  setStatus('설정 저장 중...', true);
  log('환경 변수(.env) 저장 요청...', 'info');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        korailId: korailId.value.trim(),
        korailPw: korailPw.value.trim(),
        telegramToken: telegramToken.value.trim(),
        telegramChatId: telegramChatId.value.trim(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      log('✅ .env 환경 변수가 저장되었습니다!', 'success');
    } else {
      log(`❌ 저장 실패: ${data.error}`, 'error');
    }
  } catch (err) {
    log(`❌ 서버 통신 오류: ${err.message}`, 'error');
  } finally {
    setStatus('준비 됨');
  }
});

// Search Trains
btnSearch.addEventListener('click', async () => {
  setStatus('조회 중...', true);
  log(`🚀 코레일 열차 조회 시작: ${departure.value} -> ${arrival.value} (${departDate.value} ${departTime.value}시)`, 'info');

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departure: departure.value.trim(),
        arrival: arrival.value.trim(),
        dateStr: departDate.value.replace(/-/g, ''),
        timeStr: departTime.value,
        korailId: korailId.value.trim(),
        korailPw: korailPw.value.trim(),
        telegramToken: telegramToken.value.trim(),
        telegramChatId: telegramChatId.value.trim(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      log(`✅ 열차 조회 및 텔레그램 전송 완료!`, 'success');
      if (data.summary) {
        log(`📋 [조회 결과]\n${data.summary}`, 'info');
      }
    } else {
      log(`❌ 조회 중 오류 발생: ${data.error}`, 'error');
    }
  } catch (err) {
    log(`❌ 네트워크 오류: ${err.message}`, 'error');
  } finally {
    setStatus('준비 됨');
  }
});

// Auto Reserve
btnReserve.addEventListener('click', async () => {
  setStatus('예매 시도 중...', true);
  log(`⚡ 자동 예매 시도 개시: ${departure.value} -> ${arrival.value}`, 'warning');
  try {
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departure: departure.value.trim(),
        arrival: arrival.value.trim(),
        dateStr: departDate.value.replace(/-/g, ''),
        timeStr: departTime.value,
        korailId: korailId.value.trim(),
        korailPw: korailPw.value.trim(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      log(`🎉 예매(결제 대기) 성공! 텔레그램으로 승차권 정보가 발송되었습니다.`, 'success');
    } else {
      log(`❌ 예매 실패: ${data.error || '예약 가능한 잔여 좌석이 없습니다.'}`, 'error');
    }
  } catch (err) {
    log(`❌ 통신 오류: ${err.message}`, 'error');
  } finally {
    setStatus('준비 됨');
  }
});

loadConfig();
