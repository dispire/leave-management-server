import { useState, useMemo, useCallback } from "react";

const C = {
  primary: "#4F46E5", primaryLight: "#EEF2FF", primaryBorder: "#C7D2FE",
  success: "#059669", successLight: "#ECFDF5",
  warning: "#D97706", warningLight: "#FFFBEB",
  danger: "#DC2626", dangerLight: "#FEF2F2",
  gray: "#6B7280", grayLight: "#F9FAFB", border: "#E5E7EB",
  text: "#111827", textMuted: "#6B7280",
};

const BASE_LEAVE_TYPES = [
  { id: "annual", label: "연차", color: C.primary, bg: C.primaryLight, exempt: false, fixed: true },
  { id: "military", label: "예비군/민방위", color: C.warning, bg: C.warningLight, exempt: true, fixed: true },
  { id: "maternity", label: "출산전후휴가", color: "#7C3AED", bg: "#F5F3FF", exempt: true, fixed: true },
  { id: "parental", label: "육아휴직", color: "#0891B2", bg: "#ECFEFF", exempt: true, fixed: true, isLeaveOfAbsence: true },
  { id: "paternity", label: "배우자출산휴가", color: "#0284C7", bg: "#E0F2FE", exempt: true, fixed: true },
  { id: "menstrual", label: "생리휴가", color: "#DB2777", bg: "#FDF2F8", exempt: true, fixed: true },
  { id: "pregnancy_short", label: "임산부단축근무", color: "#9333EA", bg: "#FAF5FF", exempt: true, fixed: true },
  { id: "civil", label: "공민권행사", color: "#374151", bg: "#F3F4F6", exempt: true, fixed: true },
];

const DEFAULT_GENERAL_TYPES = [{ id: "g_pm", label: "오후반차", days: 2, period: "month" }];
const DEFAULT_FAMILY_TYPES = [
  { id: "f_marriage_self", label: "본인 결혼", days: 5 },
  { id: "f_marriage_child", label: "자녀 결혼", days: 1 },
  { id: "f_death_parent", label: "부모 사망", days: 5 },
  { id: "f_death_spouse", label: "배우자 사망", days: 5 },
  { id: "f_death_child", label: "자녀 사망", days: 5 },
  { id: "f_birth", label: "배우자 출산", days: 1 },
];

function genId(p = "") { return p + Math.random().toString(36).substr(2, 7).toUpperCase(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function calcAnnualDays(joinDate, today = new Date()) {
  const join = new Date(joinDate);
  const diffYears = (today - join) / 86400000 / 365.25;
  if (diffYears < 0) return 0;
  if (diffYears < 1) return Math.min(Math.floor(diffYears * 12), 11);
  const fullYears = Math.floor(diffYears);
  return Math.min(15 + Math.floor((fullYears - 1) / 2), 25);
}

function daysInRange(start, end) {
  return Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);
}

function fmtUnit(u) {
  if (u === 1) return "(1)";
  if (u === 0.5) return "(0.5)";
  if (u === 0.25) return "(0.25)";
  return `(${u})`;
}

// ---------- initial data ----------
const initial = {
  companies: [{
    id: "COMP001", name: "테크스타트업(주)", basisType: "fiscal", basisDate: "01-01",
    bizRegNo: "", bizType: "", bizCategory: "", address: "", phone: "",
    generalTypes: DEFAULT_GENERAL_TYPES, familyTypes: DEFAULT_FAMILY_TYPES,
  }],
  employees: [
    { id: "EMP001", companyId: "COMP001", name: "김민준", email: "minjun@tech.com", phone: "010-1234-5678", joinDate: "2022-03-15", role: "employee", department: "개발팀", status: "active", leaveOfAbsence: null, resignDate: null },
    { id: "EMP002", companyId: "COMP001", name: "이서연", email: "seoyeon@tech.com", phone: "010-2222-3333", joinDate: "2021-01-10", role: "employee", department: "디자인팀", status: "active", leaveOfAbsence: null, resignDate: null },
    { id: "ADMIN001", companyId: "COMP001", name: "박지훈", email: "admin@tech.com", phone: "010-9999-0000", joinDate: "2020-05-01", role: "admin", department: "인사팀", status: "active", leaveOfAbsence: null, resignDate: null },
  ],
  leaves: [
    { id: "L001", empId: "EMP001", type: "annual", unit: 1, startDate: "2025-06-02", endDate: "2025-06-02", reason: "개인사정", status: "approved" },
    { id: "L002", empId: "EMP001", type: "annual", unit: 0.5, startDate: "2025-06-10", endDate: "2025-06-10", reason: "병원방문", status: "approved" },
    { id: "L003", empId: "EMP002", type: "military", unit: 1, startDate: "2025-06-05", endDate: "2025-06-05", reason: "예비군훈련", status: "approved" },
    { id: "L004", empId: "EMP002", type: "g_pm", unit: 0.5, startDate: "2025-06-12", endDate: "2025-06-12", reason: "개인일정", status: "approved" },
  ],
};

// ---------- shared UI atoms ----------
const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.25rem", ...style }}>{children}</div>
);
const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: bg, color, border: `0.5px solid ${color}20`, whiteSpace: "nowrap" }}>{label}</span>
);
const Btn = ({ children, onClick, variant = "default", style = {}, disabled = false }) => {
  const variants = {
    default: { background: "transparent", color: C.text, border: `0.5px solid ${C.border}` },
    primary: { background: C.primary, color: "#fff", border: "none" },
    danger: { background: C.danger, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.textMuted, border: "none" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...variants[variant], padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>;
};
const Input = ({ label, value, onChange, type = "text", options, required, style = {} }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>{label}{required && " *"}</label>}
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: "#fff", color: C.text, ...style }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, boxSizing: "border-box", ...style }} />
    )}
  </div>
);

export default function App() {
  const [data, setData] = useState(initial);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("dashboard");

  const currentUser = useMemo(() => data.employees.find(e => e.id === currentUserId) || null, [data.employees, currentUserId]);
  const company = useMemo(() => data.companies.find(c => c.id === currentUser?.companyId) || null, [data.companies, currentUser]);
  const leaveTypes = useMemo(() => {
    if (!company) return BASE_LEAVE_TYPES;
    const gen = (company.generalTypes || []).map(g => ({ id: g.id, label: g.label, color: C.success, bg: C.successLight, exempt: false, custom: "general" }));
    const fam = (company.familyTypes || []).map(f => ({ id: f.id, label: f.label, color: "#B45309", bg: "#FFFBEB", exempt: true, custom: "family" }));
    return [...BASE_LEAVE_TYPES, ...gen, ...fam];
  }, [company]);

  const login = useCallback((email) => {
    const emp = data.employees.find(e => e.email === email);
    if (!emp) return alert("등록되지 않은 이메일입니다.");
    setCurrentUserId(emp.id); setScreen("app"); setTab("dashboard");
  }, [data.employees]);

  const register = useCallback((emp, comp) => {
    setData(p => ({
      ...p,
      companies: comp ? [...p.companies, comp] : p.companies,
      employees: [...p.employees, emp],
    }));
    alert("가입 완료! 로그인해주세요.");
  }, []);

  if (screen === "login") return <LoginScreen companies={data.companies} onLogin={login} onRegister={register} />;

  const isAdmin = currentUser?.role === "admin";

  return (
    <div style={{ minHeight: "100vh", background: C.grayLight, fontFamily: "sans-serif" }}>
      <Header user={currentUser} company={company} onLogout={() => { setCurrentUserId(null); setScreen("login"); }} />
      <NavBar tab={tab} setTab={setTab} isAdmin={isAdmin} />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {tab === "dashboard" && <Dashboard currentUser={currentUser} employees={data.employees} leaves={data.leaves} company={company} leaveTypes={leaveTypes} isAdmin={isAdmin} />}
        {tab === "apply" && <ApplyLeave currentUser={currentUser} leaves={data.leaves} company={company} leaveTypes={leaveTypes}
          onSubmit={l => setData(p => ({ ...p, leaves: [...p.leaves, l] }))} />}
        {tab === "history" && <LeaveHistory currentUser={currentUser} leaves={data.leaves} employees={data.employees} leaveTypes={leaveTypes} isAdmin={isAdmin}
          onApprove={(id, status) => setData(p => ({ ...p, leaves: p.leaves.map(l => l.id === id ? { ...l, status } : l) }))} />}
        {tab === "employees" && isAdmin && <EmployeeMgmt employees={data.employees} currentUser={currentUser} leaves={data.leaves}
          onAdd={e => setData(p => ({ ...p, employees: [...p.employees, e] }))}
          onUpdate={(id, patch) => setData(p => ({ ...p, employees: p.employees.map(e => e.id === id ? { ...e, ...patch } : e) }))} />}
        {tab === "settings" && isAdmin && <CompanySettings company={company} employees={data.employees} currentUser={currentUser}
          onSave={c => setData(p => ({ ...p, companies: p.companies.map(x => x.id === c.id ? c : x) }))}
          onPromote={(empId) => setData(p => ({ ...p, employees: p.employees.map(e => e.id === empId ? { ...e, role: "admin" } : e) }))}
          onDemote={(empId) => setData(p => ({ ...p, employees: p.employees.map(e => e.id === empId ? { ...e, role: "employee" } : e) }))}
        />}
      </div>
    </div>
  );
}

function Header({ user, company, onLogout }) {
  return (
    <div style={{ background: "#fff", borderBottom: `0.5px solid ${C.border}`, padding: "0 1rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 14 }}>✦</span></div>
          <div><span style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{company?.name}</span><span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>ID: {company?.id}</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.textMuted }}>{user?.name} · {user?.role === "admin" ? "관리자" : "직원"}</span>
          <Btn onClick={onLogout} variant="ghost" style={{ fontSize: 12 }}>로그아웃</Btn>
        </div>
      </div>
    </div>
  );
}

function NavBar({ tab, setTab, isAdmin }) {
  const tabs = [
    { id: "dashboard", label: "대시보드" }, { id: "apply", label: "휴가 신청" }, { id: "history", label: isAdmin ? "신청/승인" : "사용 내역" },
    ...(isAdmin ? [{ id: "employees", label: "직원 관리" }, { id: "settings", label: "회사 설정" }] : []),
  ];
  return (
    <div style={{ background: "#fff", borderBottom: `0.5px solid ${C.border}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 18px", fontSize: 13, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? C.primary : C.textMuted, background: "transparent", border: "none", borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- Dashboard with month calendar ----------
function Dashboard({ currentUser, employees, leaves, company, leaveTypes, isAdmin }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const myCompanyEmps = useMemo(() =>
    isAdmin ? employees.filter(e => e.companyId === currentUser.companyId && e.role !== "admin") : [currentUser],
  [employees, isAdmin, currentUser]);

  const usedAnnual = useCallback((empId) =>
    leaves.filter(l => l.empId === empId && l.type === "annual" && l.status === "approved").reduce((s, l) => s + l.unit, 0),
  [leaves]);

  const generalUsed = useCallback((empId, typeId) => {
    const now = new Date();
    return leaves.filter(l => l.empId === empId && l.type === typeId && l.status === "approved" &&
      new Date(l.startDate).getMonth() === now.getMonth() && new Date(l.startDate).getFullYear() === now.getFullYear())
      .reduce((s, l) => s + l.unit, 0);
  }, [leaves]);

  const monthCells = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay(); // Sunday=0
    const start = new Date(y, m, 1 - startOffset);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const totalCells = (startOffset + daysInMonth > 35) ? 42 : 35;
    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [viewDate]);

  const allLeaves = useMemo(() =>
    isAdmin ? leaves.filter(l => myCompanyEmps.some(e => e.id === l.empId) && l.status === "approved")
            : leaves.filter(l => l.empId === currentUser.id && l.status === "approved"),
  [leaves, isAdmin, myCompanyEmps, currentUser]);

  const leavesByDay = useMemo(() => {
    const map = {};
    allLeaves.forEach(l => {
      let d = new Date(l.startDate); const end = new Date(l.endDate);
      while (d <= end) {
        const ds = d.toISOString().slice(0, 10);
        (map[ds] = map[ds] || []).push(l);
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }, [allLeaves]);

  const EMP_COLORS = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
  const isOnLOA = (emp) => emp.leaveOfAbsence && emp.leaveOfAbsence.start <= todayStr() && (!emp.leaveOfAbsence.end || emp.leaveOfAbsence.end >= todayStr());

  return (
    <div>
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "재직 직원", value: myCompanyEmps.filter(e => e.status === "active").length + "명" },
            { label: "이번 달 휴가 건수", value: leaves.filter(l => {
              const d = new Date(l.startDate);
              return myCompanyEmps.some(e => e.id === l.empId) && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && l.status === "approved";
            }).length + "건" },
            { label: "승인 대기", value: leaves.filter(l => myCompanyEmps.some(e => e.id === l.empId) && l.status === "pending").length + "건" },
            { label: "연차기준일", value: company?.basisType === "join" ? "입사일" : company?.basisType === "fiscal" ? "1월 1일" : company?.basisDate || "지정일" },
          ].map((m, i) => (
            <div key={i} style={{ background: C.grayLight, borderRadius: 8, padding: "1rem", border: `0.5px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: C.text }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 24 }}>
        {myCompanyEmps.map((emp, i) => {
          const totalAnnual = calcAnnualDays(emp.joinDate);
          const used = usedAnnual(emp.id);
          const remaining = Math.max(0, totalAnnual - used);
          const pct = totalAnnual > 0 ? Math.round((used / totalAnnual) * 100) : 0;
          const loa = isOnLOA(emp);
          return (
            <Card key={emp.id} style={{ opacity: emp.status !== "active" || loa ? 0.55 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: EMP_COLORS[i % 6] + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: EMP_COLORS[i % 6] }}>{emp.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{emp.department}</div>
                  </div>
                </div>
                {emp.status === "resigned" && <Badge label={`퇴사 ${emp.resignDate || ""}`} color={C.danger} bg={C.dangerLight} />}
                {loa && <Badge label="휴직 중" color={C.warning} bg={C.warningLight} />}
                {!isAdmin && emp.status === "active" && !loa && <Badge label="내 정보" color={C.primary} bg={C.primaryLight} />}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
                  <span>연차 사용</span><span>{used.toFixed(2)} / {totalAnnual}일 ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 4 }}><div style={{ height: 6, background: C.primary, borderRadius: 4, width: `${Math.min(pct, 100)}%` }} /></div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>잔여 {remaining.toFixed(2)}일</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(company?.generalTypes || []).map(gt => {
                  const usedG = generalUsed(emp.id, gt.id);
                  const remG = Math.max(0, gt.days - usedG);
                  return (
                    <div key={gt.id} style={{ flex: "1 1 100px", background: C.successLight, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, color: C.success, marginBottom: 2 }}>{gt.label}(월)</div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: C.success }}>{remG}개 잔여</div>
                    </div>
                  );
                })}
                <div style={{ flex: "1 1 100px", background: C.primaryLight, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: C.primary, marginBottom: 2 }}>입사일</div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: C.primary }}>{emp.joinDate}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 500, fontSize: 15 }}>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>◀ 이전</Btn>
            <Btn onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>오늘</Btn>
            <Btn onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>다음 ▶</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["일","월","화","수","목","금","토"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: C.textMuted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {monthCells.map((d, i) => {
            const ds = d.toISOString().slice(0, 10);
            const isToday = ds === todayStr();
            const inMonth = d.getMonth() === viewDate.getMonth();
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const dayLeaves = leavesByDay[ds] || [];
            return (
              <div key={ds + i} style={{ minHeight: 78, padding: "4px 3px", borderRadius: 6, background: isToday ? C.primaryLight : isWeekend ? "#FAFAFA" : "transparent", border: isToday ? `1px solid ${C.primaryBorder}` : "0.5px solid transparent", opacity: inMonth ? 1 : 0.35 }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 500 : 400, color: isToday ? C.primary : C.text, marginBottom: 3 }}>{d.getDate()}</div>
                {dayLeaves.slice(0, 3).map((l, li) => {
                  const lt = leaveTypes.find(x => x.id === l.type);
                  const emp = employees.find(e => e.id === l.empId);
                  const isExempt = lt?.exempt;
                  return (
                    <div key={li} title={`${emp?.name} · ${lt?.label}`} style={{ fontSize: 9, padding: "1px 3px", borderRadius: 3, background: lt?.bg || C.primaryLight, color: lt?.color || C.primary, marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {emp?.name?.slice(0, 3)} {isExempt ? lt?.label?.slice(0,2) : fmtUnit(l.unit)}
                    </div>
                  );
                })}
                {dayLeaves.length > 3 && <div style={{ fontSize: 8, color: C.textMuted }}>+{dayLeaves.length - 3}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {leaveTypes.slice(0, 6).map(lt => (
            <div key={lt.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: lt.bg, border: `0.5px solid ${lt.color}` }} />
              <span style={{ fontSize: 11, color: C.textMuted }}>{lt.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>연차는 (1)=하루, (0.5)=반차, (0.25)=반반차로 표시됩니다.</div>
      </Card>
    </div>
  );
}

// ---------- Apply Leave ----------
function ApplyLeave({ currentUser, leaves, company, leaveTypes, onSubmit }) {
  const annualTypes = useMemo(() => leaveTypes.filter(t => !t.custom), [leaveTypes]);
  const generalTypes = useMemo(() => leaveTypes.filter(t => t.custom === "general"), [leaveTypes]);
  const familyTypes = useMemo(() => leaveTypes.filter(t => t.custom === "family"), [leaveTypes]);
  const allOptions = useMemo(() => [...annualTypes, ...generalTypes, ...familyTypes], [annualTypes, generalTypes, familyTypes]);

  const [type, setType] = useState("annual");
  const [unit, setUnit] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const selectedType = allOptions.find(t => t.id === type);
  const isExempt = selectedType?.exempt;
  const isGeneral = selectedType?.custom === "general";
  const isFamily = selectedType?.custom === "family";

  const usedAnnual = leaves.filter(l => l.empId === currentUser.id && l.type === "annual" && l.status !== "rejected").reduce((s, l) => s + l.unit, 0);
  const totalAnnual = calcAnnualDays(currentUser.joinDate);
  const remaining = Math.max(0, totalAnnual - usedAnnual);

  const now = new Date();
  const generalRemaining = (gt) => {
    const used = leaves.filter(l => l.empId === currentUser.id && l.type === gt.id && l.status !== "rejected" &&
      new Date(l.startDate).getMonth() === now.getMonth() && new Date(l.startDate).getFullYear() === now.getFullYear()).reduce((s, l) => s + l.unit, 0);
    return Math.max(0, gt.days - used);
  };

  const submit = () => {
    if (!startDate || !endDate) return alert("시작일과 종료일을 선택해주세요.");
    let u;
    if (isExempt || isFamily) u = daysInRange(startDate, endDate);
    else if (isGeneral) u = parseFloat(unit);
    else u = parseFloat(unit);

    if (type === "annual" && u > remaining) return alert(`잔여 연차가 부족합니다. (잔여: ${remaining.toFixed(2)}일)`);
    if (isGeneral) {
      const gt = generalTypes.find(g => g.id === type);
      if (u > generalRemaining(gt)) return alert(`이번 달 잔여 ${gt.label}이 부족합니다.`);
    }
    if (isFamily) {
      const ft = familyTypes.find(f => f.id === type);
      if (ft && u > ft.days) return alert(`${ft.label}은 최대 ${ft.days}일까지 사용 가능합니다.`);
    }
    onSubmit({ id: genId("L"), empId: currentUser.id, type, unit: u, startDate, endDate, reason, status: "pending" });
    alert("신청이 완료되었습니다. 관리자 승인을 기다려주세요.");
    setStartDate(""); setEndDate(""); setReason(""); setUnit("1");
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>휴가 신청</h2>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>연차 잔여: <strong>{remaining.toFixed(2)}일</strong></p>
      </div>
      <Card>
        <Input label="휴가 종류" value={type} onChange={v => { setType(v); setUnit("1"); }} options={[
          { value: "__a", label: "— 연차/법정휴가 —" }, ...annualTypes.map(l => ({ value: l.id, label: l.label })),
          { value: "__g", label: "— 일반휴가(회사) —" }, ...generalTypes.map(l => ({ value: l.id, label: l.label })),
          { value: "__f", label: "— 경조사 휴가 —" }, ...familyTypes.map(l => ({ value: l.id, label: `${l.label} (${l.days}일)` })),
        ]} />
        {!isExempt && !isFamily && (
          <Input label="사용 단위" value={unit} onChange={setUnit} options={[
            { value: "1", label: "1일" }, { value: "0.5", label: "0.5일 (반차)" }, { value: "0.25", label: "0.25일 (반반차)" },
          ]} />
        )}
        {isExempt && <div style={{ fontSize: 12, color: C.warning, background: C.warningLight, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>산정 제외 휴가입니다. 연차에서 차감되지 않습니다.</div>}
        {isFamily && <div style={{ fontSize: 12, color: "#B45309", background: "#FFFBEB", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>경조사 휴가는 회사 내규에 따른 기간이 자동 적용됩니다. (연차 차감 없음)</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="시작일" value={startDate} onChange={v => { setStartDate(v); if (!endDate) setEndDate(v); }} type="date" />
          <Input label="종료일" value={endDate} onChange={setEndDate} type="date" />
        </div>
        <Input label="사유" value={reason} onChange={setReason} />
        <Btn variant="primary" onClick={submit} style={{ width: "100%" }}>신청하기</Btn>
      </Card>
    </div>
  );
}

// ---------- History / Approval ----------
function LeaveHistory({ currentUser, leaves, employees, leaveTypes, isAdmin, onApprove }) {
  const [filter, setFilter] = useState("all");
  const myLeaves = useMemo(() =>
    isAdmin ? leaves.filter(l => employees.some(e => e.id === l.empId && e.companyId === currentUser.companyId))
            : leaves.filter(l => l.empId === currentUser.id),
  [leaves, isAdmin, employees, currentUser]);

  const filtered = useMemo(() => {
    const sorted = [...myLeaves].sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (filter === "all") return sorted;
    return sorted.filter(l => l.status === filter);
  }, [myLeaves, filter]);

  const statusLabel = { pending: "신청(대기)", approved: "승인", rejected: "반려" };
  const statusColor = { pending: C.warning, approved: C.success, rejected: C.danger };
  const statusBg = { pending: C.warningLight, approved: C.successLight, rejected: C.dangerLight };
  const pendingCount = myLeaves.filter(l => l.status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{isAdmin ? "신청/승인 관리" : "사용 내역"}</h2>
        {isAdmin && pendingCount > 0 && <Badge label={`승인 대기 ${pendingCount}건`} color={C.warning} bg={C.warningLight} />}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[{ id: "all", l: "전체" }, { id: "pending", l: "대기" }, { id: "approved", l: "승인" }, { id: "rejected", l: "반려" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, border: `0.5px solid ${filter === f.id ? C.primary : C.border}`, background: filter === f.id ? C.primaryLight : "#fff", color: filter === f.id ? C.primary : C.textMuted, cursor: "pointer" }}>{f.l}</button>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: C.textMuted, fontSize: 14 }}>내역이 없습니다.</div>}
        {filtered.map((l, i) => {
          const lt = leaveTypes.find(x => x.id === l.type);
          const emp = employees.find(e => e.id === l.empId);
          return (
            <div key={l.id} style={{ padding: "14px 1.25rem", borderBottom: i < filtered.length - 1 ? `0.5px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: lt?.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: lt?.color, flexShrink: 0 }}>{lt?.label?.slice(0, 2)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{lt?.label}</span>
                  {isAdmin && <span style={{ fontSize: 11, color: C.textMuted }}>— {emp?.name}</span>}
                  <Badge label={statusLabel[l.status] || l.status} color={statusColor[l.status]} bg={statusBg[l.status]} />
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {l.startDate === l.endDate ? l.startDate : `${l.startDate} ~ ${l.endDate}`} · {lt?.exempt ? `${daysInRange(l.startDate, l.endDate)}일` : `${l.unit}일`}{l.reason && ` · ${l.reason}`}
                </div>
              </div>
              {isAdmin && l.status === "pending" && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn variant="primary" onClick={() => onApprove(l.id, "approved")} style={{ fontSize: 12, padding: "5px 10px" }}>승인</Btn>
                  <Btn variant="danger" onClick={() => onApprove(l.id, "rejected")} style={{ fontSize: 12, padding: "5px 10px" }}>반려</Btn>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ---------- Employee Management (table) ----------
function EmployeeMgmt({ employees, currentUser, leaves, onAdd, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", joinDate: "", department: "" });
  const [loaModal, setLoaModal] = useState(null);

  const myEmps = useMemo(() => employees.filter(e => e.companyId === currentUser.companyId), [employees, currentUser]);

  const startEdit = (emp) => { setEditId(emp.id); setForm({ name: emp.name, email: emp.email, phone: emp.phone || "", joinDate: emp.joinDate, department: emp.department || "" }); setShowForm(true); };
  const startAdd = () => { setEditId(null); setForm({ name: "", email: "", phone: "", joinDate: "", department: "" }); setShowForm(true); };

  const save = () => {
    if (!form.name || !form.email || !form.joinDate) return alert("이름, 이메일, 입사일은 필수입니다.");
    if (editId) onUpdate(editId, form);
    else onAdd({ id: genId("EMP"), companyId: currentUser.companyId, ...form, role: "employee", status: "active", leaveOfAbsence: null, resignDate: null });
    setShowForm(false);
  };

  const toggleResign = (emp) => {
    if (emp.status === "resigned") onUpdate(emp.id, { status: "active", resignDate: null });
    else { const d = prompt("퇴사일을 입력하세요 (YYYY-MM-DD)", todayStr()); if (d) onUpdate(emp.id, { status: "resigned", resignDate: d }); }
  };

  const setLOA = (emp, start, end) => { onUpdate(emp.id, { leaveOfAbsence: start ? { start, end: end || null } : null }); setLoaModal(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>직원 관리</h2>
        <Btn variant="primary" onClick={startAdd}>+ 직원 추가</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="이름" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
            <Input label="이메일" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" required />
            <Input label="연락처" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            <Input label="입사일" value={form.joinDate} onChange={v => setForm(f => ({ ...f, joinDate: v }))} type="date" required />
            <Input label="부서" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={save}>{editId ? "수정 저장" : "추가"}</Btn>
            <Btn onClick={() => setShowForm(false)}>취소</Btn>
          </div>
        </Card>
      )}

      {loaModal && (
        <Card style={{ marginBottom: 16, border: `1px solid ${C.warning}` }}>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>{loaModal.name} — 휴직 설정</div>
          <LOAForm emp={loaModal} onSave={setLOA} onCancel={() => setLoaModal(null)} />
        </Card>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 12 }}>
          <thead>
            <tr style={{ background: C.grayLight, textAlign: "left" }}>
              {["이름","부서","연락처","이메일","상태","연차","",""].map(h => <th key={h} style={{ padding: "10px 12px", fontWeight: 500, color: C.textMuted, fontSize: 12, borderBottom: `0.5px solid ${C.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {myEmps.map(emp => {
              const total = calcAnnualDays(emp.joinDate);
              const used = leaves.filter(l => l.empId === emp.id && l.type === "annual" && l.status === "approved").reduce((s, l) => s + l.unit, 0);
              const loaActive = emp.leaveOfAbsence && emp.leaveOfAbsence.start <= todayStr() && (!emp.leaveOfAbsence.end || emp.leaveOfAbsence.end >= todayStr());
              return (
                <tr key={emp.id} style={{ opacity: emp.status === "resigned" ? 0.5 : 1, borderBottom: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{emp.name}{emp.role === "admin" && <span style={{ marginLeft: 6 }}><Badge label="관리자" color={C.primary} bg={C.primaryLight} /></span>}</td>
                  <td style={{ padding: "10px 12px", color: C.textMuted }}>{emp.department || "-"}</td>
                  <td style={{ padding: "10px 12px", color: C.textMuted }}>{emp.phone || "-"}</td>
                  <td style={{ padding: "10px 12px", color: C.textMuted }}>{emp.email}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {emp.status === "resigned" ? <Badge label={`퇴사 ${emp.resignDate || ""}`} color={C.danger} bg={C.dangerLight} />
                      : loaActive ? <Badge label="휴직 중" color={C.warning} bg={C.warningLight} />
                      : <Badge label="재직" color={C.success} bg={C.successLight} />}
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{(total - used).toFixed(2)}/{total}일</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Btn onClick={() => startEdit(emp)} style={{ fontSize: 11, padding: "4px 8px" }}>수정</Btn>
                      <Btn onClick={() => setLoaModal(emp)} style={{ fontSize: 11, padding: "4px 8px" }}>휴직</Btn>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Btn variant={emp.status === "resigned" ? "default" : "danger"} onClick={() => toggleResign(emp)} style={{ fontSize: 11, padding: "4px 8px" }}>{emp.status === "resigned" ? "재직 전환" : "퇴사 처리"}</Btn>
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

function LOAForm({ emp, onSave, onCancel }) {
  const [start, setStart] = useState(emp.leaveOfAbsence?.start || "");
  const [end, setEnd] = useState(emp.leaveOfAbsence?.end || "");
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="휴직 시작일" value={start} onChange={setStart} type="date" />
        <Input label="휴직 종료일 (선택)" value={end} onChange={setEnd} type="date" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="primary" onClick={() => onSave(emp, start, end)}>저장</Btn>
        {emp.leaveOfAbsence && <Btn variant="danger" onClick={() => onSave(emp, null, null)}>휴직 해제</Btn>}
        <Btn onClick={onCancel}>취소</Btn>
      </div>
    </div>
  );
}

// ---------- Company Settings ----------
function CompanySettings({ company, employees, currentUser, onSave, onPromote, onDemote }) {
  const [local, setLocal] = useState(company);
  const myEmps = useMemo(() => employees.filter(e => e.companyId === currentUser.companyId && e.status === "active"), [employees, currentUser]);
  const admins = myEmps.filter(e => e.role === "admin");
  const nonAdmins = myEmps.filter(e => e.role !== "admin");

  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }));
  const save = () => { onSave(local); alert("저장되었습니다."); };

  const addGeneral = () => set("generalTypes", [...(local.generalTypes || []), { id: genId("g_"), label: "새 항목", days: 1, period: "month" }]);
  const updGeneral = (id, patch) => set("generalTypes", local.generalTypes.map(g => g.id === id ? { ...g, ...patch } : g));
  const delGeneral = (id) => set("generalTypes", local.generalTypes.filter(g => g.id !== id));

  const addFamily = () => set("familyTypes", [...(local.familyTypes || []), { id: genId("f_"), label: "새 항목", days: 1 }]);
  const updFamily = (id, patch) => set("familyTypes", local.familyTypes.map(f => f.id === id ? { ...f, ...patch } : f));
  const delFamily = (id) => set("familyTypes", local.familyTypes.filter(f => f.id !== id));

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>회사 설정</h2>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>기본 정보</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>회사 ID</div>
          <div style={{ fontWeight: 500, fontSize: 16, letterSpacing: 1 }}>{local.id}</div>
        </div>
        <Input label="회사명" value={local.name} onChange={v => set("name", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="사업자등록번호" value={local.bizRegNo || ""} onChange={v => set("bizRegNo", v)} />
          <Input label="연락처" value={local.phone || ""} onChange={v => set("phone", v)} />
          <Input label="업태" value={local.bizType || ""} onChange={v => set("bizType", v)} />
          <Input label="업종" value={local.bizCategory || ""} onChange={v => set("bizCategory", v)} />
        </div>
        <Input label="주소" value={local.address || ""} onChange={v => set("address", v)} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>연차 기준일</div>
        <Input value={local.basisType} onChange={v => set("basisType", v)} options={[
          { value: "join", label: "입사일 기준" }, { value: "fiscal", label: "1월 1일 기준 (회계연도)" }, { value: "custom", label: "지정일 기준" },
        ]} />
        {local.basisType === "custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="월" value={local.basisDate?.split("-")[0] || "01"} onChange={v => set("basisDate", `${v}-${local.basisDate?.split("-")[1] || "01"}`)} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: `${i + 1}월` }))} />
            <Input label="일" value={local.basisDate?.split("-")[1] || "01"} onChange={v => set("basisDate", `${local.basisDate?.split("-")[0] || "01"}-${v}`)} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: `${i + 1}일` }))} />
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>일반휴가 종류 (회사 자체)</div>
          <Btn onClick={addGeneral} style={{ fontSize: 12, padding: "4px 10px" }}>+ 추가</Btn>
        </div>
        {(local.generalTypes || []).map(g => (
          <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input value={g.label} onChange={e => updGeneral(g.id, { label: e.target.value })} style={{ flex: 1, padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
            <input type="number" step="0.5" value={g.days} onChange={e => updGeneral(g.id, { days: parseFloat(e.target.value) || 0 })} style={{ width: 70, padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>개/월</span>
            <Btn variant="danger" onClick={() => delGeneral(g.id)} style={{ fontSize: 11, padding: "4px 8px" }}>삭제</Btn>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>경조사 휴가 종류 및 일수</div>
          <Btn onClick={addFamily} style={{ fontSize: 12, padding: "4px 10px" }}>+ 추가</Btn>
        </div>
        {(local.familyTypes || []).map(f => (
          <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input value={f.label} onChange={e => updFamily(f.id, { label: e.target.value })} style={{ flex: 1, padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
            <input type="number" value={f.days} onChange={e => updFamily(f.id, { days: parseInt(e.target.value) || 0 })} style={{ width: 70, padding: "6px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>일</span>
            <Btn variant="danger" onClick={() => delFamily(f.id)} style={{ fontSize: 11, padding: "4px 8px" }}>삭제</Btn>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>관리자 지정 (최대 3명)</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>관리자는 직원 등록·수정·휴직·퇴사 처리 권한을 가집니다.</div>
        {admins.map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `0.5px solid ${C.border}` }}>
            <span style={{ fontSize: 13 }}>{a.name} <span style={{ color: C.textMuted, fontSize: 12 }}>({a.email})</span></span>
            {a.id !== currentUser.id && <Btn onClick={() => onDemote(a.id)} style={{ fontSize: 11, padding: "4px 8px" }}>해제</Btn>}
          </div>
        ))}
        {admins.length < 3 && (
          <div style={{ marginTop: 10 }}>
            <Input label="관리자로 지정할 직원 선택" value="" onChange={v => v && onPromote(v)} options={[{ value: "", label: "선택..." }, ...nonAdmins.map(e => ({ value: e.id, label: `${e.name} (${e.email})` }))]} />
          </div>
        )}
        {admins.length >= 3 && <div style={{ fontSize: 12, color: C.warning }}>관리자는 최대 3명까지 지정 가능합니다.</div>}
      </Card>

      <Btn variant="primary" onClick={save} style={{ width: "100%" }}>전체 저장</Btn>
    </div>
  );
}

// ---------- Login / Register ----------
function LoginScreen({ companies, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState("");

  const filtered = useMemo(() => companies.filter(c => c.name.includes(companySearch) || c.id.toUpperCase().includes(companySearch.toUpperCase())), [companies, companySearch]);

  const register = () => {
    if (!name || !email || !joinDate) return alert("이름, 이메일, 입사일은 필수입니다.");
    if (!selectedCompany && !newCompanyName) return alert("회사를 선택하거나 새 회사명을 입력해주세요.");
    let comp = null; let companyId = selectedCompany?.id;
    if (!selectedCompany && newCompanyName) {
      companyId = genId("COMP");
      comp = { id: companyId, name: newCompanyName, basisType: "join", basisDate: "", bizRegNo: "", bizType: "", bizCategory: "", address: "", phone: "", generalTypes: DEFAULT_GENERAL_TYPES, familyTypes: DEFAULT_FAMILY_TYPES };
    }
    onRegister({ id: genId("EMP"), companyId, name, email, phone, joinDate, role: comp ? "admin" : "employee", department: dept, status: "active", leaveOfAbsence: null, resignDate: null }, comp);
    setMode("login"); setEmail("");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.grayLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22 }}>✦</div>
          <div style={{ fontWeight: 500, fontSize: 20, color: C.text }}>연차 관리 시스템</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>근로기준법 기반 휴가 관리</div>
        </div>
        <Card>
          <div style={{ display: "flex", marginBottom: 20, borderBottom: `0.5px solid ${C.border}`, paddingBottom: 16 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", border: "none", background: mode === m ? C.primaryLight : "transparent", color: mode === m ? C.primary : C.textMuted, borderRadius: 8, fontSize: 13, fontWeight: mode === m ? 500 : 400, cursor: "pointer" }}>{m === "login" ? "로그인" : "회원가입"}</button>
            ))}
          </div>
          {mode === "login" ? (
            <>
              <Input label="이메일" value={email} onChange={setEmail} type="email" />
              <Btn variant="primary" onClick={() => onLogin(email)} style={{ width: "100%" }}>로그인</Btn>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12, textAlign: "center" }}>테스트: admin@tech.com / minjun@tech.com</div>
            </>
          ) : (
            <>
              <Input label="이름" value={name} onChange={setName} required />
              <Input label="이메일" value={email} onChange={setEmail} type="email" required />
              <Input label="연락처" value={phone} onChange={setPhone} />
              <Input label="입사일" value={joinDate} onChange={setJoinDate} type="date" required />
              <Input label="부서" value={dept} onChange={setDept} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 4 }}>회사 검색 (이름 또는 ID)</label>
                <input value={companySearch} onChange={e => { setCompanySearch(e.target.value); setSelectedCompany(null); }} placeholder="회사명 또는 ID 입력..." style={{ width: "100%", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                {companySearch && filtered.length > 0 && (
                  <div style={{ border: `0.5px solid ${C.border}`, borderRadius: 8, marginTop: 4, overflow: "hidden" }}>
                    {filtered.map(c => (
                      <div key={c.id} onClick={() => { setSelectedCompany(c); setCompanySearch(c.name); }} style={{ padding: "10px 12px", cursor: "pointer", background: selectedCompany?.id === c.id ? C.primaryLight : "#fff", borderBottom: `0.5px solid ${C.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>ID: {c.id}</div>
                      </div>
                    ))}
                  </div>
                )}
                {companySearch && filtered.length === 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>검색 결과가 없습니다. 새 회사로 등록(관리자 계정)하시겠어요?</div>
                    <Input label="새 회사명" value={newCompanyName} onChange={setNewCompanyName} />
                  </div>
                )}
              </div>
              {selectedCompany && <div style={{ fontSize: 12, color: C.success, background: C.successLight, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>선택된 회사: {selectedCompany.name} (ID: {selectedCompany.id})</div>}
              <Btn variant="primary" onClick={register} style={{ width: "100%" }}>가입하기</Btn>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
