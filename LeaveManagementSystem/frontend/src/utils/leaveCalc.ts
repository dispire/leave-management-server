export interface LeaveCycle {
  label: string;
  startDate: string;
  endDate: string;
  grantedDays: number;
  usedDays: number;
  remainingDays: number;
  carryOverDays?: number;    // 이월된 잔여 일수 (이월 모드에서 다음 주기로 넘어온 양수 잔여)
  allowanceDays?: number;    // 수당 처리된 일수 (수당 모드에서 소멸 대신 수당 지급 표시)
  debtDays?: number;         // 초과 사용 부채 (음수 잔여 절댓값, 다음 주기에서 정산됨)
}

export interface LeaveRequest {
  id: string;
  emp_id: string;
  type: string;
  unit: number;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Parses a date string into a local Date object.
 * Handles ISO strings (with T/Z) by converting to local parts first,
 * and handles plain YYYY-MM-DD (or YYYY-MM-DD HH:MM) by manual splitting.
 */
export function parseLocalDate(dateStr: string | any): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }
  const str = String(dateStr);
  
  if (str.includes('T') || str.includes('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  
  const parts = str.slice(0, 10).split('-');
  const y = parseInt(parts[0]) || 2026;
  const m = (parseInt(parts[1]) || 1) - 1;
  const d = parseInt(parts[2]) || 1;
  return new Date(y, m, d);
}

/**
 * Formats a Date object to YYYY-MM-DD string in local timezone.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates completed months between two dates.
 * Handles month-end edge cases (e.g. Jan 31 to Feb 28).
 */
export function getCompletedMonths(startDate: Date, endDate: Date): number {
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  const isEndLastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate() === endDate.getDate();
  if (endDate.getDate() < startDate.getDate() && !isEndLastDay) {
    months--;
  }
  return Math.max(0, months);
}

/**
 * Calculates difference in days between two dates.
 */
export function getDaysDiff(d1: Date, d2: Date): number {
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Counts the number of calendar days in a date range inclusive.
 */
export function daysInRange(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const s = parseLocalDate(startDate);
  const e = parseLocalDate(endDate);
  return Math.max(1, getDaysDiff(s, e) + 1);
}

/**
 * Korean Labor Standards Act (Article 60) Annual Leave Calculator
 * Supports Date of Hire (입사일 기준) and Fiscal Year (회계연도 기준, 1월 1일)
 *
 * leaveDisposal:
 *   'expire'    - 잔여 연차 소멸 (양수 잔여는 소멸, 음수 부채는 다음 주기에서 정산)
 *   'carryover' - 잔여 연차 이월 (양수 잔여를 다음 주기 부여 일수에 합산, 우선 사용)
 *   'allowance' - 잔여 연차 수당 처리 (양수 잔여는 수당으로 지급, 음수 부채는 다음 주기 정산)
 */
export function calculateLeaveCycles(
  joinDateStr: string,
  leaves: LeaveRequest[],
  basisType: 'join' | 'fiscal' | 'custom' = 'join',
  basisDateStr: string = '01-01',
  today: Date = new Date(),
  leaveDisposal: 'expire' | 'carryover' | 'allowance' = 'expire'
): LeaveCycle[] {
  const join = parseLocalDate(joinDateStr);
  if (isNaN(join.getTime())) return [];

  const cycles: LeaveCycle[] = [];
  const approvedAnnualLeaves = leaves.filter(
    (l) => (l.type === 'annual' || l.type === 'unearned_annual' || l.type === 'am_half' || l.type === 'pm_half') && l.status === 'approved'
  );

  if (basisType === 'join') {
    // === DATE OF HIRE BASIS ===
    const diffYears = getDaysDiff(join, today) / 365.25;

    // 1. Year 1 monthly leaves: Up to 11 days (expires on 1st anniversary)
    const y1End = new Date(join);
    y1End.setFullYear(join.getFullYear() + 1);
    y1End.setDate(y1End.getDate() - 1);

    const completedMonthsInY1 = getCompletedMonths(join, today < y1End ? today : y1End);
    const y1MonthlyGranted = Math.min(completedMonthsInY1, 11);

    const y1StartStr = formatLocalDate(join);
    const y1EndStr = formatLocalDate(y1End);
    const y1Used = approvedAnnualLeaves
      .filter((l) => l.start_date >= y1StartStr && l.start_date <= y1EndStr)
      .reduce((sum, l) => sum + l.unit, 0);

    cycles.push({
      label: '1년 미만 매월 발생 연차',
      startDate: y1StartStr,
      endDate: y1EndStr,
      grantedDays: y1MonthlyGranted,
      usedDays: y1Used,
      remainingDays: y1MonthlyGranted - y1Used,
    });

    // 2. Yearly cycles after year 1
    const maxYears = Math.max(1, Math.floor(diffYears) + 2); // Show upcoming year too
    for (let yr = 1; yr < maxYears; yr++) {
      const cycleStart = new Date(join);
      cycleStart.setFullYear(join.getFullYear() + yr);

      const cycleEnd = new Date(join);
      cycleEnd.setFullYear(join.getFullYear() + yr + 1);
      cycleEnd.setDate(cycleEnd.getDate() - 1);

      // 15 days for first year, then +1 day every 2 years
      const granted = Math.min(15 + Math.floor((yr - 1) / 2), 25);

      const startStr = formatLocalDate(cycleStart);
      const endStr = formatLocalDate(cycleEnd);
      const used = approvedAnnualLeaves
        .filter((l) => l.start_date >= startStr && l.start_date <= endStr)
        .reduce((sum, l) => sum + l.unit, 0);

      cycles.push({
        label: `${yr + 1}년차 정기 연차`,
        startDate: startStr,
        endDate: endStr,
        grantedDays: granted,
        usedDays: used,
        remainingDays: granted - used,
      });
    }
  } else {
    // === FISCAL YEAR BASIS (usually Jan 1st) ===
    let startMonth = 1;
    let startDay = 1;

    if (basisType === 'custom' && basisDateStr) {
      const parts = basisDateStr.split('-');
      startMonth = parseInt(parts[0]) || 1;
      startDay = parseInt(parts[1]) || 1;
    }

    // 1. Initial Period: From Join Date to the first Fiscal Date
    const firstFiscal = new Date(join.getFullYear(), startMonth - 1, startDay);
    if (firstFiscal < join) {
      firstFiscal.setFullYear(firstFiscal.getFullYear() + 1);
    }
    const initialEnd = new Date(firstFiscal);
    initialEnd.setDate(initialEnd.getDate() - 1);

    const initialStartStr = formatLocalDate(join);
    const initialEndStr = formatLocalDate(initialEnd);

    // Generation: 1 day per month in first year, up to 11 days
    const completedMonthsInitial = getCompletedMonths(join, today < initialEnd ? today : initialEnd);
    const initialGranted = Math.min(completedMonthsInitial, 11);

    const initialUsed = approvedAnnualLeaves
      .filter((l) => l.start_date >= initialStartStr && l.start_date <= initialEndStr)
      .reduce((sum, l) => sum + l.unit, 0);

    cycles.push({
      label: '1년 미만 매월 발생 연차',
      startDate: initialStartStr,
      endDate: initialEndStr,
      grantedDays: initialGranted,
      usedDays: initialUsed,
      remainingDays: initialGranted - initialUsed,
    });

    // 2. First Fiscal Year (Pro-rata)
    const firstYearDays = getDaysDiff(join, firstFiscal);
    const proRataGranted = Math.round((15 * firstYearDays / 365) * 10) / 10;

    const proRataEnd = new Date(firstFiscal);
    proRataEnd.setFullYear(firstFiscal.getFullYear() + 1);
    proRataEnd.setDate(proRataEnd.getDate() - 1);

    const proRataStartStr = formatLocalDate(firstFiscal);
    const proRataEndStr = formatLocalDate(proRataEnd);

    const proRataUsed = approvedAnnualLeaves
      .filter((l) => l.start_date >= proRataStartStr && l.start_date <= proRataEndStr)
      .reduce((sum, l) => sum + l.unit, 0);

    cycles.push({
      label: '회계연도 첫해 (일할 연차)',
      startDate: proRataStartStr,
      endDate: proRataEndStr,
      grantedDays: proRataGranted,
      usedDays: proRataUsed,
      remainingDays: proRataGranted - proRataUsed,
    });

    // 3. Regular Fiscal Years
    const currentFiscalYear = today.getFullYear();
    const maxYear = currentFiscalYear + 1; // Show upcoming fiscal year too
    const firstFiscalYearNum = firstFiscal.getFullYear();
    
    for (let yr = 1; ; yr++) {
      const cycleStart = new Date(firstFiscalYearNum + yr - 1, startMonth - 1, startDay);
      if (cycleStart.getFullYear() > maxYear) break;
      
      const cycleEnd = new Date(firstFiscalYearNum + yr, startMonth - 1, startDay);
      cycleEnd.setDate(cycleEnd.getDate() - 1);
      
      const startStr = formatLocalDate(cycleStart);
      const endStr = formatLocalDate(cycleEnd);
      
      if (yr === 1) continue; // pro-rata year
      
      const granted = Math.min(15 + Math.floor((yr - 2) / 2), 25);
      const used = approvedAnnualLeaves
        .filter((l) => l.start_date >= startStr && l.start_date <= endStr)
        .reduce((sum, l) => sum + l.unit, 0);
        
      cycles.push({
        label: `${yr}회차 정기 연차`,
        startDate: startStr,
        endDate: endStr,
        grantedDays: granted,
        usedDays: used,
        remainingDays: granted - used,
      });
    }
  }

  // ===================================================================
  // Pass 2: Apply disposal logic for each cycle
  // - Negative balance (초과 사용 부채) always carries forward to next cycle
  // - Positive balance is handled by leaveDisposal mode for closed cycles
  // ===================================================================
  const todayStr = formatLocalDate(today);
  let carryOverDebt = 0;   // 초과 사용 부채 (음수 잔여 절댓값) - 항상 다음 주기에서 선차감
  let carryOverBonus = 0;  // 이월 잔여 (이월 모드에서만 양수 잔여를 다음 주기에 합산)

  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    const cycleEnded = todayStr > c.endDate; // 이 주기가 이미 끝났는지

    // 1. 이전 주기에서 이월된 보너스 (이월 모드)
    if (carryOverBonus > 0) {
      c.carryOverDays = carryOverBonus;
      carryOverBonus = 0;
    }

    // 2. 이전 주기의 초과 사용 부채 (모든 모드 공통)
    if (carryOverDebt > 0) {
      c.debtDays = carryOverDebt;
      const totalAvailable = c.grantedDays + (c.carryOverDays || 0);
      const reduction = Math.min(carryOverDebt, totalAvailable);
      carryOverDebt = Math.max(0, carryOverDebt - reduction);
    }

    // 3. 이 주기의 실제 잔여 계산 (총 부여일수 c.grantedDays는 원본 수량 유지)
    c.remainingDays = c.grantedDays + (c.carryOverDays || 0) - (c.debtDays || 0) - c.usedDays;

    // 4. 주기가 종료된 경우에만 처분 방식 적용
    if (cycleEnded) {
      if (c.remainingDays < 0) {
        // 음수: 초과 사용 부채 → 처분 방식에 관계없이 다음 주기에서 선차감 정산
        carryOverDebt += Math.abs(c.remainingDays);
      } else if (c.remainingDays > 0) {
        // 양수: 처분 방식에 따라 소멸/이월/수당
        if (leaveDisposal === 'carryover') {
          // 이월: 다음 주기 부여 일수에 합산
          carryOverBonus += c.remainingDays;
        } else if (leaveDisposal === 'allowance') {
          // 수당: 소멸하되 수당 일수 마킹 (UI에서 표시)
          c.allowanceDays = c.remainingDays;
        }
        // 소멸(expire): 아무것도 하지 않음 → 잔여가 그냥 소멸됨
      }
    }
  }

  return cycles;
}

/**
 * Gets the leave balance for an employee at the current date.
 */
export function getCurrentLeaveBalance(
  joinDateStr: string,
  leaves: LeaveRequest[],
  basisType: 'join' | 'fiscal' | 'custom' = 'join',
  basisDateStr: string = '01-01',
  today: Date = new Date(),
  leaveDisposal: 'expire' | 'carryover' | 'allowance' = 'expire'
) {
  const cycles = calculateLeaveCycles(joinDateStr, leaves, basisType, basisDateStr, today, leaveDisposal);
  const todayStr = formatLocalDate(today);
  
  let activeCycle = cycles.find(c => todayStr >= c.startDate && todayStr <= c.endDate);
  if (!activeCycle) {
    if (cycles.length > 0 && todayStr < cycles[0].startDate) {
      activeCycle = cycles[0];
    } else {
      activeCycle = cycles[cycles.length - 1];
    }
  }
                       
  if (!activeCycle) {
    return {
      granted: 0,
      used: 0,
      remaining: 0,
      carryOverDays: undefined as number | undefined,
      allowanceDays: undefined as number | undefined,
      activeCycle: null,
      allCycles: cycles
    };
  }
  
  return {
    granted: activeCycle.grantedDays,
    used: activeCycle.usedDays,
    remaining: activeCycle.remainingDays,
    carryOverDays: activeCycle.carryOverDays,
    allowanceDays: activeCycle.allowanceDays,
    activeCycle,
    allCycles: cycles
  };
}
