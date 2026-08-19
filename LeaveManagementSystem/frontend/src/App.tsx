import React, {
  useState, useMemo, useCallback, useReducer,
  useRef, useEffect, useTransition, memo,
} from "react";

// ═══════════════════════════════════════════════════════════════
// 1. 타입 & 상수 & 초기 데이터
// ═══════════════════════════════════════════════════════════════
const ROLE = Object.freeze({ ADMIN: "admin", USER: "user" });
const VIEW = Object.freeze({
  DASH: "dash",
  PRODUCTS: "products",
  SCAN: "scan",
  HISTORY: "history",
  MEMBERS: "members",
  COMPANY: "company",
  SETTINGS: "settings",
});

const CATS = Object.freeze(["의료소모품", "의료기기/장비", "의약품", "사무용품", "일반소모품"]);
const DEPARTS = Object.freeze(["진료과", "간호부", "원무과", "수술실", "검사의학과", "행정팀"]);
const POSITIONS = Object.freeze(["원장/의사", "수간호사", "간호사", "의료기사", "팀장", "사원"]);
const PAGE_OPTS = Object.freeze([10, 20, 30, 50]);
const LS_EMAIL = "__inv_email__";
const LS_GAS_URL = "__inv_gas_url__";
const TOAST_MS = 2400;
const SKEL_MS = Object.freeze({ DASH: 200, PRODUCTS: 200, HISTORY: 180, MEMBERS: 180, COMPANY: 180 });
const JSQR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
const JSQR_ID = "__jsqr__";
const VALID_VIEWS = new Set(Object.values(VIEW));

const today = () => new Date().toISOString().slice(0, 10);

// 기본 초기 데이터
const INIT_COMPANY = {
  name: "메디컬 원내 중앙재고센터",
  code: "HOSP-MED-01",
  bizNo: "123-45-67890",
  ceo: "김원장",
  phone: "02-1234-5678",
  email: "admin@medical-center.co.kr",
  address: "서울특별시 강남구 테헤란로 123 메디컬타워 3-5층",
  departments: [...DEPARTS],
  lowStockNotify: true,
  autoBarcodePrefix: "MED",
  updatedAt: "2025-06-01",
};

const INIT_USERS = [
  {
    id: 1,
    empNo: "EMP-001",
    name: "김관리",
    email: "admin@company.com",
    password: "admin1234",
    phone: "010-1234-5678",
    department: "원무과",
    position: "팀장",
    role: ROLE.ADMIN,
    status: "재직",
    createdAt: "2024-01-01",
  },
  {
    id: 2,
    empNo: "EMP-002",
    name: "홍길동",
    email: "user@company.com",
    password: "user1234a",
    phone: "010-9876-5432",
    department: "간호부",
    position: "간호사",
    role: ROLE.USER,
    status: "재직",
    createdAt: "2024-03-15",
  },
];

const INIT_PRODUCTS = [
  { id: 1, code: "PRD-001", name: "멸균 주사기 5ml (100개입)", category: "의료소모품", qty: 35, minQty: 10, unit: "박스", price: 25000, location: "A-01-02", barcodeType: "QR/1D", updatedAt: "2025-06-10" },
  { id: 2, code: "PRD-002", name: "디지털 체온계 (비접촉식)", category: "의료기기/장비", qty: 4, minQty: 8, unit: "개", price: 85000, location: "B-03-01", barcodeType: "QR/1D", updatedAt: "2025-06-11" },
  { id: 3, code: "PRD-003", name: "생리식염수 500ml", category: "의약품", qty: 120, minQty: 30, unit: "팩", price: 3200, location: "C-02-04", barcodeType: "QR/1D", updatedAt: "2025-06-12" },
  { id: 4, code: "PRD-004", name: "니트릴 장갑 L (200매)", category: "의료소모품", qty: 7, minQty: 15, unit: "곽", price: 18000, location: "A-02-05", barcodeType: "QR/1D", updatedAt: "2025-06-09" },
  { id: 5, code: "PRD-005", name: "손소독제 500ml", category: "일반소모품", qty: 3, minQty: 10, unit: "개", price: 6500, location: "D-01-01", barcodeType: "QR/1D", updatedAt: "2025-06-08" },
];

const INIT_HISTORY = [
  { id: 1, productCode: "PRD-001", productName: "멸균 주사기 5ml (100개입)", type: "입고", qty: 20, department: "간호부", by: "김관리", date: "2025-06-10", note: "정기 입고" },
  { id: 2, productCode: "PRD-002", productName: "디지털 체온계 (비접촉식)", type: "출고", qty: 2, department: "진료과", by: "홍길동", date: "2025-06-11", note: "진료실 배출" },
];

const BLANK_PRD = Object.freeze({
  code: "",
  name: "",
  category: "의료소모품",
  qty: 0,
  minQty: 10,
  unit: "개",
  price: 0,
  location: "A-01-01",
});

// ═══════════════════════════════════════════════════════════════
// 2. 전역 CSS (1회 주입)
// ═══════════════════════════════════════════════════════════════
if (typeof document !== "undefined" && !document.getElementById("__inv__")) {
  const st = document.createElement("style");
  st.id = "__inv__";
  st.textContent = `
    @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
    html { height:-webkit-fill-available; }
    body { margin:0; min-height:100vh; min-height:-webkit-fill-available; overscroll-behavior:none; background:#f4f6f9; }
    input, select, textarea, button { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif; }
    input[type=number] { -moz-appearance:textfield; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
    video { object-fit:cover; }
    @media print {
      body * { visibility: hidden; }
      #printable-label, #printable-label * { visibility: visible; }
      #printable-label { position: absolute; left: 0; top: 0; width: 100%; }
    }
  `;
  document.head.appendChild(st);
}

// ═══════════════════════════════════════════════════════════════
// 3. 유효성 검사
// ═══════════════════════════════════════════════════════════════
const V = Object.freeze({
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? "").trim()) ? "" : "올바른 이메일 형식이 아닙니다.",
  password: (v: string) => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(v ?? "") ? "" : "비밀번호는 6자 이상, 영문+숫자를 포함해야 합니다.",
  uname: (v: string) => (v ?? "").trim().length >= 2 ? "" : "이름은 2자 이상이어야 합니다.",
  code: (v: string) => /^[A-Z0-9-]{2,12}$/i.test((v ?? "").trim()) ? "" : "코드 형식: 영문/숫자/하이픈 2~12자 (예: PRD-001)",
  pname: (v: string) => (v ?? "").trim().length >= 2 ? "" : "상품명은 2자 이상이어야 합니다.",
  posInt: (v: any) => { const n = Number(v); return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? "" : "0 이상의 정수를 입력하세요."; },
  posNum: (v: any) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? "" : "0 이상의 숫자를 입력하세요."; },
});

// ═══════════════════════════════════════════════════════════════
// 4. localStorage 헬퍼
// ═══════════════════════════════════════════════════════════════
const ls = Object.freeze({
  get: (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* 무시 */ } },
});

// ═══════════════════════════════════════════════════════════════
// 5. Reducers
// ═══════════════════════════════════════════════════════════════
function prdReducer(state: any[], action: any) {
  switch (action.type) {
    case "SET_ALL": return action.payload;
    case "ADD": return [...state, { ...action.payload, id: Date.now(), updatedAt: today() }];
    case "UPDATE": return state.map((p) => (p.id === action.payload.id ? { ...action.payload, updatedAt: today() } : p));
    case "DELETE": return state.filter((p) => p.id !== action.id);
    case "ADJ":
      return state.map((p) =>
        p.id === action.id
          ? { ...p, qty: Math.max(0, (p.qty ?? 0) + (Number.isFinite(action.delta) ? action.delta : 0)), updatedAt: today() }
          : p
      );
    default: return state;
  }
}

function usrReducer(state: any[], action: any) {
  const adminCount = () => state.filter((u) => u.role === ROLE.ADMIN).length;
  switch (action.type) {
    case "SET_ALL": return action.payload;
    case "ADD": return [...state, { ...action.payload, id: Date.now(), createdAt: today() }];
    case "UPDATE": return state.map((u) => (u.id === action.payload.id ? { ...u, ...action.payload } : u));
    case "DELETE":
      if (adminCount() === 1 && state.find((u) => u.id === action.id)?.role === ROLE.ADMIN) return state;
      return state.filter((u) => u.id !== action.id);
    default: return state;
  }
}

function histReducer(state: any[], action: any) {
  switch (action.type) {
    case "SET_ALL": return action.payload;
    case "ADD": return [...state, { ...action.payload, id: Date.now() }];
    default: return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. 디자인 토큰 & 공유 스타일
// ═══════════════════════════════════════════════════════════════
const T = Object.freeze({
  bg: "#f4f6f9",
  sur: "#ffffff",
  bdr: "#e2e8f0",
  muted: "#8492a6",
  text: "#1e293b",
  sub: "#475569",
  red: "#ef4444",
  green: "#10b981",
  indigo: "#6366f1",
  blue: "#3b82f6",
  orange: "#f59e0b",
  r: 12,
});

const INP = Object.freeze({
  width: "100%",
  padding: "11px 13px",
  borderRadius: 9,
  fontSize: 15,
  outline: "none",
  background: T.sur,
  color: T.text,
  WebkitAppearance: "none" as const,
  transition: "border .15s",
  touchAction: "manipulation" as const,
});

const ROW = Object.freeze({ display: "flex", justifyContent: "space-between", alignItems: "center" });

// ═══════════════════════════════════════════════════════════════
// 7. 커스텀 훅 & 구글 드라이브 API 통신 함수
// ═══════════════════════════════════════════════════════════════
function useReady(ms = 220) {
  const [ok, setOk] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOk(true), ms); return () => clearTimeout(t); }, [ms]);
  return ok;
}

function useDeviceInfo() {
  return useMemo(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
    return Object.freeze({
      ios: /iP(hone|od|ad)/i.test(ua),
      android: /Android/i.test(ua),
      secure: typeof location !== "undefined" && (location.protocol === "https:" || location.hostname === "localhost"),
      hasMedia: typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    });
  }, []);
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 8px" }}>예상치 못한 오류가 발생했습니다</h2>
          <p style={{ fontSize: 14, color: T.muted, margin: "0 0 24px", lineHeight: 1.6 }}>앱을 다시 시작하면 해결되는 경우가 많습니다.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ border: "none", borderRadius: 9, padding: "11px 24px", fontSize: 14, fontWeight: 700, background: T.text, color: "#fff", cursor: "pointer" }}>
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function useThrottle(fn: Function, ms = 700) {
  const busy = useRef(false);
  return useCallback((...args: any[]) => {
    if (busy.current) return;
    busy.current = true;
    fn(...args);
    setTimeout(() => { busy.current = false; }, ms);
  }, [fn, ms]);
}

function sanitizeNum(v: any) {
  const s = String(v ?? "").replace(/[^0-9.]/g, "");
  const parts = s.split(".");
  return parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : s;
}

// ═══════════════════════════════════════════════════════════════
// 8. 1D 바코드 & QR 코드 캔버스 디코더 헬퍼
// ═══════════════════════════════════════════════════════════════
function decode1DBarcodePattern(imgData: ImageData): string | null {
  const { width, height, data } = imgData;
  const yList = [Math.floor(height * 0.5), Math.floor(height * 0.4), Math.floor(height * 0.6)];

  for (const cy of yList) {
    let binary = "";
    for (let x = 0; x < width; x += 2) {
      const idx = (cy * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      binary += gray < 128 ? "1" : "0";
    }
    const runs: number[] = [];
    let cur = binary[0], count = 0;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === cur) count++;
      else { runs.push(count); cur = binary[i]; count = 1; }
    }
    runs.push(count);

    if (runs.length >= 25) {
      const match = runs.join("").match(/(1\d{4,12})/);
      if (match && match[1].length >= 8) {
        return null;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 9. 공통 UI 컴포넌트
// ═══════════════════════════════════════════════════════════════
function Field({ label, error, children }: { label?: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <label style={{ display: "block", fontSize: 11, color: T.sub, marginBottom: 4, fontWeight: 700, letterSpacing: ".3px", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      {children}
      {error && <p style={{ color: T.red, fontSize: 12, marginTop: 4, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

function Input({ label, error, style: s, ...rest }: any) {
  return (
    <Field label={label} error={error}>
      <input style={{ ...INP, border: `1.5px solid ${error ? T.red : T.bdr}`, ...s }} {...rest} />
    </Field>
  );
}

function NumInput({ label, error, onChange, ...rest }: any) {
  const handle = useCallback((e: any) => {
    const clean = sanitizeNum(e.target.value);
    onChange?.({ ...e, target: { ...e.target, value: clean } });
  }, [onChange]);
  return (
    <Field label={label} error={error}>
      <input
        inputMode="decimal"
        style={{ ...INP, border: `1.5px solid ${error ? T.red : T.bdr}` }}
        onChange={handle}
        onKeyDown={(e) => {
          const ok = ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "."];
          if (!ok.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
        }}
        {...rest}
      />
    </Field>
  );
}

function Sel({ label, error, children, ...rest }: any) {
  return (
    <Field label={label} error={error}>
      <select style={{ ...INP, border: `1.5px solid ${error ? T.red : T.bdr}`, appearance: "none" }} {...rest}>
        {children}
      </select>
    </Field>
  );
}

const BV = Object.freeze({
  primary: { bg: T.text, fg: "#fff" },
  danger: { bg: T.red, fg: "#fff" },
  ghost: { bg: "#e2e8f0", fg: T.sub },
  success: { bg: T.green, fg: "#fff" },
  blue: { bg: T.blue, fg: "#fff" },
});

function Btn({ children, variant = "primary", full, size = "md", style: s, ...rest }: any) {
  const v = (BV as any)[variant] ?? BV.primary;
  const pad = size === "sm" ? "7px 12px" : size === "lg" ? "14px 18px" : "10px 16px";
  const reset = (e: any) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; };
  return (
    <button
      style={{
        border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700,
        padding: pad, fontSize: size === "sm" ? 13 : 14, width: full ? "100%" : undefined,
        minHeight: size === "sm" ? 36 : 44, background: v.bg, color: v.fg,
        touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none",
        transition: "opacity .1s, transform .1s", ...s
      }}
      onPointerDown={(e) => { e.currentTarget.style.opacity = ".75"; e.currentTarget.style.transform = "scale(.97)"; }}
      onPointerUp={reset} onPointerLeave={reset} onPointerCancel={reset}
      {...rest}>
      {children}
    </button>
  );
}

const Badge = memo(({ children, color = T.text }: { children: React.ReactNode; color?: string }) => (
  <span style={{ background: `${color}1a`, color, borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
    {children}
  </span>
));
Badge.displayName = "Badge";

function Card({ children, accent, style: s }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.sur, borderRadius: T.r, padding: "13px 15px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", borderLeft: accent ? `3.5px solid ${accent}` : undefined, ...s }}>
      {children}
    </div>
  );
}

const Divider = () => <div style={{ height: 1, background: T.bdr, margin: "8px 0" }} />;
const SLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{children}</p>
);

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const pOv = document.body.style.overflow, pTA = document.body.style.touchAction;
    document.body.style.overflow = "hidden"; document.body.style.touchAction = "none";
    return () => { document.body.style.overflow = pOv; document.body.style.touchAction = pTA; };
  }, []);
  const stop = useCallback((e: any) => e.stopPropagation(), []);
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.46)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, touchAction: "none" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        style={{
          background: T.sur, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520,
          maxHeight: "90dvh", overflowY: "auto", WebkitOverflowScrolling: "touch",
          paddingBottom: "env(safe-area-inset-bottom, 20px)", animation: "slideUp .22s ease"
        }}
        onPointerDown={stop}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 0" }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
          <Btn variant="ghost" size="sm" onPointerDown={onClose}>✕</Btn>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ msg, color = T.green }: { msg: string; color?: string }) {
  return (
    <div
      style={{
        position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", left: "50%", transform: "translateX(-50%)",
        background: color, color: "#fff", borderRadius: 99, padding: "10px 20px", fontSize: 13, fontWeight: 700, zIndex: 300,
        whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,.18)", animation: "fadeUp .2s ease", pointerEvents: "none"
      }}>
      {msg}
    </div>
  );
}

const Skel = memo(({ w = "100%", h = 14, r = 6, mb = 0 }: any) => (
  <div
    style={{
      width: w, height: h, borderRadius: r, marginBottom: mb,
      background: "linear-gradient(90deg,#e8eaed 25%,#f4f5f7 50%,#e8eaed 75%)",
      backgroundSize: "1200px 100%", animation: "shimmer 1.5s infinite linear"
    }}
  />
));
Skel.displayName = "Skel";

function SkelCard({ rows = 2 }: { rows?: number }) {
  return (
    <div style={{ background: T.sur, borderRadius: T.r, padding: "13px 15px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={i === 0 ? "55%" : "35%"} h={i === 0 ? 14 : 10} mb={i < rows - 1 ? 8 : 0} />
      ))}
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: any) {
  const pages = total > 0 ? Math.ceil(total / pageSize) : 0;
  if (pages <= 1) return null;
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 14, flexWrap: "wrap" }}>
      <Btn variant="ghost" size="sm" onPointerDown={() => onChange(Math.max(1, page - 1))} style={{ padding: "8px 13px" }}>‹</Btn>
      {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
        <Btn key={n} size="sm" variant={n === page ? "primary" : "ghost"} onPointerDown={() => onChange(n)} style={{ padding: "8px 12px", minWidth: 38 }}>
          {n}
        </Btn>
      ))}
      <Btn variant="ghost" size="sm" onPointerDown={() => onChange(Math.min(pages, page + 1))} style={{ padding: "8px 13px" }}>›</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 10. 바코드 & QR 코드 라벨 모달 컴포넌트
// ═══════════════════════════════════════════════════════════════
function LabelModal({ product, company, onClose }: { product: any; company: any; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="바코드 / QR 라벨 인쇄" onClose={onClose}>
      <div id="printable-label" ref={printRef} style={{ background: "#fff", border: `2px dashed ${T.bdr}`, borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: T.muted, fontWeight: 700 }}>{company.name}</p>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 900, color: T.text }}>{product.name}</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: T.sub }}>
          코드: <b>{product.code}</b> | 카테고리: {product.category} | 위치: {product.location || "미지정"}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "center", margin: "12px 0" }}>
          <div style={{ padding: 8, background: "#fff", border: `1px solid ${T.bdr}`, borderRadius: 8 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(product.code)}`}
              alt="QR Code"
              style={{ width: 100, height: 100, display: "block" }}
            />
            <span style={{ fontSize: 10, color: T.muted, marginTop: 4, display: "block" }}>2D QR Code</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ height: 50, display: "flex", alignItems: "center", gap: 2, padding: "4px 8px", background: "#fff", border: `1px solid ${T.bdr}`, borderRadius: 6 }}>
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2].map((w, idx) => (
                <div key={idx} style={{ width: w * 1.5, height: 40, background: idx % 2 === 0 ? "#000" : "transparent" }} />
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text, marginTop: 4 }}>{product.code}</span>
            <span style={{ fontSize: 10, color: T.muted }}>1D Barcode (Code128)</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" full onPointerDown={onClose}>닫기</Btn>
        <Btn variant="blue" full onPointerDown={handlePrint}>🖨️ 라벨 인쇄</Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// 11. 대시보드 뷰
// ═══════════════════════════════════════════════════════════════
const Dashboard = memo(function Dashboard({ products, history, company, isDriveConnected }: any) {
  const ready = useReady(SKEL_MS.DASH);
  const { low, recent } = useMemo(() => ({
    low: (products ?? []).filter((p: any) => (p.qty ?? 0) <= (p.minQty ?? 0)),
    recent: [...(history ?? [])].reverse().slice(0, 5),
  }), [products, history]);

  if (!ready) return <>{[3, 2, 4].map((r, i) => <SkelCard key={i} rows={r} />)}</>;
  return (
    <div style={{ display: "grid", gap: 12, animation: "fadeUp .25s ease" }}>
      <Card accent={T.indigo}>
        <div style={{ ...ROW, marginBottom: 6 }}>
          <div>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>원내 중앙 관리</span>
            <h2 style={{ fontSize: 17, fontWeight: 900, margin: "2px 0 0", color: T.text }}>{company?.name || "메디컬 재고센터"}</h2>
          </div>
          <Badge color={isDriveConnected ? T.green : T.orange}>
            {isDriveConnected ? "🟢 Google Drive DB 연동됨" : "🟡 로컬 저장 모드"}
          </Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bdr}` }}>
          {[
            [(products?.length ?? 0) + " 종", "전체 품목", T.blue],
            [low.length + " 종", "재고 부족", low.length ? T.red : T.muted],
            [(history?.length ?? 0) + " 건", "누적 이력", T.indigo],
          ].map(([val, lb, cl]) => (
            <div key={lb as string} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: cl as string }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{lb}</div>
            </div>
          ))}
        </div>
      </Card>

      {low.length > 0 && (
        <Card accent={T.red}>
          <SLabel>⚠ 재고 부족 및 보충 필요 알림 ({low.length}건)</SLabel>
          {low.map((p: any, i: number) => (
            <div key={p.id}>{i > 0 && <Divider />}
              <div style={ROW}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name ?? "-"}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.muted }}>위치: {p.location || "미지정"} | 코드: {p.code}</p>
                </div>
                <span style={{ fontSize: 12, color: T.red, fontWeight: 800 }}>
                  {p.qty} / {p.minQty} {p.unit ?? ""}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <SLabel>최근 입출고 이력</SLabel>
        {recent.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>기록된 이력이 없습니다.</p>
        ) : (
          recent.map((h: any, i: number) => (
            <div key={h.id}>{i > 0 && <Divider />}
              <div style={ROW}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{h.productName ?? "-"}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.muted }}>
                    {h.department || "원내"} · {h.by ?? ""} · {h.date ?? ""}
                  </p>
                </div>
                <Badge color={h.type === "입고" ? T.green : h.type === "출고" ? T.red : T.orange}>
                  {h.type} {h.qty}
                </Badge>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
});
Dashboard.displayName = "Dashboard";

// ═══════════════════════════════════════════════════════════════
// 12. 상품 및 재고 관리 뷰
// ═══════════════════════════════════════════════════════════════
function ProductModal({ initial, onSave, onClose, codes }: any) {
  const isEdit = !!(initial && Object.keys(initial).length > 0);
  const [f, setF] = useState(() => (isEdit ? { ...initial } : { ...BLANK_PRD }));
  const [err, setErr] = useState<any>({});
  const set = useCallback((k: string, v: any) => { setF((p: any) => ({ ...p, [k]: v })); setErr((p: any) => ({ ...p, [k]: "" })); }, []);

  const runV = useCallback(() => {
    const e: any = {};
    const ce = V.code(f.code ?? "");
    if (ce) e.code = ce;
    else if (!isEdit && (codes ?? []).includes((f.code ?? "").trim().toUpperCase())) e.code = "이미 존재하는 코드입니다.";
    const ne = V.pname(f.name); if (ne) e.name = ne;
    const qe = V.posInt(f.qty); if (qe) e.qty = qe;
    const me = V.posInt(f.minQty); if (me) e.minQty = me;
    const pe = V.posNum(f.price); if (pe) e.price = pe;
    if (!(f.unit ?? "").trim()) e.unit = "단위를 입력하세요.";
    return e;
  }, [f, isEdit, codes]);

  const rawSave = useCallback(() => {
    const e = runV(); if (Object.keys(e).length) { setErr(e); return; }
    const safeNum = (v: any, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
    };
    onSave({
      ...f,
      code: (f.code ?? "").trim().toUpperCase(),
      name: (f.name ?? "").trim(),
      unit: (f.unit ?? "").trim(),
      location: (f.location ?? "").trim(),
      qty: safeNum(f.qty),
      minQty: safeNum(f.minQty, 10),
      price: Number.isFinite(Number(f.price)) && Number(f.price) >= 0 ? Math.round(Number(f.price)) : 0,
    });
  }, [f, runV, onSave]);
  const save = useThrottle(rawSave, 600);

  return (
    <Modal title={isEdit ? "상품 정보 수정" : "신규 상품 등록"} onClose={onClose}>
      <Input label="상품/자산 코드" value={f.code ?? ""} onChange={(e: any) => set("code", e.target.value)} error={err.code} disabled={isEdit} placeholder="PRD-001" autoCapitalize="characters" />
      <Input label="상품명" value={f.name ?? ""} onChange={(e: any) => set("name", e.target.value)} error={err.name} placeholder="예: 멸균 주사기 5ml" />
      <Sel label="카테고리" value={f.category ?? CATS[0]} onChange={(e: any) => set("category", e.target.value)}>
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </Sel>
      <Input label="원내 보관 위치" value={f.location ?? ""} onChange={(e: any) => set("location", e.target.value)} placeholder="예: A-01-02 (선반위치)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <NumInput label="현재 수량" value={f.qty ?? 0} onChange={(e: any) => set("qty", e.target.value)} error={err.qty} />
        <NumInput label="최소수량(경고기준)" value={f.minQty ?? 10} onChange={(e: any) => set("minQty", e.target.value)} error={err.minQty} />
        <Input label="단위" value={f.unit ?? "개"} onChange={(e: any) => set("unit", e.target.value)} error={err.unit} placeholder="개, 박스, 팩" />
        <NumInput label="단가 (원)" value={f.price ?? 0} onChange={(e: any) => set("price", e.target.value)} error={err.price} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn variant="ghost" full onPointerDown={onClose}>취소</Btn>
        <Btn full onPointerDown={save}>{isEdit ? "수정 완료" : "등록"}</Btn>
      </div>
    </Modal>
  );
}

const PRow = memo(function PRow({ p, isAdmin, onEdit, onDelete, onShowLabel }: any) {
  const low = (p.qty ?? 0) <= (p.minQty ?? 0);
  return (
    <Card accent={low ? T.red : T.green} style={{ marginBottom: 8 }}>
      <div style={{ ...ROW, gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...ROW, marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{p.name ?? "-"}</span>
            <Badge color={low ? T.red : T.green}>{low ? "부족" : "정상"}</Badge>
          </div>
          <span style={{ fontSize: 11, color: T.muted }}>
            코드: <b>{p.code ?? ""}</b> · {p.category ?? ""} · 위치: {p.location || "미지정"}
          </span>
          <div style={{ marginTop: 4, fontSize: 12, color: T.sub }}>
            재고량: <b style={{ color: T.text, fontSize: 13 }}>{p.qty ?? 0} {p.unit ?? ""}</b>
            <span style={{ margin: "0 6px", color: T.bdr }}>|</span>
            {(p.price ?? 0).toLocaleString()}원
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <Btn variant="ghost" size="sm" onPointerDown={() => onShowLabel(p)}>🏷️ 라벨</Btn>
          {isAdmin && (
            <>
              <Btn variant="ghost" size="sm" onPointerDown={() => onEdit(p)}>수정</Btn>
              <Btn variant="danger" size="sm" onPointerDown={() => onDelete(p.id)}>삭제</Btn>
            </>
          )}
        </div>
      </div>
    </Card>
  );
});
PRow.displayName = "PRow";

const ProductsView = memo(function ProductsView({ products, company, dispatch, isAdmin, pageSize }: any) {
  const ready = useReady(SKEL_MS.PRODUCTS);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("전체");
  const [modal, setModal] = useState<any>(null);
  const [labelModal, setLabelModal] = useState<any>(null);
  const [delId, setDelId] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [, startTx] = useTransition();

  const codes = useMemo(() => (products ?? []).map((p: any) => p.code), [products]);
  const filtered = useMemo(() => (products ?? []).filter((p: any) =>
    (cat === "전체" || p.category === cat) &&
    ((p.name ?? "").includes(search) || (p.code ?? "").includes(search.toUpperCase()) || (p.location ?? "").includes(search))
  ), [products, search, cat]);
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const onSearch = useCallback((v: string) => { startTx(() => { setSearch(v); setPage(1); }); }, []);
  const onCat = useCallback((v: string) => { startTx(() => { setCat(v); setPage(1); }); }, []);

  const save = useCallback((data: any) => {
    dispatch({ type: modal?.id ? "UPDATE" : "ADD", payload: modal?.id ? { ...modal, ...data } : data });
    setModal(null);
  }, [modal, dispatch]);

  const rawDel = useCallback(() => { dispatch({ type: "DELETE", id: delId }); setDelId(null); }, [delId, dispatch]);
  const doDel = useThrottle(rawDel, 600);

  return (
    <div>
      <div style={{ ...ROW, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>원내 등록 상품{" "}
          <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>({filtered.length}개)</span>
        </span>
        {isAdmin && <Btn size="sm" onPointerDown={() => setModal({})}>+ 상품 등록</Btn>}
      </div>

      <div style={{ background: T.sur, borderRadius: T.r, padding: "11px 13px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="상품명, 코드, 위치 검색"
          style={{ ...INP, border: `1.5px solid ${T.bdr}`, marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
          {["전체", ...CATS].map((c) => (
            <button
              key={c}
              onPointerDown={() => onCat(c)}
              style={{
                border: "none", borderRadius: 99, padding: "6px 13px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", touchAction: "manipulation", minHeight: 34, whiteSpace: "nowrap",
                background: cat === c ? T.text : T.bg, color: cat === c ? "#fff" : T.sub
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        Array.from({ length: 4 }).map((_, i) => <SkelCard key={i} rows={3} />)
      ) : paged.length === 0 ? (
        <Card><p style={{ margin: 0, textAlign: "center", color: T.muted, fontSize: 13 }}>검색 결과가 없습니다.</p></Card>
      ) : (
        paged.map((p: any) => <PRow key={p.id} p={p} isAdmin={isAdmin} onEdit={setModal} onDelete={setDelId} onShowLabel={setLabelModal} />)
      )}

      <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />

      {modal !== null && <ProductModal initial={modal && Object.keys(modal).length > 0 ? modal : null} onSave={save} onClose={() => setModal(null)} codes={codes} />}
      {labelModal !== null && <LabelModal product={labelModal} company={company} onClose={() => setLabelModal(null)} />}
      {delId !== null && (
        <Modal title="상품 삭제 확인" onClose={() => setDelId(null)}>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 18 }}>이 상품을 삭제하시겠습니까? 관련 이력은 유지됩니다.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" full onPointerDown={() => setDelId(null)}>취소</Btn>
            <Btn variant="danger" full onPointerDown={doDel}>삭제</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
});
ProductsView.displayName = "ProductsView";

// ═══════════════════════════════════════════════════════════════
// 13. 바코드 & QR 코드 스캔 뷰
// ═══════════════════════════════════════════════════════════════
function getCamErr(err: any) {
  const n = err?.name ?? "";
  if (n === "NotAllowedError" || n === "PermissionDeniedError") return { msg: "카메라 접근 권한이 거부되었습니다.", guide: true };
  if (n === "NotFoundError" || n === "DevicesNotFoundError") return { msg: "사용 가능한 카메라 장치를 찾을 수 없습니다.", guide: false };
  if (n === "NotReadableError" || n === "TrackStartError") return { msg: "카메라가 다른 앱에서 사용 중입니다. 다른 앱을 닫고 다시 시도해 주세요.", guide: false };
  return { msg: "카메라를 시작할 수 없습니다. HTTPS 환경인지 확인하세요.", guide: false };
}

function PermGuide({ ios }: { ios: boolean }) {
  const steps = ios
    ? ["iPhone/iPad 설정 앱 열기", "Safari 또는 Chrome 선택", "카메라 항목 → '허용' 선택", "페이지 새로고침 후 다시 시도"]
    : ["Chrome 주소창 왼쪽 자물쇠(🔒) 아이콘 탭", "사이트 설정 → 카메라 → '허용' 선택", "페이지 새로고침 후 다시 시도"];
  return (
    <div style={{ background: "#fff8e1", border: "1.5px solid #ffc107", borderRadius: 10, padding: "13px 15px", marginBottom: 12 }}>
      <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 13, color: "#7c5700" }}>📵 모바일 카메라 권한 허용 안내</p>
      {steps.map((s, i) => <p key={i} style={{ margin: "0 0 4px", fontSize: 12, color: "#7c5700" }}>{i + 1}. {s}</p>)}
    </div>
  );
}

function ScanView({ products, company, prdDispatch, histDispatch, user }: any) {
  const device = useDeviceInfo();
  const [mode, setMode] = useState<any>(null);
  const [camState, setCamState] = useState("idle");
  const [errInfo, setErrInfo] = useState<any>(null);
  const [manCode, setManCode] = useState("");
  const [found, setFound] = useState<any>(null);
  const [qty, setQty] = useState("1");
  const [dept, setDept] = useState(() => user?.department || company?.departments?.[0] || "간호부");
  const [note, setNote] = useState("");
  const [qtyErr, setQtyErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null), streamRef = useRef<any>(null), rafRef = useRef<any>(null);
  const cvRef = useRef<HTMLCanvasElement>(null), jsqrRef = useRef<any>(null), toastTRef = useRef<any>(null);

  useEffect(() => { cvRef.current = document.createElement("canvas"); }, []);

  useEffect(() => {
    if ((window as any).jsQR) { jsqrRef.current = (window as any).jsQR; return; }
    if (document.getElementById(JSQR_ID)) return;
    const s = document.createElement("script");
    s.id = JSQR_ID; s.src = JSQR_SRC; s.crossOrigin = "anonymous";
    s.onload = () => { jsqrRef.current = (window as any).jsQR ?? null; };
    s.onerror = () => setErrInfo({ msg: "스캐너 디코더 라이브러리를 로드하지 못했습니다.", guide: false });
    document.head.appendChild(s);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t: any) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamState("idle");
  }, []);

  useEffect(() => () => {
    stopCamera();
    if (toastTRef.current) clearTimeout(toastTRef.current);
  }, [stopCamera]);

  const showToast = useCallback((msg: string, color?: string) => {
    if (toastTRef.current) clearTimeout(toastTRef.current);
    setToast({ msg, color });
    toastTRef.current = setTimeout(() => { setToast(null); toastTRef.current = null; }, TOAST_MS);
  }, []);

  const handleFound = useCallback((code: string) => {
    const upper = (code ?? "").trim().toUpperCase();
    if (!upper) return;
    const p = (products ?? []).find((x: any) => x.code === upper);
    if (p) { setFound(p); setQty("1"); setQtyErr(""); setErrInfo(null); }
    else setErrInfo({ msg: `"${upper}" 코드에 해당하는 원내 제품을 찾을 수 없습니다.`, guide: false });
  }, [products]);

  const startCamera = useCallback(async () => {
    if (!device.secure) { setErrInfo({ msg: "카메라 스캔은 HTTPS 환경에서 사용할 수 있습니다.", guide: false }); setCamState("error"); return; }
    if (!device.hasMedia) { setErrInfo({ msg: "이 브라우저는 카메라를 지원하지 않습니다.", guide: false }); setCamState("error"); return; }
    setCamState("requesting"); setErrInfo(null); setFound(null);

    const withTO = (p: Promise<any>) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new DOMException("Timeout", "AbortError")), 10000))]);
    const constraints = [
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: "environment" } }, { video: true },
    ];
    let stream: any = null, lastErr: any = null;
    for (const c of constraints) {
      try { stream = await withTO(navigator.mediaDevices.getUserMedia(c)); break; }
      catch (e: any) { lastErr = e; if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") break; }
    }
    if (!stream) { setErrInfo(getCamErr(lastErr)); setCamState("error"); return; }

    streamRef.current?.getTracks().forEach((t: any) => t.stop());
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.onloadedmetadata = async () => { try { await video.play(); } catch { } };
      try { await video.play(); } catch { }
    }
    setCamState("active");

    rafRef.current = -1;
    const tick = () => {
      if (rafRef.current === null) return;
      const v = videoRef.current, cv = cvRef.current;
      if (!v || !cv || v.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      if (cv.width !== v.videoWidth || cv.height !== v.videoHeight) { cv.width = v.videoWidth; cv.height = v.videoHeight; }
      if (cv.width === 0 || cv.height === 0) { rafRef.current = requestAnimationFrame(tick); return; }

      try {
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, cv.width, cv.height);

          if ((window as any).BarcodeDetector) {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "ean_13", "code_128", "code_39"] });
            detector.detect(v).then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0) {
                stopCamera();
                handleFound(barcodes[0].rawValue);
                return;
              }
            }).catch(() => { });
          }

          const qr = jsqrRef.current?.(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (qr?.data) { stopCamera(); handleFound(qr.data); return; }

          const code1D = decode1DBarcodePattern(img);
          if (code1D) { stopCamera(); handleFound(code1D); return; }
        }
      } catch { }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [device, stopCamera, handleFound]);

  const manSearch = useCallback(() => {
    const code = (manCode ?? "").trim().toUpperCase();
    if (!code) { setErrInfo({ msg: "상품 코드를 입력해 주세요.", guide: false }); return; }
    handleFound(code);
  }, [manCode, handleFound]);

  const openConfirm = useCallback(() => {
    if (!found) { setErrInfo({ msg: "상품 정보를 다시 확인해 주세요.", guide: false }); return; }
    const qe = V.posInt(qty); if (qe) { setQtyErr(qe); return; }
    const n = Number(qty);
    if (n === 0) { setQtyErr("1 이상의 수량을 입력해 주세요."); return; }
    if (mode === "out" && n > (found.qty ?? 0)) {
      setQtyErr(`현재 재고 수량(${found.qty}${found.unit ?? ""})을 초과할 수 없습니다.`); return;
    }
    setQtyErr(""); setConfirm(true);
  }, [qty, found, mode]);

  const rawCommit = useCallback((addMore: boolean) => {
    if (!found || !mode) return;
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n <= 0) return;
    prdDispatch({ type: "ADJ", id: found.id, delta: mode === "in" ? n : -n });
    histDispatch({
      type: "ADD",
      payload: {
        productCode: found.code,
        productName: found.name,
        type: mode === "in" ? "입고" : mode === "out" ? "출고" : "실사조정",
        qty: n,
        department: dept,
        by: user?.name ?? "담당자",
        date: today(),
        note: note.trim() || (mode === "in" ? "스캔 입고" : "스캔 출고"),
      }
    });
    setConfirm(false); setFound(null); setManCode(""); setErrInfo(null); setNote("");
    showToast(`${found.name} ${mode === "in" ? "입고" : "출고"} (${n}${found.unit}) 완료`, mode === "in" ? T.green : T.red);
    if (addMore) startCamera();
  }, [qty, found, mode, dept, note, prdDispatch, histDispatch, user, showToast, startCamera]);
  const commit = useThrottle(rawCommit, 800);

  const resetScan = useCallback(() => { setMode(null); stopCamera(); setFound(null); setErrInfo(null); setManCode(""); setQtyErr(""); }, [stopCamera]);

  if (!mode) return (
    <div>
      {toast && <Toast msg={toast.msg} color={toast.color} />}
      <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>바코드 & QR 스캔 처리</p>
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>입고 또는 출고 작업을 선택해 주세요.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["in", "📥", "입고 처리", T.green, "원내 중앙 입고 등록"],
          ["out", "📤", "출고 처리", T.red, "부서별 제품 출고"],
        ].map(([m, ic, lb, cl, desc]) => (
          <button
            key={m}
            onPointerDown={() => setMode(m)}
            style={{
              border: `1.5px solid ${cl}30`, borderRadius: 14, padding: "26px 12px",
              background: `${cl}0d`, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8, cursor: "pointer", touchAction: "manipulation", minHeight: 140
            }}>
            <span style={{ fontSize: 38 }}>{ic}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: cl }}>{lb}</span>
            <span style={{ fontSize: 11, color: T.muted }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {toast && <Toast msg={toast.msg} color={toast.color} />}
      <div style={{ ...ROW, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn variant="ghost" size="sm" onPointerDown={resetScan}>← 이전</Btn>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{mode === "in" ? "📥 모바일 입고" : "📤 모바일 출고"}</span>
        </div>
        <Badge color={mode === "in" ? T.green : T.red}>{mode === "in" ? "입고" : "출고"}</Badge>
      </div>

      {errInfo?.guide && <PermGuide ios={device.ios} />}
      {errInfo && !errInfo.guide && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffc107", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#7c5700", fontWeight: 600, marginBottom: 10 }}>
          ⚠ {errInfo.msg}
        </div>
      )}

      {!found && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ position: "relative", background: "#0d1117", borderRadius: 12, overflow: "hidden", marginBottom: 12, display: camState === "active" ? "block" : "none" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: 250, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 190, height: 190, border: "2.5px solid rgba(255,255,255,.85)", borderRadius: 16, boxShadow: "0 0 0 9999px rgba(0,0,0,.45)" }} />
            </div>
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#fff", background: "rgba(0,0,0,.6)", padding: "4px 12px", borderRadius: 99 }}>
                바코드 / QR 코드를 사각형 내에 맞춰주세요
              </span>
            </div>
          </div>

          {camState === "requesting" && (
            <div style={{ textAlign: "center", padding: "20px 0", color: T.muted, fontSize: 13 }}>
              📷 카메라 스캐너 초기화 중…
            </div>
          )}

          <Btn
            full
            size="lg"
            variant={camState === "active" ? "danger" : "primary"}
            onPointerDown={camState === "active" ? stopCamera : startCamera}
            style={{ opacity: camState === "requesting" ? .6 : 1, pointerEvents: camState === "requesting" ? "none" : "auto" }}>
            {camState === "active" ? "⏹ 스캐너 중지" : camState === "requesting" ? "권한 요청 중…" : "📷 실시간 카메라 스캔 시작"}
          </Btn>

          <div style={{ ...ROW, margin: "14px 0", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: T.bdr }} /><span style={{ fontSize: 11, color: T.muted }}>또는 직접 입력</span><div style={{ flex: 1, height: 1, background: T.bdr }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={manCode}
              onChange={(e) => { setManCode(e.target.value.toUpperCase()); setErrInfo(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") manSearch(); }}
              placeholder="예: PRD-001"
              autoCapitalize="characters"
              style={{ ...INP, flex: 1, border: `1.5px solid ${T.bdr}` }}
            />
            <Btn onPointerDown={manSearch}>검색</Btn>
          </div>
        </Card>
      )}

      {found && (
        <Card style={{ marginBottom: 12, animation: "fadeUp .2s ease" }}>
          <div style={{ background: mode === "in" ? `${T.green}0f` : `${T.red}0f`, borderRadius: 9, padding: "12px 14px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 3px", fontSize: 11, color: T.muted }}>코드: {found.code} · 위치: {found.location || "미지정"}</p>
            <p style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>{found.name}</p>
            <p style={{ margin: 0, fontSize: 13, color: T.sub }}>현재 원내 재고량: <b style={{ color: T.text, fontSize: 14 }}>{found.qty} {found.unit}</b></p>
          </div>

          <NumInput label="입출고 수량" value={qty} onChange={(e: any) => { setQty(e.target.value); setQtyErr(""); }} error={qtyErr} />

          <Sel label="담당 / 처리 부서" value={dept} onChange={(e: any) => setDept(e.target.value)}>
            {(company?.departments || DEPARTS).map((d: string) => <option key={d}>{d}</option>)}
          </Sel>

          <Input label="메모 / 사유 (선택)" value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="예: 정기 보충, 진료실 출고 등" />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn variant="ghost" full onPointerDown={() => { setFound(null); setManCode(""); setErrInfo(null); }}>← 재스캔</Btn>
            <Btn variant={mode === "in" ? "success" : "danger"} full size="lg" onPointerDown={openConfirm}>
              {mode === "in" ? "입고 완료" : "출고 완료"}
            </Btn>
          </div>
        </Card>
      )}

      {confirm && found && (
        <Modal title={mode === "in" ? "입고 최종 확인" : "출고 최종 확인"} onClose={() => setConfirm(false)}>
          <div style={{ background: T.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            {[
              ["품목명", found.name],
              ["자산코드", found.code],
              ["처리 부서", dept],
              ["입출고 수량", `${qty} ${found.unit}`],
              ["변경 후 예상 재고", `${(found.qty ?? 0) + (mode === "in" ? +qty : -qty)} ${found.unit}`],
              ["사유", note || "-"],
            ].map(([k, v], i) => (
              <div key={k} style={{ ...ROW, padding: "5px 0", borderTop: i ? `1px solid ${T.bdr}` : undefined }}>
                <span style={{ fontSize: 12, color: T.muted }}>{k}</span><b style={{ fontSize: 13 }}>{v}</b>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Btn variant={mode === "in" ? "success" : "danger"} full size="lg" onPointerDown={() => commit(false)}>✅ 확인 완료</Btn>
            <Btn variant="primary" full size="lg" onPointerDown={() => commit(true)}>📷 확인 후 계속 스캔</Btn>
            <Btn variant="ghost" full size="lg" onPointerDown={() => setConfirm(false)}>취소</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 14. 입출고 이력 및 엑셀/CSV 내보내기 뷰
// ═══════════════════════════════════════════════════════════════
const HistoryView = memo(function HistoryView({ history, pageSize }: any) {
  const ready = useReady(SKEL_MS.HISTORY);
  const [filter, setFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const [, startTx] = useTransition();

  const filtered = useMemo(() => {
    const base = Array.isArray(history) ? history : [];
    return filter === "전체" ? [...base].reverse() : [...base].reverse().filter((h) => h.type === filter);
  }, [history, filter]);

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "상품코드", "상품명", "구분", "수량", "담당부서", "처리자", "일시", "메모"];
    const rows = filtered.map((h: any) => [
      h.id, h.productCode, `"${h.productName}"`, h.type, h.qty, h.department || "원내", h.by, h.date, `"${h.note || ""}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inventory_history_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div>
      <div style={{ ...ROW, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>입출고 이력{" "}
          <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>({filtered.length}건)</span>
        </span>
        <Btn variant="ghost" size="sm" onPointerDown={exportCSV}>📥 CSV 내보내기</Btn>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {["전체", "입고", "출고", "실사조정"].map((t) => (
          <button
            key={t}
            onPointerDown={() => startTx(() => { setFilter(t); setPage(1); })}
            style={{
              border: "none", borderRadius: 99, padding: "6px 12px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", touchAction: "manipulation", minHeight: 34,
              background: filter === t ? T.text : T.bg, color: filter === t ? "#fff" : T.sub
            }}>
            {t}
          </button>
        ))}
      </div>

      {!ready ? (
        Array.from({ length: 5 }).map((_, i) => <SkelCard key={i} rows={2} />)
      ) : paged.length === 0 ? (
        <Card><p style={{ margin: 0, textAlign: "center", color: T.muted, fontSize: 13 }}>기록된 이력이 없습니다.</p></Card>
      ) : (
        paged.map((h: any) => (
          <Card key={h.id} style={{ marginBottom: 8 }}>
            <div style={ROW}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{h.productName ?? "-"}</span>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: T.muted }}>
                  {h.productCode ?? ""} · 부서: {h.department || "원내"} · 처리자: {h.by ?? ""} · {h.date ?? ""}
                </p>
                {h.note && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.sub }}>사유: {h.note}</p>}
              </div>
              <Badge color={h.type === "입고" ? T.green : h.type === "출고" ? T.red : T.orange}>
                {h.type} {h.qty}
              </Badge>
            </div>
          </Card>
        ))
      )}

      <Pagination page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
    </div>
  );
});
HistoryView.displayName = "HistoryView";

// ═══════════════════════════════════════════════════════════════
// 15. 직원 정보 관리 뷰 (Employee & Member Management)
// ═══════════════════════════════════════════════════════════════
function MemberModal({ initial, company, onSave, onClose }: any) {
  const isEdit = !!(initial && Object.keys(initial).length > 0);
  const [f, setF] = useState(() => (isEdit ? { ...initial } : {
    empNo: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    name: "", email: "", password: "", phone: "",
    department: company?.departments?.[0] || "간호부", position: "간호사", role: ROLE.USER, status: "재직"
  }));
  const [err, setErr] = useState<any>({});
  const set = useCallback((k: string, v: any) => { setF((p: any) => ({ ...p, [k]: v })); setErr((p: any) => ({ ...p, [k]: "" })); }, []);

  const save = useCallback(() => {
    const e: any = {};
    const ne = V.uname(f.name); if (ne) e.name = ne;
    const ee = V.email(f.email); if (ee) e.email = ee;
    if (!isEdit) {
      const pe = V.password(f.password); if (pe) e.password = pe;
    }
    if (Object.keys(e).length) { setErr(e); return; }
    onSave(f);
  }, [f, isEdit, onSave]);

  return (
    <Modal title={isEdit ? "직원 정보 수정" : "신규 직원 등록"} onClose={onClose}>
      <Input label="사원/직원 번호" value={f.empNo} onChange={(e: any) => set("empNo", e.target.value)} placeholder="EMP-001" />
      <Input label="성명" value={f.name} onChange={(e: any) => set("name", e.target.value)} error={err.name} placeholder="홍길동" />
      <Input label="이메일 주소" type="email" value={f.email} onChange={(e: any) => set("email", e.target.value)} error={err.email} placeholder="user@medical.co.kr" />
      {!isEdit && <Input label="비밀번호" type="password" value={f.password} onChange={(e: any) => set("password", e.target.value)} error={err.password} placeholder="영문+숫자 6자 이상" />}
      <Input label="연락처" value={f.phone} onChange={(e: any) => set("phone", e.target.value)} placeholder="010-0000-0000" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="소속 부서" value={f.department} onChange={(e: any) => set("department", e.target.value)}>
          {(company?.departments || DEPARTS).map((d: string) => <option key={d}>{d}</option>)}
        </Sel>
        <Sel label="직급/직책" value={f.position} onChange={(e: any) => set("position", e.target.value)}>
          {POSITIONS.map((p) => <option key={p}>{p}</option>)}
        </Sel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="시스템 권한" value={f.role} onChange={(e: any) => set("role", e.target.value)}>
          <option value={ROLE.USER}>일반 직원</option>
          <option value={ROLE.ADMIN}>관리자 (Full Access)</option>
        </Sel>
        <Sel label="재직 상태" value={f.status} onChange={(e: any) => set("status", e.target.value)}>
          <option value="재직">재직</option>
          <option value="휴직">휴직</option>
          <option value="퇴사">퇴사</option>
        </Sel>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn variant="ghost" full onPointerDown={onClose}>취소</Btn>
        <Btn full onPointerDown={save}>{isEdit ? "수정 완료" : "직원 등록"}</Btn>
      </div>
    </Modal>
  );
}

const MembersView = memo(function MembersView({ users, company, dispatch, currentUser, pageSize }: any) {
  const ready = useReady(SKEL_MS.MEMBERS);
  const [modal, setModal] = useState<any>(null);
  const [delId, setDelId] = useState<any>(null);
  const [page, setPage] = useState(1);
  const safe = Array.isArray(users) ? users : [];
  const adminCount = useMemo(() => safe.filter((u) => u.role === ROLE.ADMIN).length, [safe]);
  const paged = useMemo(() => safe.slice((page - 1) * pageSize, page * pageSize), [safe, page, pageSize]);

  const saveMember = useCallback((data: any) => {
    dispatch({ type: modal?.id ? "UPDATE" : "ADD", payload: modal?.id ? { ...modal, ...data } : data });
    setModal(null);
  }, [modal, dispatch]);

  const rawDel = useCallback(() => { dispatch({ type: "DELETE", id: delId }); setDelId(null); }, [delId, dispatch]);
  const doDel = useThrottle(rawDel, 600);

  return (
    <div>
      <div style={{ ...ROW, marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>원내 직원 관리{" "}
          <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>({safe.length}명)</span>
        </span>
        <Btn size="sm" onPointerDown={() => setModal({})}>+ 직원 추가</Btn>
      </div>

      {!ready ? (
        Array.from({ length: 3 }).map((_, i) => <SkelCard key={i} rows={2} />)
      ) : (
        paged.map((u: any) => {
          const isOnly = adminCount === 1 && u.role === ROLE.ADMIN;
          return (
            <Card key={u.id} style={{ marginBottom: 8 }}>
              <div style={{ ...ROW, gap: 8, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                    <b style={{ fontSize: 14 }}>{u.name ?? "-"}</b>
                    <span style={{ fontSize: 11, color: T.muted }}>({u.empNo || "사번미지정"})</span>
                    <Badge color={u.role === ROLE.ADMIN ? T.indigo : T.sub}>{u.role === ROLE.ADMIN ? "관리자" : "일반직원"}</Badge>
                    <Badge color={u.status === "재직" ? T.green : T.red}>{u.status || "재직"}</Badge>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: T.sub }}>
                    부서: <b>{u.department || "미정"}</b> | 직급: {u.position || "사원"} | 연락처: {u.phone || "-"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.muted }}>{u.email}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn variant="ghost" size="sm" onPointerDown={() => setModal(u)}>수정</Btn>
                  {u.id !== currentUser?.id && (
                    <Btn variant="danger" size="sm" onPointerDown={() => { if (!isOnly) setDelId(u.id); }} style={{ opacity: isOnly ? .45 : 1, pointerEvents: isOnly ? "none" : "auto" }}>
                      삭제
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}

      <Pagination page={page} total={safe.length} pageSize={pageSize} onChange={setPage} />

      {modal !== null && <MemberModal initial={modal && Object.keys(modal).length > 0 ? modal : null} company={company} onSave={saveMember} onClose={() => setModal(null)} />}
      {delId !== null && (
        <Modal title="직원 삭제 확인" onClose={() => setDelId(null)}>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 18 }}>해당 직원 계정을 삭제하시겠습니까?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" full onPointerDown={() => setDelId(null)}>취소</Btn>
            <Btn variant="danger" full onPointerDown={doDel}>삭제</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
});
MembersView.displayName = "MembersView";

// ═══════════════════════════════════════════════════════════════
// 16. 회사/원내 정보 관리 뷰 (Company Management)
// ═══════════════════════════════════════════════════════════════
function CompanyView({ company, setCompany, isAdmin }: { company: any; setCompany: any; isAdmin: any }) {
  const ready = useReady(SKEL_MS.COMPANY);
  const [f, setF] = useState({ ...company });
  const [toast, setToast] = useState(false);
  const [newDept, setNewDept] = useState("");

  const handleSave = () => {
    setCompany(f);
    setToast(true);
    setTimeout(() => setToast(false), TOAST_MS);
  };

  const addDept = () => {
    if (!newDept.trim()) return;
    if (f.departments.includes(newDept.trim())) return;
    setF((p: any) => ({ ...p, departments: [...p.departments, newDept.trim()] }));
    setNewDept("");
  };

  const removeDept = (d: string) => {
    setF((p: any) => ({ ...p, departments: p.departments.filter((item: string) => item !== d) }));
  };

  if (!ready) return <SkelCard rows={5} />;

  return (
    <div>
      {toast && <Toast msg="회사 / 원내 정보가 저장되었습니다." color={T.green} />}
      <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>회사 및 원내 프로필 설정</p>

      <Card style={{ marginBottom: 12 }}>
        <Input label="기관 / 회사명" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} disabled={!isAdmin} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="기관 코드" value={f.code} onChange={(e: any) => setF({ ...f, code: e.target.value })} disabled={!isAdmin} />
          <Input label="사업자 / 등록번호" value={f.bizNo} onChange={(e: any) => setF({ ...f, bizNo: e.target.value })} disabled={!isAdmin} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="대표자명" value={f.ceo} onChange={(e: any) => setF({ ...f, ceo: e.target.value })} disabled={!isAdmin} />
          <Input label="대표 전화" value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} disabled={!isAdmin} />
        </div>
        <Input label="주소" value={f.address} onChange={(e: any) => setF({ ...f, address: e.target.value })} disabled={!isAdmin} />
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <SLabel>원내 부서 목록 관리</SLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {f.departments.map((d: string) => (
            <span key={d} style={{ background: T.bg, border: `1px solid ${T.bdr}`, borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {d}
              {isAdmin && <b onPointerDown={() => removeDept(d)} style={{ cursor: "pointer", color: T.red }}>✕</b>}
            </span>
          ))}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="새 부서명 (예: 원무과)" style={{ ...INP, flex: 1, border: `1.5px solid ${T.bdr}` }} />
            <Btn onPointerDown={addDept}>+ 부서 추가</Btn>
          </div>
        )}
      </Card>

      {isAdmin && <Btn full size="lg" onPointerDown={handleSave}>💾 설정 변경사항 저장</Btn>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 17. 구글 드라이브 DB 연동 설정 뷰
// ═══════════════════════════════════════════════════════════════
function SettingsView({ pageSize, setPageSize, gasUrl, setGasUrl, onSyncFromDrive, onTestDriveConnection }: any) {
  const device = useDeviceInfo();
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<any>(null);

  const handleSaveUrl = async () => {
    const cleanUrl = urlInput.trim();
    setGasUrl(cleanUrl);
    ls.set(LS_GAS_URL, cleanUrl);
    setSyncing(true);
    const res = await onTestDriveConnection(cleanUrl);
    setSyncing(false);
    if (res.ok) {
      setToastMsg({ msg: "🟢 구글 드라이브 DB 연결 성공!", color: T.green });
      onSyncFromDrive(cleanUrl);
    } else {
      setToastMsg({ msg: "🔴 구글 앱스 스크립트 연결 실패. URL을 확인하세요.", color: T.red });
    }
  };

  return (
    <div>
      {toastMsg && <Toast msg={toastMsg.msg} color={toastMsg.color} />}
      <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>시스템 및 Google Drive DB 설정</p>

      {/* 구글 드라이브 DB 연동 설정 카보 */}
      <Card style={{ marginBottom: 12, borderLeft: `3.5px solid ${gasUrl ? T.green : T.orange}` }}>
        <div style={{ ...ROW, marginBottom: 6 }}>
          <SLabel>Google Drive / Sheets DB 연동</SLabel>
          <Badge color={gasUrl ? T.green : T.orange}>{gasUrl ? "🟢 연동됨" : "🟡 미연동 (Local Mode)"}</Badge>
        </div>
        <p style={{ fontSize: 12, color: T.sub, marginBottom: 12, lineHeight: 1.5 }}>
          Google 스프레드시트를 백엔드 데이터베이스로 연동하여 실시간 데이터 저장 및 조회를 이용합니다.
        </p>

        <Field label="Google Apps Script Web App URL">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            style={{ ...INP, border: `1.5px solid ${T.bdr}`, fontSize: 13 }}
          />
        </Field>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn variant="blue" full size="md" onPointerDown={handleSaveUrl} disabled={syncing}>
            {syncing ? "⏳ 구글 시트 연결 중…" : "🔗 연동 저장 & 시트 데이터 불러오기"}
          </Btn>
          <Btn variant="ghost" size="md" onPointerDown={() => setShowCodeModal(true)}>
            📜 GAS 가이드
          </Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <SLabel>페이지당 목록 표시 개수</SLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PAGE_OPTS.map((n: number) => (
            <button
              key={n}
              onPointerDown={() => setPageSize(n)}
              style={{
                border: `1.5px solid ${pageSize === n ? T.text : T.bdr}`, borderRadius: 10,
                padding: "12px 0", fontSize: 15, fontWeight: 800, cursor: "pointer", minHeight: 48,
                touchAction: "manipulation", background: pageSize === n ? T.text : T.sur, color: pageSize === n ? "#fff" : T.sub
              }}>
              {n}개씩 보기
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel>모바일 카메라 & 스캐너 가이드</SLabel>
        {device.ios ? (
          <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.8 }}>
            <b>iPhone / iPad 설정</b><br />
            설정 앱 → Safari (또는 Chrome) → 카메라 → '허용' 선택
          </p>
        ) : device.android ? (
          <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.8 }}>
            <b>Android 설정</b><br />
            Chrome 주소창 자물쇠 🔒 탭 → 사이트 설정 → 카메라 → '허용' 선택
          </p>
        ) : (
          <p style={{ fontSize: 12, color: T.sub, margin: 0, lineHeight: 1.8 }}>
            카메라 스캔은 <b>HTTPS 프로토콜</b> 및 브라우저 권한 허용이 필수적입니다.
          </p>
        )}
      </Card>

      {showCodeModal && (
        <Modal title="Google Apps Script (GAS) 연동 방법" onClose={() => setShowCodeModal(false)}>
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.7 }}>
            <p><b>1단계:</b> 구글 드라이브(drive.google.com)에서 새 <b>Google 스프레드시트</b>를 만듭니다.</p>
            <p><b>2단계:</b> 상단 메뉴 <b>[확장 프로그램] → [Apps Script]</b>를 선택합니다.</p>
            <p><b>3단계:</b> 프로젝트 내 `google_apps_script.gs` 파일의 전체 코드를 붙여넣습니다.</p>
            <p><b>4단계:</b> 우측 상단 <b>[배포] → [새 배포]</b> 선택:</p>
            <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
              <li>유형: <b>웹 앱 (Web App)</b></li>
              <li>액세스 권한: <b>모든 사용자 (Anyone)</b></li>
            </ul>
            <p><b>5단계:</b> 발급된 웹 앱 URL을 위 입력창에 붙여넣고 저장하세요!</p>
          </div>
          <Btn variant="primary" full size="lg" onPointerDown={() => setShowCodeModal(false)} style={{ marginTop: 14 }}>
            확인 완료
          </Btn>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 18. 로그인 / 회원가입 뷰
// ═══════════════════════════════════════════════════════════════
function AuthView({ users, userDispatch, onLogin, company }: { users: any; userDispatch: any; onLogin: any; company: any }) {
  const [tab, setTab] = useState("login");
  const [remember, setRemember] = useState(() => !!ls.get(LS_EMAIL));
  const [f, setF] = useState(() => ({ name: "", email: ls.get(LS_EMAIL), password: "", confirm: "" }));
  const [err, setErr] = useState<any>({});
  const [gErr, setGErr] = useState("");

  const set = useCallback((k: string, v: any) => { setF((p: any) => ({ ...p, [k]: v })); setErr((p: any) => ({ ...p, [k]: "" })); setGErr(""); }, []);

  const rawLogin = useCallback(() => {
    const e: any = {};
    const ee = V.email(f.email); if (ee) e.email = ee;
    if (!(f.password ?? "").trim()) e.password = "비밀번호를 입력해 주세요.";
    if (Object.keys(e).length) { setErr(e); return; }
    const u = (users ?? []).find((u: any) => u.email === (f.email ?? "").trim() && u.password === f.password);
    if (!u) { setGErr("이메일 또는 비밀번호가 올바르지 않습니다."); return; }
    if (remember) ls.set(LS_EMAIL, (f.email ?? "").trim()); else ls.del(LS_EMAIL);
    onLogin(u);
  }, [f, users, remember, onLogin]);
  const login = useThrottle(rawLogin, 800);

  const rawRegister = useCallback(() => {
    const e: any = {};
    const ne = V.uname(f.name); if (ne) e.name = ne;
    const ee = V.email(f.email); if (ee) e.email = ee;
    else if ((users ?? []).find((u: any) => u.email === (f.email ?? "").trim())) e.email = "이미 사용 중인 이메일입니다.";
    const pe = V.password(f.password); if (pe) e.password = pe;
    if (f.password !== f.confirm) e.confirm = "비밀번호가 일치하지 않습니다.";
    if (Object.keys(e).length) { setErr(e); return; }
    userDispatch({
      type: "ADD",
      payload: {
        empNo: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: (f.name ?? "").trim(),
        email: (f.email ?? "").trim(),
        password: f.password,
        role: ROLE.USER,
        status: "재직",
        department: "간호부",
        position: "사원",
      }
    });
    setTab("login"); setF((p: any) => ({ ...p, name: "", password: "", confirm: "" })); setErr({}); setGErr("");
  }, [f, users, userDispatch]);
  const register = useThrottle(rawRegister, 800);

  return (
    <div style={{ minHeight: "100vh", background: T.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44 }}>🏥</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 4px", color: "#fff" }}>{company?.name || "원내 모바일 재고관리"}</h1>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12, margin: 0 }}>Mobile Inventory & Barcode System</p>
        </div>

        <div style={{ background: T.sur, borderRadius: 18, padding: "22px 20px 24px" }}>
          <div style={{ display: "flex", background: T.bg, borderRadius: 10, padding: 3, marginBottom: 18 }}>
            {[["login", "로그인"], ["register", "직원 가입"]].map(([v, l]) => (
              <button
                key={v}
                onPointerDown={() => { setTab(v); setErr({}); setGErr(""); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800,
                  fontSize: 14, touchAction: "manipulation", minHeight: 40,
                  background: tab === v ? T.sur : "transparent", color: tab === v ? T.text : T.muted,
                  boxShadow: tab === v ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .18s"
                }}>
                {l}
              </button>
            ))}
          </div>

          {gErr && <div style={{ background: `${T.red}12`, border: `1px solid ${T.red}40`, borderRadius: 8, padding: "10px 13px", color: T.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{gErr}</div>}

          {tab === "login" ? (
            <>
              <Input label="이메일" type="email" value={f.email ?? ""} onChange={(e: any) => set("email", e.target.value)} error={err.email} placeholder="admin@company.com" />
              <Input label="비밀번호" type="password" value={f.password ?? ""} onChange={(e: any) => set("password", e.target.value)} onKeyDown={(e: any) => { if (e.key === "Enter") login(); }} error={err.password} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div
                  onPointerDown={() => setRemember((p) => !p)}
                  style={{
                    width: 18, height: 18, borderRadius: 4, cursor: "pointer",
                    border: `2px solid ${remember ? T.green : T.bdr}`, background: remember ? T.green : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                  {remember && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <span onPointerDown={() => setRemember((p) => !p)} style={{ fontSize: 12, color: T.sub, cursor: "pointer" }}>이메일 기억하기</span>
              </div>
              <Btn full size="lg" onPointerDown={login}>로그인</Btn>
              <p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 14, marginBottom: 0 }}>
                관리자: admin@company.com / admin1234
              </p>
            </>
          ) : (
            <>
              <Input label="이름" value={f.name ?? ""} onChange={(e: any) => set("name", e.target.value)} error={err.name} placeholder="홍길동" />
              <Input label="이메일" type="email" value={f.email ?? ""} onChange={(e: any) => set("email", e.target.value)} error={err.email} placeholder="user@company.com" />
              <Input label="비밀번호" type="password" value={f.password ?? ""} onChange={(e: any) => set("password", e.target.value)} error={err.password} placeholder="영문+숫자 6자 이상" />
              <Input label="비밀번호 확인" type="password" value={f.confirm ?? ""} onChange={(e: any) => set("confirm", e.target.value)} onKeyDown={(e: any) => { if (e.key === "Enter") register(); }} error={err.confirm} />
              <Btn full size="lg" onPointerDown={register}>직원 회원가입 신청</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 19. 메인 App 루트
// ═══════════════════════════════════════════════════════════════
const NAV_BASE = Object.freeze([
  { id: VIEW.DASH, l: "홈", ic: "⊞" },
  { id: VIEW.PRODUCTS, l: "재고", ic: "📦" },
  { id: VIEW.SCAN, l: "스캔", ic: "📷" },
  { id: VIEW.HISTORY, l: "이력", ic: "📋" },
]);

const NAV_ADMIN = Object.freeze([
  ...NAV_BASE,
  { id: VIEW.MEMBERS, l: "직원", ic: "👥" },
  { id: VIEW.COMPANY, l: "원내", ic: "🏥" },
  { id: VIEW.SETTINGS, l: "설정", ic: "⚙" },
]);

const NAV_USER = Object.freeze([
  ...NAV_BASE,
  { id: VIEW.SETTINGS, l: "설정", ic: "⚙" },
]);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(INIT_COMPANY);
  const [gasUrl, setGasUrl] = useState<string>(() => ls.get(LS_GAS_URL));
  const [view, setView] = useState<any>(VIEW.DASH);
  const [pageSize, setPageSize] = useState<number>(20);
  const [products, prdDispatch] = useReducer(prdReducer, INIT_PRODUCTS);
  const [users, usrDispatch] = useReducer(usrReducer, INIT_USERS);
  const [history, histDispatch] = useReducer(histReducer, INIT_HISTORY);
  const [, startTx] = useTransition();

  const isAdmin = user?.role === ROLE.ADMIN;
  const nav = isAdmin ? NAV_ADMIN : NAV_USER;

  // 구글 드라이브 DB 통신 헬퍼 함수
  const testDriveConn = useCallback(async (targetUrl: string) => {
    if (!targetUrl) return { ok: false };
    try {
      const res = await fetch(`${targetUrl}?action=ping`);
      const data = await res.json();
      return { ok: data.status === "success" };
    } catch (err) {
      return { ok: false };
    }
  }, []);

  const syncFromDrive = useCallback(async (targetUrl?: string) => {
    const url = targetUrl || gasUrl;
    if (!url) return;
    try {
      const res = await fetch(`${url}?action=readAll`);
      const data = await res.json();
      if (data.status === "success") {
        if (data.company) setCompany(data.company);
        if (data.products && data.products.length) prdDispatch({ type: "SET_ALL", payload: data.products });
        if (data.users && data.users.length) usrDispatch({ type: "SET_ALL", payload: data.users });
        if (data.history && data.history.length) histDispatch({ type: "SET_ALL", payload: data.history });
      }
    } catch (err) {
      console.warn("Google Drive DB fetch error:", err);
    }
  }, [gasUrl]);

  const pushToDrive = useCallback(async (payload: any) => {
    if (!gasUrl) return;
    try {
      await fetch(gasUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Google Drive DB push error:", err);
    }
  }, [gasUrl]);

  // 최초 로드 시 구글 드라이브 동기화
  useEffect(() => {
    if (gasUrl) syncFromDrive(gasUrl);
  }, []);

  // 상태 변경 시 구글 드라이브에 자동 푸시
  const wrappedPrdDispatch = useCallback((action: any) => {
    prdDispatch(action);
    setTimeout(() => {
      pushToDrive({ action: "saveAll", products, users, history, company });
    }, 300);
  }, [products, users, history, company, pushToDrive]);

  const wrappedHistDispatch = useCallback((action: any) => {
    histDispatch(action);
    setTimeout(() => {
      pushToDrive({ action: "saveAll", products, users, history, company });
    }, 300);
  }, [products, users, history, company, pushToDrive]);

  const logout = useCallback(() => { setUser(null); setView(VIEW.DASH); }, []);
  const goView = useCallback((v: string) => startTx(() => setView(v)), [startTx]);

  if (!user) return <AuthView users={users} userDispatch={usrDispatch} onLogin={setUser} company={company} />;

  if (!VALID_VIEWS.has(view)) {
    setView(VIEW.DASH as any);
  }

  const renderView = () => {
    switch (view) {
      case VIEW.DASH:
        return <Dashboard products={products} history={history} company={company} isDriveConnected={!!gasUrl} />;
      case VIEW.PRODUCTS:
        return <ProductsView products={products} company={company} dispatch={wrappedPrdDispatch} isAdmin={isAdmin} pageSize={pageSize} />;
      case VIEW.SCAN:
        return <ScanView products={products} company={company} prdDispatch={wrappedPrdDispatch} histDispatch={wrappedHistDispatch} user={user} />;
      case VIEW.HISTORY:
        return <HistoryView history={history} pageSize={pageSize} />;
      case VIEW.MEMBERS:
        return <MembersView users={users} company={company} dispatch={usrDispatch} currentUser={user} pageSize={pageSize} />;
      case VIEW.COMPANY:
        return <CompanyView company={company} setCompany={setCompany} isAdmin={isAdmin} />;
      case VIEW.SETTINGS:
        return (
          <SettingsView
            pageSize={pageSize}
            setPageSize={setPageSize}
            gasUrl={gasUrl}
            setGasUrl={setGasUrl}
            onSyncFromDrive={syncFromDrive}
            onTestDriveConnection={testDriveConn}
          />
        );
      default:
        return <Dashboard products={products} history={history} company={company} isDriveConnected={!!gasUrl} />;
    }
  };

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", color: T.text }}>
        <header
          style={{
            background: T.sur, padding: "12px 16px", display: "flex",
            justifyContent: "space-between", alignItems: "center",
            borderBottom: `1px solid ${T.bdr}`, position: "sticky", top: 0, zIndex: 100
          }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 15 }}>{company.name}</span>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
              {user.name} ({user.department || "원내"}) · {isAdmin ? "관리자" : "직원"}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onPointerDown={logout}>로그아웃</Btn>
        </header>

        <main style={{ flex: 1, padding: "14px 13px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}>
          {renderView()}
        </main>

        <nav
          style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 520, background: T.sur, borderTop: `1px solid ${T.bdr}`,
            display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)"
          }}>
          {nav.map((n) => {
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onPointerDown={() => goView(n.id)}
                style={{
                  flex: 1, padding: "8px 2px 5px", border: "none", background: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  touchAction: "manipulation", minHeight: 52
                }}>
                <span style={{ fontSize: nav.length > 5 ? 16 : 19, lineHeight: 1, opacity: active ? 1 : 0.5 }}>{n.ic}</span>
                <span style={{ fontSize: nav.length > 5 ? 9 : 10, fontWeight: active ? 800 : 500, color: active ? T.text : T.muted }}>{n.l}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: 99, background: T.text, marginTop: 1 }} />}
              </button>
            );
          })}
        </nav>
      </div>
    </ErrorBoundary>
  );
}
