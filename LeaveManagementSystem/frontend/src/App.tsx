import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  FileText, 
  Check, 
  X, 
  Building, 
  Clock, 
  Shield, 
  Briefcase, 
  Info, 
  ShieldAlert, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { authAPI, companyAPI, employeeAPI, leaveAPI } from './api';
import type { Employee, Company, Leave } from './api';
import { getCurrentLeaveBalance, daysInRange, parseLocalDate, formatLocalDate } from './utils/leaveCalc';
import { formatPhone, formatBizRegNo } from './utils/format';

const BASE_LEAVE_TYPES = [
  { id: 'annual', label: '연차', color: '#4F46E5', bg: '#EEF2FF', exempt: false, fixed: true },
  { id: 'am_half', label: '오전반차', color: '#6366F1', bg: '#EEF2FF', exempt: false, fixed: true, defaultUnit: 0.5 },
  { id: 'pm_half', label: '오후반차', color: '#4338CA', bg: '#EEF2FF', exempt: false, fixed: true, defaultUnit: 0.5 },
  { id: 'military', label: '예비군/민방위', color: '#D97706', bg: '#FFFBEB', exempt: true, fixed: true },
  { id: 'maternity', label: '출산전후휴가', color: '#7C3AED', bg: '#F5F3FF', exempt: true, fixed: true },
  { id: 'parental', label: '육아휴직', color: '#0891B2', bg: '#ECFEFF', exempt: true, fixed: true, isLeaveOfAbsence: true },
  { id: 'paternity', label: '배우자출산휴가', color: '#0284C7', bg: '#E0F2FE', exempt: true, fixed: true },
  { id: 'menstrual', label: '생리휴가', color: '#DB2777', bg: '#FDF2F8', exempt: true, fixed: true },
  { id: 'pregnancy_short', label: '임산부단축근무', color: '#9333EA', bg: '#FAF5FF', exempt: true, fixed: true },
  { id: 'civil', label: '공민권행사', color: '#374151', bg: '#F3F4F6', exempt: true, fixed: true },
  { id: 'unpaid_annual', label: '무급 연차신청', color: '#6B7280', bg: '#F3F4F6', exempt: true, fixed: true },
  { id: 'unearned_annual', label: '연차 선사용(사전승인필요)', color: '#EF4444', bg: '#FEF2F2', exempt: false, fixed: true },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmtUnit(u: number) {
  if (u === 1) return '(1일)';
  if (u === 0.5) return '(0.5일)';
  if (u === 0.25) return '(0.25일)';
  return `(${u}일)`;
}

function formatDateStr(dateStr: string) {
  if (!dateStr) return '';
  try {
    return formatLocalDate(parseLocalDate(dateStr));
  } catch {
    return dateStr.slice(0, 10);
  }
}

// Global Badge component
const StatusBadge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: bg, color, border: `1px solid ${color}20`, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
    {label}
  </span>
);

function DashboardSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '1.5rem' }}>
        {Array.from({ length: isAdmin ? 2 : 1 }).map((_, i) => (
          <div key={i} className="glass-card skeleton skeleton-card" style={{ height: 180 }} />
        ))}
      </div>
      <div className="glass-card skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}

function TableSkeleton({ cols = 5, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="skeleton" style={{ height: 40, width: 200, borderRadius: 8 }} />
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} style={{ display: 'flex', gap: '1.5rem' }}>
              {Array.from({ length: cols }).map((_, c) => (
                <div key={c} className="skeleton" style={{ height: 24, flex: 1, borderRadius: 4 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="skeleton" style={{ height: 32, width: 150, borderRadius: 6 }} />
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 16, width: 80, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 42, width: '100%', borderRadius: 8 }} />
          </div>
        ))}
        <div className="skeleton" style={{ height: 46, width: '100%', borderRadius: 8, marginTop: 12 }} />
      </div>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [companiesList, setCompaniesList] = useState<Array<{ id: string; name: string }>>([]);
  
  const [screen, setScreen] = useState<'login' | 'app'>('login');
  const [tab, setTab] = useState<'dashboard' | 'apply' | 'history' | 'employees' | 'settings'>('dashboard');

  const leaveTypes = useMemo(() => {
    if (!company) return BASE_LEAVE_TYPES;
    const filteredBase = BASE_LEAVE_TYPES.filter(b => !(company.hidden_base_types || []).includes(b.id))
      .map(b => {
        const customLabel = (company.base_type_labels && company.base_type_labels[b.id]) || b.label;
        return { ...b, label: customLabel };
      });
    const gen = (company.general_types || []).map(g => ({ id: g.id, label: g.label, color: '#059669', bg: '#ECFDF5', exempt: false, custom: 'general' }));
    const fam = (company.family_types || []).map(f => ({ id: f.id, label: f.label, color: '#B45309', bg: '#FFFBEB', exempt: true, custom: 'family' }));
    return [...filteredBase, ...gen, ...fam];
  }, [company]);

  // bypassCache=true: 쓰기 작업 후 강제 새로 고침, false: 캐시 우선 사용
  const loadAppData = async (bypassCache = true) => {
    setDataLoading(true);
    try {
      const [compData, empsData, leavesData] = await Promise.all([
        companyAPI.getCompany(bypassCache),
        employeeAPI.getEmployees(bypassCache),
        leaveAPI.getLeaves(bypassCache)
      ]);
      setCompany(compData);
      setEmployees(empsData);

      // Self-healing: Auto-reject pending leaves of resigned or deleted employees
      const pendingToReject = leavesData.filter(l => {
        if (l.status !== 'pending') return false;
        const emp = empsData.find(e => e.id === l.emp_id);
        return !emp || emp.status === 'resigned';
      });

      if (pendingToReject.length > 0) {
        // ✅ 최적화: for loop 순차 처리 → Promise.allSettled 병렬 처리
        await Promise.allSettled(
          pendingToReject.map(leave =>
            leaveAPI.updateLeaveStatus(leave.id, 'rejected').catch(e =>
              console.error('Failed to auto-reject leave:', e)
            )
          )
        );
        // ✅ 최적화: 재API 호출 없이 state에서 직접 반영 (API roundtrip 1회 절약)
        setLeaves(leavesData.map(l =>
          pendingToReject.some(r => r.id === l.id) ? { ...l, status: 'rejected' as const } : l
        ));
      } else {
        setLeaves(leavesData);
      }
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Check initial login state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authInfo = await authAPI.me();
        if (authInfo.logged_in && authInfo.user) {
          setCurrentUser(authInfo.user);
          setScreen('app');
          setDataLoading(true);
          setLoading(false);
          
          // ✅ 최적화: 재방문 시 캐시 우선 사용 (bypassCache=false)
          const [compData, empsData, leavesData] = await Promise.all([
            companyAPI.getCompany(false),
            employeeAPI.getEmployees(false),
            leaveAPI.getLeaves(false)
          ]);
          setCompany(compData);
          setEmployees(empsData);
          setLeaves(leavesData);
        } else {
          // Load company list for registration options
          const list = await authAPI.listCompanies();
          setCompaniesList(list);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setLoading(false);
      } finally {
        setDataLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setScreen('app');
        setTab('dashboard');
        setDataLoading(true);
        setLoading(false);
        
        // ✅ 최적화: 로그인 직후는 항상 최신 데이터 강제 패치 (bypassCache=true)
        const [compData, empsData, leavesData] = await Promise.all([
          companyAPI.getCompany(true),
          employeeAPI.getEmployees(true),
          leaveAPI.getLeaves(true)
        ]);
        setCompany(compData);
        setEmployees(empsData);
        setLeaves(leavesData);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '로그인에 실패했습니다.');
      setLoading(false);
    } finally {
      setDataLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setCurrentUser(null);
      setCompany(null);
      setEmployees([]);
      setLeaves([]);
      setScreen('login');
      const list = await authAPI.listCompanies();
      setCompaniesList(list);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const register = async (regData: any) => {
    try {
      const res = await authAPI.register(regData);
      if (res.success) {
        alert('회원가입이 완료되었습니다! 로그인해주세요.');
        // Refresh companies list
        const list = await authAPI.listCompanies();
        setCompaniesList(list);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '회원가입에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc' }}>
        <div className="animate-scale" style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 28, fontWeight: 'bold', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)' }}>✦</div>
          <div style={{ fontWeight: 600, fontSize: 18, color: '#111827' }}>데이터를 불러오는 중...</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>잠시만 기다려주세요.</div>
        </div>
      </div>
    );
  }

  if (screen === 'login') {
    return <LoginScreen companies={companiesList} onLogin={login} onRegister={register} />;
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={currentUser} company={company} onLogout={logout} />
      <NavBar tab={tab} setTab={setTab} isAdmin={isAdmin} />
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }} className="animate-fade">
        {dataLoading ? (
          <>
            {tab === 'dashboard' && <DashboardSkeleton isAdmin={isAdmin} />}
            {tab === 'apply' && <FormSkeleton />}
            {tab === 'history' && <TableSkeleton cols={isAdmin ? 7 : 6} />}
            {tab === 'employees' && <TableSkeleton cols={5} />}
            {tab === 'settings' && <TableSkeleton cols={3} rows={8} />}
          </>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard currentUser={currentUser!} employees={employees} leaves={leaves} company={company!} leaveTypes={leaveTypes} isAdmin={isAdmin} />}
            {tab === 'apply' && <ApplyLeave currentUser={currentUser!} leaves={leaves} company={company!} leaveTypes={leaveTypes} onApply={loadAppData} />}
            {tab === 'history' && <LeaveHistory currentUser={currentUser!} leaves={leaves} employees={employees} leaveTypes={leaveTypes} isAdmin={isAdmin} onApprove={loadAppData} />}
            {tab === 'employees' && isAdmin && <EmployeeMgmt employees={employees} currentUser={currentUser!} leaves={leaves} company={company!} leaveTypes={leaveTypes} onUpdate={loadAppData} />}
            {tab === 'settings' && isAdmin && <CompanySettings company={company!} employees={employees} currentUser={currentUser!} onSave={loadAppData} />}
          </>
        )}
      </main>
    </div>
  );
}

// ---------- Header ----------
function Header({ user, company, onLogout }: { user: Employee | null; company: Company | null; onLogout: () => void }) {
  return (
    <header className="glass-nav" style={{ padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)' }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✦</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{company?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building size={10} /> ID: {company?.id}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>
              {user?.name[0]}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 2 }}>
                {user?.role === 'admin' ? <Shield size={10} style={{ color: 'var(--primary)' }} /> : null}
                {user?.role === 'admin' ? '관리자' : '직원'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- NavBar ----------
function NavBar({ tab, setTab, isAdmin }: { tab: string; setTab: (t: any) => void; isAdmin: boolean }) {
  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: CalendarIcon },
    { id: 'apply', label: '휴가 신청', icon: Plus },
    { id: 'history', label: isAdmin ? '신청/승인 관리' : '사용 내역', icon: FileText },
    ...(isAdmin ? [
      { id: 'employees', label: '직원 관리', icon: Users },
      { id: 'settings', label: '회사 설정', icon: Settings }
    ] : []),
  ];
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid var(--gray-200)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', overflowX: 'auto', padding: '0 0.75rem' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              style={{ 
                padding: '16px 20px', 
                fontSize: 14, 
                fontWeight: isActive ? 600 : 500, 
                color: isActive ? 'var(--primary)' : 'var(--gray-500)', 
                background: 'transparent', 
                border: 'none', 
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent', 
                cursor: 'pointer', 
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--primary)' : 'var(--gray-400)' }} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Dashboard ----------
function Dashboard({ currentUser, employees, leaves, company, leaveTypes, isAdmin }: { 
  currentUser: Employee; 
  employees: Employee[]; 
  leaves: Leave[]; 
  company: Company; 
  leaveTypes: any[]; 
  isAdmin: boolean;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const myCompanyEmps = useMemo(() =>
    isAdmin ? employees.filter(e => e.company_id === currentUser.company_id && e.role !== 'admin') : [currentUser],
  [employees, isAdmin, currentUser]);

  const visibleEmps = useMemo(() => {
    const myCard = employees.find(e => e.id === currentUser.id);
    if (!isAdmin) {
      return myCard ? [myCard] : [];
    }
    
    const cards = [];
    if (myCard) cards.push(myCard);
    
    const companyEmployees = employees.filter(e => e.company_id === currentUser.company_id);
    const otherLeaves = leaves.filter(l => l.emp_id !== currentUser.id && companyEmployees.some(e => e.id === l.emp_id));
    const sortedOtherLeaves = [...otherLeaves].sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id.localeCompare(a.id));
    const recentLeave = sortedOtherLeaves[0];
    
    if (recentLeave) {
      const recentEmp = companyEmployees.find(e => e.id === recentLeave.emp_id);
      if (recentEmp && recentEmp.id !== currentUser.id) {
        cards.push(recentEmp);
      }
    }
    return cards;
  }, [employees, currentUser, isAdmin, leaves]);

  const monthCells = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    // Find the Monday of the week containing first day of month
    const firstDayOfWeek = first.getDay(); // Sunday = 0, Monday = 1...
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Days from Monday
    const start = new Date(y, m, 1 - startOffset);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(start); 
      d.setDate(start.getDate() + i); 
      return d;
    });
  }, [viewDate]);

  const allLeaves = useMemo(() =>
    isAdmin ? leaves.filter(l => myCompanyEmps.some(e => e.id === l.emp_id) && l.status === 'approved')
            : leaves.filter(l => l.emp_id === currentUser.id && l.status === 'approved'),
  [leaves, isAdmin, myCompanyEmps, currentUser]);

  const leavesByDay = useMemo(() => {
    const map: Record<string, Leave[]> = {};
    allLeaves.forEach(l => {
      let d = new Date(l.start_date); 
      const end = new Date(l.end_date);
      while (d <= end) {
        const ds = d.toISOString().slice(0, 10);
        (map[ds] = map[ds] || []).push(l);
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }, [allLeaves]);

  const EMP_COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];
  const isOnLOA = (emp: Employee) => {
    if (!emp.leave_of_absence) return false;
    const start = emp.leave_of_absence.start;
    const end = emp.leave_of_absence.end;
    const current = todayStr();
    return start <= current && (!end || end >= current);
  };

  const getBasisLabel = (type: string, date: string) => {
    if (type === 'join') return '입사일 기준';
    if (type === 'fiscal') return '회계연도 기준(1월 1일)';
    return `지정일 기준(${date})`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {isAdmin && leaves.some(l => l.status === 'pending' && l.reason?.includes('한도초과') && myCompanyEmps.some(e => e.id === l.emp_id)) && (
        <div className="glass-card animate-scale" style={{ background: '#FFFBEB', borderLeft: '4px solid #D97706', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #FDE68A' }}>
          <ShieldAlert size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>⚠️ 연차 보유 한도 초과 신청 감지</div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              소속 직원이 연차 한도를 초과하여 신청한 휴가 결재 대기 건이 존재합니다. <strong>[신청/결재 관리]</strong> 탭에서 사유를 확인하고 결재해 주십시오.
            </div>
          </div>
        </div>
      )}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[
            { label: '전체 관리 직원', value: myCompanyEmps.length + '명', icon: Users, color: 'var(--primary)' },
            { label: '재직 직원', value: myCompanyEmps.filter(e => e.status === 'active').length + '명', icon: Briefcase, color: 'var(--success)' },
            { label: '이번 달 승인 휴가', value: leaves.filter(l => {
              const d = new Date(l.start_date);
              return myCompanyEmps.some(e => e.id === l.emp_id) && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && l.status === 'approved';
            }).length + '건', icon: CalendarIcon, color: 'var(--warning)' },
            { label: '승인 대기 건수', value: leaves.filter(l => myCompanyEmps.some(e => e.id === l.emp_id) && l.status === 'pending').length + '건', icon: Clock, color: 'var(--danger)' },
          ].map((m, i) => (
            <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>{m.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: m.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.icon size={22} style={{ color: m.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Message on calculation standard */}
      <div className="glass-card" style={{ background: '#fff', borderLeft: '4px solid var(--primary)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>
          현재 회사의 연차 부여 기준은 <strong>{getBasisLabel(company?.basis_type, company?.basis_date)}</strong>입니다. 이에 따라 연차가 산출됩니다.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: visibleEmps.length > 1 ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '1.5rem' }}>
        {visibleEmps.map((emp) => {
          // Accurate Korean Labor Standards Act calculation
          const leaveBalance = getCurrentLeaveBalance(emp.join_date, leaves.filter(l => l.emp_id === emp.id), company?.basis_type, company?.basis_date, new Date(), company?.leave_disposal ?? 'expire');
          const totalAnnual = leaveBalance.granted;
          const used = leaveBalance.used;
          const remaining = leaveBalance.remaining;
          const pct = totalAnnual > 0 ? Math.round((used / totalAnnual) * 100) : 0;
          const loa = isOnLOA(emp);
          const originalIdx = employees.findIndex(e => e.id === emp.id);
          
          return (
            <div key={emp.id} className="glass-card" style={{ opacity: emp.status !== 'active' || loa ? 0.65 : 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: EMP_COLORS[originalIdx % EMP_COLORS.length] + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: EMP_COLORS[originalIdx % EMP_COLORS.length] }}>
                    {emp.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{emp.department || '부서 미지정'}</div>
                  </div>
                </div>
                {emp.status === 'resigned' && <StatusBadge label={`퇴사 ${emp.resign_date || ''}`} color="var(--danger)" bg="var(--danger-light)" />}
                {loa && <StatusBadge label="휴직 중" color="var(--warning)" bg="var(--warning-light)" />}
                {!isAdmin && emp.status === 'active' && !loa && <StatusBadge label="본인" color="var(--primary)" bg="var(--primary-light)" />}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 6 }}>
                  <span>연차 소진현황 (현재 주기)</span>
                  <span>{used.toFixed(2)} / {totalAnnual}일 ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 4, width: `${Math.min(pct, 100)}%`, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>주기: {leaveBalance.activeCycle?.startDate} ~ {leaveBalance.activeCycle?.endDate}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>잔여 {remaining.toFixed(2)}일</span>
                </div>
              </div>

              {/* General Leaves and metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '8px 12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 2 }}>입사일</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>{formatDateStr(emp.join_date)}</div>
                </div>
                {(company?.general_types || []).slice(0, 1).map(gt => {
                  // Monthly company general leaves (simple count)
                  const usedG = leaves.filter(l => l.emp_id === emp.id && l.type === gt.id && l.status === 'approved' &&
                    new Date(l.start_date).getMonth() === today.getMonth() && new Date(l.start_date).getFullYear() === today.getFullYear())
                    .reduce((sum, l) => sum + l.unit, 0);
                  const remG = Math.max(0, gt.days - usedG);
                  return (
                    <div key={gt.id} style={{ background: 'var(--success-light)', borderRadius: 'var(--radius-md)', padding: '8px 12px', border: '1px solid var(--success-border)40' }}>
                      <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginBottom: 2 }}>{gt.label} (이번달)</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--success)' }}>{remG}개 / {gt.days}일 잔여</div>
                    </div>
                  );
                })}
              </div>
              

            </div>
          );
        })}
      </div>

      {/* Calendar card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-900)' }}>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월 휴가 캘린더</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ padding: '6px 12px' }}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ padding: '6px 12px', fontSize: 12 }}>
              오늘
            </button>
            <button className="btn" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ padding: '6px 12px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-container">
          <div className="calendar-inner">
            <div className="calendar-grid" style={{ marginBottom: 6 }}>
              {['월','화','수','목','금','토','일'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', padding: '6px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {monthCells.map((d, i) => {
                const ds = d.toISOString().slice(0, 10);
                const isToday = ds === todayStr();
                const inMonth = d.getMonth() === viewDate.getMonth();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const dayLeaves = leavesByDay[ds] || [];
                
                return (
                  <div 
                    key={ds + i} 
                    className={`calendar-day ${isToday ? 'today' : ''} ${inMonth ? '' : 'other-month'}`}
                    style={{ 
                      background: isToday ? 'var(--primary-light)' : isWeekend ? '#fbfcfe' : '#fff',
                      border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--gray-100)',
                      boxShadow: isToday ? '0 4px 12px rgba(79, 70, 229, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: isToday ? 700 : 500, 
                      color: isToday ? 'var(--primary)' : isWeekend ? 'var(--danger)' : 'var(--gray-700)', 
                      marginBottom: 6 
                    }}>
                      {d.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayLeaves.slice(0, 3).map((l, li) => {
                        const lt = leaveTypes.find(x => x.id === l.type);
                        const isExempt = lt?.exempt;
                        
                        // Categorize colors
                        let badgeColor = '#4F46E5';
                        let badgeBg = '#EEF2FF';
                        if (l.type === 'annual') {
                          badgeColor = '#4F46E5';
                          badgeBg = '#EEF2FF';
                        } else if (l.type === 'unearned_annual') {
                          badgeColor = '#EF4444';
                          badgeBg = '#FEF2F2';
                        } else if (l.type === 'unpaid_annual') {
                          badgeColor = '#6B7280';
                          badgeBg = '#F3F4F6';
                        } else if (lt?.custom === 'family') {
                          badgeColor = '#B45309';
                          badgeBg = '#FFFBEB';
                        } else {
                          badgeColor = '#059669';
                          badgeBg = '#ECFDF5';
                        }

                        return (
                          <div 
                            key={li} 
                            className="calendar-leave-badge"
                            title={`${l.emp_name} · ${lt?.label}`}
                            style={{ 
                              background: badgeBg, 
                              color: badgeColor,
                              borderLeft: `3px solid ${badgeColor}`
                            }}
                          >
                            {l.emp_name} {isExempt ? lt?.label?.slice(0,2) : fmtUnit(l.unit)}
                          </div>
                        );
                      })}
                      {dayLeaves.length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--gray-500)', fontWeight: 600, paddingLeft: 4 }}>
                          외 {dayLeaves.length - 3}명
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap', borderTop: '1px solid var(--gray-200)', paddingTop: 16 }}>
          {[
            { label: '연차', color: '#4F46E5', bg: '#EEF2FF' },
            { label: '회사휴가', color: '#059669', bg: '#ECFDF5' },
            { label: '경조휴가', color: '#B45309', bg: '#FFFBEB' }
          ].map(cat => (
            <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: cat.bg, border: `1px solid ${cat.color}` }} />
              <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Apply Leave ----------
function ApplyLeave({ currentUser, leaves, company, leaveTypes, onApply }: {
  currentUser: Employee;
  leaves: Leave[];
  company: Company;
  leaveTypes: any[];
  onApply: () => void;
}) {
  const annualTypes = useMemo(() => leaveTypes.filter(t => !t.custom), [leaveTypes]);
  const generalTypes = useMemo(() => leaveTypes.filter(t => t.custom === 'general'), [leaveTypes]);
  const familyTypes = useMemo(() => leaveTypes.filter(t => t.custom === 'family'), [leaveTypes]);

  const [type, setType] = useState('annual');
  const [unit, setUnit] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedType = leaveTypes.find(t => t.id === type);
  const isExempt = selectedType?.exempt;
  const isFamily = selectedType?.custom === 'family';
  const isGeneral = selectedType?.custom === 'general';

  // Calculate remaining leaves for current period
  const balance = getCurrentLeaveBalance(currentUser.join_date, leaves.filter(l => l.emp_id === currentUser.id), company?.basis_type, company?.basis_date, new Date(), company?.leave_disposal ?? 'expire');
  const remaining = balance.remaining;

  const now = new Date();
  const getGeneralRemaining = (gt: any) => {
    const used = leaves.filter(l => l.emp_id === currentUser.id && l.type === gt.id && l.status !== 'rejected' &&
      new Date(l.start_date).getMonth() === now.getMonth() && new Date(l.start_date).getFullYear() === now.getFullYear()).reduce((sum, l) => sum + l.unit, 0);
    return Math.max(0, gt.days - used);
  };

  const submit = async () => {
    if (!startDate || !endDate) return alert('시작일과 종료일을 선택해주세요.');
    let u: number;
    if (isExempt || isFamily) {
      u = daysInRange(startDate, endDate);
    } else {
      u = parseFloat(unit);
    }

    let isExceeded = false;
    if (type === 'annual' && u > remaining) {
      const confirmProceed = confirm(
        `잔여 연차가 부족합니다. (현재 잔여 연차: ${remaining.toFixed(2)}일, 신청일수: ${u.toFixed(2)}일)\n\n` +
        `보유 연차 한도를 초과하는 ${(u - remaining).toFixed(2)}일분은 무급 휴가로 차감되거나 차기 연차에서 땡겨 쓰기(차용) 처리됩니다.\n` +
        `이대로 연차 신청을 진행하시겠습니까?`
      );
      if (!confirmProceed) return;
      isExceeded = true;
    }
    if (isGeneral) {
      const gt = generalTypes.find(g => g.id === type);
      if (gt && u > getGeneralRemaining(gt)) {
        return alert(`이번 달 잔여 ${gt.label}이 부족합니다.`);
      }
    }
    if (isFamily) {
      const ft = familyTypes.find(f => f.id === type);
      if (ft && u > ft.days) {
        return alert(`${ft.label}은 회사 설정상 최대 ${ft.days}일까지만 신청할 수 있습니다.`);
      }
    }

    setSubmitting(true);
    try {
      const finalReason = isExceeded ? (reason ? `${reason} (한도초과)` : '한도초과') : reason;
      const res = await leaveAPI.applyLeave({
        type,
        unit: u,
        startDate,
        endDate,
        reason: finalReason
      });
      if (res.success) {
        alert(res.message);
        setStartDate('');
        setEndDate('');
        setReason('');
        setUnit('1');
        onApply();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '휴가 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 6px' }}>휴가 신청하기</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-500)' }}>
          현재 사용 가능한 연차 잔여량: <strong style={{ color: 'var(--primary)', fontSize: 14 }}>{remaining.toFixed(2)}일</strong>
        </div>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="input-group">
          <label className="input-label">휴가 종류</label>
          <select 
            value={type} 
            onChange={e => { setType(e.target.value); setUnit('1'); }} 
            className="input-field"
          >
            <option value="annual">연차 (일할 차감)</option>
            {annualTypes.filter(t => t.id !== 'annual').map(t => (
              <option key={t.id} value={t.id}>{t.label} (차감 없음)</option>
            ))}
            {generalTypes.length > 0 && <option disabled>— 회사 일반휴가 —</option>}
            {generalTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label} (월 {t.days}일 한도)</option>
            ))}
            {familyTypes.length > 0 && <option disabled>— 경조사 휴가 —</option>}
            {familyTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label} (최대 {t.days}일)</option>
            ))}
          </select>
        </div>

        {!isExempt && !isFamily && (
          <div className="input-group">
            <label className="input-label">사용 단위</label>
            <select 
              value={unit} 
              onChange={e => setUnit(e.target.value)} 
              className="input-field"
            >
              <option value="1">1일 (종일)</option>
              <option value="0.5">0.5일 (반차)</option>
              <option value="0.25">0.25일 (반반차)</option>
            </select>
          </div>
        )}

        {isExempt && (
          <div style={{ fontSize: 12, color: 'var(--warning)', background: 'var(--warning-light)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--warning-border)50', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} /> 연차 차감 제외 대상 휴가입니다.
          </div>
        )}

        {isFamily && (
          <div style={{ fontSize: 12, color: '#b45309', background: '#FFFBEB', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--warning-border)50', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} /> 경조사 휴가는 연차 차감이 없으며, 증빙 서류가 필요할 수 있습니다.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">시작일</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} 
              className="input-field" 
            />
          </div>
          <div className="input-group">
            <label className="input-label">종료일</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="input-field" 
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">사유</label>
          <input 
            type="text" 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            placeholder="휴가 신청 사유를 간단히 입력하세요..." 
            className="input-field" 
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={submit} 
          disabled={submitting}
          style={{ width: '100%', height: 44, fontSize: 14 }}
        >
          {submitting ? '신청 처리 중...' : '휴가 신청 완료'}
        </button>
      </div>
    </div>
  );
}

// ---------- Leave History / Approval ----------
function LeaveHistory({ currentUser, leaves, employees, leaveTypes, isAdmin, onApprove }: {
  currentUser: Employee;
  leaves: Leave[];
  employees: Employee[];
  leaveTypes: any[];
  isAdmin: boolean;
  onApprove: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const [searchEmpName, setSearchEmpName] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const myLeaves = useMemo(() =>
    isAdmin ? leaves.filter(l => employees.some(e => e.id === l.emp_id && e.company_id === currentUser.company_id))
            : leaves.filter(l => l.emp_id === currentUser.id),
  [leaves, isAdmin, employees, currentUser]);

  const filtered = useMemo(() => {
    let list = [...myLeaves];
    if (isAdmin && searchEmpName.trim()) {
      list = list.filter(l => {
        const emp = employees.find(e => e.id === l.emp_id);
        const nameToMatch = emp ? emp.name : (l.emp_name || '');
        return nameToMatch.toLowerCase().includes(searchEmpName.trim().toLowerCase());
      });
    }
    if (startDateFilter) {
      list = list.filter(l => l.start_date >= startDateFilter);
    }
    if (endDateFilter) {
      list = list.filter(l => l.start_date <= endDateFilter);
    }
    if (filter !== 'all') {
      list = list.filter(l => l.status === filter);
    }
    return list.sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [myLeaves, searchEmpName, startDateFilter, endDateFilter, filter, isAdmin, employees]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const statusMap = {
    pending: { label: '대기 중', color: 'var(--warning)', bg: 'var(--warning-light)' },
    approved: { label: '승인됨', color: 'var(--success)', bg: 'var(--success-light)' },
    rejected: { label: '반려됨', color: 'var(--danger)', bg: 'var(--danger-light)' },
  };

  const pendingCount = myLeaves.filter(l => l.status === 'pending').length;
  const [bulkApproving, setBulkApproving] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);

  const handleBulkApprove = async () => {
    const pendingsOnPage = paginatedData.filter(l => l.status === 'pending');
    if (pendingsOnPage.length === 0) return;
    
    if (!confirm(`현재 페이지에 있는 ${pendingsOnPage.length}건의 결재 대기 신청을 모두 일괄 승인하시겠습니까?`)) return;
    
    setBulkApproving(true);
    let successCount = 0;
    for (const leave of pendingsOnPage) {
      try {
        const res = await leaveAPI.updateLeaveStatus(leave.id, 'approved');
        if (res.success) {
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to approve leave ${leave.id}:`, err);
      }
    }
    setBulkApproving(false);
    alert(`${successCount}건의 신청이 정상적으로 일괄 승인되었습니다.`);
    onApprove();
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await leaveAPI.updateLeaveStatus(id, status);
      if (res.success) {
        onApprove();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const pageNumbers = useMemo(() => {
    const pages = new Set<number>();
    for (let i = 1; i <= Math.min(10, totalPages); i++) {
      pages.add(i);
    }
    for (let i = 20; i <= totalPages; i += 10) {
      pages.add(i);
    }
    if (currentPage > 0 && currentPage <= totalPages) {
      pages.add(currentPage);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [totalPages, currentPage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>
            {isAdmin ? '신청/결재 관리' : '휴가 신청 내역'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
            {isAdmin ? '소속 임직원들의 휴가 신청을 검토하고 승인하거나 반려합니다.' : '신청하신 휴가의 결재 상태 및 사용 내역을 조회합니다.'}
          </p>
        </div>
        {isAdmin && pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge label={`승인 대기 ${pendingCount}건`} color="var(--warning)" bg="var(--warning-light)" />
            <button 
              className="btn btn-primary" 
              onClick={handleBulkApprove} 
              disabled={bulkApproving}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {bulkApproving ? '승인 중...' : '현재 페이지 일괄 승인'}
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Options */}
      <div className="glass-card animate-fade" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.5)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>임직원 이름 검색</span>
            <input 
              type="text" 
              value={searchEmpName} 
              onChange={e => { setSearchEmpName(e.target.value); setCurrentPage(1); }} 
              placeholder="이름 입력 (예: 이광희)..." 
              className="input-field"
              style={{ padding: '6px 12px', fontSize: 12, minWidth: 160, margin: 0 }}
            />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>휴가 시작일 (부터)</span>
            <input 
              type="date" 
              value={startDateFilter} 
              onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }} 
              className="input-field"
              style={{ padding: '5px 10px', fontSize: 12, width: 135 }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 18 }}>~</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)' }}>휴가 시작일 (까지)</span>
            <input 
              type="date" 
              value={endDateFilter} 
              onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }} 
              className="input-field"
              style={{ padding: '5px 10px', fontSize: 12, width: 135 }}
            />
          </div>
        </div>
        {(startDateFilter || endDateFilter || (isAdmin && searchEmpName)) && (
          <button 
            className="btn" 
            onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setSearchEmpName(''); setCurrentPage(1); }}
            style={{ padding: '8px 14px', fontSize: 12, marginTop: 18, borderColor: 'var(--danger-border)', color: 'var(--danger)', background: 'var(--danger-light)' }}
          >
            필터 초기화
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button 
              key={f} 
              onClick={() => { setFilter(f as any); setCurrentPage(1); }} 
              style={{ 
                padding: '6px 14px', 
                borderRadius: 20, 
                fontSize: 12, 
                fontWeight: 600,
                border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--gray-200)'}`, 
                background: filter === f ? 'var(--primary-light)' : '#fff', 
                color: filter === f ? 'var(--primary)' : 'var(--gray-500)', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {f === 'all' ? '전체' : f === 'pending' ? '대기' : f === 'approved' ? '승인' : '반려'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>보기 개수:</span>
          <select 
            value={pageSize} 
            onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }} 
            className="input-field" 
            style={{ width: 85, padding: '4px 8px', fontSize: 12, margin: 0 }}
          >
            <option value={20}>20개씩</option>
            <option value={30}>30개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </select>
        </div>
      </div>

      <div className="table-container animate-scale">
        <table className="custom-table">
          <thead>
            <tr>
              <th>종류</th>
              {isAdmin && <th>신청자</th>}
              <th>일정</th>
              <th>사용일</th>
              <th>사유</th>
              <th>결재상태</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>작업</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)', fontSize: 14 }}>
                  휴가 내역이 존재하지 않습니다.
                </td>
              </tr>
            ) : (
              paginatedData.map(l => {
                const lt = leaveTypes.find(x => x.id === l.type);
                const stat = statusMap[l.status] || { label: l.status, color: 'var(--gray-500)', bg: 'var(--gray-100)' };
                
                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: lt?.color || 'var(--primary)' }} />
                        <span style={{ fontWeight: 600 }}>{lt?.label || l.type}</span>
                      </div>
                    </td>
                    {isAdmin && <td style={{ fontWeight: 600 }}>{l.emp_name} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)' }}>({l.emp_dept})</span></td>}
                    <td>
                      {formatDateStr(l.start_date) === formatDateStr(l.end_date) 
                        ? formatDateStr(l.start_date) 
                        : `${formatDateStr(l.start_date)} ~ ${formatDateStr(l.end_date)}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {lt?.exempt ? `${daysInRange(l.start_date, l.end_date)}일 (제외)` : `${l.unit}일`}
                    </td>
                    <td style={{ color: 'var(--gray-500)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.reason || '-'}
                    </td>
                    <td>
                      <StatusBadge label={stat.label} color={stat.color} bg={stat.bg} />
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {l.status === 'pending' && (
                            <>
                              <button className="btn btn-primary" onClick={() => handleAction(l.id, 'approved')} style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}>
                                <Check size={12} /> 승인
                              </button>
                              <button className="btn btn-danger" onClick={() => handleAction(l.id, 'rejected')} style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}>
                                <X size={12} /> 반려
                              </button>
                            </>
                          )}
                          <button className="btn" onClick={() => setEditingLeave(l)} style={{ padding: '4px 8px', fontSize: 11 }}>
                            수정
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingLeave && (
        <EditLeaveModal
          leave={editingLeave}
          leaveTypes={leaveTypes}
          onClose={() => setEditingLeave(null)}
          onSave={onApprove}
        />
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: '0.5rem' }}>
          <button 
            className="btn" 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            이전
          </button>
          
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{ 
                padding: '6px 12px', 
                fontSize: 12,
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                border: `1px solid ${currentPage === page ? 'var(--primary)' : 'var(--gray-200)'}`,
                background: currentPage === page ? 'var(--primary)' : '#fff',
                color: currentPage === page ? '#fff' : 'var(--gray-700)',
                transition: 'all 0.2s ease'
              }}
            >
              {page}
            </button>
          ))}
          
          <button 
            className="btn" 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}



// ---------- Edit Leave Modal ----------
function EditLeaveModal({ leave, leaveTypes, onClose, onSave }: {
  leave: Leave;
  leaveTypes: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [type, setType] = useState(leave.type);
  const [unit, setUnit] = useState(leave.unit);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(leave.status);
  const [reason, setReason] = useState(leave.reason || '');
  const [startDate, setStartDate] = useState(() => formatDateStr(leave.start_date));
  const [endDate, setEndDate] = useState(() => formatDateStr(leave.end_date));
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const targetObj = leaveTypes.find(t => t.id === newType);
    if (targetObj?.defaultUnit) {
      setUnit(targetObj.defaultUnit);
    } else if (newType === 'am_half' || newType === 'pm_half') {
      setUnit(0.5);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate && val !== endDate) {
      setUnit(daysInRange(val, endDate));
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && startDate !== val) {
      setUnit(daysInRange(startDate, val));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await leaveAPI.updateLeaveDetails(leave.id, {
        type,
        unit: Number(unit),
        status,
        reason,
        start_date: startDate,
        end_date: endDate,
      });
      alert('휴가 내역이 정상적으로 수정되었습니다.');
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card animate-scale" style={{ background: '#fff', maxWidth: 480, width: '100%', padding: '1.75rem', borderRadius: 12, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--gray-200)', paddingBottom: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>휴가 내역 세부 수정</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">휴가 종류 (구분)</label>
            <select value={type} onChange={e => handleTypeChange(e.target.value)} className="input-field">
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.exempt ? '연차차감제외' : '연차차감'})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">사용 일수 (unit)</label>
              <input type="number" step="0.25" value={unit} onChange={e => setUnit(parseFloat(e.target.value) || 0)} className="input-field" />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button type="button" className="btn" onClick={() => setUnit(1.0)} style={{ padding: '2px 6px', fontSize: 10, background: unit === 1.0 ? 'var(--primary-light)' : '#fff', color: unit === 1.0 ? 'var(--primary)' : 'var(--gray-600)' }}>1일</button>
                <button type="button" className="btn" onClick={() => setUnit(0.5)} style={{ padding: '2px 6px', fontSize: 10, background: unit === 0.5 ? 'var(--primary-light)' : '#fff', color: unit === 0.5 ? 'var(--primary)' : 'var(--gray-600)' }}>0.5일 (반차)</button>
                <button type="button" className="btn" onClick={() => setUnit(0.25)} style={{ padding: '2px 6px', fontSize: 10, background: unit === 0.25 ? 'var(--primary-light)' : '#fff', color: unit === 0.25 ? 'var(--primary)' : 'var(--gray-600)' }}>0.25일 (반반차)</button>
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">결재 상태 (status)</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className="input-field">
                <option value="approved">승인됨 (approved)</option>
                <option value="pending">대기 중 (pending)</option>
                <option value="rejected">반려됨 (rejected)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">시작일</label>
              <input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} className="input-field" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">종료일</label>
              <input type="date" value={endDate} onChange={e => handleEndDateChange(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">신청 사유</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="input-field" placeholder="사유 입력..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '수정 사항 저장'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Employee Management ----------
function EmployeeMgmt({ employees, currentUser, leaves, company, leaveTypes, onUpdate }: {
  employees: Employee[];
  currentUser: Employee;
  leaves: Leave[];
  company: Company;
  leaveTypes: any[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', joinDate: '', department: '' });
  const [loaModal, setLoaModal] = useState<Employee | null>(null);
  const [selectedHistoryEmp, setSelectedHistoryEmp] = useState<Employee | null>(null);

  const myEmps = useMemo(() => employees.filter(e => e.company_id === currentUser.company_id), [employees, currentUser]);

  const startEdit = (emp: Employee) => {
    setEditId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      joinDate: formatDateStr(emp.join_date),
      department: emp.department || '',
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', joinDate: '', department: '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.email || !form.joinDate) return alert('이름, 이메일, 입사일은 필수항목입니다.');
    try {
      if (editId) {
        const res = await employeeAPI.updateEmployee(editId, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          joinDate: form.joinDate,
          department: form.department
        });
        if (res.success) alert(res.message);
      } else {
        const res = await employeeAPI.addEmployee({
          ...form,
          password: '1234'
        });
        if (res.success) alert('직원이 성공적으로 등록되었습니다.');
      }
      setShowForm(false);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message || '직원 저장 실패');
    }
  };

  const toggleResign = async (emp: Employee) => {
    if (emp.status === 'resigned') {
      if (confirm(`${emp.name} 직원을 다시 재직 상태로 전환하시겠습니까?`)) {
        try {
          await employeeAPI.updateEmployee(emp.id, { status: 'active', resign_date: null });
          onUpdate();
        } catch (err: any) {
          alert(err.response?.data?.message);
        }
      }
    } else {
      const d = prompt('퇴사일을 입력하세요 (YYYY-MM-DD)', todayStr());
      if (d) {
        try {
          await employeeAPI.updateEmployee(emp.id, { status: 'resigned', resign_date: d });
          onUpdate();
        } catch (err: any) {
          alert(err.response?.data?.message);
        }
      }
    }
  };

  const setLOA = async (emp: Employee, start: string | null, end: string | null) => {
    try {
      await employeeAPI.updateEmployee(emp.id, {
        leaveOfAbsence: start ? { start, end: end || null } : null
      });
      setLoaModal(null);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>임직원 관리</h2>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>소속 직원의 기본 정보 수정, 휴직 설정 및 퇴사 처리를 일괄 관리합니다.</p>
        </div>
        <button className="btn btn-primary" onClick={startAdd} style={{ gap: 6 }}>
          <UserPlus size={16} /> 직원 추가 등록
        </button>
      </div>

      {showForm && (
        <div className="glass-card animate-scale" style={{ border: '1px solid var(--primary-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{editId ? '직원 기본 정보 수정' : '신규 직원 등록'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">이름 *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">이메일 *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">연락처</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} className="input-field" placeholder="010-0000-0000" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">입사일 *</label>
              <input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} className="input-field" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">부서</label>
              <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input-field" placeholder="부서명 입력" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={save}>저장</button>
            <button className="btn" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {loaModal && (
        <div className="glass-card animate-scale" style={{ border: '1.5px solid var(--warning)', background: '#FFFDF9' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={16} style={{ color: 'var(--warning)' }} />
            {loaModal.name} 임직원 휴직 설정
          </div>
          <LOAForm emp={loaModal} onSave={setLOA} onCancel={() => setLoaModal(null)} />
        </div>
      )}

      {selectedHistoryEmp && (
        <HistoryModal 
          emp={selectedHistoryEmp} 
          leaves={leaves} 
          company={company} 
          leaveTypes={leaveTypes}
          onClose={() => setSelectedHistoryEmp(null)} 
          onRefresh={onUpdate}
        />
      )}

      <div className="table-container animate-scale">
        <table className="custom-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>부서</th>
              <th>연락처</th>
              <th>이메일</th>
              <th>입사일</th>
              <th>상태</th>
              <th>잔여연차 (현재주기)</th>
              <th style={{ textAlign: 'right' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {myEmps.map(emp => {
              const balance = getCurrentLeaveBalance(emp.join_date, leaves.filter(l => l.emp_id === emp.id), company?.basis_type, company?.basis_date, new Date(), company?.leave_disposal ?? 'expire');
              const total = balance.granted;
              const remaining = balance.remaining;
              const loaActive = emp.leave_of_absence && emp.leave_of_absence.start <= todayStr() && (!emp.leave_of_absence.end || emp.leave_of_absence.end >= todayStr());
              
              return (
                <tr key={emp.id} style={{ opacity: emp.status === 'resigned' ? 0.6 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{emp.name}</span>
                      {emp.role === 'admin' && <StatusBadge label="인사관리자" color="var(--primary)" bg="var(--primary-light)" />}
                    </div>
                  </td>
                  <td style={{ color: 'var(--gray-500)' }}>{emp.department || '-'}</td>
                  <td style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{emp.phone || '-'}</td>
                  <td style={{ color: 'var(--gray-500)' }}>{emp.email}</td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{formatDateStr(emp.join_date)}</td>
                  <td>
                    {emp.status === 'resigned' ? (
                      <StatusBadge label={`퇴사 (${emp.resign_date || ''})`} color="var(--danger)" bg="var(--danger-light)" />
                    ) : loaActive ? (
                      <StatusBadge label="휴직 중" color="var(--warning)" bg="var(--warning-light)" />
                    ) : (
                      <StatusBadge label="재직 중" color="var(--success)" bg="var(--success-light)" />
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--gray-900)' }}>{remaining.toFixed(2)}일 잔여</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 4 }}>(사용 {balance.used.toFixed(2)}일 / 총 {total}일)</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn" onClick={() => setSelectedHistoryEmp(emp)} style={{ padding: '5px 10px', fontSize: 11, borderColor: 'var(--primary-border)', color: 'var(--primary)', background: 'var(--primary-light)' }}>이력</button>
                      <button className="btn" onClick={() => startEdit(emp)} style={{ padding: '5px 10px', fontSize: 11 }}>수정</button>
                      <button className="btn" onClick={() => setLoaModal(emp)} style={{ padding: '5px 10px', fontSize: 11 }} disabled={emp.status === 'resigned'}>휴직설정</button>
                      <button 
                        className={`btn ${emp.status === 'resigned' ? 'btn-ghost' : 'btn-danger'}`} 
                        onClick={() => toggleResign(emp)} 
                        style={{ padding: '5px 10px', fontSize: 11 }}
                      >
                        {emp.status === 'resigned' ? '재직 전환' : '퇴사 처리'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- History Modal ----------
function HistoryModal({ emp, leaves, company, leaveTypes, onClose, onRefresh }: {
  emp: Employee;
  leaves: Leave[];
  company: Company;
  leaveTypes: any[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const balance = getCurrentLeaveBalance(emp.join_date, leaves.filter(l => l.emp_id === emp.id), company?.basis_type, company?.basis_date, new Date(), company?.leave_disposal ?? 'expire');
  
  const empLeaves = useMemo(() => {
    return leaves.filter(l => l.emp_id === emp.id).sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [leaves, emp.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchType, setBatchType] = useState<string>('unpaid_annual');
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === empLeaves.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(empLeaves.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchTypeChange = async () => {
    if (selectedIds.length === 0) return alert('일괄 변경할 휴가 항목을 1개 이상 선택해 주세요.');
    const targetTypeObj = leaveTypes.find(t => t.id === batchType);
    const targetLabel = targetTypeObj ? targetTypeObj.label : batchType;

    if (!confirm(`선택한 ${selectedIds.length}건의 휴가 구분을 '${targetLabel}'(으)로 일괄 변경하시겠습니까?\n변경 시 연차 차감 일수가 재산출됩니다.`)) return;

    setIsUpdating(true);
    try {
      await leaveAPI.batchUpdateLeaveType(selectedIds, batchType);
      alert(`${selectedIds.length}건의 휴가 종류가 '${targetLabel}'(으)로 성공적으로 일괄 변경되었습니다.`);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || '일괄 변경 처리에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('해당 휴가 내역을 정말로 삭제하시겠습니까? 삭제 후에는 연차 사용 일수가 즉시 재산출됩니다.')) return;
    try {
      await leaveAPI.deleteLeave(leaveId);
      alert('휴가 내역이 삭제되었습니다.');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || '삭제 처리에 실패했습니다.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-card animate-scale" style={{
        background: '#fff',
        maxWidth: 750,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '2rem',
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}>
              {emp.name}님의 전체 연차 이력 및 등록 휴가 관리
            </h3>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              입사일: {formatDateStr(emp.join_date)} · 부서: {emp.department || '미지정'} · 이메일: {emp.email}
            </p>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={onClose} 
            style={{ fontSize: 20, padding: 4, width: 36, height: 36 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)50' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>현재 주기 상태 요약</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>
                주기: {balance.activeCycle?.startDate} ~ {balance.activeCycle?.endDate}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: balance.remaining < 0 ? 'var(--danger)' : 'var(--primary)' }}>
                잔여 {balance.remaining.toFixed(2)}일 (부여: {balance.granted}일 / 사용: {balance.used.toFixed(2)}일)
              </span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>회차별 연차 생성 이력</div>
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  if (confirm(`${emp.name}님에게 1일 연차 선사용(사전승인)을 등록하여 소멸 예정 연차 1일을 보존/사용할 수 있도록 등록하시겠습니까?`)) {
                    try {
                      await leaveAPI.applyLeave({
                        type: 'unearned_annual',
                        unit: 1,
                        startDate: todayStr(),
                        endDate: todayStr(),
                        reason: '소멸 예정 연차 보존 (사전 승인 1일 사용)',
                        empId: emp.id
                      });
                      alert('1일 연차 선사용(사전승인)이 성공적으로 등록되었습니다.');
                      onRefresh();
                    } catch (err: any) {
                      alert(err.response?.data?.message || '등록 실패');
                    }
                  }
                }}
                style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
              >
                + 소멸 연차 보존 (1일 선사용 등록)
              </button>
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 8, fontSize: 11, color: '#92400E', marginBottom: 12 }}>
              <strong>💡 소멸 예정 연차 활용/보존 방안 안내:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li><strong>이월 처리</strong>: 환경설정 탭에서 연차 처분 방식을 <code>다음 주기로 이월(carryover)</code>로 설정하시면 미사용 소멸 연차가 다음 회차로 자동 이월됩니다.</li>
                <li><strong>선사용/반차 활용</strong>: 소멸 예정 연차가 있더라도 <code>오후/오전반차(0.5일)</code> 또는 <code>연차 선사용(사전승인)</code>으로 1일 또는 반차 단위로 당겨서 활용할 수 있습니다.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {balance.allCycles.map((c, ci) => {
                const isActive = balance.activeCycle?.startDate === c.startDate && balance.activeCycle?.endDate === c.endDate;
                return (
                  <div 
                    key={ci} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      padding: '12px 16px', 
                      borderRadius: 8,
                      border: `1px solid ${isActive ? 'var(--primary-border)' : 'var(--gray-200)'}`,
                      background: isActive ? 'var(--primary-light)15' : '#f8fafc',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isActive ? 'var(--primary)' : 'var(--gray-800)' }}>
                        {c.label} {isActive && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' }}>현재 주기</span>}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500 }}>
                        {c.startDate} ~ {c.endDate}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 8, fontSize: 12 }}>
                      <div>
                        <div style={{ color: 'var(--gray-500)', fontSize: 10, fontWeight: 600 }}>총 부여일수</div>
                        <div style={{ fontWeight: 600, color: 'var(--gray-800)', marginTop: 2 }}>
                          {c.grantedDays}일
                          {c.debtDays ? <div style={{ fontSize: 9, color: 'var(--danger)', marginTop: 1 }}>(전주기부채 -{c.debtDays}일)</div> : null}
                          {c.carryOverDays ? <div style={{ fontSize: 9, color: 'var(--primary)', marginTop: 1 }}>(전주기이월 +{c.carryOverDays}일)</div> : null}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--gray-500)', fontSize: 10, fontWeight: 600 }}>사용일수</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>{c.usedDays.toFixed(2)}일</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--gray-500)', fontSize: 10, fontWeight: 600 }}>잔여일수</div>
                        <div style={{ fontWeight: 700, color: c.remainingDays < 0 ? 'var(--danger)' : 'var(--primary)', marginTop: 2 }}>{c.remainingDays.toFixed(2)}일</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>등록된 휴가 내역 및 일괄 종류 변경</h4>
                <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                  예비군, 무급연차, 임산부단축근무 등이 연차로 잘못 일괄 등록된 경우 항목을 선택하여 타 휴가 종류로 일괄 전환할 수 있습니다.
                </p>
              </div>
            </div>

            {empLeaves.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={empLeaves.length > 0 && selectedIds.length === empLeaves.length} 
                      onChange={toggleSelectAll} 
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: 14, height: 14 }} 
                    />
                    전체 선택 ({selectedIds.length}/{empLeaves.length})
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 500 }}>변경할 휴가 종류:</span>
                  <select 
                    value={batchType} 
                    onChange={e => setBatchType(e.target.value)} 
                    className="input-field" 
                    style={{ padding: '4px 8px', fontSize: 12, width: 'auto', margin: 0 }}
                  >
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.exempt ? '차감제외' : '연차차감'})</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleBatchTypeChange} 
                    disabled={selectedIds.length === 0 || isUpdating} 
                    style={{ padding: '5px 12px', fontSize: 11 }}
                  >
                    {isUpdating ? '변경 중...' : '선택 건 휴가종류 일괄 변경'}
                  </button>
                </div>
              </div>
            )}

            {empLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--gray-400)', fontSize: 12, background: '#fafafa', borderRadius: 8 }}>
                등록된 휴가 내역이 없습니다.
              </div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                <table className="custom-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ width: 36, textAlign: 'center' }}>선택</th>
                      <th>기간</th>
                      <th>휴가 구분</th>
                      <th>일수</th>
                      <th>상태</th>
                      <th>사유</th>
                      <th style={{ textAlign: 'right' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empLeaves.map(l => {
                      const isChecked = selectedIds.includes(l.id);
                      const typeObj = leaveTypes.find(t => t.id === l.type);
                      const typeLabel = typeObj ? typeObj.label : l.type;
                      const isExempt = typeObj ? typeObj.exempt : false;
                      
                      return (
                        <tr key={l.id} style={{ background: isChecked ? 'var(--primary-light)20' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleSelectOne(l.id)} 
                              style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: 14, height: 14 }} 
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {formatDateStr(l.start_date)} {l.start_date !== l.end_date ? `~ ${formatDateStr(l.end_date)}` : ''}
                          </td>
                          <td>
                            <span style={{ 
                              fontSize: 11, 
                              padding: '2px 6px', 
                              borderRadius: 4, 
                              fontWeight: 600, 
                              background: isExempt ? '#F3F4F6' : '#EEF2FF', 
                              color: isExempt ? '#4B5563' : '#4F46E5', 
                              border: `1px solid ${isExempt ? '#E5E7EB' : '#C7D2FE'}` 
                            }}>
                              {typeLabel} {isExempt ? '(차감제외)' : ''}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{fmtUnit(l.unit)}</td>
                          <td>
                            <StatusBadge 
                              label={l.status === 'approved' ? '승인됨' : l.status === 'pending' ? '대기중' : '반려됨'} 
                              color={l.status === 'approved' ? 'var(--success)' : l.status === 'pending' ? 'var(--warning)' : 'var(--danger)'} 
                              bg={l.status === 'approved' ? 'var(--success-light)' : l.status === 'pending' ? 'var(--warning-light)' : 'var(--danger-light)'} 
                            />
                          </td>
                          <td style={{ color: 'var(--gray-600)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.reason || '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 4 }}>
                              <button className="btn" onClick={() => setEditingLeave(l)} style={{ padding: '3px 8px', fontSize: 10 }}>수정</button>
                              <button className="btn btn-danger" onClick={() => handleDeleteLeave(l.id)} style={{ padding: '3px 8px', fontSize: 10 }}>삭제</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {editingLeave && (
          <EditLeaveModal
            leave={editingLeave}
            leaveTypes={leaveTypes}
            onClose={() => setEditingLeave(null)}
            onSave={() => {
              setEditingLeave(null);
              onRefresh();
            }}
          />
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function LOAForm({ emp, onSave, onCancel }: { emp: Employee; onSave: (emp: Employee, start: string | null, end: string | null) => void; onCancel: () => void }) {
  const [start, setStart] = useState(emp.leave_of_absence?.start || '');
  const [end, setEnd] = useState(emp.leave_of_absence?.end || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">휴직 시작일</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input-field" />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">휴직 종료일 (선택)</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-field" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn btn-primary" onClick={() => onSave(emp, start, end)}>휴직 일정 적용</button>
        {emp.leave_of_absence && (
          <button className="btn btn-danger" onClick={() => onSave(emp, null, null)}>휴직 해제 처리</button>
        )}
        <button className="btn" onClick={onCancel}>닫기</button>
      </div>
    </div>
  );
}

// ---------- Company Settings ----------
function CompanySettings({ company, employees, currentUser, onSave }: {
  company: Company;
  employees: Employee[];
  currentUser: Employee;
  onSave: () => void;
}) {
  const [local, setLocal] = useState<Company>({ ...company });
  const myEmps = useMemo(() => employees.filter(e => e.company_id === currentUser.company_id && e.status === 'active'), [employees, currentUser]);
  const admins = myEmps.filter(e => e.role === 'admin');
  const nonAdmins = myEmps.filter(e => e.role !== 'admin');

  const set = (k: keyof Company, v: any) => setLocal(p => ({ ...p, [k]: v }));
  
  const save = async () => {
    try {
      const res = await companyAPI.updateCompany(local);
      if (res.success) {
        alert(res.message);
        onSave();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '회사 설정 저장 실패');
    }
  };

  const addGeneral = () => {
    const id = 'g_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const updated = [...(local.general_types || []), { id, label: '신규 휴가 종류', days: 1, period: 'month' as const }];
    set('general_types', updated);
  };
  
  const updGeneral = (id: string, patch: any) => {
    const updated = local.general_types.map(g => g.id === id ? { ...g, ...patch } : g);
    set('general_types', updated);
  };
  
  const delGeneral = (id: string) => {
    const updated = local.general_types.filter(g => g.id !== id);
    set('general_types', updated);
  };

  const addFamily = () => {
    const id = 'f_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const updated = [...(local.family_types || []), { id, label: '신규 경조사 휴가', days: 1 }];
    set('family_types', updated);
  };
  
  const updFamily = (id: string, patch: any) => {
    const updated = local.family_types.map(f => f.id === id ? { ...f, ...patch } : f);
    set('family_types', updated);
  };
  
  const delFamily = (id: string) => {
    const updated = local.family_types.filter(f => f.id !== id);
    set('family_types', updated);
  };

  const promote = async (empId: string) => {
    if (!empId) return;
    try {
      const res = await employeeAPI.updateEmployee(empId, { role: 'admin' });
      if (res.success) {
        alert('관리자 지정이 완료되었습니다.');
        onSave();
      }
    } catch (err: any) {
      alert(err.response?.data?.message);
    }
  };

  const demote = async (empId: string) => {
    if (confirm('이 직원의 인사관리자 권한을 해제하시겠습니까?')) {
      try {
        const res = await employeeAPI.updateEmployee(empId, { role: 'employee' });
        if (res.success) {
          alert('관리자 권한이 해제되었습니다.');
          onSave();
        }
      } catch (err: any) {
        alert(err.response?.data?.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>회사 및 휴가 운영 규정 설정</h2>

      {/* Two-column: left=기본인적사항, right=연차설정 stacked */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.1fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* LEFT: Basic Info */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building size={16} /> 회사 기본 인적사항
          </h3>
          <div className="input-group">
            <label className="input-label">회사 ID</label>
            <input type="text" value={local.id} disabled className="input-field" style={{ background: '#f8fafc', fontWeight: 600 }} />
          </div>
          <div className="input-group">
            <label className="input-label">회사명</label>
            <input type="text" value={local.name} onChange={e => set('name', e.target.value)} className="input-field" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">사업자등록번호</label>
              <input type="text" value={local.biz_reg_no || ''} onChange={e => set('biz_reg_no', formatBizRegNo(e.target.value))} className="input-field" placeholder="000-00-00000" />
            </div>
            <div className="input-group">
              <label className="input-label">대표 연락처</label>
              <input type="text" value={local.phone || ''} onChange={e => set('phone', formatPhone(e.target.value))} className="input-field" placeholder="02-000-0000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">업태</label>
              <input type="text" value={local.biz_type || ''} onChange={e => set('biz_type', e.target.value)} className="input-field" />
            </div>
            <div className="input-group">
              <label className="input-label">업종</label>
              <input type="text" value={local.biz_category || ''} onChange={e => set('biz_category', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">본사 주소</label>
            <input type="text" value={local.address || ''} onChange={e => set('address', e.target.value)} className="input-field" />
          </div>
        </div>

        {/* RIGHT: Calculation basis + Leave Disposal stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Calculation basis */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={16} /> 연차 계산 시점 기준 설정
            </h3>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">기준 시점 구분</label>
              <select 
                value={local.basis_type} 
                onChange={e => set('basis_type', e.target.value as any)} 
                className="input-field"
              >
                <option value="join">입사일 기준 (직원 개개인 기준)</option>
                <option value="fiscal">회계연도 기준 (매년 1월 1일 일괄 부여)</option>
                <option value="custom">지정일 기준 (특정 기산일 설정)</option>
              </select>
            </div>
            
            {local.basis_type === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">기산일 월</label>
                  <select 
                    value={local.basis_date?.split('-')[0] || '01'} 
                    onChange={e => set('basis_date', `${e.target.value}-${local.basis_date?.split('-')[1] || '01'}`)} 
                    className="input-field"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = String(i + 1).padStart(2, '0');
                      return <option key={m} value={m}>{i + 1}월</option>;
                    })}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">기산일 일</label>
                  <select 
                    value={local.basis_date?.split('-')[1] || '01'} 
                    onChange={e => set('basis_date', `${local.basis_date?.split('-')[0] || '01'}-${e.target.value}`)} 
                    className="input-field"
                  >
                    {Array.from({ length: 28 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      return <option key={d} value={d}>{i + 1}일</option>;
                    })}
                  </select>
                </div>
              </div>
            )}
            
            <div style={{ padding: '10px 12px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 8, fontSize: 11, lineHeight: 1.5, border: '1px solid var(--primary-border)50' }}>
              <strong>💡 기준 변경 시 영향</strong><br />
              기준 구분을 변경하면 소속 임직원의 연차 가용 일수가 즉시 새 공식에 따라 실시간으로 재산울됩니다.
            </div>
          </div>

          {/* Leave Disposal Policy */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} /> 잔여 연차 처분 방식 설정
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: 'expire', label: '소멸', desc: '주기 종료 시 남은 연차 소멸. 초과 사용 부채는 다음 주기에서 선차감 정산.' },
                { value: 'carryover', label: '이월', desc: '남은 연차를 다음 주기에 합산. 이월분 우선 사용, 부채는 선차감 정산.' },
                { value: 'allowance', label: '수당', desc: '남은 연차를 수당으로 지급. (수당 태그 표시)' },
              ].map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${(local.leave_disposal ?? 'expire') === opt.value ? 'var(--primary)' : 'var(--gray-200)'}`,
                    background: (local.leave_disposal ?? 'expire') === opt.value ? 'var(--primary-light)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="leave_disposal"
                    value={opt.value}
                    checked={(local.leave_disposal ?? 'expire') === opt.value}
                    onChange={() => set('leave_disposal', opt.value as any)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)', marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ padding: '10px 12px', background: '#FFFBEB', color: '#92400E', borderRadius: 8, fontSize: 11, lineHeight: 1.5, border: '1px solid #FDE68A' }}>
              <strong>⚠️ 주의</strong><br />
              처분 방식은 주기가 완전히 종료된 시점에 적용됩니다. 초과 사용 부채는 모든 모드에서 다음 주기 선차감으로 정산됩니다.
            </div>
          </div>
        </div>
      </div>

      {/* General Company Leaves */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={16} /> 회사 부여 일반 포상/유급 휴가 종류 설정
          </h3>
          <button className="btn" onClick={addGeneral} style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
            <Plus size={12} /> 추가
          </button>
        </div>
        
        {local.general_types.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--gray-400)', fontSize: 13 }}>설정된 회사 일반 휴가가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {local.general_types.map(g => (
              <div key={g.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={g.label} 
                  onChange={e => updGeneral(g.id, { label: e.target.value })} 
                  className="input-field" 
                  style={{ flex: 1 }} 
                />
                <input 
                  type="number" 
                  step="0.5" 
                  value={g.days} 
                  onChange={e => updGeneral(g.id, { days: parseFloat(e.target.value) || 0 })} 
                  className="input-field" 
                  style={{ width: 90 }} 
                />
                <span style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>일 / 월 한도</span>
                <button className="btn btn-danger" onClick={() => delGeneral(g.id)} style={{ padding: '6px 12px' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Event Leaves */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={16} /> 경조사 휴가 일수 세부 설정
          </h3>
          <button className="btn" onClick={addFamily} style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
            <Plus size={12} /> 추가
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {local.family_types.map(f => (
            <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid var(--gray-200)' }}>
              <input 
                type="text" 
                value={f.label} 
                onChange={e => updFamily(f.id, { label: e.target.value })} 
                className="input-field" 
                style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} 
              />
              <input 
                type="number" 
                value={f.days} 
                onChange={e => updFamily(f.id, { days: parseInt(e.target.value) || 0 })} 
                className="input-field" 
                style={{ width: 60, padding: '6px 10px', fontSize: 12 }} 
              />
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>일</span>
              <button className="btn btn-danger" onClick={() => delFamily(f.id)} style={{ padding: '6px 10px' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Legal & Default Leaves */}
      <div className="glass-card">
        <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 8, marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={16} /> 기본 제공 법정휴가 종류 및 명칭 설정
          </h3>
          <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
            연차 이외의 법정 휴가를 활성화/비활성화하고, 각 휴가의 명칭을 변경할 수 있습니다.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BASE_LEAVE_TYPES.filter(b => b.id !== 'annual').map(b => {
            const isHidden = (local.hidden_base_types || []).includes(b.id);
            const active = !isHidden;
            const currentLabel = (local.base_type_labels && local.base_type_labels[b.id]) || b.label;

            const toggleActive = () => {
              let updatedHidden = [...(local.hidden_base_types || [])];
              if (active) {
                updatedHidden.push(b.id);
              } else {
                updatedHidden = updatedHidden.filter(id => id !== b.id);
              }
              setLocal(p => ({ ...p, hidden_base_types: updatedHidden }));
            };

            const changeLabel = (val: string) => {
              const updatedLabels = { ...(local.base_type_labels || {}) };
              updatedLabels[b.id] = val;
              setLocal(p => ({ ...p, base_type_labels: updatedLabels }));
            };

            return (
              <div 
                key={b.id} 
                style={{ 
                  display: 'flex', 
                  gap: 12, 
                  alignItems: 'center', 
                  background: active ? '#f8fafc' : '#f1f5f9', 
                  padding: '10px 12px', 
                  borderRadius: 8, 
                  border: `1px solid ${active ? 'var(--gray-200)' : 'var(--gray-300)'}`,
                  opacity: active ? 1 : 0.65,
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={active}
                  onChange={toggleActive}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, width: 120, color: active ? 'var(--gray-800)' : 'var(--gray-400)' }}>
                  기본: {b.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>→</span>
                <input 
                  type="text" 
                  value={currentLabel} 
                  disabled={!active}
                  onChange={e => changeLabel(e.target.value)}
                  placeholder={`${b.label} 노출 명칭`}
                  className="input-field" 
                  style={{ flex: 1, padding: '6px 10px', fontSize: 13, background: active ? '#fff' : '#e2e8f0', margin: 0 }} 
                />
                <span style={{ fontSize: 11, color: active ? 'var(--success)' : 'var(--gray-400)', fontWeight: 600 }}>
                  {active ? '사용 중' : '사용 안함'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin promotion / demotion */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={16} /> 인사 전결 권한자(인사 관리자) 지정
          </h3>
          <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>회사 설정 변경 및 사원 승인 처리가 가능한 직원을 지정합니다. (회사당 최대 3명)</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {admins.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name} <span style={{ color: 'var(--gray-400)', fontWeight: 500, fontSize: 12 }}>({a.email})</span></span>
              {a.id !== currentUser.id ? (
                <button className="btn" onClick={() => demote(a.id)} style={{ padding: '4px 8px', fontSize: 11 }}>권한 해제</button>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>본인 (로그인 계정)</span>
              )}
            </div>
          ))}
        </div>

        {admins.length < 3 && (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">추가할 관리자 직원 선택</label>
            <select 
              value="" 
              onChange={e => promote(e.target.value)} 
              className="input-field"
            >
              <option value="">사원 선택...</option>
              {nonAdmins.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.email}) — {e.department}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save} style={{ height: 44, fontSize: 14, fontWeight: 600 }}>
        회사 운영 규정 전체 저장 적용
      </button>
    </div>
  );
}

// ---------- Login / Register Screen ----------
function LoginScreen({ companies, onLogin, onRegister }: {
  companies: Array<{ id: string; name: string }>;
  onLogin: (email: string, password?: string) => void;
  onRegister: (data: any) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [rememberEmail, setRememberEmail] = useState(() => {
    return localStorage.getItem('remember_email') === 'true';
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('saved_email') || '';
  });
  const [loginPassword, setLoginPassword] = useState('');

  const handleLoginSubmit = () => {
    if (rememberEmail) {
      localStorage.setItem('saved_email', email);
      localStorage.setItem('remember_email', 'true');
    } else {
      localStorage.removeItem('saved_email');
      localStorage.removeItem('remember_email');
    }
    onLogin(email, loginPassword);
  };

  // Registration form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [dept, setDept] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');

  const filteredCompanies = useMemo(() => {
    if (!companySearch) return [];
    return companies.filter(c => 
      c.name.toLowerCase().includes(companySearch.toLowerCase()) || 
      c.id.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  const register = () => {
    if (!name || !email || !joinDate || !password || !confirmPassword) return alert('이름, 이메일, 입사일, 비밀번호는 필수 입력사항입니다.');
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!pwRegex.test(password)) return alert('비밀번호는 영문, 숫자 혼합 8자 이상이어야 합니다.');
    if (password !== confirmPassword) return alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    if (!selectedCompany && !newCompanyName) return alert('회사를 선택하거나 새 회사명을 입력해주세요.');
    
    onRegister({
      name,
      email,
      phone,
      joinDate,
      department: dept,
      companyId: selectedCompany?.id,
      newCompanyName: selectedCompany ? undefined : newCompanyName,
      password,
    });
    setMode('login');
    setEmail('');
    setLoginPassword('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="animate-scale" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 'bold', color: '#fff', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.25)' }}>✦</div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--gray-900)' }}>스마트 연차관리 웹서비스</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>대한민국 근로기준법 제60조 및 회계연도 기준 준수</p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', paddingBottom: 16, marginBottom: 20 }}>
            <button 
              onClick={() => setMode('login')} 
              style={{ 
                flex: 1, 
                padding: '8px', 
                border: 'none', 
                background: mode === 'login' ? 'var(--primary-light)' : 'transparent', 
                color: mode === 'login' ? 'var(--primary)' : 'var(--gray-500)', 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              로그인
            </button>
            <button 
              onClick={() => setMode('register')} 
              style={{ 
                flex: 1, 
                padding: '8px', 
                border: 'none', 
                background: mode === 'register' ? 'var(--primary-light)' : 'transparent', 
                color: mode === 'register' ? 'var(--primary)' : 'var(--gray-500)', 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              회원가입
            </button>
          </div>

          {mode === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">사내 이메일 주소</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@company.com" 
                  className="input-field" 
                  onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">비밀번호</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="input-field" 
                  onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gray-700)', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={rememberEmail} 
                    onChange={e => setRememberEmail(e.target.checked)} 
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: 15, height: 15 }} 
                  />
                  ID(이메일 주소) 저장
                </label>
              </div>
              <button className="btn btn-primary" onClick={handleLoginSubmit} style={{ height: 44, fontSize: 14 }}>
                로그인 <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">이름 *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="홍길동" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">이메일 주소 *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="example@company.com" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">비밀번호 * (영문, 숫자 혼합 8자 이상)</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="비밀번호 입력" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">비밀번호 확인 *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="비밀번호 재입력" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">연락처</label>
                <input type="text" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} className="input-field" placeholder="010-0000-0000" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">입사일 *</label>
                <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="input-field" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">소속 부서</label>
                <input type="text" value={dept} onChange={e => setDept(e.target.value)} className="input-field" placeholder="인사팀, 개발팀 등" />
              </div>
              
              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
                <label className="input-label">소속 회사 지정 *</label>
                <input 
                  type="text" 
                  value={companySearch} 
                  onChange={e => { setCompanySearch(e.target.value); setSelectedCompany(null); }} 
                  placeholder="회사명 또는 ID 검색..." 
                  className="input-field" 
                />
                
                {companySearch && filteredCompanies.length > 0 && (
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginTop: 6, overflow: 'hidden', maxHeight: 150, overflowY: 'auto' }}>
                    {filteredCompanies.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => { setSelectedCompany(c); setCompanySearch(c.name); }} 
                        style={{ 
                          padding: '10px 12px', 
                          cursor: 'pointer', 
                          background: selectedCompany?.id === c.id ? 'var(--primary-light)' : '#fff', 
                          borderBottom: '1px solid var(--gray-100)',
                          fontSize: 13
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>ID: {c.id}</div>
                      </div>
                    ))}
                  </div>
                )}

                {companySearch && filteredCompanies.length === 0 && (
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid var(--gray-200)', marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 8 }}>
                      등록된 회사가 없습니다. 아래에 새 회사명을 입력하시면 **신규 회사 등록 및 관리자 권한**으로 회원가입이 처리됩니다.
                    </div>
                    <input 
                      type="text" 
                      value={newCompanyName} 
                      onChange={e => setNewCompanyName(e.target.value)} 
                      placeholder="신규 등록할 회사명 입력" 
                      className="input-field" 
                    />
                  </div>
                )}
              </div>

              {selectedCompany && (
                <div style={{ fontSize: 12, color: 'var(--success)', background: 'var(--success-light)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--success-border)50' }}>
                  선택된 회사: <strong>{selectedCompany.name}</strong>
                </div>
              )}

              <button className="btn btn-primary" onClick={register} style={{ height: 44, fontSize: 14, marginTop: 6 }}>
                가입 완료 및 계정 생성
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
