import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// BLUE OCEAN CARE — COMMAND CENTER v4
// Role-based access · Per-home separation · ODDS compliant
// ============================================================

const SK = {
  HOMES: "boc4-homes", RES: "boc4-res", STAFF: "boc4-staff", APPTS: "boc4-appts",
  COMMS: "boc4-comms", INC: "boc4-inc", TASKS: "boc4-tasks", MEDS: "boc4-meds",
  MAR: "boc4-mar", GOALS: "boc4-goals", GOALDATA: "boc4-goaldata", NOTES: "boc4-notes",
  TLOG: "boc4-tlog", HEALTH: "boc4-health", FILES: "boc4-files", CONTACTS: "boc4-contacts",
  SETTINGS: "boc4-settings", USERS: "boc4-users", AUDIT: "boc4-audit",
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const td = () => new Date().toISOString().split("T")[0];
const now = () => new Date().toISOString();
const fmt = (d) => {
  if (!d) return "\u2014";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch (e) { return "\u2014"; }
};
const fmtS = (d) => {
  if (!d) return "\u2014";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch (e) { return "\u2014"; }
};
const du = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date(td())) / 864e5); };

function useS(k, fb) {
  const [d, setD] = useState(fb);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const r = await window.storage.get(k); if (!cancelled && r && r.value) setD(JSON.parse(r.value)); }
      catch (e) {}
      if (!cancelled) setOk(true);
    })();
    return () => { cancelled = true; };
  }, [k]);
  const save = useCallback(async (fn) => {
    const v = typeof fn === "function" ? fn(d) : fn;
    setD(v);
    try { await window.storage.set(k, JSON.stringify(v)); } catch (e) {}
    return v;
  }, [d, k]);
  return [d, save, ok];
}

// ============================================================
// ROLE DEFINITIONS — ODDS-Compliant Access Tiers
// OAR 411-323-0060: Confidentiality of Records
// OAR 411-325-0025: Program Management
// ============================================================
const ROLES = {
  owner: {
    label: "Owner / Executive Director", color: "#7c3aed",
    desc: "Full access to all homes, all modules, user management",
  },
  admin: {
    label: "Program Supervisor / Admin", color: "#0c5e6b",
    desc: "Full access to assigned homes, can manage staff access",
  },
  lead: {
    label: "Lead DSP / House Manager", color: "#0891b2",
    desc: "View and document for assigned homes, limited admin",
  },
  dsp: {
    label: "Direct Support Professional", color: "#059669",
    desc: "MAR, notes, T-Log, ISP data for assigned homes only",
  },
  nurse: {
    label: "Nursing", color: "#d97706",
    desc: "Health, MAR, medications — medical-focused access",
  },
  readonly: {
    label: "Read Only / Auditor", color: "#64748b",
    desc: "View-only access to assigned homes for oversight",
  },
};

// Module access matrix: true = full, "view" = read-only, false = hidden
const ACCESS = {
  //               owner  admin  lead   dsp    nurse  readonly
  dashboard:      [true,  true,  true,  true,  true,  true    ],
  shiftboard:     [true,  true,  true,  true,  true,  "view"  ],
  resident360:    [true,  true,  true,  true,  "view","view"  ],
  mar:            [true,  true,  true,  true,  true,  "view"  ],
  goals:          [true,  true,  true,  true,  false, "view"  ],
  notes:          [true,  true,  true,  true,  "view","view"  ],
  tlog:           [true,  true,  true,  true,  "view","view"  ],
  health:         [true,  true,  true,  false, true,  "view"  ],
  appointments:   [true,  true,  true,  "view",true,  "view"  ],
  incidents:      [true,  true,  true,  true,  "view","view"  ],
  staff:          [true,  true,  "view",false, false, false   ],
  comms:          [true,  true,  true,  false, "view","view"  ],
  tasks:          [true,  true,  true,  true,  true,  "view"  ],
  compliance:     [true,  true,  "view",false, false, "view"  ],
  users:          [true,  true,  false, false, false, false   ],
  homes:          [true,  true,  false, false, false, false   ],
  aiassist:       [true,  true,  true,  true,  true,  false   ],
  docingest:      [true,  true,  true,  false, false, false   ],
};
const ROLE_KEYS = Object.keys(ROLES);
const getAccess = (role, module) => {
  const idx = ROLE_KEYS.indexOf(role);
  if (idx === -1) return false;
  const row = ACCESS[module];
  if (!row) return false;
  return row[idx];
};

// Seed users — default admin account
const SEED_USERS = [
  { id: "u-owner", name: "Robera (Owner)", username: "admin", pin: "1234", role: "owner", homeIds: ["all"], status: "active", email: "", phone: "", createdAt: now(), lastLogin: null },
  { id: "u-demo-dsp", name: "Demo DSP Staff", username: "dsp", pin: "0000", role: "dsp", homeIds: ["h1"], status: "active", email: "", phone: "", createdAt: now(), lastLogin: null },
];
const SEED_HOMES = [
  { id: "h1", name: "Blue Ocean \u2014 Adult Home", type: "adult", address: "Beaverton, OR", capacity: 5, status: "active" },
  { id: "h2", name: "Blue Ocean \u2014 Children's Home", type: "children", address: "Beaverton, OR", capacity: 5, status: "active" },
];
const SEED_RES = [
  { id: "r1", homeId: "h1", name: "Resident A1", age: 28, status: "active", diagnosis: "I/DD", serviceLevel: "High", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
  { id: "r2", homeId: "h1", name: "Resident A2", age: 34, status: "active", diagnosis: "I/DD", serviceLevel: "Medium", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
  { id: "r3", homeId: "h1", name: "Resident A3", age: 22, status: "active", diagnosis: "I/DD", serviceLevel: "High", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
  { id: "r4", homeId: "h2", name: "Resident C1", age: 14, status: "active", diagnosis: "I/DD, behavioral", serviceLevel: "Very High", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
  { id: "r5", homeId: "h2", name: "Resident C2", age: 12, status: "active", diagnosis: "I/DD", serviceLevel: "High", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
  { id: "r6", homeId: "h2", name: "Resident C3", age: 16, status: "active", diagnosis: "I/DD, trauma", serviceLevel: "Very High", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "" },
];

// ============================================================
// ICON SYSTEM — Multi-path safe
// ============================================================
const Ico = ({ d, s = 16, c = "currentColor" }) => {
  const parts = (d || "").split(/(?=M)/).filter(Boolean);
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {parts.map((seg, i) => (<path key={i} d={seg.trim()} />))}
    </svg>
  );
};
const IC = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2",
  cal: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  msg: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  alert: "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  pill: "M19.5 12.572l-7.071 7.071a5 5 0 01-7.071-7.071l7.071-7.071a5 5 0 017.071 7.071z",
  check: "M20 6L9 17l-5-5", plus: "M12 5v14M5 12h14", x: "M18 6L6 18M6 6l12 12",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  note: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8",
  target: "M22 12A10 10 0 1112 2a10 10 0 0110 10zM16 12a4 4 0 11-8 0 4 4 0 018 0z",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  ai: "M12 2a10 10 0 100 20 10 10 0 000-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  switch: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
};

// ============================================================
// DESIGN SYSTEM
// ============================================================
const C = {
  bg: "#f5f7fa", card: "#fff", primary: "#0c5e6b", accent: "#0891b2",
  danger: "#dc2626", warn: "#d97706", success: "#059669", purple: "#7c3aed",
  text: "#0f172a", sub: "#64748b", muted: "#94a3b8", border: "#e2e8f0",
};
const Badge = ({ children, color = C.accent }) => (
  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: ".4px", color, background: color + "14", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);
const Btn = ({ children, onClick, v = "primary", sm, icon, disabled, style: sx }) => {
  const base = { display: "inline-flex", alignItems: "center", gap: 4, border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: sm ? 11 : 12, fontFamily: "inherit", opacity: disabled ? 0.5 : 1 };
  const vs = {
    primary: { ...base, background: C.primary, color: "#fff", padding: sm ? "5px 10px" : "8px 14px" },
    secondary: { ...base, background: C.primary + "10", color: C.primary, padding: sm ? "5px 10px" : "8px 14px" },
    ghost: { ...base, background: "transparent", color: C.sub, padding: sm ? "3px 6px" : "6px 10px" },
    danger: { ...base, background: "#fef2f2", color: C.danger, padding: sm ? "5px 10px" : "8px 14px" },
    accent: { ...base, background: C.accent, color: "#fff", padding: sm ? "5px 10px" : "8px 14px" },
    white: { ...base, background: "#fff", color: C.primary, padding: sm ? "5px 10px" : "8px 14px", border: "1.5px solid " + C.border },
  };
  return (<button onClick={disabled ? undefined : onClick} style={{ ...(vs[v] || vs.primary), ...sx }}>{icon && <Ico d={IC[icon] || ""} s={sm ? 11 : 13} />}{children}</button>);
};
const Inp = ({ label, style: sx, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase" }}>
    {label}<input {...p} style={{ padding: "7px 10px", border: "1.5px solid " + C.border, borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", ...sx }} />
  </label>
);
const Sel = ({ label, children, style: sx, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase" }}>
    {label}<select {...p} style={{ padding: "7px 10px", border: "1.5px solid " + C.border, borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", ...sx }}>{children}</select>
  </label>
);
const TA = ({ label, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase" }}>
    {label}<textarea {...p} rows={p.rows || 3} style={{ padding: "7px 10px", border: "1.5px solid " + C.border, borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", background: "#fff" }} />
  </label>
);
const Card = ({ children, style: sx, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, borderRadius: 11, border: "1px solid " + C.border, padding: 16, cursor: onClick ? "pointer" : "default", ...sx }}>{children}</div>
);
const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,15,25,.5)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 14, width: wide ? "min(900px,96vw)" : "min(560px,96vw)", maxHeight: "92vh", overflow: "auto", padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><Ico d={IC.x} s={16} c={C.muted} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Empty = ({ icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "32px 16px", color: C.muted }}>
    <Ico d={IC[icon] || ""} s={28} c={C.border} />
    <p style={{ margin: "8px 0 2px", fontWeight: 600, color: C.sub, fontSize: 13 }}>{title}</p>
    <p style={{ margin: 0, fontSize: 11 }}>{sub}</p>
  </div>
);
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 9, padding: 3, marginBottom: 14 }}>
    {tabs.map((t) => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11, fontFamily: "inherit", background: active === t.id ? "#fff" : "transparent", color: active === t.id ? C.text : C.sub, boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>{t.label}</button>
    ))}
  </div>
);

// ============================================================
// MAIN APP
// ============================================================
const App = () => {
  const [users, setUsers, uOk] = useS(SK.USERS, SEED_USERS);
  const [homes, setHomes, h1] = useS(SK.HOMES, SEED_HOMES);
  const [res, setRes, h2] = useS(SK.RES, SEED_RES);
  const [staff, setStaff, h3] = useS(SK.STAFF, []);
  const [appts, setAppts, h4] = useS(SK.APPTS, []);
  const [comms, setComms, h5] = useS(SK.COMMS, []);
  const [inc, setInc, h6] = useS(SK.INC, []);
  const [tasks, setTasks, h7] = useS(SK.TASKS, []);
  const [meds, setMeds, h8] = useS(SK.MEDS, []);
  const [mar, setMar, h9] = useS(SK.MAR, []);
  const [goals, setGoals, h10] = useS(SK.GOALS, []);
  const [goalData, setGoalData, h11] = useS(SK.GOALDATA, []);
  const [notes, setNotes, h12] = useS(SK.NOTES, []);
  const [tlog, setTlog, h13] = useS(SK.TLOG, []);
  const [health, setHealth, h14] = useS(SK.HEALTH, []);
  const [contacts, setContacts, h16] = useS(SK.CONTACTS, []);
  const [audit, setAudit, h17] = useS(SK.AUDIT, []);

  const [curUser, setCurUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [fh, setFh] = useState("all");
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [loginErr, setLoginErr] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const loaded = uOk && h1 && h2 && h3 && h4 && h5 && h6 && h7 && h8 && h9 && h10 && h11 && h12 && h13 && h14 && h16 && h17;

  // ============================================================
  // AUTH + ACCESS HELPERS
  // ============================================================
  const role = curUser ? curUser.role : null;
  const can = (mod) => {
    if (!role) return false;
    return getAccess(role, mod);
  };
  const canWrite = (mod) => {
    const a = can(mod);
    return a === true;
  };
  const canView = (mod) => {
    const a = can(mod);
    return a === true || a === "view";
  };
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  // Home filtering — staff only see assigned homes
  const userHomes = useMemo(() => {
    if (!curUser) return [];
    if (curUser.homeIds?.includes("all")) return homes;
    return homes.filter((h) => curUser.homeIds?.includes(h.id));
  }, [curUser, homes]);

  const fil = (a) => {
    if (!curUser) return [];
    const allowedHomeIds = userHomes.map((h) => h.id);
    let filtered = a.filter((x) => !x.homeId || allowedHomeIds.includes(x.homeId));
    if (fh !== "all") filtered = filtered.filter((x) => x.homeId === fh);
    return filtered;
  };
  const rn = (id) => res.find((r) => r.id === id)?.name || "";
  const hn = (id) => { const h = homes.find((x) => x.id === id); return h ? (h.name.split("\u2014")[1]?.trim() || h.name) : ""; };
  const activeRes = useMemo(() => fil(res).filter((r) => r.status === "active"), [res, fh, curUser, homes]);

  const logAction = (action, detail) => {
    if (!curUser) return;
    setAudit((p) => [...p, { id: uid(), userId: curUser.id, userName: curUser.name, action, detail, timestamp: now() }].slice(-500));
  };

  const doLogin = () => {
    const u = users.find((x) => x.username === loginUser && x.pin === loginPin && x.status === "active");
    if (!u) { setLoginErr("Invalid credentials or account inactive"); return; }
    setCurUser(u);
    setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, lastLogin: now() } : x)));
    setLoginErr("");
    setLoginUser("");
    setLoginPin("");
    const allowed = u.homeIds?.includes("all") ? homes : homes.filter((h) => u.homeIds?.includes(h.id));
    if (allowed.length === 1) setFh(allowed[0].id);
    else setFh("all");
  };

  const doLogout = () => {
    logAction("logout", "User logged out");
    setCurUser(null);
    setPage("dashboard");
    setFh("all");
  };

  // ============================================================
  // NAV — filtered by role access
  // ============================================================
  const allNav = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "shiftboard", label: "Shift Board", icon: "zap" },
    { id: "resident360", label: "Resident 360\u00B0", icon: "eye" },
    { id: "mar", label: "MAR", icon: "pill" },
    { id: "goals", label: "ISP Goals", icon: "target" },
    { id: "notes", label: "Progress Notes", icon: "note" },
    { id: "tlog", label: "T-Log / Shifts", icon: "msg" },
    { id: "health", label: "Health Tracking", icon: "heart" },
    { id: "appointments", label: "Appointments", icon: "cal" },
    { id: "incidents", label: "Incidents", icon: "alert" },
    { id: "staff", label: "Staff", icon: "star" },
    { id: "comms", label: "Communications", icon: "msg" },
    { id: "tasks", label: "Tasks", icon: "check" },
    { id: "compliance", label: "Compliance", icon: "shield" },
    { id: "aiassist", label: "AI Assistant", icon: "ai" },
    { id: "docingest", label: "Doc Intake", icon: "note" },
    { id: "homes", label: "Homes & Residents", icon: "home" },
    { id: "users", label: "User Management", icon: "lock" },
  ];
  const nav = allNav.filter((n) => canView(n.id));

  const ResSelector = ({ value, onChange, showAll }) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
      {showAll && <button onClick={() => onChange(null)} style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid " + (!value ? C.primary : C.border), background: !value ? C.primary + "12" : "transparent", color: !value ? C.primary : C.sub, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>All</button>}
      {activeRes.map((r) => (
        <button key={r.id} onClick={() => onChange(r.id)} style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid " + (value === r.id ? C.primary : C.border), background: value === r.id ? C.primary + "12" : "transparent", color: value === r.id ? C.primary : C.sub, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{r.name}</button>
      ))}
    </div>
  );

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  // LoginScreen is rendered inline (not as a sub-component) to prevent
  // input focus loss on re-render. See the return block below.

  // ============================================================
  // USER MANAGEMENT PAGE
  // ============================================================
  const UserMgmt = () => {
    const [uf, setUf] = useState({ name: "", username: "", pin: "", role: "dsp", homeIds: [], status: "active", email: "", phone: "" });

    const toggleHome = (hid) => {
      setUf((f) => {
        const cur = f.homeIds || [];
        if (hid === "all") return ({ ...f, homeIds: cur.includes("all") ? [] : ["all"] });
        const without = cur.filter((x) => x !== "all");
        return ({ ...f, homeIds: without.includes(hid) ? without.filter((x) => x !== hid) : [...without, hid] });
      });
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>User Management</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>OAR 411-323-0060: Manage access to confidential records</p>
          </div>
          <Btn icon="plus" onClick={() => { setUf({ name: "", username: "", pin: "", role: "dsp", homeIds: [], status: "active", email: "", phone: "" }); setEditItem(null); setModal("user-form"); }}>Add User</Btn>
        </div>

        {/* Role Overview */}
        <Card style={{ marginBottom: 14, padding: 12, background: C.primary + "06" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 6 }}>ROLE REFERENCE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(ROLES).map(([k, r]) => (
              <div key={k} style={{ padding: "4px 10px", borderRadius: 6, background: r.color + "10", border: "1px solid " + r.color + "20", fontSize: 10 }}>
                <span style={{ fontWeight: 700, color: r.color }}>{r.label}</span>
                <span style={{ color: C.sub, marginLeft: 4 }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* User List */}
        <div style={{ display: "grid", gap: 8 }}>
          {users.map((u) => {
            const r = ROLES[u.role] || {};
            const homeNames = u.homeIds?.includes("all") ? "All Homes" : (u.homeIds || []).map((h) => hn(h)).filter(Boolean).join(", ") || "None";
            return (
              <Card key={u.id} style={{ padding: 12, borderLeft: "3px solid " + (r.color || C.border) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{u.name}</span>
                      <Badge color={r.color}>{r.label}</Badge>
                      <Badge color={u.status === "active" ? C.success : C.danger}>{u.status}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      @{u.username} \u00B7 Homes: {homeNames}
                      {u.lastLogin ? " \u00B7 Last login: " + new Date(u.lastLogin).toLocaleDateString() : " \u00B7 Never logged in"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(u); setUf({ ...u }); setModal("user-form"); }} />
                    {u.id !== curUser?.id && (
                      <Btn sm v="ghost" icon="trash" onClick={() => {
                        if (u.role === "owner" && users.filter((x) => x.role === "owner" && x.status === "active").length <= 1) return;
                        setUsers((p) => p.filter((x) => x.id !== u.id));
                        logAction("delete_user", "Deleted " + u.name);
                      }} />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Audit Log */}
        {isOwnerOrAdmin && audit.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, color: C.text, marginBottom: 8 }}>Recent Activity Log</h3>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr style={{ background: C.primary, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Time</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>User</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Action</th>
                  <th style={{ padding: "6px 10px", textAlign: "left" }}>Detail</th>
                </tr></thead>
                <tbody>{audit.slice(-20).reverse().map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid " + C.border, background: i % 2 ? "#fafbfc" : "#fff" }}>
                    <td style={{ padding: "5px 10px", color: C.muted }}>{new Date(a.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "5px 10px", fontWeight: 600 }}>{a.userName}</td>
                    <td style={{ padding: "5px 10px" }}>{a.action}</td>
                    <td style={{ padding: "5px 10px", color: C.sub }}>{a.detail}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
        )}

        {/* User Form Modal */}
        <Modal open={modal === "user-form"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit User" : "Add User"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Full Name" value={uf.name} onChange={(e) => setUf((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            <Inp label="Username" value={uf.username} onChange={(e) => setUf((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} placeholder="jsmith" />
            <Inp label="PIN (4+ digits)" type="password" value={uf.pin} onChange={(e) => setUf((f) => ({ ...f, pin: e.target.value }))} placeholder="1234" maxLength={8} />
            <Sel label="Role" value={uf.role} onChange={(e) => setUf((f) => ({ ...f, role: e.target.value }))}>
              {Object.entries(ROLES).map(([k, r]) => (<option key={k} value={k}>{r.label}</option>))}
            </Sel>
            <Inp label="Email" value={uf.email} onChange={(e) => setUf((f) => ({ ...f, email: e.target.value }))} />
            <Inp label="Phone" value={uf.phone} onChange={(e) => setUf((f) => ({ ...f, phone: e.target.value }))} />
            <Sel label="Status" value={uf.status} onChange={(e) => setUf((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
            </Sel>
          </div>

          {/* Home Assignment */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 6 }}>Assigned Homes (OAR 411-323-0060 Confidentiality)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => toggleHome("all")} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + ((uf.homeIds || []).includes("all") ? C.purple : C.border), background: (uf.homeIds || []).includes("all") ? C.purple + "12" : "#fff", color: (uf.homeIds || []).includes("all") ? C.purple : C.sub, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>All Homes</button>
              {homes.map((h) => (
                <button key={h.id} onClick={() => toggleHome(h.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid " + ((uf.homeIds || []).includes(h.id) || (uf.homeIds || []).includes("all") ? C.accent : C.border), background: (uf.homeIds || []).includes(h.id) || (uf.homeIds || []).includes("all") ? C.accent + "12" : "#fff", color: (uf.homeIds || []).includes(h.id) || (uf.homeIds || []).includes("all") ? C.accent : C.sub, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{h.name}</button>
              ))}
            </div>
          </div>

          {/* Permission Preview */}
          <div style={{ marginTop: 14, padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 6 }}>Permission Preview for {ROLES[uf.role]?.label}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.keys(ACCESS).map((mod) => {
                const a = getAccess(uf.role, mod);
                return (
                  <span key={mod} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: a === true ? C.success + "14" : a === "view" ? C.warn + "14" : "#fee2e2", color: a === true ? C.success : a === "view" ? C.warn : C.danger }}>
                    {mod}: {a === true ? "Full" : a === "view" ? "View" : "None"}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <Btn onClick={() => {
              if (!uf.name || !uf.username || !uf.pin) return;
              if (editItem) {
                setUsers((p) => p.map((u) => (u.id === editItem.id ? { ...editItem, ...uf } : u)));
                logAction("edit_user", "Updated " + uf.name + " (" + uf.role + ")");
              } else {
                if (users.some((u) => u.username === uf.username)) { setLoginErr("Username taken"); return; }
                setUsers((p) => [...p, { ...uf, id: uid(), createdAt: now(), lastLogin: null }]);
                logAction("create_user", "Created " + uf.name + " (" + uf.role + ")");
              }
              setModal(null); setEditItem(null);
            }}>{editItem ? "Update User" : "Create User"}</Btn>
          </div>
        </Modal>
      </div>
    );
  };

  // ============================================================
  // SHIFT BOARD — The #1 screen DSPs open every shift
  // Shows exactly what needs to happen RIGHT NOW
  // ============================================================
  const ShiftBoard = () => {
    const hour = new Date().getHours();
    const curShift = hour >= 6 && hour < 14 ? "Day" : hour >= 14 && hour < 22 ? "Evening" : "Night";
    const shiftTimes = curShift === "Day" ? ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "12:00 PM", "1:00 PM"] : curShift === "Evening" ? ["2:00 PM", "5:00 PM", "6:00 PM", "8:00 PM", "9:00 PM"] : ["9:00 PM", "10:00 PM", "PRN"];
    const todayStr = td();
    const todayNum = new Date().getDate();

    // MAR status per resident
    const marStatus = activeRes.map((r) => {
      const rMeds = fil(meds).filter((m) => m.residentId === r.id && m.status !== "discontinued");
      const getMedTimes = (med) => {
        if (med.times && med.times.length > 0) return med.times;
        const f = med.frequency || "";
        if (f.includes("Bedtime")) return ["9:00 PM"];
        if (f.includes("Three") || f === "TID") return ["8:00 AM", "12:00 PM", "5:00 PM"];
        if (f.includes("Twice") || f === "BID") return ["8:00 AM", "8:00 PM"];
        if (f.includes("Four") || f === "QID") return ["8:00 AM", "12:00 PM", "5:00 PM", "9:00 PM"];
        if (f === "PRN" || f.includes("As Needed")) return ["PRN"];
        return ["8:00 AM"];
      };
      let shiftDue = 0;
      let shiftDone = 0;
      let shiftRefused = 0;
      let overdue = [];
      rMeds.forEach((med) => {
        const times = getMedTimes(med);
        times.forEach((t) => {
          if (shiftTimes.includes(t) || t === "PRN") {
            if (t === "PRN") return;
            shiftDue++;
            const entry = mar.find((m) => m.medId === med.id && m.timeSlot === t && m.date === todayStr && m.residentId === r.id);
            if (entry) {
              if (entry.status === "given") shiftDone++;
              else if (entry.status === "refused") shiftRefused++;
              else shiftDone++;
            } else {
              overdue.push({ med: med.name, time: t });
            }
          }
        });
      });
      return { ...r, shiftDue, shiftDone, shiftRefused, overdue, medCount: rMeds.length };
    });

    // Today's appointments
    const todayAppts = fil(appts).filter((a) => a.date === todayStr).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    // Open incidents
    const openInc = fil(inc).filter((x) => x.status === "open" || x.status === "investigating");

    // Goals needing data today
    const goalsNeedData = goals.filter((g) => {
      if (g.status !== "active") return false;
      const r = res.find((x) => x.id === g.residentId);
      if (!r || (fh !== "all" && r.homeId !== fh)) return false;
      const hasToday = goalData.some((d) => d.goalId === g.id && d.date === todayStr);
      return !hasToday && (g.frequency === "Daily" || g.frequency === "Per Shift");
    });

    // Tasks due today or overdue
    const dueTasks = fil(tasks).filter((t) => !t.done && t.due && t.due <= todayStr);

    // Recent T-Logs for handoff context
    const recentLogs = fil(tlog).filter((t) => t.shift === curShift || t.date === todayStr).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);

    const totalDue = marStatus.reduce((a, r) => a + r.shiftDue, 0);
    const totalDone = marStatus.reduce((a, r) => a + r.shiftDone, 0);
    const totalOverdue = marStatus.reduce((a, r) => a + r.overdue.length, 0);

    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: C.text }}>Shift Board</h2>
              <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 12 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} {"\u00B7"} <span style={{ fontWeight: 700, color: curShift === "Day" ? C.warn : curShift === "Evening" ? C.purple : C.accent }}>{curShift} Shift</span> {"\u00B7"} {curUser?.name}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {canWrite("tlog") && <Btn sm v="secondary" icon="msg" onClick={() => setPage("tlog")}>Write Handoff</Btn>}
              {canWrite("incidents") && <Btn sm v="danger" icon="alert" onClick={() => setPage("incidents")}>Report Incident</Btn>}
            </div>
          </div>
        </div>

        {/* Shift Scorecard */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
          {[
            { l: "Meds Due", v: totalDue, c: C.accent },
            { l: "Administered", v: totalDone, c: totalDone >= totalDue ? C.success : C.warn },
            { l: "Overdue", v: totalOverdue, c: totalOverdue > 0 ? C.danger : C.success },
            { l: "Appts Today", v: todayAppts.length, c: C.warn },
            { l: "Goals Need Data", v: goalsNeedData.length, c: goalsNeedData.length > 0 ? C.warn : C.success },
            { l: "Open Incidents", v: openInc.length, c: openInc.length > 0 ? C.danger : C.success },
          ].map((s, i) => (
            <Card key={i} style={{ padding: 10, borderLeft: "3px solid " + s.c }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{s.v}</div>
            </Card>
          ))}
        </div>

        {/* MAR Status Per Resident */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.pill} s={14} c={C.accent} /> Medication Passes This Shift</div>
          <div style={{ display: "grid", gap: 6 }}>
            {marStatus.filter((r) => r.medCount > 0).map((r) => {
              const pct = r.shiftDue > 0 ? Math.round((r.shiftDone / r.shiftDue) * 100) : 100;
              const allDone = r.shiftDue > 0 && r.shiftDone >= r.shiftDue;
              return (
                <Card key={r.id} style={{ padding: 10, background: allDone ? "#f0fdf4" : r.overdue.length > 0 ? "#fffbeb" : C.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.name}</span>
                        {allDone && <Badge color={C.success}>ALL DONE</Badge>}
                        {r.shiftRefused > 0 && <Badge color={C.danger}>{r.shiftRefused} REFUSED</Badge>}
                        {!allDone && r.overdue.length > 0 && <Badge color={C.warn}>{r.overdue.length} PENDING</Badge>}
                      </div>
                      {r.overdue.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {r.overdue.map((o, i) => (
                            <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: C.warn + "14", color: C.warn, fontWeight: 600 }}>{o.med} @ {o.time}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", minWidth: 70 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: allDone ? C.success : C.text }}>{r.shiftDone}/{r.shiftDue}</div>
                      <div style={{ height: 4, borderRadius: 99, background: C.border, marginTop: 3, width: 60 }}>
                        <div style={{ height: "100%", borderRadius: 99, background: allDone ? C.success : pct > 50 ? C.warn : C.danger, width: pct + "%", transition: "width .3s" }} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {marStatus.filter((r) => r.medCount > 0).length === 0 && <div style={{ fontSize: 12, color: C.muted, padding: 8 }}>No medications configured for current residents</div>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Today's Appointments */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.cal} s={14} c={C.warn} /> Today{"\u0027"}s Appointments</div>
            {todayAppts.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>No appointments today</div> :
              todayAppts.map((a) => (
                <div key={a.id} style={{ padding: "5px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{a.title}</span>
                    <span style={{ color: C.accent, fontWeight: 600 }}>{a.time || "TBD"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.sub }}>{rn(a.residentId)} {a.provider ? "\u00B7 " + a.provider : ""} {a.location ? "\u00B7 " + a.location : ""}</div>
                </div>
              ))
            }
          </Card>

          {/* ISP Goals Needing Data */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.target} s={14} c={C.accent} /> Goals {"\u2014"} Data Needed Today</div>
            {goalsNeedData.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>All goals have data for today</div> :
              goalsNeedData.slice(0, 6).map((g) => (
                <div key={g.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontWeight: 600 }}>{g.title}</span> <span style={{ color: C.sub, fontSize: 11 }}>{"\u00B7"} {rn(g.residentId)}</span></div>
                  {canWrite("goals") && <Btn sm v="secondary" onClick={() => setPage("goals")}>Record</Btn>}
                </div>
              ))
            }
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Open Incidents */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.alert} s={14} c={C.danger} /> Open Incidents</div>
            {openInc.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>No open incidents</div> :
              openInc.slice(0, 5).map((x) => (
                <div key={x.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}><Badge color={x.severity === "high" || x.severity === "critical" ? C.danger : C.warn}>{x.severity}</Badge><span style={{ fontWeight: 600 }}>{x.title}</span></div>
                  <div style={{ fontSize: 11, color: C.sub }}>{fmt(x.date)} {"\u00B7"} {rn(x.residentId)}</div>
                </div>
              ))
            }
          </Card>

          {/* Shift Handoff Notes */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.msg} s={14} c={C.purple} /> Shift Handoff Notes</div>
            {recentLogs.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>No handoff notes for this shift</div> :
              recentLogs.map((t) => (
                <div key={t.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>{t.author || "Staff"} {"\u00B7"} {t.shift}</span><span style={{ color: C.muted }}>{fmtS(t.date)}</span></div>
                  <div style={{ color: C.sub, marginTop: 2 }}>{(t.content || "").slice(0, 120)}{(t.content || "").length > 120 ? "..." : ""}</div>
                </div>
              ))
            }
          </Card>
        </div>

        {/* Tasks due */}
        {dueTasks.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Ico d={IC.check} s={14} c={C.warn} /> Tasks Due</div>
            <div style={{ display: "grid", gap: 4 }}>
              {dueTasks.slice(0, 6).map((t) => (
                <Card key={t.id} style={{ padding: 8, borderLeft: "3px solid " + (t.due < todayStr ? C.danger : C.warn) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <div><span style={{ fontWeight: 600 }}>{t.title}</span> {t.assignedTo && <span style={{ color: C.sub }}>{"\u00B7"} {t.assignedTo}</span>}</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {t.due < todayStr && <Badge color={C.danger}>OVERDUE</Badge>}
                      <span style={{ fontSize: 10, color: C.muted }}>{fmtS(t.due)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // DASHBOARD — role-aware
  // ============================================================
  const Dashboard = () => {
    const todayMarCount = mar.filter((m) => m.date === td() && m.status === "given").length;
    const totalMedsToday = activeRes.reduce((a, r) => a + fil(meds).filter((m) => m.residentId === r.id && m.status !== "discontinued").length, 0);
    const upcoming = fil(appts).filter((a) => a.date >= td() && a.status !== "completed").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const recentTlogs = fil(tlog).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4);

    return (
      <div>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: C.text }}>Welcome, {curUser?.name?.split(" ")[0]}</h2>
          <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 12 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" \u00B7 "}<Badge color={ROLES[role]?.color}>{ROLES[role]?.label}</Badge>
            {" \u00B7 "}{userHomes.length === homes.length ? "All Homes" : userHomes.map((h) => hn(h.id)).join(", ")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { l: "Residents", v: activeRes.length },
            canView("mar") && { l: "MAR Today", v: todayMarCount + "/" + totalMedsToday, c: todayMarCount < totalMedsToday ? C.warn : C.success },
            canView("goals") && { l: "Active Goals", v: goals.filter((g) => g.status === "active").length },
            canView("tasks") && { l: "Open Tasks", v: fil(tasks).filter((t) => !t.done).length },
            canView("incidents") && { l: "Open Incidents", v: fil(inc).filter((x) => x.status === "open").length, c: fil(inc).filter((x) => x.status === "open").length > 0 ? C.danger : C.success },
          ].filter(Boolean).map((s, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>{s.v}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 14, padding: 12, background: C.primary + "06" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginRight: 6 }}>QUICK ACTIONS</span>
            {canWrite("mar") && <Btn sm icon="pill" onClick={() => setPage("mar")}>Record MAR</Btn>}
            {canWrite("notes") && <Btn sm v="secondary" icon="note" onClick={() => setPage("notes")}>Write Note</Btn>}
            {canWrite("tlog") && <Btn sm v="secondary" icon="msg" onClick={() => setPage("tlog")}>Shift Log</Btn>}
            {canWrite("goals") && <Btn sm v="secondary" icon="target" onClick={() => setPage("goals")}>Track Goal</Btn>}
            {canWrite("health") && <Btn sm v="secondary" icon="heart" onClick={() => setPage("health")}>Log Vitals</Btn>}
            {canWrite("incidents") && <Btn sm v="secondary" icon="alert" onClick={() => setPage("incidents")}>Report Incident</Btn>}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {canView("appointments") && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 10 }}>Upcoming Appointments</div>
              {upcoming.length === 0 ? <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>None scheduled</div> :
                upcoming.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}>
                    <div><span style={{ fontWeight: 600 }}>{a.title}</span>{a.residentId && <span style={{ color: C.sub }}> \u2014 {rn(a.residentId)}</span>}</div>
                    <span style={{ color: C.muted, fontSize: 11 }}>{fmtS(a.date)}</span>
                  </div>
                ))
              }
            </Card>
          )}
          {canView("tlog") && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 10 }}>Recent Shift Logs</div>
              {recentTlogs.length === 0 ? <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>No shift logs yet</div> :
                recentTlogs.map((t) => (
                  <div key={t.id} style={{ padding: "5px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600 }}>{t.author || "Staff"} - {t.shift}</span>
                      <span style={{ color: C.muted, fontSize: 11 }}>{fmtS(t.date)}</span>
                    </div>
                    <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>{(t.content || "").slice(0, 100)}</div>
                  </div>
                ))
              }
            </Card>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // REUSABLE PAGE COMPONENTS (MAR, Goals, Notes, T-Log, Health, etc.)
  // All from v3 but with canWrite checks
  // ============================================================
  const MARPage = () => {
    const [marRes, setMarRes] = useState(activeRes[0]?.id || null);
    const [marMonth, setMarMonth] = useState(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); });
    const [marTab, setMarTab] = useState("administer");
    const [mf, setMf] = useState({ name: "", dosage: "", frequency: "Daily", route: "Oral", purpose: "", prescriber: "", pharmacy: "", times: ["8:00 AM"], startDate: td(), notes: "" });
    const [adminModal, setAdminModal] = useState(null); // {medId, timeSlot, date}
    const [adminInitials, setAdminInitials] = useState(curUser?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "");
    const [adminStatus, setAdminStatus] = useState("given");
    const [adminNote, setAdminNote] = useState("");

    const r = res.find((x) => x.id === marRes);
    const resMeds = fil(meds).filter((m) => m.residentId === marRes && m.status !== "discontinued");
    const [mYear, mMonth] = marMonth.split("-").map(Number);
    const daysInMonth = new Date(mYear, mMonth, 0).getDate();
    const monthLabel = new Date(mYear, mMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDateStr = (day) => marMonth + "-" + String(day).padStart(2, "0");
    const getEntry = (medId, timeSlot, day) => mar.find((m) => m.medId === medId && m.timeSlot === timeSlot && m.date === getDateStr(day) && m.residentId === marRes);
    const stColors = { given: "#059669", refused: "#dc2626", missed: "#d97706", held: "#6366f1" };

    const getMedTimes = (med) => {
      if (med.times && med.times.length > 0) return med.times;
      const f = med.frequency || "";
      if (f.includes("Bedtime")) return ["9:00 PM"];
      if (f.includes("Three") || f === "TID") return ["8:00 AM", "12:00 PM", "5:00 PM"];
      if (f.includes("Twice") || f === "BID") return ["8:00 AM", "8:00 PM"];
      if (f.includes("Four") || f === "QID") return ["8:00 AM", "12:00 PM", "5:00 PM", "9:00 PM"];
      if (f === "PRN" || f.includes("As Needed")) return ["PRN"];
      return ["8:00 AM"];
    };

    const openAdmin = (medId, timeSlot, day) => {
      if (!canWrite("mar")) return;
      const existing = getEntry(medId, timeSlot, day);
      setAdminInitials(curUser?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "");
      setAdminStatus(existing ? existing.status : "given");
      setAdminNote(existing ? (existing.notes || "") : "");
      setAdminModal({ medId, timeSlot, date: getDateStr(day), existing });
    };

    const saveAdmin = () => {
      if (!adminModal || !adminInitials) return;
      const { medId, timeSlot, date, existing } = adminModal;
      if (existing) {
        setMar((p) => p.map((m) => (m.id === existing.id ? { ...m, status: adminStatus, initials: adminInitials, notes: adminNote, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), recordedBy: curUser?.name } : m)));
      } else {
        setMar((p) => [...p, { id: uid(), date, residentId: marRes, medId, timeSlot, status: adminStatus, initials: adminInitials, notes: adminNote, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), recordedBy: curUser?.name }]);
      }
      setAdminModal(null);
    };

    // Collect unique initials for signature legend
    const monthMar = mar.filter((m) => m.residentId === marRes && m.date?.startsWith(marMonth));
    const sigMap = {};
    monthMar.forEach((m) => { if (m.initials && m.recordedBy) sigMap[m.initials] = m.recordedBy; });

    // Print function
    const doPrint = () => {
      const printDiv = document.getElementById("mar-print-area");
      if (!printDiv) return;
      const w = window.open("", "_blank");
      w.document.write("<html><head><title>MAR - " + (r?.name || "") + " - " + monthLabel + "</title>");
      w.document.write("<style>body{font-family:Arial,sans-serif;font-size:9px;margin:8px;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:2px 3px;text-align:center;min-width:18px}th{background:#e8e8e8;font-size:8px}.med-info{text-align:left;min-width:140px;font-size:8px;padding:3px 5px}.given{color:#059669;font-weight:700}.refused{color:#dc2626;font-weight:700;text-decoration:line-through}.missed{color:#d97706}.held{color:#6366f1}h2{font-size:14px;margin:4px 0}h3{font-size:11px;margin:8px 0 4px}.header{display:flex;justify-content:space-between;margin-bottom:8px;font-size:10px}.legend{margin-top:8px;font-size:9px}.sig-table td{text-align:left;padding:3px 8px}@media print{@page{size:landscape;margin:0.3in}}</style>");
      w.document.write("</head><body>");
      w.document.write(printDiv.innerHTML);
      w.document.write("</body></html>");
      w.document.close();
      w.print();
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>Medication Administration Record</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <Inp type="month" value={marMonth} onChange={(e) => setMarMonth(e.target.value)} style={{ width: 160 }} />
            {canWrite("mar") && <Btn icon="plus" sm onClick={() => { setMf({ name: "", dosage: "", frequency: "Daily", route: "Oral", purpose: "", prescriber: "", pharmacy: "", times: ["8:00 AM"], startDate: td(), notes: "" }); setEditItem(null); setModal("add-med"); }}>Add Medication</Btn>}
            <Btn sm v="secondary" onClick={doPrint} disabled={!marRes}>Print MAR</Btn>
          </div>
        </div>
        <ResSelector value={marRes} onChange={setMarRes} />

        {marRes && resMeds.length > 0 && (
          <TabBar tabs={[{ id: "administer", label: "Administer Today" }, { id: "monthly", label: "Monthly View" }, { id: "medications", label: "Medications (" + resMeds.length + ")" }]} active={marTab} onChange={setMarTab} />
        )}

        {!marRes ? (<Empty icon="pill" title="Select a resident" sub="Choose a resident to view their MAR" />) :
          resMeds.length === 0 ? (<Empty icon="pill" title="No medications" sub={canWrite("mar") ? "Add medications to start tracking" : "No medications configured"} />) : (
          <div>
            {/* ===== ADMINISTER TODAY TAB ===== */}
            {marTab === "administer" && (
              <div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Tap a medication pass to record administration for <b>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</b></div>
                {r?.allergies && <div style={{ padding: "6px 10px", background: "#fef2f2", borderRadius: 8, fontSize: 12, color: C.danger, fontWeight: 600, marginBottom: 10 }}>{"\u26A0"} Allergies: {r.allergies}</div>}
                <div style={{ display: "grid", gap: 8 }}>
                  {resMeds.map((med) => {
                    const times = getMedTimes(med);
                    return (
                      <Card key={med.id} style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{med.name} <span style={{ fontWeight: 400, color: C.sub }}>{med.dosage}</span></div>
                            <div style={{ fontSize: 11, color: C.muted }}>{med.route} {"\u00B7"} {med.frequency} {med.purpose ? "\u00B7 " + med.purpose : ""}</div>
                          </div>
                          {canWrite("mar") && <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(med); setMf({ ...med, times: med.times || getMedTimes(med) }); setModal("add-med"); }} />}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {times.map((t) => {
                            const todayNum = new Date().getDate();
                            const entry = getEntry(med.id, t, todayNum);
                            const st = entry?.status;
                            const bgColor = st === "given" ? "#ecfdf5" : st === "refused" ? "#fef2f2" : st === "missed" ? "#fffbeb" : st === "held" ? "#f0f0ff" : "#f8fafc";
                            const borderColor = st ? (stColors[st] || C.border) : C.border;
                            return (
                              <button key={t} onClick={() => openAdmin(med.id, t, todayNum)} style={{ flex: "1 1 120px", minWidth: 120, padding: "10px 12px", borderRadius: 10, border: "2px solid " + borderColor, background: bgColor, cursor: canWrite("mar") ? "pointer" : "default", fontFamily: "inherit", textAlign: "left" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{t}</div>
                                {st ? (
                                  <div>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: stColors[st] }}>{entry?.initials || "\u2713"}</span>
                                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>{st === "given" ? "Administered" : st === "refused" ? "Refused" : st === "missed" ? "Missed" : "Held"}</span>
                                    <div style={{ fontSize: 9, color: C.muted }}>{entry?.time} {"\u00B7"} {entry?.recordedBy}</div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 11, color: C.muted }}>{canWrite("mar") ? "Tap to administer" : "Pending"}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== MONTHLY VIEW TAB (Print-friendly grid) ===== */}
            {marTab === "monthly" && (
              <div>
                <div id="mar-print-area">
                  <h2 style={{ textAlign: "center", margin: "0 0 4px", fontSize: 16, color: C.text }}>MEDICATION ADMINISTRATION RECORD</h2>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6, padding: "0 4px" }}>
                    <div><b>Resident:</b> {r?.name} <b style={{ marginLeft: 12 }}>DOB:</b> {r?.age ? "Age " + r.age : "\u2014"}</div>
                    <div><b>Month:</b> {monthLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, marginBottom: 8, padding: "4px 8px", background: "#f8fafc", borderRadius: 6, flexWrap: "wrap" }}>
                    {r?.diagnosis && <span><b>Dx:</b> {r.diagnosis}</span>}
                    {r?.allergies && <span style={{ color: C.danger, fontWeight: 700 }}><b>ALLERGIES:</b> {r.allergies}</span>}
                    {r?.physician && <span><b>MD:</b> {r.physician}</span>}
                    {r?.pharmacy && <span><b>Pharmacy:</b> {r.pharmacy}</span>}
                  </div>

                  {/* Monthly grid per medication per time */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 10 }}>
                      <thead>
                        <tr style={{ background: C.primary, color: "#fff" }}>
                          <th style={{ padding: "5px 6px", textAlign: "left", minWidth: 150, border: "1px solid #094a54", fontSize: 9 }}>Medication / Time</th>
                          {days.map((d) => (<th key={d} style={{ padding: "4px 1px", border: "1px solid #094a54", minWidth: 24, fontSize: 9 }}>{d}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {resMeds.map((med, mi) => {
                          const times = getMedTimes(med);
                          return times.map((t, ti) => (
                            <tr key={med.id + t} style={{ background: mi % 2 === 0 ? "#fff" : "#fafbfc" }}>
                              <td style={{ padding: "3px 6px", border: "1px solid " + C.border, textAlign: "left", fontSize: 9, whiteSpace: "nowrap" }}>
                                {ti === 0 && <div style={{ fontWeight: 700 }}>{med.name} {med.dosage}</div>}
                                {ti === 0 && <div style={{ color: C.sub, fontSize: 8 }}>{med.route} {"\u00B7"} {med.frequency}</div>}
                                <div style={{ color: C.accent, fontWeight: 600, fontSize: 8 }}>{t}</div>
                              </td>
                              {days.map((d) => {
                                const entry = getEntry(med.id, t, d);
                                const st = entry?.status;
                                const cellBg = st === "refused" ? "#fef2f2" : st === "missed" ? "#fffbeb" : st === "held" ? "#f0f0ff" : "transparent";
                                const isToday = getDateStr(d) === td();
                                return (
                                  <td key={d} onClick={() => openAdmin(med.id, t, d)} style={{ padding: "2px 1px", border: "1px solid " + C.border, cursor: canWrite("mar") ? "pointer" : "default", background: cellBg, minWidth: 24, textAlign: "center", outline: isToday ? "2px solid " + C.accent : "none", fontWeight: 700, fontSize: 10, color: st ? (stColors[st] || C.text) : C.border, textDecoration: st === "refused" ? "line-through" : "none" }}>
                                    {st ? (entry?.initials || (st === "given" ? "\u2713" : st[0].toUpperCase())) : (getDateStr(d) < td() ? "\u00B7" : "")}
                                  </td>
                                );
                              })}
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend + Signature Block */}
                  <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Legend</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <span><span style={{ color: "#059669", fontWeight: 700 }}>AB</span> = Given</span>
                        <span><span style={{ color: "#dc2626", fontWeight: 700, textDecoration: "line-through" }}>AB</span> = Refused</span>
                        <span><span style={{ color: "#d97706", fontWeight: 700 }}>M</span> = Missed</span>
                        <span><span style={{ color: "#6366f1", fontWeight: 700 }}>H</span> = Held</span>
                        <span><span style={{ color: C.border }}>{"\u00B7"}</span> = No entry</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Signature Legend</div>
                      <table style={{ borderCollapse: "collapse", fontSize: 10 }}>
                        <thead><tr><th style={{ border: "1px solid " + C.border, padding: "2px 8px", textAlign: "left" }}>Initials</th><th style={{ border: "1px solid " + C.border, padding: "2px 8px", textAlign: "left" }}>Full Name</th></tr></thead>
                        <tbody>
                          {Object.entries(sigMap).map(([ini, name]) => (
                            <tr key={ini}><td style={{ border: "1px solid " + C.border, padding: "2px 8px", fontWeight: 700 }}>{ini}</td><td style={{ border: "1px solid " + C.border, padding: "2px 8px" }}>{name}</td></tr>
                          ))}
                          {Object.keys(sigMap).length === 0 && <tr><td colSpan={2} style={{ border: "1px solid " + C.border, padding: "2px 8px", color: C.muted }}>No entries this month</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== MEDICATIONS TAB ===== */}
            {marTab === "medications" && (
              <div style={{ display: "grid", gap: 8 }}>
                {resMeds.map((med) => (
                  <Card key={med.id} style={{ padding: 14, borderLeft: "3px solid " + C.accent }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{med.name} <span style={{ fontWeight: 400, color: C.sub, fontSize: 12 }}>{med.dosage}</span></div>
                        <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{med.route} {"\u00B7"} {med.frequency} {"\u00B7"} {(med.times || getMedTimes(med)).join(", ")}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {med.purpose && <span>Purpose: {med.purpose} {"\u00B7"} </span>}
                          {med.prescriber && <span>Prescriber: {med.prescriber} {"\u00B7"} </span>}
                          {med.pharmacy && <span>Pharmacy: {med.pharmacy}</span>}
                        </div>
                      </div>
                      {canWrite("mar") && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(med); setMf({ ...med, times: med.times || getMedTimes(med) }); setModal("add-med"); }} />
                          <Btn sm v="danger" onClick={() => { setMeds((p) => p.map((m) => (m.id === med.id ? { ...m, status: "discontinued" } : m))); logAction("discontinue_med", med.name); }}>Discontinue</Btn>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Administration Modal */}
        <Modal open={!!adminModal} onClose={() => setAdminModal(null)} title="Record Administration">
          {adminModal && (() => {
            const med = meds.find((m) => m.id === adminModal.medId);
            return (
              <div>
                <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 14, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{med?.name} {med?.dosage}</div>
                  <div style={{ color: C.sub }}>{med?.route} {"\u00B7"} Scheduled: {adminModal.timeSlot} {"\u00B7"} Date: {fmt(adminModal.date)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <Inp label="Your Initials" value={adminInitials} onChange={(e) => setAdminInitials(e.target.value.toUpperCase())} maxLength={4} placeholder="AB" style={{ fontSize: 20, textAlign: "center", fontWeight: 700, letterSpacing: 2 }} />
                  <Sel label="Status" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                    <option value="given">{"\u2705"} Given / Administered</option>
                    <option value="refused">{"\u274C"} Refused by Resident</option>
                    <option value="missed">{"\u26A0"} Missed</option>
                    <option value="held">{"\u23F8"} Held (by order)</option>
                  </Sel>
                </div>
                {(adminStatus === "refused" || adminStatus === "missed" || adminStatus === "held") && (
                  <TA label={"Reason for " + adminStatus} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="Document reason..." />
                )}
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <Btn onClick={saveAdmin} disabled={!adminInitials} style={{ flex: 1, justifyContent: "center" }}>
                    {adminStatus === "given" ? "Confirm Administration" : "Record " + adminStatus.charAt(0).toUpperCase() + adminStatus.slice(1)}
                  </Btn>
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* Add/Edit Medication Modal */}
        <Modal open={modal === "add-med"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Medication" : "Add Medication"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Inp label="Medication Name" value={mf.name} onChange={(e) => setMf((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Risperidone" />
            <Inp label="Dosage" value={mf.dosage} onChange={(e) => setMf((f) => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 2mg" />
            <Sel label="Route" value={mf.route} onChange={(e) => setMf((f) => ({ ...f, route: e.target.value }))}><option>Oral</option><option>Topical</option><option>Injection</option><option>Inhaled</option><option>Sublingual</option><option>Rectal</option></Sel>
            <Sel label="Frequency" value={mf.frequency} onChange={(e) => setMf((f) => ({ ...f, frequency: e.target.value }))}><option>Daily</option><option>Twice Daily</option><option>Three Times Daily</option><option>Four Times Daily</option><option>Bedtime</option><option>PRN (As Needed)</option><option>Weekly</option></Sel>
            <Inp label="Purpose" value={mf.purpose} onChange={(e) => setMf((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Mood stabilization" />
            <Inp label="Prescriber" value={mf.prescriber} onChange={(e) => setMf((f) => ({ ...f, prescriber: e.target.value }))} />
            <Inp label="Pharmacy" value={mf.pharmacy} onChange={(e) => setMf((f) => ({ ...f, pharmacy: e.target.value }))} />
            <Inp label="Start Date" type="date" value={mf.startDate} onChange={(e) => setMf((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 6 }}>Scheduled Times</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {(mf.times || []).map((t, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: C.accent + "12", borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.accent }}>
                  {t}
                  <button onClick={() => setMf((f) => ({ ...f, times: f.times.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, padding: 0 }}>{"\u00D7"}</button>
                </span>
              ))}
              <select onChange={(e) => { if (e.target.value) { setMf((f) => ({ ...f, times: [...(f.times || []), e.target.value] })); e.target.value = ""; } }} style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid " + C.border, fontSize: 11, fontFamily: "inherit", color: C.sub }}>
                <option value="">+ Add time</option>
                {["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "5:00 PM", "6:00 PM", "8:00 PM", "9:00 PM", "PRN"].map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
          </div>
          <TA label="Notes / Special Instructions" value={mf.notes} onChange={(e) => setMf((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <div style={{ marginTop: 14 }}><Btn onClick={() => {
            if (!mf.name) return;
            if (editItem) { setMeds((p) => p.map((m) => (m.id === editItem.id ? { ...editItem, ...mf } : m))); logAction("edit_med", mf.name); }
            else { setMeds((p) => [...p, { ...mf, id: uid(), residentId: marRes, homeId: res.find((x) => x.id === marRes)?.homeId || "", status: "active" }]); logAction("add_med", mf.name + " for " + rn(marRes)); }
            setModal(null); setEditItem(null); setMf({ name: "", dosage: "", frequency: "Daily", route: "Oral", purpose: "", prescriber: "", pharmacy: "", times: ["8:00 AM"], startDate: td(), notes: "" });
          }}>{editItem ? "Update Medication" : "Add Medication"}</Btn></div>
        </Modal>
      </div>
    );
  };

  const GoalsPage = () => {
    const [gRes, setGRes] = useState(activeRes[0]?.id || null);
    const [gf, setGf] = useState({ title: "", area: "", objective: "", baseline: "", target: "", method: "", frequency: "Daily", status: "active", startDate: td(), notes: "" });
    const resGoals = goals.filter((g) => g.residentId === gRes);
    const areas = ["Independence/ADLs", "Communication", "Social Skills", "Community", "Behavioral", "Health/Safety", "Employment", "Education"];

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>ISP Goal Tracking</h2>
          {canWrite("goals") && <Btn icon="plus" onClick={() => { setGf({ title: "", area: "", objective: "", baseline: "", target: "", method: "", frequency: "Daily", status: "active", startDate: td(), notes: "" }); setEditItem(null); setModal("add-goal"); }}>Add Goal</Btn>}
        </div>
        <ResSelector value={gRes} onChange={setGRes} />
        {!gRes ? (<Empty icon="target" title="Select a resident" sub="Choose a resident to track ISP goals" />) :
          resGoals.length === 0 ? (<Empty icon="target" title="No goals set" sub={canWrite("goals") ? "Add ISP goals to start tracking" : "No goals have been set"} />) : (
            <div style={{ display: "grid", gap: 12 }}>
              {resGoals.map((g) => {
                const data = goalData.filter((d) => d.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date));
                const latest = data[data.length - 1];
                const progress = g.target && latest ? Math.min(100, Math.round((latest.value / Number(g.target)) * 100)) : 0;
                return (
                  <Card key={g.id} style={{ borderLeft: "3px solid " + (g.status === "active" ? C.accent : C.muted) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{g.title}</span>
                          <Badge color={C.accent}>{g.area}</Badge><Badge color={g.status === "active" ? C.success : C.muted}>{g.status}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: C.sub }}>{g.objective}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Baseline: {g.baseline || "\u2014"} | Target: {g.target || "\u2014"} | Method: {g.method || "\u2014"}</div>
                      </div>
                      {canWrite("goals") && <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(g); setGf({ ...g }); setModal("add-goal"); }} />}
                    </div>
                    {g.target && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: C.sub, marginBottom: 3 }}><span>Progress</span><span>{progress}%</span></div>
                        <div style={{ height: 8, borderRadius: 99, background: C.border }}><div style={{ height: "100%", borderRadius: 99, background: progress >= 80 ? C.success : progress >= 50 ? C.warn : C.accent, width: progress + "%", transition: "width .3s" }} /></div>
                      </div>
                    )}
                    {data.length > 0 && (
                      <div style={{ display: "flex", gap: 3, alignItems: "end", height: 36, marginBottom: 6 }}>
                        {data.slice(-14).map((dp, i) => { const max = Math.max(...data.slice(-14).map((x) => x.value), 1); return (<div key={i} title={dp.date + ": " + dp.value} style={{ flex: 1, maxWidth: 18, height: Math.max(4, (dp.value / max) * 32), borderRadius: 3, background: C.accent + "60" }} />); })}
                      </div>
                    )}
                    {canWrite("goals") && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 8px", background: "#f8fafc", borderRadius: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.sub }}>Record:</span>
                        {["0", "1", "2", "3", "4", "5"].map((v) => (
                          <button key={v} onClick={() => setGoalData((p) => [...p, { id: uid(), goalId: g.id, residentId: gRes, date: td(), value: Number(v), note: "", recordedBy: curUser?.name }])} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid " + C.border, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12, color: C.text, fontFamily: "inherit" }}>{v}</button>
                        ))}
                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>{data.length} pts</span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        }
        <Modal open={modal === "add-goal"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Goal" : "Add ISP Goal"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Goal Title" value={gf.title} onChange={(e) => setGf((f) => ({ ...f, title: e.target.value }))} />
            <Sel label="Area" value={gf.area} onChange={(e) => setGf((f) => ({ ...f, area: e.target.value }))}><option value="">---</option>{areas.map((a) => (<option key={a}>{a}</option>))}</Sel>
            <div style={{ gridColumn: "1/-1" }}><TA label="Objective" value={gf.objective} onChange={(e) => setGf((f) => ({ ...f, objective: e.target.value }))} rows={2} /></div>
            <Inp label="Baseline" value={gf.baseline} onChange={(e) => setGf((f) => ({ ...f, baseline: e.target.value }))} />
            <Inp label="Target" value={gf.target} onChange={(e) => setGf((f) => ({ ...f, target: e.target.value }))} />
            <Inp label="Method" value={gf.method} onChange={(e) => setGf((f) => ({ ...f, method: e.target.value }))} />
            <Sel label="Frequency" value={gf.frequency} onChange={(e) => setGf((f) => ({ ...f, frequency: e.target.value }))}><option>Daily</option><option>Weekly</option><option>Per Shift</option><option>Per Occurrence</option></Sel>
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={() => {
            if (!gf.title) return;
            if (editItem) setGoals((p) => p.map((g) => (g.id === editItem.id ? { ...editItem, ...gf } : g)));
            else setGoals((p) => [...p, { ...gf, id: uid(), residentId: gRes, homeId: res.find((r) => r.id === gRes)?.homeId || "" }]);
            setModal(null); setEditItem(null);
          }}>{editItem ? "Update" : "Add Goal"}</Btn></div>
        </Modal>
      </div>
    );
  };

  const NotesPage = () => {
    const [nRes, setNRes] = useState(null);
    const [nf, setNf] = useState({ residentId: "", date: td(), shift: "Day", author: curUser?.name || "", content: "", mood: "", participation: "" });
    const [aiLoading, setAiLoading] = useState(false);
    const list = (nRes ? notes.filter((n) => n.residentId === nRes) : fil(notes)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const aiFormat = async () => {
      if (!nf.content) return;
      setAiLoading(true);
      try {
        const r = res.find((x) => x.id === nf.residentId);
        const rGoals = goals.filter((g) => g.residentId === nf.residentId && g.status === "active");
        const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
            system: "Write ODHS-ODDS compliant progress notes for a 24-hour residential group home in Oregon. Professional, person-centered, factual.",
            messages: [{ role: "user", content: "Format into progress note:\nResident: " + (r?.name || "Unknown") + "\nDiagnosis: " + (r?.diagnosis || "I/DD") + "\nGoals: " + (rGoals.map((g) => g.title).join(", ") || "N/A") + "\nDate: " + nf.date + " Shift: " + nf.shift + "\nMood: " + nf.mood + " Participation: " + nf.participation + "\n\nObservations:\n" + nf.content }] }) });
        const data = await resp.json();
        const text = data.content && data.content[0] ? data.content[0].text : "";
        if (text) setNf((f) => ({ ...f, content: text }));
      } catch (e) { console.error(e); }
      setAiLoading(false);
    };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>Progress Notes ({list.length})</h2>
          {canWrite("notes") && <Btn icon="plus" onClick={() => { setNf({ residentId: nRes || "", date: td(), shift: "Day", author: curUser?.name || "", content: "", mood: "", participation: "" }); setEditItem(null); setModal("add-note"); }}>Write Note</Btn>}
        </div>
        <ResSelector value={nRes} onChange={setNRes} showAll />
        {list.length === 0 ? (<Empty icon="note" title="No notes yet" sub={canWrite("notes") ? "Write your first progress note" : "No notes recorded"} />) :
          <div style={{ display: "grid", gap: 8 }}>{list.map((n) => (
            <Card key={n.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{rn(n.residentId) || "General"}</span>
                  <Badge>{n.shift}</Badge>{n.mood && <Badge color={C.purple}>{n.mood}</Badge>}
                  <span style={{ fontSize: 11, color: C.muted }}>{fmt(n.date)}{n.author ? " - " + n.author : ""}</span>
                </div>
                {canWrite("notes") && <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(n); setNf({ ...n }); setModal("add-note"); }} />}
              </div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{(n.content || "").slice(0, 300)}{(n.content || "").length > 300 ? "..." : ""}</div>
            </Card>
          ))}</div>
        }
        <Modal open={modal === "add-note"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Note" : "Write Progress Note"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Sel label="Resident" value={nf.residentId} onChange={(e) => setNf((f) => ({ ...f, residentId: e.target.value }))}><option value="">---</option>{activeRes.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</Sel>
            <Inp label="Date" type="date" value={nf.date} onChange={(e) => setNf((f) => ({ ...f, date: e.target.value }))} />
            <Sel label="Shift" value={nf.shift} onChange={(e) => setNf((f) => ({ ...f, shift: e.target.value }))}><option>Day</option><option>Evening</option><option>Night</option></Sel>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Inp label="Author" value={nf.author} onChange={(e) => setNf((f) => ({ ...f, author: e.target.value }))} />
            <Sel label="Mood" value={nf.mood} onChange={(e) => setNf((f) => ({ ...f, mood: e.target.value }))}><option value="">---</option><option>Happy</option><option>Calm</option><option>Neutral</option><option>Anxious</option><option>Agitated</option><option>Withdrawn</option></Sel>
            <Sel label="Participation" value={nf.participation} onChange={(e) => setNf((f) => ({ ...f, participation: e.target.value }))}><option value="">---</option><option>Fully Independent</option><option>Minimal Prompting</option><option>Moderate Support</option><option>Full Assistance</option><option>Refused</option></Sel>
          </div>
          <TA label="Content" value={nf.content} onChange={(e) => setNf((f) => ({ ...f, content: e.target.value }))} rows={8} placeholder="Type observations... then hit AI Format for ODDS-compliant language" />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn v="accent" icon="ai" onClick={aiFormat} disabled={aiLoading || !nf.content}>{aiLoading ? "Formatting..." : "AI Format"}</Btn>
            <Btn onClick={() => { if (!nf.content) return; if (editItem) setNotes((p) => p.map((n) => (n.id === editItem.id ? { ...editItem, ...nf } : n))); else setNotes((p) => [...p, { ...nf, id: uid(), homeId: res.find((r) => r.id === nf.residentId)?.homeId || "", createdAt: now() }]); logAction("write_note", rn(nf.residentId)); setModal(null); setEditItem(null); }}>{editItem ? "Update" : "Save Note"}</Btn>
          </div>
        </Modal>
      </div>
    );
  };

  const TLogPage = () => {
    const [tf, setTf] = useState({ homeId: userHomes[0]?.id || "", date: td(), shift: "Day", author: curUser?.name || "", content: "", priority: "normal" });
    const list = fil(tlog).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div><h2 style={{ margin: 0, fontSize: 19, color: C.text }}>T-Log / Shift Communication</h2><p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Shift handoff notes</p></div>
          {canWrite("tlog") && <Btn icon="plus" onClick={() => { setTf({ homeId: userHomes[0]?.id || "", date: td(), shift: "Day", author: curUser?.name || "", content: "", priority: "normal" }); setModal("add-tlog"); }}>New Entry</Btn>}
        </div>
        {list.length === 0 ? (<Empty icon="msg" title="No shift logs" sub="Create a shift handoff note" />) :
          <div style={{ display: "grid", gap: 8 }}>{list.map((t) => (
            <Card key={t.id} style={{ padding: 14, borderLeft: "3px solid " + (t.priority === "urgent" ? C.danger : t.priority === "important" ? C.warn : C.border) }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontWeight: 600, fontSize: 13 }}>{t.author || "Staff"}</span><Badge>{t.shift}</Badge><Badge color={C.sub}>{hn(t.homeId)}</Badge>{t.priority !== "normal" && <Badge color={t.priority === "urgent" ? C.danger : C.warn}>{t.priority}</Badge>}</div>
                <span style={{ fontSize: 11, color: C.muted }}>{fmt(t.date)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{t.content}</div>
            </Card>
          ))}</div>
        }
        <Modal open={modal === "add-tlog"} onClose={() => setModal(null)} title="New Shift Log" wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Sel label="Home" value={tf.homeId} onChange={(e) => setTf((f) => ({ ...f, homeId: e.target.value }))}>{userHomes.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}</Sel>
            <Inp label="Date" type="date" value={tf.date} onChange={(e) => setTf((f) => ({ ...f, date: e.target.value }))} />
            <Sel label="Shift" value={tf.shift} onChange={(e) => setTf((f) => ({ ...f, shift: e.target.value }))}><option>Day</option><option>Evening</option><option>Night</option></Sel>
            <Sel label="Priority" value={tf.priority} onChange={(e) => setTf((f) => ({ ...f, priority: e.target.value }))}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></Sel>
          </div>
          <Inp label="Author" value={tf.author} onChange={(e) => setTf((f) => ({ ...f, author: e.target.value }))} style={{ marginBottom: 12 }} />
          <TA label="Shift Notes" value={tf.content} onChange={(e) => setTf((f) => ({ ...f, content: e.target.value }))} rows={6} placeholder="What does the next shift need to know?" />
          <div style={{ marginTop: 12 }}><Btn onClick={() => { if (!tf.content) return; setTlog((p) => [...p, { ...tf, id: uid() }]); logAction("tlog_entry", tf.shift + " shift"); setModal(null); }}>Post Entry</Btn></div>
        </Modal>
      </div>
    );
  };

  const HealthPage = () => {
    const [hRes, setHRes] = useState(activeRes[0]?.id || null);
    const [hTab, setHTab] = useState("vitals");
    const [hf, setHf] = useState({ date: td(), bp: "", pulse: "", temp: "", o2: "", weight: "", bowel: "", sleep: "", notes: "" });
    const resHealth = health.filter((h) => h.residentId === hRes && h.type === hTab).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const saveH = () => {
      setHealth((p) => [...p, { ...hf, id: uid(), residentId: hRes, homeId: res.find((r) => r.id === hRes)?.homeId || "", type: hTab, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), recordedBy: curUser?.name }]);
      setHf((f) => ({ ...f, bp: "", pulse: "", temp: "", o2: "", weight: "", bowel: "", sleep: "", notes: "" }));
    };
    return (
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: 19, color: C.text }}>Health Tracking</h2>
        <ResSelector value={hRes} onChange={setHRes} />
        {!hRes ? (<Empty icon="heart" title="Select a resident" sub="Choose a resident to track health data" />) : (
          <div>
            <TabBar tabs={[{ id: "vitals", label: "Vitals" }, { id: "weight", label: "Weight" }, { id: "bowel", label: "Bowel" }, { id: "sleep", label: "Sleep" }]} active={hTab} onChange={setHTab} />
            {canWrite("health") && (
              <Card style={{ marginBottom: 14, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", marginBottom: 8 }}>Quick Entry</div>
                <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <Inp label="Date" type="date" value={hf.date} onChange={(e) => setHf((f) => ({ ...f, date: e.target.value }))} style={{ width: 130 }} />
                  {hTab === "vitals" && (<><Inp label="BP" value={hf.bp} onChange={(e) => setHf((f) => ({ ...f, bp: e.target.value }))} placeholder="120/80" style={{ width: 80 }} /><Inp label="Pulse" value={hf.pulse} onChange={(e) => setHf((f) => ({ ...f, pulse: e.target.value }))} placeholder="72" style={{ width: 60 }} /><Inp label="Temp" value={hf.temp} onChange={(e) => setHf((f) => ({ ...f, temp: e.target.value }))} placeholder="98.6" style={{ width: 60 }} /><Inp label="O2%" value={hf.o2} onChange={(e) => setHf((f) => ({ ...f, o2: e.target.value }))} placeholder="98" style={{ width: 50 }} /></>)}
                  {hTab === "weight" && <Inp label="Weight (lbs)" value={hf.weight} onChange={(e) => setHf((f) => ({ ...f, weight: e.target.value }))} style={{ width: 80 }} />}
                  {hTab === "bowel" && <Sel label="Status" value={hf.bowel} onChange={(e) => setHf((f) => ({ ...f, bowel: e.target.value }))}><option value="">---</option><option>Normal</option><option>Soft</option><option>Hard</option><option>Loose</option><option>Constipated</option></Sel>}
                  {hTab === "sleep" && <Inp label="Hours" value={hf.sleep} onChange={(e) => setHf((f) => ({ ...f, sleep: e.target.value }))} style={{ width: 60 }} />}
                  <Inp label="Notes" value={hf.notes} onChange={(e) => setHf((f) => ({ ...f, notes: e.target.value }))} style={{ flex: 1, minWidth: 80 }} />
                  <Btn onClick={saveH} sm>Save</Btn>
                </div>
              </Card>
            )}
            {resHealth.length === 0 ? (<Empty icon="heart" title={"No " + hTab + " data"} sub="Use the form above to start tracking" />) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.primary, color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th><th style={{ padding: "8px 12px", textAlign: "left" }}>Time</th>
                    {hTab === "vitals" && (<><th style={{ padding: "8px 12px" }}>BP</th><th style={{ padding: "8px 12px" }}>Pulse</th><th style={{ padding: "8px 12px" }}>Temp</th><th style={{ padding: "8px 12px" }}>O2</th></>)}
                    {hTab === "weight" && <th style={{ padding: "8px 12px" }}>Weight</th>}
                    {hTab === "bowel" && <th style={{ padding: "8px 12px" }}>Status</th>}
                    {hTab === "sleep" && <th style={{ padding: "8px 12px" }}>Hours</th>}
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Notes</th><th style={{ padding: "8px 12px" }}>By</th>
                  </tr></thead>
                  <tbody>{resHealth.slice(0, 20).map((h, i) => (
                    <tr key={h.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid " + C.border }}>
                      <td style={{ padding: "6px 12px" }}>{fmtS(h.date)}</td><td style={{ padding: "6px 12px", color: C.muted }}>{h.time || "\u2014"}</td>
                      {hTab === "vitals" && (<><td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 600 }}>{h.bp || "\u2014"}</td><td style={{ padding: "6px 12px", textAlign: "center" }}>{h.pulse || "\u2014"}</td><td style={{ padding: "6px 12px", textAlign: "center" }}>{h.temp || "\u2014"}</td><td style={{ padding: "6px 12px", textAlign: "center" }}>{h.o2 || "\u2014"}</td></>)}
                      {hTab === "weight" && <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 600 }}>{h.weight} lbs</td>}
                      {hTab === "bowel" && <td style={{ padding: "6px 12px", textAlign: "center" }}>{h.bowel || "\u2014"}</td>}
                      {hTab === "sleep" && <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: 600 }}>{h.sleep}h</td>}
                      <td style={{ padding: "6px 12px", color: C.muted }}>{h.notes || "\u2014"}</td>
                      <td style={{ padding: "6px 12px", color: C.muted, fontSize: 10 }}>{h.recordedBy || ""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const Resident360 = () => {
    const [vRes, setVRes] = useState(activeRes[0]?.id || null);
    const r = res.find((x) => x.id === vRes);
    if (!vRes || !r) return (<div><h2 style={{ margin: "0 0 14px", fontSize: 19, color: C.text }}>Resident 360{"\u00B0"} View</h2><ResSelector value={vRes} onChange={setVRes} /><Empty icon="eye" title="Select a resident" sub="See everything about one resident" /></div>);
    const rMeds = fil(meds).filter((m) => m.residentId === vRes);
    const rGoals = goals.filter((g) => g.residentId === vRes);
    const rNotes = notes.filter((n) => n.residentId === vRes).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    const rAppts = appts.filter((a) => a.residentId === vRes && a.date >= td()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    return (
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: 19, color: C.text }}>Resident 360{"\u00B0"} View</h2>
        <ResSelector value={vRes} onChange={setVRes} />
        <Card style={{ marginBottom: 14, background: C.primary + "06" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, color: C.text }}>{r.name}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}><Badge color={C.accent}>{r.serviceLevel}</Badge><Badge color={C.purple}>{hn(r.homeId)}</Badge>{r.age && <Badge color={C.sub}>Age {r.age}</Badge>}</div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
            {r.diagnosis && <div>Dx: {r.diagnosis}</div>}{r.caseManager && <div>CM: {r.caseManager}</div>}{r.physician && <div>MD: {r.physician}</div>}
            {r.allergies && <div style={{ color: C.danger, fontWeight: 600 }}>Allergies: {r.allergies}</div>}{r.emergencyContact && <div>Emergency: {r.emergencyContact} {r.emergencyPhone}</div>}
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Medications ({rMeds.length})</div>{rMeds.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>None</div> : rMeds.map((m) => (<div key={m.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}><span style={{ fontWeight: 600 }}>{m.name} {m.dosage}</span> <span style={{ color: C.sub }}>{m.frequency}</span></div>))}</Card>
          <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>ISP Goals ({rGoals.length})</div>{rGoals.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>None</div> : rGoals.map((g) => (<div key={g.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}><span style={{ fontWeight: 600 }}>{g.title}</span> <Badge color={C.accent}>{g.area}</Badge></div>))}</Card>
          <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Recent Notes</div>{rNotes.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>None</div> : rNotes.map((n) => (<div key={n.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 11 }}><span style={{ fontWeight: 600 }}>{fmtS(n.date)} {n.shift}</span><div style={{ color: C.sub }}>{(n.content || "").slice(0, 80)}...</div></div>))}</Card>
          <Card><div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Upcoming Appts</div>{rAppts.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>None</div> : rAppts.map((a) => (<div key={a.id} style={{ padding: "4px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}><span style={{ fontWeight: 600 }}>{a.title}</span> <span style={{ color: C.sub }}>{fmtS(a.date)}</span></div>))}</Card>
        </div>
      </div>
    );
  };

  // Generic CRUD - with write protection
  const SimpleCrud = ({ title, icon, data, setData, fields, modalId, getBadges, getSub }) => {
    const [f, setF] = useState({});
    const list = fil(data).sort((a, b) => (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || ""));
    const modKey = Object.keys(ACCESS).find((k) => modalId.includes(k)) || modalId.replace("crud-", "");
    const writable = canWrite(modKey === "appt" ? "appointments" : modKey === "inc" ? "incidents" : modKey === "comm" ? "comms" : modKey);
    const open = (item) => { setEditItem(item); setF(item ? { ...item } : fields.reduce((acc, x) => ({ ...acc, [x.k]: x.def || "" }), {})); setModal(modalId); };
    const save = () => { if (editItem) setData((p) => p.map((x) => (x.id === editItem.id ? { ...editItem, ...f } : x))); else setData((p) => [...p, { ...f, id: uid(), createdAt: now() }]); setModal(null); setEditItem(null); };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>{title} ({list.length})</h2>
          {writable && <Btn icon="plus" onClick={() => open(null)}>Add</Btn>}
        </div>
        {list.length === 0 ? (<Empty icon={icon} title={"No " + title.toLowerCase()} sub={writable ? "Click Add to get started" : "Nothing recorded yet"} />) : (
          <div style={{ display: "grid", gap: 8 }}>{list.map((item) => (
            <Card key={item.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 2 }}><span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{item[fields[0]?.k] || item.title || item.name || "\u2014"}</span>{getBadges && getBadges(item)}</div>
                  {getSub && <div style={{ fontSize: 11, color: C.sub }}>{getSub(item)}</div>}
                </div>
                {writable && <div style={{ display: "flex", gap: 3 }}><Btn sm v="ghost" icon="edit" onClick={() => open(item)} /><Btn sm v="ghost" icon="trash" onClick={() => setData((p) => p.filter((x) => x.id !== item.id))} /></div>}
              </div>
            </Card>
          ))}</div>
        )}
        <Modal open={modal === modalId} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit" : "Add"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {fields.map((x) => {
              if (x.t === "ta") return (<div key={x.k} style={x.w ? { gridColumn: "1/-1" } : {}}><TA label={x.l} value={f[x.k] || ""} onChange={(e) => setF((p) => ({ ...p, [x.k]: e.target.value }))} rows={x.rows} /></div>);
              if (x.t === "sel") return (<Sel key={x.k} label={x.l} value={f[x.k] || ""} onChange={(e) => setF((p) => ({ ...p, [x.k]: e.target.value }))}>{x.opts.map((o) => (<option key={o} value={o}>{o}</option>))}</Sel>);
              if (x.t === "homeSel") return (<Sel key={x.k} label={x.l} value={f[x.k] || ""} onChange={(e) => setF((p) => ({ ...p, [x.k]: e.target.value }))}>{userHomes.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}</Sel>);
              if (x.t === "resSel") return (<Sel key={x.k} label={x.l} value={f[x.k] || ""} onChange={(e) => setF((p) => ({ ...p, [x.k]: e.target.value }))}><option value="">---</option>{activeRes.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</Sel>);
              return (<Inp key={x.k} label={x.l} type={x.it || "text"} value={f[x.k] || ""} onChange={(e) => setF((p) => ({ ...p, [x.k]: e.target.value }))} placeholder={x.ph} />);
            })}
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={save}>{editItem ? "Update" : "Save"}</Btn></div>
        </Modal>
      </div>
    );
  };


  // ============================================================
  // APPOINTMENTS — Google Calendar sync + smart scheduling
  // ============================================================
  const ApptsPage = () => {
    const [af, setAf] = useState({ title: "", type: "medical", homeId: userHomes[0]?.id || "", residentId: "", date: td(), time: "09:00", provider: "", location: "", status: "scheduled", notes: "", duration: 60 });
    const [apptTab, setApptTab] = useState("upcoming");
    const upcoming = fil(appts).filter((a) => a.date >= td() && a.status !== "cancelled").sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    const past = fil(appts).filter((a) => a.date < td() || a.status === "completed").sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const buildGcalUrl = (a) => {
      const dt = (a.date || "").replace(/-/g, "");
      const [hh, mm] = (a.time || "09:00").split(":");
      const startT = dt + "T" + (hh || "09") + (mm || "00") + "00";
      const durMin = a.duration || 60;
      const endDate = new Date(a.date + "T" + (a.time || "09:00"));
      endDate.setMinutes(endDate.getMinutes() + durMin);
      const endT = endDate.toISOString().replace(/[-:]/g, "").split(".")[0];
      const desc = encodeURIComponent([
        "Resident: " + rn(a.residentId),
        "Type: " + a.type,
        "Provider: " + (a.provider || ""),
        a.notes || "",
        "---",
        "Blue Ocean Care - " + (homes.find((h) => h.id === a.homeId)?.name || ""),
      ].filter(Boolean).join("\n"));
      return "https://calendar.google.com/calendar/u/0/r/eventedit?text=" + encodeURIComponent(a.title + " - " + rn(a.residentId)) + "&dates=" + startT + "/" + endT + "&details=" + desc + "&location=" + encodeURIComponent(a.location || "");
    };

    const markComplete = (a) => {
      setAppts((p) => p.map((x) => (x.id === a.id ? { ...x, status: "completed" } : x)));
      logAction("appt_complete", a.title + " for " + rn(a.residentId));
      // Auto-create follow-up task
      if (a.type === "medical" || a.type === "psychiatric") {
        setTasks((p) => [...p, { id: uid(), title: "Follow up: " + a.title + " - " + rn(a.residentId), priority: "medium", category: "medical", due: new Date(new Date(a.date).getTime() + 7 * 864e5).toISOString().split("T")[0], assignedTo: curUser?.name || "", homeId: a.homeId, notes: "Auto-created after appointment on " + fmt(a.date) + " with " + (a.provider || "provider"), done: false }]);
      }
    };

    const typeColors = { medical: C.accent, dental: "#06b6d4", psychiatric: C.purple, therapy: "#8b5cf6", isp: C.primary, school: C.warn, other: C.sub };

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>Appointments</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{upcoming.length} upcoming {"\u00B7"} Sync to Google Calendar with one click</p>
          </div>
          {canWrite("appointments") && <Btn icon="plus" onClick={() => { setAf({ title: "", type: "medical", homeId: userHomes[0]?.id || "", residentId: "", date: td(), time: "09:00", provider: "", location: "", status: "scheduled", notes: "", duration: 60 }); setEditItem(null); setModal("add-appt"); }}>New Appointment</Btn>}
        </div>
        <TabBar tabs={[{ id: "upcoming", label: "Upcoming (" + upcoming.length + ")" }, { id: "past", label: "Past (" + past.length + ")" }]} active={apptTab} onChange={setApptTab} />

        <div style={{ display: "grid", gap: 8 }}>
          {(apptTab === "upcoming" ? upcoming : past.slice(0, 20)).map((a) => {
            const daysUntil = du(a.date);
            const isUrgent = daysUntil !== null && daysUntil <= 1 && daysUntil >= 0;
            const isOverdue = a.date < td() && a.status !== "completed" && a.status !== "cancelled";
            return (
              <Card key={a.id} style={{ padding: 14, borderLeft: "4px solid " + (typeColors[a.type] || C.sub), background: isUrgent ? "#fffbeb" : isOverdue ? "#fef2f2" : C.card }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{a.title}</span>
                      <Badge color={typeColors[a.type] || C.sub}>{a.type}</Badge>
                      {isOverdue && <Badge color={C.danger}>OVERDUE</Badge>}
                      {isUrgent && !isOverdue && <Badge color={C.warn}>TODAY</Badge>}
                      {a.status === "completed" && <Badge color={C.success}>DONE</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub }}>
                      {fmt(a.date)} {a.time ? "at " + a.time : ""} {"\u00B7"} {rn(a.residentId)}{a.provider ? " \u00B7 " + a.provider : ""}{a.location ? " \u00B7 " + a.location : ""}
                    </div>
                    {a.notes && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{a.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                    <a href={buildGcalUrl(a)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "5px 10px", borderRadius: 8, background: "#4285f4", color: "#fff", fontSize: 10, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
                      <Ico d={IC.cal} s={11} c="#fff" />GCal
                    </a>
                    {a.status !== "completed" && canWrite("appointments") && (
                      <Btn sm v="secondary" icon="check" onClick={() => markComplete(a)}>Done</Btn>
                    )}
                    {canWrite("appointments") && <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(a); setAf({ ...a }); setModal("add-appt"); }} />}
                  </div>
                </div>
              </Card>
            );
          })}
          {(apptTab === "upcoming" ? upcoming : past).length === 0 && <Empty icon="cal" title={"No " + apptTab + " appointments"} sub={canWrite("appointments") ? "Click New Appointment to schedule" : ""} />}
        </div>

        {/* Bulk Google Calendar Export */}
        {upcoming.length > 0 && apptTab === "upcoming" && (
          <Card style={{ marginTop: 14, padding: 12, background: "#eef6ff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>Sync All to Google Calendar</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Open each appointment in Google Calendar to save it</div>
              </div>
              <Btn sm style={{ background: "#4285f4", color: "#fff" }} onClick={() => { upcoming.slice(0, 5).forEach((a, i) => { setTimeout(() => window.open(buildGcalUrl(a), "_blank"), i * 800); }); }}>Sync Next 5</Btn>
            </div>
          </Card>
        )}

        {/* Add/Edit Appointment */}
        <Modal open={modal === "add-appt"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Appointment" : "New Appointment"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Inp label="Title" value={af.title} onChange={(e) => setAf((f) => ({ ...f, title: e.target.value }))} placeholder="Dr. Smith follow-up" />
            <Sel label="Type" value={af.type} onChange={(e) => setAf((f) => ({ ...f, type: e.target.value }))}><option value="medical">Medical</option><option value="dental">Dental</option><option value="psychiatric">Psychiatric</option><option value="therapy">Therapy</option><option value="isp">ISP Meeting</option><option value="school">School</option><option value="other">Other</option></Sel>
            <Sel label="Home" value={af.homeId} onChange={(e) => setAf((f) => ({ ...f, homeId: e.target.value }))}>{userHomes.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}</Sel>
            <Sel label="Resident" value={af.residentId} onChange={(e) => setAf((f) => ({ ...f, residentId: e.target.value }))}><option value="">---</option>{activeRes.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</Sel>
            <Inp label="Date" type="date" value={af.date} onChange={(e) => setAf((f) => ({ ...f, date: e.target.value }))} />
            <Inp label="Time" type="time" value={af.time} onChange={(e) => setAf((f) => ({ ...f, time: e.target.value }))} />
            <Inp label="Provider" value={af.provider} onChange={(e) => setAf((f) => ({ ...f, provider: e.target.value }))} placeholder="Dr. Smith" />
            <Inp label="Location" value={af.location} onChange={(e) => setAf((f) => ({ ...f, location: e.target.value }))} placeholder="Providence Medical" />
            <Inp label="Duration (min)" type="number" value={af.duration} onChange={(e) => setAf((f) => ({ ...f, duration: parseInt(e.target.value) || 60 }))} />
          </div>
          <TA label="Notes" value={af.notes} onChange={(e) => setAf((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={() => {
              if (!af.title) return;
              if (editItem) { setAppts((p) => p.map((a) => (a.id === editItem.id ? { ...editItem, ...af } : a))); logAction("edit_appt", af.title); }
              else { const newA = { ...af, id: uid(), createdAt: now() }; setAppts((p) => [...p, newA]); logAction("add_appt", af.title + " for " + rn(af.residentId)); }
              setModal(null); setEditItem(null);
            }}>{editItem ? "Update" : "Create Appointment"}</Btn>
            {!editItem && af.title && (
              <Btn v="secondary" onClick={() => {
                const newA = { ...af, id: uid(), createdAt: now() };
                setAppts((p) => [...p, newA]);
                window.open(buildGcalUrl(newA), "_blank");
                logAction("add_appt_gcal", af.title);
                setModal(null); setEditItem(null);
              }}>Create + Add to Google Calendar</Btn>
            )}
          </div>
        </Modal>
      </div>
    );
  };

  // ============================================================
  // SMART ALERTS BANNER — runs every render, zero config
  // Surfaces critical items that need attention NOW
  // ============================================================
  const SmartAlerts = () => {
    const alerts = [];
    // Cert expiring soon
    staff.filter((s) => s.status === "active" && s.certExpiry).forEach((s) => {
      const d = du(s.certExpiry);
      if (d !== null && d <= 30 && d >= 0) alerts.push({ type: "cert", severity: d <= 7 ? "critical" : "warn", msg: s.name + " cert expires " + fmtS(s.certExpiry) + " (" + d + " days)", action: () => setPage("staff") });
    });
    // License expiring
    homes.forEach((h) => {
      if (h.licenseExpiry) {
        const d = du(h.licenseExpiry);
        if (d !== null && d <= 60 && d >= 0) alerts.push({ type: "license", severity: d <= 14 ? "critical" : "warn", msg: h.name + " license expires " + fmtS(h.licenseExpiry), action: () => setPage("homes") });
      }
    });
    // Overdue appointments
    fil(appts).filter((a) => a.date < td() && a.status !== "completed" && a.status !== "cancelled").forEach((a) => {
      alerts.push({ type: "appt", severity: "warn", msg: "Overdue: " + a.title + " for " + rn(a.residentId) + " was " + fmt(a.date), action: () => setPage("appointments") });
    });
    // Residents without emergency contacts
    activeRes.filter((r) => !r.emergencyContact || !r.emergencyPhone).forEach((r) => {
      alerts.push({ type: "compliance", severity: "info", msg: r.name + " missing emergency contact (OAR 411-325-0185)", action: () => setPage("homes") });
    });
    // Open critical incidents > 24h
    fil(inc).filter((x) => (x.status === "open") && (x.severity === "high" || x.severity === "critical")).forEach((x) => {
      alerts.push({ type: "incident", severity: "critical", msg: "Open " + x.severity + " incident: " + x.title, action: () => setPage("incidents") });
    });
    // Residents without ISP goals
    activeRes.filter((r) => !goals.some((g) => g.residentId === r.id)).forEach((r) => {
      alerts.push({ type: "compliance", severity: "info", msg: r.name + " has no ISP goals documented (OAR 411-325-0025)", action: () => setPage("goals") });
    });
    // Meds overdue today
    const hour = new Date().getHours();
    if (hour >= 10) {
      activeRes.forEach((r) => {
        const rMeds = fil(meds).filter((m) => m.residentId === r.id && m.status !== "discontinued");
        rMeds.forEach((m) => {
          const times = m.times || ["8:00 AM"];
          times.forEach((t) => {
            if (t === "PRN") return;
            const tHour = parseInt(t) + (t.includes("PM") && !t.startsWith("12") ? 12 : 0);
            if (tHour < hour) {
              const entry = mar.find((x) => x.medId === m.id && x.timeSlot === t && x.date === td() && x.residentId === r.id);
              if (!entry) alerts.push({ type: "med", severity: "critical", msg: r.name + ": " + m.name + " " + t + " not recorded", action: () => setPage("mar") });
            }
          });
        });
      });
    }

    if (alerts.length === 0) return null;
    const critical = alerts.filter((a) => a.severity === "critical");
    const warns = alerts.filter((a) => a.severity === "warn");
    const infos = alerts.filter((a) => a.severity === "info");
    const sorted = [...critical, ...warns, ...infos];
    const sevColors = { critical: C.danger, warn: C.warn, info: C.accent };

    return (
      <div style={{ marginBottom: 14, padding: "10px 14px", background: critical.length > 0 ? "#fef2f2" : "#fffbeb", borderRadius: 10, border: "1px solid " + (critical.length > 0 ? C.danger + "30" : C.warn + "30") }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sorted.length > 3 ? 6 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: critical.length > 0 ? C.danger : C.warn }}>{"\u26A0"} {alerts.length} Smart Alert{alerts.length !== 1 ? "s" : ""} {critical.length > 0 ? "(" + critical.length + " critical)" : ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {sorted.slice(0, 6).map((a, i) => (
            <div key={i} onClick={a.action} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, cursor: "pointer", padding: "2px 0" }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: sevColors[a.severity] || C.muted, flexShrink: 0 }} />
              <span style={{ color: C.text }}>{a.msg}</span>
            </div>
          ))}
          {sorted.length > 6 && <div style={{ fontSize: 10, color: C.muted }}>+{sorted.length - 6} more alerts</div>}
        </div>
      </div>
    );
  };

  const apptF = [{ k: "title", l: "Title" }, { k: "type", l: "Type", t: "sel", opts: ["medical", "dental", "psychiatric", "therapy", "isp", "school", "other"] }, { k: "homeId", l: "Home", t: "homeSel" }, { k: "residentId", l: "Resident", t: "resSel" }, { k: "date", l: "Date", it: "date", def: td() }, { k: "time", l: "Time", it: "time" }, { k: "provider", l: "Provider" }, { k: "location", l: "Location" }, { k: "status", l: "Status", t: "sel", opts: ["scheduled", "confirmed", "completed", "cancelled"], def: "scheduled" }, { k: "notes", l: "Notes", t: "ta", w: true }];
  const incF = [{ k: "title", l: "Title" }, { k: "type", l: "Type", t: "sel", opts: ["behavioral", "elopement", "medical", "injury", "property", "medication-error", "restraint", "abuse-allegation"] }, { k: "severity", l: "Severity", t: "sel", opts: ["low", "medium", "high", "critical"] }, { k: "status", l: "Status", t: "sel", opts: ["open", "investigating", "resolved", "reported"], def: "open" }, { k: "homeId", l: "Home", t: "homeSel" }, { k: "residentId", l: "Resident", t: "resSel" }, { k: "date", l: "Date", it: "date", def: td() }, { k: "time", l: "Time", it: "time" }, { k: "description", l: "Description", t: "ta", w: true, rows: 4 }, { k: "actionTaken", l: "Action Taken", t: "ta", w: true }];
  const staffF = [{ k: "name", l: "Name" }, { k: "role", l: "Role", t: "sel", opts: ["DSP", "Awake Night", "Program Supervisor", "Lead DSP", "House Manager"] }, { k: "shift", l: "Shift", t: "sel", opts: ["Day", "Evening", "Night", "Swing", "PRN"] }, { k: "homeId", l: "Home", t: "homeSel" }, { k: "phone", l: "Phone" }, { k: "email", l: "Email" }, { k: "hireDate", l: "Hire Date", it: "date" }, { k: "certExpiry", l: "Cert Expiry", it: "date" }, { k: "status", l: "Status", t: "sel", opts: ["active", "inactive", "training"], def: "active" }];
  const commF = [{ k: "contactName", l: "Contact" }, { k: "contactRole", l: "Role", t: "sel", opts: ["", "Case Manager", "Family", "Physician", "Therapist", "School", "Pharmacy", "CDDP", "ODDS"] }, { k: "type", l: "Type", t: "sel", opts: ["phone", "email", "in-person", "text"], def: "phone" }, { k: "direction", l: "Direction", t: "sel", opts: ["outgoing", "incoming"] }, { k: "homeId", l: "Home", t: "homeSel" }, { k: "residentId", l: "Resident", t: "resSel" }, { k: "date", l: "Date", it: "date", def: td() }, { k: "summary", l: "Summary", t: "ta", w: true }];
  const taskF = [{ k: "title", l: "Task" }, { k: "priority", l: "Priority", t: "sel", opts: ["low", "medium", "high"], def: "medium" }, { k: "category", l: "Category", t: "sel", opts: ["general", "compliance", "medical", "training", "documentation"] }, { k: "due", l: "Due", it: "date" }, { k: "assignedTo", l: "Assigned To" }, { k: "homeId", l: "Home", t: "homeSel" }, { k: "notes", l: "Notes", t: "ta", w: true }];

  // ============================================================
  // DOC INTAKE — Upload ISP, RIT, PBSP → AI extracts data
  // ============================================================
  const DocIngest = () => {
    const [diRes, setDiRes] = useState(activeRes[0]?.id || null);
    const [diDocType, setDiDocType] = useState("isp");
    const [diFile, setDiFile] = useState(null);
    const [diFileName, setDiFileName] = useState("");
    const [diLoading, setDiLoading] = useState(false);
    const [diResult, setDiResult] = useState(null); // parsed JSON
    const [diRaw, setDiRaw] = useState(""); // raw AI text
    const [diApplied, setDiApplied] = useState(false);
    const [diHistory, setDiHistory] = useState([]);

    const r = res.find((x) => x.id === diRes);
    const docTypes = [
      { id: "isp", label: "ISP (Individual Support Plan)", extract: "demographics, diagnoses, medications, ISP goals with objectives/baselines/targets/methods, service level, case manager, physician, pharmacy, allergies, diet, emergency contacts, behavioral triggers, safety protocols" },
      { id: "rit", label: "RIT (Referral Information)", extract: "name, age, diagnoses, service level, behavioral history, risk factors, medications, allergies, current placement, reason for referral, support needs, medical contacts" },
      { id: "pbsp", label: "PBSP (Positive Behavior Support Plan)", extract: "target behaviors, function of behavior, antecedents, setting events, replacement behaviors, prevention strategies, teaching strategies, reactive strategies, crisis protocols, reinforcement schedules, data collection methods" },
      { id: "nursing", label: "Nursing Assessment / Health Plan", extract: "diagnoses, medications with dosages/frequencies/routes/purposes/prescribers, allergies, vital sign baselines, dietary needs, seizure protocol, PRN protocols, health monitoring requirements" },
      { id: "other", label: "Other Document", extract: "any relevant resident information including demographics, medical, behavioral, programmatic data" },
    ];
    const curDocType = docTypes.find((d) => d.id === diDocType) || docTypes[0];

    const handleFile = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setDiFileName(file.name);
      setDiResult(null);
      setDiRaw("");
      setDiApplied(false);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        setDiFile({ base64, type: file.type, name: file.name });
      };
      reader.readAsDataURL(file);
    };

    const doExtract = async () => {
      if (!diFile || !diRes) return;
      setDiLoading(true);
      setDiResult(null);
      setDiRaw("");
      setDiApplied(false);
      try {
        const isPdf = diFile.type === "application/pdf";
        const isImage = diFile.type.startsWith("image/");
        const content = [];
        if (isPdf) {
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: diFile.base64 } });
        } else if (isImage) {
          content.push({ type: "image", source: { type: "base64", media_type: diFile.type, data: diFile.base64 } });
        } else {
          // For text-based files, decode and send as text
          try {
            const text = atob(diFile.base64);
            content.push({ type: "text", text: "Document content:\n" + text.slice(0, 15000) });
          } catch (err) {
            content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: diFile.base64 } });
          }
        }
        content.push({ type: "text", text: "Extract information from this " + curDocType.label + " document for a resident at a 24-hour residential group home in Oregon (OAR 411-325).\n\nCurrent resident record:\nName: " + (r?.name || "Unknown") + "\nAge: " + (r?.age || "") + "\nDiagnosis: " + (r?.diagnosis || "") + "\n\nExtract specifically: " + curDocType.extract + "\n\nRespond with ONLY valid JSON in this exact format (use empty string for unknown, empty array for no items):\n{\n  \"demographics\": { \"name\": \"\", \"age\": \"\", \"diagnosis\": \"\", \"serviceLevel\": \"\", \"allergies\": \"\", \"diet\": \"\" },\n  \"contacts\": { \"caseManager\": \"\", \"physician\": \"\", \"pharmacy\": \"\", \"emergencyContact\": \"\", \"emergencyPhone\": \"\" },\n  \"medications\": [{ \"name\": \"\", \"dosage\": \"\", \"frequency\": \"\", \"route\": \"Oral\", \"purpose\": \"\", \"prescriber\": \"\" }],\n  \"goals\": [{ \"title\": \"\", \"area\": \"\", \"objective\": \"\", \"baseline\": \"\", \"target\": \"\", \"method\": \"\", \"frequency\": \"Daily\" }],\n  \"behavioral\": { \"targetBehaviors\": \"\", \"triggers\": \"\", \"preventionStrategies\": \"\", \"reactiveStrategies\": \"\", \"crisisProtocol\": \"\" },\n  \"summary\": \"\"\n}\nReturn ONLY the JSON, no markdown fences, no preamble." });

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content }] }),
        });
        const data = await resp.json();
        const text = (data.content || []).map((b) => b.text || "").join("");
        setDiRaw(text);
        try {
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          setDiResult(parsed);
        } catch (e) {
          setDiResult(null);
        }
      } catch (e) {
        setDiRaw("Error: " + (e.message || "Upload failed"));
      }
      setDiLoading(false);
    };

    const applyToResident = () => {
      if (!diResult || !diRes) return;
      const d = diResult.demographics || {};
      const c = diResult.contacts || {};
      // Update resident record with extracted data (only non-empty fields)
      setRes((prev) => prev.map((x) => {
        if (x.id !== diRes) return x;
        const updated = { ...x };
        if (d.diagnosis) updated.diagnosis = d.diagnosis;
        if (d.serviceLevel) updated.serviceLevel = d.serviceLevel;
        if (d.allergies) updated.allergies = d.allergies;
        if (d.diet) updated.diet = d.diet;
        if (d.age) updated.age = d.age;
        if (c.caseManager) updated.caseManager = c.caseManager;
        if (c.physician) updated.physician = c.physician;
        if (c.pharmacy) updated.pharmacy = c.pharmacy;
        if (c.emergencyContact) updated.emergencyContact = c.emergencyContact;
        if (c.emergencyPhone) updated.emergencyPhone = c.emergencyPhone;
        if (diResult.behavioral?.triggers) updated.notes = (updated.notes || "") + "\n[PBSP] Triggers: " + diResult.behavioral.triggers + "\nPrevention: " + (diResult.behavioral.preventionStrategies || "") + "\nCrisis: " + (diResult.behavioral.crisisProtocol || "");
        return updated;
      }));
      // Add extracted medications
      if (diResult.medications?.length > 0) {
        const newMeds = diResult.medications.filter((m) => m.name).map((m) => ({ ...m, id: uid(), residentId: diRes, homeId: r?.homeId || "", status: "active", times: ["8:00 AM"], startDate: td() }));
        if (newMeds.length > 0) setMeds((p) => [...p, ...newMeds]);
      }
      // Add extracted ISP goals
      if (diResult.goals?.length > 0) {
        const newGoals = diResult.goals.filter((g) => g.title).map((g) => ({ ...g, id: uid(), residentId: diRes, homeId: r?.homeId || "", status: "active", startDate: td() }));
        if (newGoals.length > 0) setGoals((p) => [...p, ...newGoals]);
      }
      setDiApplied(true);
      setDiHistory((p) => [...p, { id: uid(), residentId: diRes, docType: diDocType, fileName: diFileName, date: now(), extractedBy: curUser?.name }]);
      logAction("doc_intake", curDocType.label + " for " + (r?.name || "") + " (" + diFileName + ")");
    };

    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>Document Intake</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>Upload ISP, RIT, PBSP, nursing assessments {"\u2014"} AI extracts data into the resident profile</p>
        </div>

        <Card style={{ marginBottom: 14, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 4 }}>Resident</div>
              <ResSelector value={diRes} onChange={setDiRes} />
            </div>
            <Sel label="Document Type" value={diDocType} onChange={(e) => setDiDocType(e.target.value)}>
              {docTypes.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
            </Sel>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".4px", textTransform: "uppercase", marginBottom: 4 }}>Upload File</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: "2px dashed " + (diFile ? C.success : C.border), background: diFile ? C.success + "08" : "#fafbfc", cursor: "pointer", fontSize: 12 }}>
                <Ico d={IC.plus} s={14} c={diFile ? C.success : C.muted} />
                <span style={{ color: diFile ? C.success : C.sub, fontWeight: 600 }}>{diFile ? diFileName : "Choose PDF or image"}</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.doc,.docx" onChange={handleFile} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 11, color: C.sub, marginBottom: 12 }}>
            <b>What AI will extract from {curDocType.label}:</b> {curDocType.extract}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="accent" icon="ai" onClick={doExtract} disabled={diLoading || !diFile || !diRes}>
              {diLoading ? "Extracting..." : "Extract Data from Document"}
            </Btn>
            {diFile && <Btn v="ghost" onClick={() => { setDiFile(null); setDiFileName(""); setDiResult(null); setDiRaw(""); setDiApplied(false); }}>Clear</Btn>}
          </div>
        </Card>

        {/* Extraction Results */}
        {diLoading && (
          <Card style={{ background: "#f8fafc", borderLeft: "3px solid " + C.accent }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.accent }}>
              <div style={{ width: 16, height: 16, border: "2px solid " + C.accent, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>AI is reading and extracting data from {diFileName}...</span>
            </div>
            <style>{"{@keyframes spin { to { transform: rotate(360deg) } }}"}</style>
          </Card>
        )}

        {diResult && (
          <div>
            <Card style={{ marginBottom: 12, background: diApplied ? "#f0fdf4" : "#fff", borderLeft: "3px solid " + (diApplied ? C.success : C.accent) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: diApplied ? C.success : C.text }}>{diApplied ? "\u2705 Data Applied to " + (r?.name || "") : "Extracted Data — Review Before Applying"}</div>
                {!diApplied && <Btn onClick={applyToResident} icon="check">Apply to Resident Profile</Btn>}
              </div>

              {/* Summary */}
              {diResult.summary && (
                <div style={{ padding: "8px 10px", background: C.accent + "08", borderRadius: 6, fontSize: 12, color: C.sub, marginBottom: 10, lineHeight: 1.5 }}>{diResult.summary}</div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Demographics */}
                {diResult.demographics && Object.values(diResult.demographics).some(Boolean) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Demographics</div>
                    {Object.entries(diResult.demographics).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 11, padding: "2px 0", borderBottom: "1px solid " + C.border }}>
                        <span style={{ fontWeight: 600, color: C.sub, textTransform: "capitalize" }}>{k}: </span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contacts */}
                {diResult.contacts && Object.values(diResult.contacts).some(Boolean) && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Contacts</div>
                    {Object.entries(diResult.contacts).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 11, padding: "2px 0", borderBottom: "1px solid " + C.border }}>
                        <span style={{ fontWeight: 600, color: C.sub, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}: </span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medications */}
              {diResult.medications?.length > 0 && diResult.medications.some((m) => m.name) && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Medications ({diResult.medications.filter((m) => m.name).length})</div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {diResult.medications.filter((m) => m.name).map((m, i) => (
                      <div key={i} style={{ padding: "4px 8px", background: "#f8fafc", borderRadius: 4, fontSize: 11, display: "flex", gap: 8 }}>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span style={{ color: C.sub }}>{m.dosage} {m.route} {m.frequency}</span>
                        {m.purpose && <span style={{ color: C.muted }}>{"\u2014"} {m.purpose}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {diResult.goals?.length > 0 && diResult.goals.some((g) => g.title) && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>ISP Goals ({diResult.goals.filter((g) => g.title).length})</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {diResult.goals.filter((g) => g.title).map((g, i) => (
                      <div key={i} style={{ padding: "6px 8px", background: C.accent + "08", borderRadius: 6, fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{g.title} <Badge color={C.accent}>{g.area}</Badge></div>
                        {g.objective && <div style={{ color: C.sub, marginTop: 2 }}>{g.objective}</div>}
                        <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Baseline: {g.baseline || "\u2014"} | Target: {g.target || "\u2014"} | Method: {g.method || "\u2014"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral */}
              {diResult.behavioral && Object.values(diResult.behavioral).some(Boolean) && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Behavioral / Safety</div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {Object.entries(diResult.behavioral).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ padding: "4px 8px", background: k.includes("crisis") || k.includes("reactive") ? "#fef2f2" : "#fffbeb", borderRadius: 4, fontSize: 11 }}>
                        <span style={{ fontWeight: 600, color: C.sub, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}: </span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Raw text fallback if JSON parse failed */}
        {diRaw && !diResult && !diLoading && (
          <Card style={{ borderLeft: "3px solid " + C.warn }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.warn, marginBottom: 6 }}>Could not parse structured data — raw extraction below</div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 400, overflow: "auto" }}>{diRaw}</div>
          </Card>
        )}

        {/* Upload History */}
        {diHistory.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Recent Uploads</div>
            <div style={{ display: "grid", gap: 4 }}>
              {diHistory.slice().reverse().slice(0, 10).map((h) => (
                <div key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: 6, fontSize: 11 }}>
                  <Badge color={C.accent}>{h.docType.toUpperCase()}</Badge>
                  <span style={{ fontWeight: 600 }}>{h.fileName}</span>
                  <span style={{ color: C.sub }}>{rn(h.residentId)}</span>
                  <span style={{ color: C.muted, marginLeft: "auto" }}>{new Date(h.date).toLocaleString()} by {h.extractedBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // HOMES & RESIDENTS MANAGEMENT
  // ============================================================
  const HomesPage = () => {
    const [htab, setHtab] = useState("homes");
    const [hf, setHf] = useState({ name: "", type: "adult", address: "", capacity: 5, status: "active", phone: "", licenseNum: "", licenseExpiry: "" });
    const [rf, setRf] = useState({ name: "", homeId: "", age: "", status: "active", diagnosis: "", serviceLevel: "Medium", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "", admissionDate: td() });

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>Homes & Residents</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{homes.length} homes {"\u00B7"} {res.filter((r) => r.status === "active").length} active residents</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {htab === "homes" && <Btn icon="plus" onClick={() => { setHf({ name: "", type: "adult", address: "", capacity: 5, status: "active", phone: "", licenseNum: "", licenseExpiry: "" }); setEditItem(null); setModal("add-home"); }}>Add Home</Btn>}
            {htab === "residents" && <Btn icon="plus" onClick={() => { setRf({ name: "", homeId: homes[0]?.id || "", age: "", status: "active", diagnosis: "", serviceLevel: "Medium", caseManager: "", physician: "", pharmacy: "", emergencyContact: "", emergencyPhone: "", allergies: "", diet: "", notes: "", admissionDate: td() }); setEditItem(null); setModal("add-resident"); }}>Add Resident</Btn>}
          </div>
        </div>
        <TabBar tabs={[{ id: "homes", label: "Homes (" + homes.length + ")" }, { id: "residents", label: "Residents (" + res.length + ")" }]} active={htab} onChange={setHtab} />

        {/* HOMES LIST */}
        {htab === "homes" && (
          <div style={{ display: "grid", gap: 10 }}>
            {homes.map((h) => {
              const hRes = res.filter((r) => r.homeId === h.id && r.status === "active");
              const hStaff = staff.filter((s) => s.homeId === h.id && s.status === "active");
              return (
                <Card key={h.id} style={{ padding: 14, borderLeft: "4px solid " + (h.type === "children" ? C.purple : C.accent) }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{h.name}</span>
                        <Badge color={h.type === "children" ? C.purple : C.accent}>{h.type}</Badge>
                        <Badge color={h.status === "active" ? C.success : C.danger}>{h.status}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>{h.address}{h.phone ? " \u00B7 " + h.phone : ""}{h.licenseNum ? " \u00B7 License: " + h.licenseNum : ""}</div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                        <span><b>{hRes.length}</b>/{h.capacity} residents</span>
                        <span><b>{hStaff.length}</b> active staff</span>
                        {h.licenseExpiry && du(h.licenseExpiry) <= 60 && du(h.licenseExpiry) >= 0 && <span style={{ color: C.danger, fontWeight: 600 }}>License expires {fmtS(h.licenseExpiry)}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 3, marginTop: 6, height: 6 }}>
                        {Array.from({ length: h.capacity }).map((_, i) => (
                          <div key={i} style={{ flex: 1, borderRadius: 3, background: i < hRes.length ? C.accent : C.border }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(h); setHf({ ...h }); setModal("add-home"); }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* RESIDENTS LIST */}
        {htab === "residents" && (
          <div style={{ display: "grid", gap: 8 }}>
            {res.map((r) => (
              <Card key={r.id} style={{ padding: 12, borderLeft: "3px solid " + (r.status === "active" ? C.success : C.muted) }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.name}</span>
                      <Badge color={C.accent}>{r.serviceLevel}</Badge>
                      <Badge color={C.sub}>{hn(r.homeId)}</Badge>
                      <Badge color={r.status === "active" ? C.success : C.muted}>{r.status}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.sub }}>
                      {r.age ? "Age " + r.age + " \u00B7 " : ""}{r.diagnosis || "No dx"}{r.allergies ? " \u00B7 Allergies: " + r.allergies : ""}{r.caseManager ? " \u00B7 CM: " + r.caseManager : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn sm v="ghost" icon="eye" onClick={() => { setPage("resident360"); }} />
                    <Btn sm v="ghost" icon="edit" onClick={() => { setEditItem(r); setRf({ ...r }); setModal("add-resident"); }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ADD/EDIT HOME MODAL */}
        <Modal open={modal === "add-home"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Home" : "Add New Home"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Home Name" value={hf.name} onChange={(e) => setHf((f) => ({ ...f, name: e.target.value }))} placeholder="Blue Ocean \u2014 West Home" />
            <Sel label="Type" value={hf.type} onChange={(e) => setHf((f) => ({ ...f, type: e.target.value }))}><option value="adult">Adult (18+)</option><option value="children">Children / Youth</option><option value="mixed">Mixed</option></Sel>
            <Inp label="Address" value={hf.address} onChange={(e) => setHf((f) => ({ ...f, address: e.target.value }))} placeholder="Beaverton, OR" />
            <Inp label="Phone" value={hf.phone} onChange={(e) => setHf((f) => ({ ...f, phone: e.target.value }))} />
            <Inp label="Capacity" type="number" value={hf.capacity} onChange={(e) => setHf((f) => ({ ...f, capacity: parseInt(e.target.value) || 5 }))} />
            <Sel label="Status" value={hf.status} onChange={(e) => setHf((f) => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending License</option></Sel>
            <Inp label="License Number" value={hf.licenseNum} onChange={(e) => setHf((f) => ({ ...f, licenseNum: e.target.value }))} placeholder="OR-ODDS-XXXX" />
            <Inp label="License Expiry" type="date" value={hf.licenseExpiry} onChange={(e) => setHf((f) => ({ ...f, licenseExpiry: e.target.value }))} />
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={() => {
            if (!hf.name) return;
            if (editItem) { setHomes((p) => p.map((h) => (h.id === editItem.id ? { ...editItem, ...hf } : h))); logAction("edit_home", hf.name); }
            else { setHomes((p) => [...p, { ...hf, id: uid() }]); logAction("add_home", hf.name); }
            setModal(null); setEditItem(null);
          }}>{editItem ? "Update Home" : "Create Home"}</Btn></div>
        </Modal>

        {/* ADD/EDIT RESIDENT MODAL */}
        <Modal open={modal === "add-resident"} onClose={() => { setModal(null); setEditItem(null); }} title={editItem ? "Edit Resident" : "Admit New Resident"} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Inp label="Full Name" value={rf.name} onChange={(e) => setRf((f) => ({ ...f, name: e.target.value }))} />
            <Sel label="Home" value={rf.homeId} onChange={(e) => setRf((f) => ({ ...f, homeId: e.target.value }))}>{homes.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}</Sel>
            <Inp label="Age" type="number" value={rf.age} onChange={(e) => setRf((f) => ({ ...f, age: e.target.value }))} />
            <Sel label="Status" value={rf.status} onChange={(e) => setRf((f) => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="discharged">Discharged</option><option value="pending">Pending Admission</option><option value="temporary">Temporary Leave</option></Sel>
            <Sel label="Service Level" value={rf.serviceLevel} onChange={(e) => setRf((f) => ({ ...f, serviceLevel: e.target.value }))}><option>Low</option><option>Medium</option><option>High</option><option>Very High</option><option>Intensive</option></Sel>
            <Inp label="Admission Date" type="date" value={rf.admissionDate} onChange={(e) => setRf((f) => ({ ...f, admissionDate: e.target.value }))} />
            <Inp label="Diagnosis" value={rf.diagnosis} onChange={(e) => setRf((f) => ({ ...f, diagnosis: e.target.value }))} placeholder="I/DD, behavioral" />
            <Inp label="Allergies" value={rf.allergies} onChange={(e) => setRf((f) => ({ ...f, allergies: e.target.value }))} style={{ borderColor: rf.allergies ? C.danger : C.border }} />
            <Inp label="Diet" value={rf.diet} onChange={(e) => setRf((f) => ({ ...f, diet: e.target.value }))} />
            <Inp label="Case Manager" value={rf.caseManager} onChange={(e) => setRf((f) => ({ ...f, caseManager: e.target.value }))} />
            <Inp label="Physician" value={rf.physician} onChange={(e) => setRf((f) => ({ ...f, physician: e.target.value }))} />
            <Inp label="Pharmacy" value={rf.pharmacy} onChange={(e) => setRf((f) => ({ ...f, pharmacy: e.target.value }))} />
            <Inp label="Emergency Contact" value={rf.emergencyContact} onChange={(e) => setRf((f) => ({ ...f, emergencyContact: e.target.value }))} />
            <Inp label="Emergency Phone" value={rf.emergencyPhone} onChange={(e) => setRf((f) => ({ ...f, emergencyPhone: e.target.value }))} />
          </div>
          <TA label="Notes / Special Instructions" value={rf.notes} onChange={(e) => setRf((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <div style={{ marginTop: 14 }}><Btn onClick={() => {
            if (!rf.name || !rf.homeId) return;
            if (editItem) { setRes((p) => p.map((r) => (r.id === editItem.id ? { ...editItem, ...rf } : r))); logAction("edit_resident", rf.name); }
            else { setRes((p) => [...p, { ...rf, id: uid() }]); logAction("admit_resident", rf.name + " to " + hn(rf.homeId)); }
            setModal(null); setEditItem(null);
          }}>{editItem ? "Update Resident" : "Admit Resident"}</Btn></div>
        </Modal>
      </div>
    );
  };

  // ============================================================
  // AI ASSISTANT — Multi-capability ODDS-compliant AI
  // ============================================================
  const AiAssist = () => {
    const [aiTab, setAiTab] = useState("incident");
    const [aiOut, setAiOut] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRes, setAiRes] = useState(activeRes[0]?.id || null);
    // Incident fields
    const [aiIncDesc, setAiIncDesc] = useState("");
    const [aiIncType, setAiIncType] = useState("behavioral");
    // T-Log fields
    const [aiTlogRaw, setAiTlogRaw] = useState("");
    // ISP fields
    const [aiIspGoalId, setAiIspGoalId] = useState("");
    // General query
    const [aiQuery, setAiQuery] = useState("");

    const r = res.find((x) => x.id === aiRes);
    const resGoals = goals.filter((g) => g.residentId === aiRes);
    const resNotes = notes.filter((n) => n.residentId === aiRes).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);
    const resInc = inc.filter((n) => n.residentId === aiRes).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);
    const resHealth = health.filter((h) => h.residentId === aiRes).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 20);
    const resMeds = meds.filter((m) => m.residentId === aiRes && m.status !== "discontinued");
    const resGD = goalData.filter((d) => resGoals.some((g) => g.id === d.goalId)).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 30);

    const SYS = "You are an AI assistant for Blue Ocean Care, a 24-hour residential group home in Beaverton, Oregon operating under OAR 411-325. All outputs must be ODDS-compliant, person-centered, factual, and professional. Use person-first language. Never fabricate information. Only use data provided.";

    const callAi = async (prompt) => {
      setAiLoading(true);
      setAiOut("");
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYS, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await resp.json();
        const text = (data.content || []).map((b) => b.text || "").join("\n");
        setAiOut(text);
      } catch (e) {
        setAiOut("Error: " + (e.message || "AI request failed"));
      }
      setAiLoading(false);
    };

    const doIncident = () => {
      if (!aiIncDesc) return;
      callAi("Draft an ODDS-compliant incident report for Oregon OAR 411-325.\nResident: " + (r?.name || "Unknown") + "\nDiagnosis: " + (r?.diagnosis || "I/DD") + "\nHome type: " + (homes.find((h) => h.id === r?.homeId)?.type || "adult") + "\nIncident type: " + aiIncType + "\nDate: " + td() + "\nStaff description:\n" + aiIncDesc + "\n\nProvide:\n1. Formatted incident narrative (factual, person-first, no assumptions)\n2. Immediate actions taken / recommended\n3. Follow-up actions required\n4. Who to notify (ODDS reporting requirements for this type)\n5. Preventive measures / safety plan updates");
    };

    const doTlog = () => {
      if (!aiTlogRaw) return;
      callAi("Convert these raw shift notes into a professional ODDS-compliant T-Log / shift communication entry for a 24-hour residential group home.\nHome: " + (homes.find((h) => h.id === r?.homeId)?.name || "") + "\nResidents covered: " + activeRes.filter((ar) => ar.homeId === r?.homeId).map((ar) => ar.name).join(", ") + "\nDate: " + td() + "\n\nRaw notes:\n" + aiTlogRaw + "\n\nFormat into:\n1. Clear shift summary\n2. Individual resident updates\n3. Follow-up items for next shift\n4. Any safety concerns flagged\nKeep it concise and factual.");
    };

    const doIspAnalysis = () => {
      const g = resGoals.find((x) => x.id === aiIspGoalId);
      if (!g) return;
      const gd = goalData.filter((d) => d.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      callAi("Analyze ISP goal progress for ODDS documentation.\nResident: " + (r?.name || "Unknown") + "\nGoal: " + g.title + "\nArea: " + g.area + "\nObjective: " + g.objective + "\nBaseline: " + g.baseline + "\nTarget: " + g.target + "\nMethod: " + g.method + "\nData points (" + gd.length + " entries):\n" + gd.map((d) => d.date + ": " + d.value + (d.note ? " (" + d.note + ")" : "")).join("\n") + "\n\nProvide:\n1. Trend analysis (improving, stable, declining)\n2. Current performance vs target\n3. Recommended ISP updates or strategy changes\n4. Suggested language for ISP progress report\n5. Whether goal should continue, be modified, or is met");
    };

    const doHealthReview = () => {
      callAi("Review health data for clinical patterns and flag concerns.\nResident: " + (r?.name || "Unknown") + " | Age: " + (r?.age || "?") + " | Dx: " + (r?.diagnosis || "I/DD") + "\nAllergies: " + (r?.allergies || "None") + "\nMedications: " + resMeds.map((m) => m.name + " " + m.dosage + " (" + m.purpose + ")").join("; ") + "\n\nRecent health data:\n" + resHealth.map((h) => h.date + " " + h.type + ": " + [h.bp, h.pulse && "P:" + h.pulse, h.temp && "T:" + h.temp, h.o2 && "O2:" + h.o2, h.weight && h.weight + "lb", h.bowel, h.sleep && h.sleep + "h sleep", h.notes].filter(Boolean).join(", ")).join("\n") + "\n\nProvide:\n1. Any concerning trends (BP, weight, bowel, sleep patterns)\n2. Potential medication side effects to watch for\n3. Recommended follow-up actions\n4. Items to discuss with physician at next appointment\nBe clinically precise but note you are not providing medical advice.");
    };

    const doQuery = () => {
      if (!aiQuery) return;
      const ctx = "Context about " + (r?.name || "the facility") + ":\n" + (r ? "Resident: " + r.name + ", Age: " + r.age + ", Dx: " + r.diagnosis + ", Service Level: " + r.serviceLevel + "\nMedications: " + resMeds.map((m) => m.name + " " + m.dosage).join(", ") + "\nActive Goals: " + resGoals.map((g) => g.title + " (" + g.area + ")").join(", ") + "\nRecent notes: " + resNotes.slice(0, 3).map((n) => n.date + ": " + (n.content || "").slice(0, 100)).join("\n") : "Homes: " + homes.map((h) => h.name).join(", ") + "\nResidents: " + res.filter((x) => x.status === "active").map((x) => x.name).join(", "));
      callAi(ctx + "\n\nUser question: " + aiQuery + "\n\nAnswer helpfully within ODDS compliance. If about a specific resident, use available data. If about regulations, reference OAR 411-325 specifically.");
    };

    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 19, color: C.text }}>AI Assistant</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>ODDS-compliant AI for documentation, analysis, and decision support</p>
        </div>

        <ResSelector value={aiRes} onChange={setAiRes} showAll />

        <TabBar tabs={[
          { id: "incident", label: "Incident Report" },
          { id: "tlog", label: "T-Log Writer" },
          { id: "isp", label: "ISP Analysis" },
          { id: "health", label: "Health Review" },
          { id: "ask", label: "Ask Anything" },
        ]} active={aiTab} onChange={setAiTab} />

        {/* INCIDENT REPORT DRAFTER */}
        {aiTab === "incident" && (
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>Draft ODDS Incident Report</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>Describe what happened in plain language. AI will format it into a compliant incident report with required fields, follow-up actions, and ODDS notification requirements.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Sel label="Incident Type" value={aiIncType} onChange={(e) => setAiIncType(e.target.value)}>
                <option value="behavioral">Behavioral</option><option value="elopement">Elopement</option><option value="medical">Medical Emergency</option><option value="injury">Injury</option>
                <option value="property">Property Damage</option><option value="medication-error">Medication Error</option><option value="restraint">Restraint</option><option value="abuse-allegation">Abuse Allegation</option>
                <option value="fall">Fall</option><option value="self-injury">Self-Injury</option>
              </Sel>
              <div style={{ fontSize: 10, color: C.muted, padding: "16px 0 0" }}>Resident: <b>{r?.name || "Select above"}</b></div>
            </div>
            <TA label="What Happened (plain language)" value={aiIncDesc} onChange={(e) => setAiIncDesc(e.target.value)} rows={4} placeholder="e.g. At 3:15pm resident became agitated during transition from day program. Threw a chair. No one was injured. Staff used verbal de-escalation..." />
            <div style={{ marginTop: 10 }}><Btn v="accent" icon="ai" onClick={doIncident} disabled={aiLoading || !aiIncDesc || !aiRes}>Generate Incident Report</Btn></div>
          </Card>
        )}

        {/* T-LOG WRITER */}
        {aiTab === "tlog" && (
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>T-Log / Shift Summary Writer</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>Paste your raw shift notes, quick texts, or bullet points. AI will organize them into a professional shift handoff entry.</p>
            <TA label="Raw Shift Notes" value={aiTlogRaw} onChange={(e) => setAiTlogRaw(e.target.value)} rows={5} placeholder="e.g. res A had good morning, ate 80% breakfast. res B refused shower, tried again at 10 worked fine. med pass done 8am all given. C had appt with Dr Smith at 2pm - new rx for melatonin. fire drill at 11am all evacuated 2 mins." />
            <div style={{ marginTop: 10 }}><Btn v="accent" icon="ai" onClick={doTlog} disabled={aiLoading || !aiTlogRaw}>Format T-Log Entry</Btn></div>
          </Card>
        )}

        {/* ISP GOAL ANALYSIS */}
        {aiTab === "isp" && (
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>ISP Goal Progress Analysis</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>Select a goal to get AI-powered trend analysis, progress assessment, and recommended ISP language for quarterly reviews.</p>
            {!aiRes ? <div style={{ color: C.muted, fontSize: 12 }}>Select a resident above</div> :
              resGoals.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>No goals set for this resident</div> : (
                <div>
                  <Sel label="Select Goal" value={aiIspGoalId} onChange={(e) => setAiIspGoalId(e.target.value)}>
                    <option value="">---</option>
                    {resGoals.map((g) => (<option key={g.id} value={g.id}>{g.title} ({g.area}) - {goalData.filter((d) => d.goalId === g.id).length} data pts</option>))}
                  </Sel>
                  <div style={{ marginTop: 10 }}><Btn v="accent" icon="ai" onClick={doIspAnalysis} disabled={aiLoading || !aiIspGoalId}>Analyze Goal Progress</Btn></div>
                </div>
              )
            }
          </Card>
        )}

        {/* HEALTH REVIEW */}
        {aiTab === "health" && (
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>Health Data Review</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>AI reviews vitals, weight, bowel, and sleep data alongside medications to flag potential concerns and prepare for physician visits.</p>
            {!aiRes ? <div style={{ color: C.muted, fontSize: 12 }}>Select a resident above</div> :
              resHealth.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>No health data recorded. Start tracking in Health Tracking.</div> : (
                <div>
                  <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, fontSize: 11, color: C.sub, marginBottom: 10 }}>
                    <b>{r?.name}</b> {"\u00B7"} {resHealth.length} health entries {"\u00B7"} {resMeds.length} medications {"\u00B7"} Allergies: {r?.allergies || "None"}
                  </div>
                  <Btn v="accent" icon="ai" onClick={doHealthReview} disabled={aiLoading}>Run Health Review</Btn>
                </div>
              )
            }
          </Card>
        )}

        {/* ASK ANYTHING */}
        {aiTab === "ask" && (
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>Ask Anything</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>Ask about ODDS regulations, care strategies, documentation help, or anything about your residents. AI uses resident data in context.</p>
            <TA label="Your Question" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} rows={3} placeholder="e.g. What are the ODDS reporting requirements for elopement? / What activities would help Resident A1 with social skills? / Draft an email to the case manager about the upcoming ISP meeting..." />
            <div style={{ marginTop: 10 }}><Btn v="accent" icon="ai" onClick={doQuery} disabled={aiLoading || !aiQuery}>Ask AI</Btn></div>
          </Card>
        )}

        {/* AI OUTPUT */}
        {(aiLoading || aiOut) && (
          <Card style={{ marginTop: 14, background: aiLoading ? "#f8fafc" : "#f0fdf4", borderLeft: "3px solid " + (aiLoading ? C.muted : C.success) }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: aiLoading ? C.muted : C.success, textTransform: "uppercase", marginBottom: 6 }}>{aiLoading ? "Generating..." : "AI Output"}</div>
            {aiLoading ? (
              <div style={{ color: C.muted, fontSize: 12 }}>Processing your request...</div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 400, overflow: "auto" }}>{aiOut}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Btn sm v="secondary" onClick={() => { navigator.clipboard.writeText(aiOut); }}>Copy to Clipboard</Btn>
                  {aiTab === "incident" && canWrite("incidents") && (
                    <Btn sm onClick={() => {
                      setInc((p) => [...p, { id: uid(), title: aiIncType + " incident - " + (r?.name || ""), type: aiIncType, severity: "medium", status: "open", homeId: r?.homeId || "", residentId: aiRes || "", date: td(), time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), description: aiOut, actionTaken: "", createdAt: now() }]);
                      logAction("ai_incident", "AI-drafted incident for " + (r?.name || ""));
                    }}>Save as Incident</Btn>
                  )}
                  {aiTab === "tlog" && canWrite("tlog") && (
                    <Btn sm onClick={() => {
                      setTlog((p) => [...p, { id: uid(), homeId: r?.homeId || userHomes[0]?.id || "", date: td(), shift: new Date().getHours() < 14 ? "Day" : new Date().getHours() < 22 ? "Evening" : "Night", author: curUser?.name || "", content: aiOut, priority: "normal" }]);
                      logAction("ai_tlog", "AI-formatted T-Log entry");
                    }}>Save as T-Log</Btn>
                  )}
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 8 }}>AI-generated content. Review for accuracy before saving. This is a decision-support tool, not a substitute for professional judgment.</div>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  };

  const CompPage = () => {
    const checks = [];
    userHomes.forEach((h) => {
      const hS = staff.filter((s) => s.homeId === h.id && s.status === "active");
      const hR = res.filter((r) => r.homeId === h.id && r.status === "active");
      const n = h.name.split("\u2014")[1]?.trim() || h.name;
      checks.push({ home: n, rule: "411-325-0170", item: "Staff assigned", pass: hS.length >= 1 });
      if (h.type === "children") checks.push({ home: n, rule: "411-325-0170", item: "Awake night staff", pass: hS.some((s) => s.role === "Awake Night" || s.shift === "Night") });
      checks.push({ home: n, rule: "411-325-0025", item: "ISP goals documented", pass: hR.every((r) => goals.some((g) => g.residentId === r.id)) });
      checks.push({ home: n, rule: "411-325-0120", item: "Medications tracked", pass: hR.length === 0 || hR.every((r) => meds.some((m) => m.residentId === r.id)) });
      checks.push({ home: n, rule: "411-325-0185", item: "Emergency contacts", pass: hR.every((r) => r.emergencyContact && r.emergencyPhone) });
    });
    const score = checks.length ? Math.round(checks.filter((c) => c.pass).length / checks.length * 100) : 0;
    return (
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: 19, color: C.text }}>Compliance: {score}%</h2>
        <div style={{ display: "grid", gap: 6 }}>{checks.map((c, i) => (
          <Card key={i} style={{ padding: 10, borderLeft: "3px solid " + (c.pass ? C.success : C.danger) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div><span style={{ fontWeight: 600 }}>{c.item}</span> <span style={{ color: C.muted }}>{c.home} - OAR {c.rule}</span></div>
              <Badge color={c.pass ? C.success : C.danger}>{c.pass ? "PASS" : "FAIL"}</Badge>
            </div>
          </Card>
        ))}</div>
      </div>
    );
  };

  // ============================================================
  // RENDER ROUTING
  // ============================================================
  const renderPage = () => {
    if (!canView(page) && page !== "dashboard") { setPage("dashboard"); return (<Dashboard />); }
    switch (page) {
      case "dashboard": return (<Dashboard />);
      case "shiftboard": return (<ShiftBoard />);
      case "resident360": return (<Resident360 />);
      case "mar": return (<MARPage />);
      case "goals": return (<GoalsPage />);
      case "notes": return (<NotesPage />);
      case "tlog": return (<TLogPage />);
      case "health": return (<HealthPage />);
      case "appointments": return (<ApptsPage />);
      case "incidents": return (<SimpleCrud title="Incidents" icon="alert" data={inc} setData={setInc} fields={incF} modalId="crud-inc" getBadges={(i) => (<><Badge color={i.severity === "high" || i.severity === "critical" ? C.danger : C.warn}>{i.severity}</Badge><Badge>{i.type}</Badge></>)} getSub={(i) => [fmt(i.date), rn(i.residentId), (i.description || "").slice(0, 80)].filter(Boolean).join(" \u00B7 ")} />);
      case "staff": return (<SimpleCrud title="Staff" icon="star" data={staff} setData={setStaff} fields={staffF} modalId="crud-staff" getBadges={(i) => (<><Badge>{i.role}</Badge><Badge color={C.purple}>{i.shift}</Badge></>)} getSub={(i) => [i.phone, i.email, hn(i.homeId)].filter(Boolean).join(" \u00B7 ")} />);
      case "comms": return (<SimpleCrud title="Communications" icon="msg" data={comms} setData={setComms} fields={commF} modalId="crud-comm" getBadges={(i) => (<><Badge>{i.type}</Badge><Badge color={C.sub}>{i.contactRole}</Badge></>)} getSub={(i) => [fmt(i.date), rn(i.residentId), (i.summary || "").slice(0, 80)].filter(Boolean).join(" \u00B7 ")} />);
      case "tasks": return (<SimpleCrud title="Tasks" icon="check" data={tasks} setData={setTasks} fields={taskF} modalId="crud-task" getBadges={(i) => (<><Badge color={i.priority === "high" ? C.danger : C.warn}>{i.priority}</Badge><Badge color={C.sub}>{i.category}</Badge></>)} getSub={(i) => [i.due ? "Due: " + fmt(i.due) : "", i.assignedTo].filter(Boolean).join(" \u00B7 ")} />);
      case "compliance": return (<CompPage />);
      case "homes": return (<HomesPage />);
      case "docingest": return (<DocIngest />);
      case "aiassist": return (<AiAssist />);
      case "users": return (<UserMgmt />);
      default: return (<Dashboard />);
    }
  };

  // ============================================================
  // LOADING + AUTH GATE
  // ============================================================
  if (!loaded) return (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", background: C.primary }}><div style={{ textAlign: "center", color: "#fff" }}><div style={{ fontSize: 24, fontWeight: 700 }}>{"\uD83C\uDF0A"} Blue Ocean Care</div><div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Loading...</div></div></div>);
  if (!curUser) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", background: "linear-gradient(135deg, #082e36, " + C.primary + ", " + C.accent + ")" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 36, width: 360, boxShadow: "0 25px 60px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{"\uD83C\uDF0A"}</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, color: C.text }}>Blue Ocean Care</h2>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>OAR 411-325 Compliant {"\u00B7"} Secure Access</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Inp label="Username" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Enter username" onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} autoComplete="off" />
          <Inp label="PIN" type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="4-digit PIN" maxLength={8} onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} autoComplete="off" />
          {loginErr && <div style={{ color: C.danger, fontSize: 11, fontWeight: 600, padding: "4px 8px", background: "#fef2f2", borderRadius: 6 }}>{loginErr}</div>}
          <Btn onClick={doLogin} style={{ width: "100%", justifyContent: "center", padding: "10px 14px", fontSize: 13 }}>Sign In</Btn>
        </div>
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 10, color: C.muted }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Demo Accounts:</div>
          <div>Owner: <b>admin</b> / PIN: <b>1234</b></div>
          <div>DSP Staff: <b>dsp</b> / PIN: <b>0000</b> (Adult Home only)</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", height: "100vh", background: C.bg, color: "#334155", fontSize: 13 }}>
      <aside style={{ width: sideOpen ? 210 : 50, background: "linear-gradient(180deg, #082e36, " + C.primary + ")", display: "flex", flexDirection: "column", transition: "width .2s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: sideOpen ? "14px 12px" : "14px 8px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minHeight: 50 }} onClick={() => setSideOpen(!sideOpen)}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>{"\uD83C\uDF0A"}</div>
          {sideOpen && <div><div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Blue Ocean Care</div><div style={{ fontSize: 8, color: "rgba(255,255,255,.35)" }}>v4 {"\u00B7"} {ROLES[role]?.label}</div></div>}
        </div>

        {sideOpen && (
          <div style={{ padding: "8px 8px 2px" }}>
            <select value={fh} onChange={(e) => setFh(e.target.value)} style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 10, fontFamily: "inherit", outline: "none" }}>
              {userHomes.length > 1 && <option value="all" style={{ color: "#000" }}>All Homes</option>}
              {userHomes.map((h) => (<option key={h.id} value={h.id} style={{ color: "#000" }}>{h.name}</option>))}
            </select>
          </div>
        )}

        <nav style={{ flex: 1, padding: "4px 5px", display: "flex", flexDirection: "column", gap: 1, overflow: "auto" }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: sideOpen ? "7px 9px" : "7px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: page === n.id ? 600 : 400, background: page === n.id ? "rgba(255,255,255,.1)" : "transparent", color: page === n.id ? "#fff" : "rgba(255,255,255,.5)", transition: "all .1s", justifyContent: sideOpen ? "flex-start" : "center" }}>
              <Ico d={IC[n.icon] || ""} s={14} />{sideOpen && n.label}
              {sideOpen && can(n.id) === "view" && <span style={{ marginLeft: "auto", fontSize: 8, color: "rgba(255,255,255,.25)" }}>VIEW</span>}
            </button>
          ))}
        </nav>

        {/* User bar at bottom */}
        <div style={{ padding: sideOpen ? "10px 10px" : "10px 5px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          {sideOpen ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: 99, background: ROLES[role]?.color || C.muted, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{curUser?.name?.[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{curUser?.name}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,.4)" }}>{ROLES[role]?.label}</div>
                </div>
              </div>
              <button onClick={doLogout} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(255,255,255,.5)", fontSize: 10, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                <Ico d={IC.logout} s={10} /> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={doLogout} title="Sign Out" style={{ width: "100%", display: "flex", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ico d={IC.logout} s={14} c="rgba(255,255,255,.4)" /></button>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", padding: "18px 24px" }}>
        <SmartAlerts />
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
