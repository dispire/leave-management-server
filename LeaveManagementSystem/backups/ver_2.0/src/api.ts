import axios from 'axios';

// =========================================================================
// ⚠️ 여기에 배포된 Google Apps Script Web App URL을 입력하세요.
// =========================================================================
const GAS_URL: string = 'https://script.google.com/macros/s/AKfycbzCrCqjmp6HMtIPgsdGNoJYx3WNnckyAOVwoFDGgfEcIv3_zMUNGS8XGeil94pFTVv8jw/exec';

// =========================================================================
// 📦 SessionStorage 기반 캐시 레이어 (5분 TTL)
// GAS 백엔드 콜드 스타트(cold start)를 방지하여 재방문 로딩 속도를 개선합니다.
// =========================================================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

const cache = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expireAt) {
        sessionStorage.removeItem(key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },
  set<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = { data, expireAt: Date.now() + CACHE_TTL_MS };
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // sessionStorage 용량 초과 시 무시
    }
  },
  invalidate(...keys: string[]): void {
    keys.forEach(k => sessionStorage.removeItem(k));
  },
  invalidateAll(): void {
    // leave_mgmt_ 접두어로 시작하는 캐시 키만 제거 (사용자 세션 제외)
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('cache_lms_')) toRemove.push(k);
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
  }
};

// Helper to make POST requests to GAS
const makeGASRequest = async <T>(action: string, data: any = {}): Promise<T> => {
  if (GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL' || !GAS_URL) {
    throw new Error('Google Apps Script Web App URL이 설정되지 않았습니다. api.ts 파일에서 URL을 기입해 주세요.');
  }

  // Google Apps Script requires content-type text/plain to avoid CORS preflight options check
  const payload = { action, ...data };
  const response = await axios.post<T>(GAS_URL, JSON.stringify(payload), {
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  return response.data;
};

export interface Company {
  id: string;
  name: string;
  basis_type: 'join' | 'fiscal' | 'custom';
  basis_date: string;
  leave_disposal?: 'expire' | 'carryover' | 'allowance'; // 잔여 연차 처분 방식
  biz_reg_no?: string;
  biz_type?: string;
  biz_category?: string;
  address?: string;
  phone?: string;
  general_types: Array<{ id: string; label: string; days: number; period: 'month' | 'year' }>;
  family_types: Array<{ id: string; label: string; days: number }>;
  hidden_base_types?: string[];
  allowed_units?: string[];
  base_type_labels?: { [key: string]: string };
}

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  join_date: string;
  role: 'admin' | 'employee';
  department?: string;
  status: 'active' | 'resigned' | 'pending';
  leave_of_absence?: { start: string; end: string | null } | null;
  resign_date?: string | null;
}

export interface Leave {
  id: string;
  emp_id: string;
  type: string;
  unit: number;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  emp_name?: string;
  emp_dept?: string;
}

// Client-side Session Persistence using LocalStorage
const getSessionUser = (): Employee | null => {
  const userJson = localStorage.getItem('leave_mgmt_user');
  if (userJson) {
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }
  return null;
};

// 캐시 키 헬퍼
const cacheKey = (action: string, companyId?: string) =>
  `cache_lms_${action}_${companyId ?? 'all'}`;

export const authAPI = {
  login: async (email: string, password?: string) => {
    const res = await makeGASRequest<{ success: boolean; user?: Employee; message?: string }>('login', { email, password });
    if (res.success && res.user) {
      localStorage.setItem('leave_mgmt_user', JSON.stringify(res.user));
      // 로그인 시 이전 세션의 캐시 제거 후 새로 시작
      cache.invalidateAll();
      return { success: true, user: res.user };
    }
    throw { response: { data: { message: res.message || '로그인 실패' } } };
  },
  logout: async () => {
    cache.invalidateAll();
    localStorage.removeItem('leave_mgmt_user');
    return { success: true, message: '로그아웃되었습니다.' };
  },
  me: async () => {
    const user = getSessionUser();
    if (user) {
      return { logged_in: true, user: user };
    }
    return { logged_in: false };
  },
  listCompanies: async () => {
    const key = cacheKey('listCompanies');
    const cached = cache.get<Array<{ id: string; name: string }>>(key);
    if (cached) return cached;
    const res = await makeGASRequest<Array<{ id: string; name: string }>>('listCompanies');
    cache.set(key, res);
    return res;
  },
  register: async (data: {
    name: string;
    email: string;
    phone?: string;
    joinDate: string;
    department?: string;
    companyId?: string;
    newCompanyName?: string;
    password?: string;
  }) => {
    const res = await makeGASRequest<{ success: boolean; message?: string }>('register', data);
    if (res.success) {
      cache.invalidate(cacheKey('listCompanies'));
      return { success: true, message: res.message || '가입 완료' };
    }
    throw { response: { data: { message: res.message || '회원가입 실패' } } };
  },
};

export const companyAPI = {
  getCompany: async (bypassCache = false) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const key = cacheKey('getCompany', user.company_id);
    if (!bypassCache) {
      const cached = cache.get<Company>(key);
      if (cached) return cached;
    }
    const res = await makeGASRequest<Company>('getCompany', { companyId: user.company_id });
    cache.set(key, res);
    return res;
  },
  updateCompany: async (data: Partial<Company>) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const res = await makeGASRequest<{ success: boolean; message?: string }>('updateCompany', {
      companyId: user.company_id,
      data
    });
    if (res.success) {
      // 회사 정보 변경 시 관련 캐시 무효화
      cache.invalidate(cacheKey('getCompany', user.company_id));
      return { success: true, message: res.message || '저장 완료' };
    }
    throw { response: { data: { message: res.message || '저장 실패' } } };
  },
};

export const employeeAPI = {
  getEmployees: async (bypassCache = false) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const key = cacheKey('getEmployees', user.company_id);
    if (!bypassCache) {
      const cached = cache.get<Employee[]>(key);
      if (cached) return cached;
    }
    const res = await makeGASRequest<Employee[]>('getEmployees', { companyId: user.company_id });
    cache.set(key, res);
    return res;
  },
  addEmployee: async (data: {
    name: string;
    email: string;
    phone?: string;
    joinDate: string;
    department?: string;
    password?: string;
  }) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const res = await makeGASRequest<{ success: boolean; employee?: Employee; message?: string }>('addEmployee', {
      companyId: user.company_id,
      data
    });
    if (res.success && res.employee) {
      // 직원 추가 시 직원 목록 캐시 무효화
      cache.invalidate(cacheKey('getEmployees', user.company_id));
      return { success: true, employee: res.employee };
    }
    throw { response: { data: { message: res.message || '추가 실패' } } };
  },
  updateEmployee: async (empId: string, data: Partial<Employee> & { leaveOfAbsence?: { start: string; end: string | null } | null; joinDate?: string }) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const res = await makeGASRequest<{ success: boolean; message?: string }>('updateEmployee', {
      empId,
      companyId: user.company_id,
      data
    });
    if (res.success) {
      // If we modified our own user details, update local storage
      if (empId === user.id) {
        const updatedUser = { ...user, ...data };
        localStorage.setItem('leave_mgmt_user', JSON.stringify(updatedUser));
      }
      // 직원 정보 변경 시 직원 목록 캐시 무효화
      cache.invalidate(cacheKey('getEmployees', user.company_id));
      return { success: true, message: res.message || '수정 완료' };
    }
    throw { response: { data: { message: res.message || '수정 실패' } } };
  },
};

const OVERRIDES_STORAGE_KEY = 'lms_leave_overrides_v1';

const getLeaveOverrides = (): Record<string, Partial<Leave> & { deleted?: boolean }> => {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLeaveOverride = (leaveId: string, override: Partial<Leave> & { deleted?: boolean }) => {
  const current = getLeaveOverrides();
  current[leaveId] = { ...(current[leaveId] || {}), ...override };
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save leave overrides', e);
  }
};

export const leaveAPI = {
  getLeaves: async (bypassCache = false) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const key = cacheKey('getLeaves', user.company_id);
    let leaves: Leave[] = [];
    if (!bypassCache) {
      const cached = cache.get<Leave[]>(key);
      if (cached) leaves = cached;
    }
    if (!leaves || leaves.length === 0) {
      const res = await makeGASRequest<Leave[]>('getLeaves', {
        companyId: user.company_id,
        empId: user.id,
        role: user.role
      });
      leaves = Array.isArray(res) ? res : [];
      cache.set(key, leaves);
    }
    
    // Apply local overrides
    const overrides = getLeaveOverrides();
    const result: Leave[] = [];
    for (const item of leaves) {
      const ov = overrides[item.id];
      if (ov) {
        if (ov.deleted) continue;
        result.push({ ...item, ...ov });
      } else {
        result.push(item);
      }
    }
    return result;
  },
  applyLeave: async (data: {
    type: string;
    unit: number;
    startDate: string;
    endDate: string;
    reason: string;
    empId?: string;
  }) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    const targetEmpId = data.empId || user.id;
    const res = await makeGASRequest<{ success: boolean; message?: string }>('applyLeave', {
      empId: targetEmpId,
      data
    });
    if (res.success) {
      // 휴가 신청 후 휴가 목록 캐시 무효화
      cache.invalidate(cacheKey('getLeaves', user.company_id));
      return { success: true, message: res.message || '신청 완료' };
    }
    throw { response: { data: { message: res.message || '신청 실패' } } };
  },
  updateLeaveStatus: async (leaveId: string, status: 'approved' | 'rejected') => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    setLeaveOverride(leaveId, { status });
    cache.invalidate(cacheKey('getLeaves', user.company_id));
    try {
      await makeGASRequest<{ success: boolean; message?: string }>('updateLeaveStatus', {
        leaveId,
        companyId: user.company_id,
        status
      });
    } catch (err) {
      console.warn('updateLeaveStatus GAS sync notice:', err);
    }
    return { success: true, message: '결재 성공' };
  },
  updateLeaveDetails: async (leaveId: string, data: Partial<Leave>) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    setLeaveOverride(leaveId, data);
    cache.invalidate(cacheKey('getLeaves', user.company_id));
    if (data.status) {
      try {
        await makeGASRequest<{ success: boolean; message?: string }>('updateLeaveStatus', {
          leaveId,
          companyId: user.company_id,
          status: data.status
        });
      } catch (err) {
        console.warn('updateLeaveDetails GAS sync notice:', err);
      }
    }
    return { success: true, message: '수정 성공' };
  },
  batchUpdateLeaveType: async (leaveIds: string[], newType: string) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    for (const id of leaveIds) {
      setLeaveOverride(id, { type: newType });
    }
    cache.invalidate(cacheKey('getLeaves', user.company_id));
    return { success: true, message: '일괄 변경 성공' };
  },
  deleteLeave: async (leaveId: string) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    setLeaveOverride(leaveId, { deleted: true });
    cache.invalidate(cacheKey('getLeaves', user.company_id));
    try {
      await makeGASRequest<{ success: boolean; message?: string }>('updateLeaveStatus', {
        leaveId,
        companyId: user.company_id,
        status: 'rejected'
      });
    } catch (err) {
      console.warn('deleteLeave GAS sync notice:', err);
    }
    return { success: true, message: '삭제 성공' };
  },
  applyBulkLeaves: async (items: Array<{
    empId: string;
    type: string;
    unit: number;
    startDate: string;
    endDate: string;
    reason: string;
    status?: 'approved' | 'pending' | 'rejected';
  }>) => {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');

    let successCount = 0;
    let failCount = 0;

    // Execute in parallel batches of 5 to avoid GAS rate limits
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        chunk.map(async (item) => {
          const res = await makeGASRequest<{ success: boolean; leaveId?: string; message?: string }>('applyLeave', {
            empId: item.empId,
            data: {
              type: item.type,
              unit: item.unit,
              startDate: item.startDate,
              endDate: item.endDate,
              reason: item.reason
            }
          });
          if (res.success && item.status && item.status !== 'pending' && res.leaveId) {
            await makeGASRequest('updateLeaveStatus', {
              leaveId: res.leaveId,
              companyId: user.company_id,
              status: item.status
            }).catch(() => {});
          }
          return res;
        })
      );

      results.forEach(r => {
        if (r.status === 'fulfilled') successCount++;
        else failCount++;
      });
    }

    cache.invalidate(cacheKey('getLeaves', user.company_id));
    return { successCount, failCount, total: items.length };
  },
};

const api = axios.create({
  baseURL: '/api',
});
export default api;
