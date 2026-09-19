// KorailTicketAgent UI App Logic v2.0
const API = 'http://localhost:3840';

// ─── Utils ───────────────────────────────────
function log(msg, type = 'info') {
  const body = document.getElementById('consoleBody');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  entry.textContent = `[${ts}] ${msg}`;
  body.appendChild(entry);
  body.scrollTop = body.scrollHeight;
}

function setStatus(text, cls = '') {
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  badge.className = 'status-badge ' + cls;
  statusText.textContent = text;
}

function setLoading(loading) {
  document.getElementById('btnSearch').disabled = loading;
  document.getElementById('btnReserve').disabled = loading;
  if (loading) {
    document.getElementById('btnSearch').querySelector('span').textContent = '🔄 조회 중...';
    setStatus('조회 중...', 'running');
  } else {
    document.getElementById('btnSearch').querySelector('span').textContent = '🔍 열차 조회 (브라우저 표출)';
    setStatus('준비 됨', '');
  }
}

// 인원 수 조절
window.adjustPassenger = function(delta) {
  const input = document.getElementById('passengers');
  const current = parseInt(input.value) || 1;
  const next = Math.max(1, Math.min(9, current + delta));
  input.value = next;
};

// 출발/도착 바꾸기
document.getElementById('btnSwapStation')?.addEventListener('click', () => {
  const dep = document.getElementById('departure');
  const arr = document.getElementById('arrival');
  [dep.value, arr.value] = [arr.value, dep.value];
  log('🔄 출발/도착역이 교체되었습니다.', 'info');
});

// ─── Load Config ─────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch(`${API}/api/config`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.korailId)        document.getElementById('korailId').value = data.korailId;
    if (data.korailPw)        document.getElementById('korailPw').value = data.korailPw;
    if (data.telegramToken)   document.getElementById('telegramToken').value = data.telegramToken;
    if (data.telegramChatId)  document.getElementById('telegramChatId').value = data.telegramChatId;
    log('✅ 저장된 설정이 로드되었습니다.', 'success');
  } catch (e) {
    log('⚠️ 서버 연결 확인 중... (서버 미실행 시 무시)', 'warn');
  }
}

// 기본 날짜 = 오늘
(function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('departDate').value = `${yyyy}-${mm}-${dd}`;
})();

// ─── Save Config ──────────────────────────────
document.getElementById('btnSaveEnv')?.addEventListener('click', async () => {
  const body = {
    korailId: document.getElementById('korailId').value,
    korailPw: document.getElementById('korailPw').value,
    telegramToken: document.getElementById('telegramToken').value,
    telegramChatId: document.getElementById('telegramChatId').value,
  };
  try {
    const res = await fetch(`${API}/api/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      log('💾 설정이 .env 파일에 저장되었습니다.', 'success');
    } else {
      log('❌ 설정 저장 실패: ' + (data.error || '알 수 없는 오류'), 'error');
    }
  } catch (e) {
    log('❌ 서버 연결 실패: ' + e.message, 'error');
  }
});

// ─── Search ───────────────────────────────────
document.getElementById('btnSearch')?.addEventListener('click', () => doSearch(false));
document.getElementById('btnReserve')?.addEventListener('click', () => doSearch(true));

window.showErrorBanner = function(msg) {
  const container = document.getElementById('errorBannerContainer');
  const msgEl = document.getElementById('errorBannerMessage');
  if (container && msgEl) {
    msgEl.textContent = msg;
    container.style.display = 'block';
  }
};

window.hideErrorBanner = function() {
  const container = document.getElementById('errorBannerContainer');
  if (container) {
    container.style.display = 'none';
  }
};

function renderResultsTable(results, departure, arrival, dateStr, timeStr) {
  const card = document.getElementById('resultsCard');
  const tbody = document.getElementById('resultsTableBody');
  const countBadge = document.getElementById('resultCountBadge');

  if (!card || !tbody) return;

  card.style.display = 'block';

  if (!results || results.length === 0) {
    countBadge.textContent = `0건`;
    const formattedDate = dateStr && /^\d{8}$/.test(dateStr) 
      ? dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') 
      : '선택일';
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 30px 15px; color: var(--text-muted); font-size: 0.9rem;">
          <div style="font-size: 1.2rem; margin-bottom: 6px;">⚠️ <strong>조회된 열차가 없습니다.</strong></div>
          <div style="font-size: 0.85rem; color: #a0aec0; line-height: 1.5;">
            선택하신 일시(<strong>${formattedDate} ${timeStr || '00'}:00 이후</strong>) 및 구간(<strong>${departure || ''} ➔ ${arrival || ''}</strong>)에 운행하는 열차가 없거나 예매 가능 날짜 범위를 벗어났습니다.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  countBadge.textContent = `${results.length}건`;
  tbody.innerHTML = '';

  results.forEach(r => {
    const tr = document.createElement('tr');
    const isAvail = r.available;
    const seatHtml = isAvail
      ? `<span class="badge-avail">${r.generalSeat || '예매가능'}</span>`
      : `<span class="badge-soldout">매진</span>`;

    const actionHtml = isAvail
      ? `<button class="btn-table-reserve" onclick="reserveSingleTrain('${r.trainNo}', '${r.departTime}')">예매 시도</button>`
      : `<span style="color:var(--text-muted); font-size:0.75rem;">대기</span>`;

    tr.innerHTML = `
      <td><strong>${r.trainNo || '열차'}</strong></td>
      <td>${r.departTime || '-'}</td>
      <td>${r.arrivalTime || '-'}</td>
      <td>${r.duration || '-'}</td>
      <td>${seatHtml}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.reserveSingleTrain = function(trainNo, departTime) {
  log(`⚡ [선택 열차 예매 시도] ${trainNo} (${departTime})`, 'accent');
  doSearch(true);
};

async function doSearch(reserve = false) {
  window.hideErrorBanner();

  const departure   = document.getElementById('departure').value.trim();
  const arrival     = document.getElementById('arrival').value.trim();
  const dateRaw     = document.getElementById('departDate').value;
  const timeStr     = document.getElementById('departTime').value;
  const passengers  = parseInt(document.getElementById('passengers').value) || 1;
  const includeAdjacent   = document.getElementById('includeAdjacent').checked;
  const includeSeoulGroup = document.getElementById('includeSeoulGroup').checked;

  if (!departure || !arrival) {
    const msg = '출발역과 도착역을 입력해주세요.';
    log('❌ ' + msg, 'error');
    window.showErrorBanner(msg);
    return;
  }

  const dateStr = dateRaw ? dateRaw.replace(/-/g, '') : '';

  const body = {
    departure, arrival, dateStr, timeStr,
    passengers, includeAdjacent, includeSeoulGroup,
    korailId: document.getElementById('korailId').value,
    korailPw: document.getElementById('korailPw').value,
    telegramToken: document.getElementById('telegramToken').value,
    telegramChatId: document.getElementById('telegramChatId').value,
  };

  setLoading(true);

  if (reserve) {
    log('──────────────────────────────────────────', 'accent');
    log(`⚡ ${departure} ➔ ${arrival} 자동 예매 프로세스 시작`, 'accent');
    log(`📅 날짜: ${dateStr || '오늘'} | ⏰ ${timeStr}:00 이후 | 👤 ${passengers}명`, 'info');
    log('ℹ️ 예약 완료 시에만 텔레그램 알림 메시지가 발송됩니다.', 'info');
  } else {
    log('──────────────────────────────────────────', 'accent');
    log(`🔍 ${departure} ➔ ${arrival} 열차 조회 시작 (브라우저 표출)`, 'accent');
    log(`📅 날짜: ${dateStr || '오늘'} | ⏰ ${timeStr}:00 이후 | 👤 ${passengers}명`, 'info');
  }

  try {
    const endpoint = reserve ? '/api/reserve' : '/api/search';
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      if (!reserve) {
        // Pure Search Mode: Display in browser table
        if (data.results && data.results.length > 0) {
          log(`✅ 조회 완료! 총 ${data.results.length}건의 열차가 발견되었습니다. 아래 테이블에서 확인하세요.`, 'success');
        } else {
          log(`⚠️ 조회 완료: 선택하신 조건(${departure} ➔ ${arrival}, ${dateStr || ''} ${timeStr}:00 이후)에 운행하는 열차가 없습니다.`, 'warn');
        }
        renderResultsTable(data.results, departure, arrival, dateStr, timeStr);
        setStatus(data.results && data.results.length > 0 ? '조회 완료' : '결과 없음', '');
      } else {
        // Reserve Mode
        if (data.reserved) {
          log('🎉 [예약 완료!] 열차가 성공적으로 예매되었습니다.', 'success');
          log('📲 텔레그램으로 완료 메시지가 발송되었습니다. 10분 내 결제하세요.', 'success');
          setStatus('예약 완료!', 'running');
          if (data.reservedTrain) {
            renderResultsTable([data.reservedTrain], departure, arrival, dateStr, timeStr);
          }
        } else {
          log(`ℹ️ ${data.message || '현재 잔여 좌석이 없습니다.'}`, 'warn');
          renderResultsTable([], departure, arrival, dateStr, timeStr);
          setStatus('좌석 없음', '');
        }
      }
    } else {
      const errMsg = data.error || '알 수 없는 오류가 발생했습니다.';
      log('❌ 오류 발생: ' + errMsg, 'error');
      window.showErrorBanner(`[백엔드 오류]\n${errMsg}`);
      setStatus('오류 발생', 'error');
    }
  } catch (e) {
    const errMsg = e.message || '서버 응답 오류';
    log('❌ 서버 연결 실패: ' + errMsg, 'error');
    log('ℹ️ npm start 또는 KorailTicketAgent.exe 실행 확인 필요', 'warn');
    window.showErrorBanner(`[서버 연결/네트워크 오류]\n${errMsg}`);
    setStatus('서버 오프라인', 'error');
  } finally {
    setLoading(false);
  }
}

// ─── Clear Log ────────────────────────────────
document.getElementById('btnClearLog')?.addEventListener('click', () => {
  document.getElementById('consoleBody').innerHTML = '';
  log('🗑️ 로그가 지워졌습니다.', 'info');
});

// ─── Init ─────────────────────────────────────
loadConfig();
