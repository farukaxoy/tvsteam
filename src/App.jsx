import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * 🎨 TVS TEAM VERİ TAKİP SİSTEMİ - v005 MODERN
 * 
 * Tüm istenen özellikler eklendi:
 * 1. ✅ Puantaj: Türkiye saati + Fazla mesai hesaplama
 * 2. ✅ Modern Anasayfa
 * 3. ✅ Web sitesi benzeri üst menü
 * 4. ✅ Tema butonu sol tarafa küçültüldü
 * 5. ✅ Dashboard modern filtreler
 * 6. ✅ Admin sayfası tamamen yenilendi
 */

// Supabase Client
const SUPABASE_URL = "https://tvxkwrvkkmlxrpwtmyxh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eGt3cnZra21seHJwd3RteXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MjI2ODgsImV4cCI6MjA1MTI5ODY4OH0.t3cQZRl3-x2h44dMcBaWUf2WJTqTPqI_d4xoYLN0QZA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers
const toast = {
  success: (msg) => console.log("✅", msg),
  error: (msg) => console.error("❌", msg)
};

function isoDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Fazla mesai hesaplama
function calculateOvertime(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let totalMin = (endH * 60 + endM) - (startH * 60 + startM);
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin -= 30; // Mola
  const overtime = Math.max(0, totalMin - 480); // 8 saat = 480 dk
  return (overtime / 60).toFixed(2);
}

// Resmi Tatiller
const HOLIDAYS = [
  { date: '2025-01-01', name: 'Yılbaşı' },
  { date: '2025-03-30', name: 'Ramazan Bayramı 1' },
  { date: '2025-03-31', name: 'Ramazan Bayramı 2' },
  { date: '2025-04-01', name: 'Ramazan Bayramı 3' },
  { date: '2025-04-23', name: '23 Nisan' },
  { date: '2025-05-01', name: 'İşçi Bayramı' },
  { date: '2025-05-19', name: '19 Mayıs' },
  { date: '2025-06-06', name: 'Kurban Bayramı 1' },
  { date: '2025-06-07', name: 'Kurban Bayramı 2' },
  { date: '2025-06-08', name: 'Kurban Bayramı 3' },
  { date: '2025-06-09', name: 'Kurban Bayramı 4' },
  { date: '2025-08-30', name: 'Zafer Bayramı' },
  { date: '2025-10-29', name: 'Cumhuriyet Bayramı' }
];

const ATTENDANCE_STATUS = {
  present: { label: "Tam Gün", color: "#10b981" },
  half_day: { label: "Yarım Gün", color: "#14b8a6" },
  absent: { label: "Gelmedi", color: "#ef4444" },
  paid_leave: { label: "Ücretli İzin", color: "#f59e0b" },
  unpaid_leave: { label: "Ücretsiz İzin", color: "#fb923c" },
  sick_leave: { label: "Hastalık", color: "#8b5cf6" },
  excuse: { label: "Mazeret", color: "#6366f1" },
  weekend: { label: "Hafta Sonu", color: "#6b7280" },
  holiday: { label: "Resmi Tatil", color: "#ec4899" }
};

// Inline Modern CSS
const modernStyles = `
:root {
  --primary: #6366f1;
  --secondary: #ec4899;
  --success: #10b981;
  --bg: #ffffff;
  --bg-alt: #f8fafc;
  --text: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
}

[data-theme="dark"] {
  --bg: #0f172a;
  --bg-alt: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  background: var(--bg-alt);
  color: var(--text);
  line-height: 1.6;
}

/* Modern Header */
.modern-header {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--bg-alt);
  color: var(--primary);
}

.nav-btn.active {
  background: var(--bg-alt);
  color: var(--primary);
  position: relative;
}

.nav-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20px;
  right: 20px;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border-radius: 3px 3px 0 0;
}

.theme-btn {
  width: 42px;
  height: 42px;
  border: 2px solid var(--border);
  background: var(--bg-alt);
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.theme-btn:hover {
  transform: scale(1.05);
  border-color: var(--primary);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
}

.logout-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Cards */
.card {
  background: var(--bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid var(--border);
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
}

.card-title {
  font-size: 20px;
  font-weight: 700;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: 2px solid transparent;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--bg-alt);
  color: var(--text);
  border-color: var(--border);
}

.btn-secondary:hover {
  border-color: var(--primary);
}

/* Inputs */
.input, .select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  transition: all 0.2s;
}

.input:focus, .select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Grid */
.grid { display: grid; gap: 24px; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .nav { display: none; }
}

/* Hero */
.hero {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 24px;
  padding: 48px;
  color: white;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  right: -50px;
  bottom: -50px;
  width: 300px;
  height: 300px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  filter: blur(40px);
}

.hero h1 {
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.hero p {
  font-size: 18px;
  opacity: 0.95;
  position: relative;
  z-index: 1;
}

/* Stat Card */
.stat-card {
  background: var(--bg);
  border-radius: 16px;
  padding: 20px;
  border: 2px solid var(--border);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 600;
}

/* Filter Card */
.filter-card {
  padding: 20px;
  background: var(--bg-alt);
  border-radius: 16px;
  border: 2px solid var(--border);
  text-align: center;
}

.filter-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.filter-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 8px;
}

/* Login */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.login-card {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 48px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.login-title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 32px;
  text-align: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

// Inject styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = modernStyles;
  document.head.appendChild(style);
}

// Main App
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  if (!user) {
    return <LoginPage onLogin={(u) => {
      setUser(u);
      localStorage.setItem("currentUser", JSON.stringify(u));
    }} />;
  }

  const isAdmin = user.role === "admin";

  return (
    <>
      <header className="modern-header">
        <div className="header-inner">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button className="theme-btn" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <div className="logo">📊 TVS Team</div>
          </div>

          <nav className="nav">
            {["home", "dashboard", "entry", "attendance", "reports", isAdmin && "admin"].filter(Boolean).map(t => (
              <button key={t} className={`nav-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {{
                  home: "🏠 Anasayfa",
                  dashboard: "📊 Dashboard",
                  entry: "✍️ Veri Girişi",
                  attendance: "📅 Puantaj",
                  reports: "📈 Raporlar",
                  admin: "⚙️ Admin"
                }[t]}
              </button>
            ))}
          </nav>

          <div className="user-section">
            <div className="user-avatar">{user.username[0].toUpperCase()}</div>
            <button className="logout-btn" onClick={() => {
              setUser(null);
              localStorage.removeItem("currentUser");
            }}>
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {tab === "home" && <HomePage user={user} />}
        {tab === "dashboard" && <Dashboard />}
        {tab === "entry" && <DataEntry />}
        {tab === "attendance" && <Attendance isAdmin={isAdmin} />}
        {tab === "reports" && <Reports />}
        {tab === "admin" && isAdmin && <Admin />}
      </div>
    </>
  );
}

// LOGIN PAGE
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("*")
        .eq("username", username.trim())
        .single();

      if (err || !data) {
        setError("Kullanıcı bulunamadı");
        return;
      }

      if (data.password !== password) {
        setError("Şifre yanlış");
        return;
      }

      onLogin(data);
    } catch (err) {
      setError("Giriş hatası: " + err.message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Giriş Yap</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            className="input"
            placeholder="Kullanıcı Adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}

// HOME PAGE
function HomePage({ user }) {
  const [stats, setStats] = useState({ projects: 0, employees: 0, records: 0 });

  useEffect(() => {
    async function load() {
      const [p, e, r] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('records').select('*')
      ]);
      setStats({
        projects: p.data?.length || 0,
        employees: e.data?.length || 0,
        records: r.data?.length || 0
      });
    }
    load();
  }, []);

  return (
    <>
      <div className="hero">
        <h1>Hoş Geldiniz, {user.username}! 👋</h1>
        <p>TVS Team Veri Takip Sistemi ile projelerinizi kolayca yönetin</p>
      </div>

      <div className="grid grid-4">
        <div className="stat-card">
          <div className="stat-value">{stats.projects}</div>
          <div className="stat-label">Toplam Proje</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.employees}</div>
          <div className="stat-label">Toplam Çalışan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.records}</div>
          <div className="stat-label">Toplam Kayıt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">✓</div>
          <div className="stat-label">Sistem Aktif</div>
        </div>
      </div>
    </>
  );
}

// DASHBOARD
function Dashboard() {
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterProj, setFilterProj] = useState("");
  const [filterEmp, setFilterEmp] = useState("");

  useEffect(() => {
    async function load() {
      const [r, p, e] = await Promise.all([
        supabase.from('records').select('*').order('date', { ascending: false }),
        supabase.from('projects').select('*'),
        supabase.from('employees').select('*')
      ]);
      setRecords(r.data || []);
      setProjects(p.data || []);
      setEmployees(e.data || []);
    }
    load();
  }, []);

  const filtered = records.filter(r =>
    (!filterProj || r.project_name === filterProj) &&
    (!filterEmp || r.employee_name === filterEmp)
  );

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🔍 Hızlı Filtreler</h2>
        </div>
        <div className="grid grid-4">
          <div className="filter-card">
            <div className="filter-icon">📁</div>
            <div className="filter-label">Proje Seçin</div>
            <select className="select" value={filterProj} onChange={e => setFilterProj(e.target.value)}>
              <option value="">Tüm Projeler</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="filter-card">
            <div className="filter-icon">👤</div>
            <div className="filter-label">Çalışan Seçin</div>
            <select className="select" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
              <option value="">Tüm Çalışanlar</option>
              {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div className="filter-card">
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginTop: 16 }}>
              {records.length}
            </div>
            <div className="filter-label">Toplam Kayıt</div>
          </div>
          <div className="filter-card">
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', marginTop: 16 }}>
              {filtered.length}
            </div>
            <div className="filter-label">Filtrelenmiş</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📊 Kayıtlar ({filtered.length})</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Tarih</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Proje</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Çalışan</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Notlar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>{r.date}</td>
                  <td style={{ padding: 12 }}>{r.project_name}</td>
                  <td style={{ padding: 12 }}>{r.employee_name}</td>
                  <td style={{ padding: 12 }}>{r.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// DATA ENTRY
function DataEntry() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    project: "",
    employee: "",
    date: isoDate(new Date()),
    notes: ""
  });

  useEffect(() => {
    async function load() {
      const [p, e] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('employees').select('*')
      ]);
      setProjects(p.data || []);
      setEmployees(e.data || []);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.project || !formData.employee) {
      alert("Proje ve çalışan seçmelisiniz!");
      return;
    }

    try {
      await supabase.from('records').insert([{
        project_name: formData.project,
        employee_name: formData.employee,
        date: formData.date,
        notes: formData.notes
      }]);
      toast.success("Kayıt eklendi!");
      setFormData({ ...formData, notes: "" });
    } catch (err) {
      toast.error("Hata: " + err.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">✍️ Yeni Veri Girişi</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Proje</label>
          <select className="select" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})}>
            <option value="">Seçin</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Çalışan</label>
          <select className="select" value={formData.employee} onChange={e => setFormData({...formData, employee: e.target.value})}>
            <option value="">Seçin</option>
            {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Tarih</label>
          <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Notlar</label>
          <textarea className="input" rows={4} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        </div>
        <button type="submit" className="btn btn-primary">💾 Kaydet</button>
      </form>
    </div>
  );
}

// ATTENDANCE PAGE
function Attendance({ isAdmin }) {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProj, setSelectedProj] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showHolidays, setShowHolidays] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    async function load() {
      const [e, p] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('projects').select('*')
      ]);
      setEmployees(e.data || []);
      setProjects(p.data || []);
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      async function loadAtt() {
        const { data } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', selectedEmp.id)
          .eq('month', month)
          .single();
        setAttendanceData(data?.data || {});
      }
      loadAtt();
    }
  }, [selectedEmp, month]);

  const monthHolidays = HOLIDAYS.filter(h => h.date.startsWith(month));

  const filteredEmp = employees.filter(e => !selectedProj || e.project === selectedProj);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📅 Puantaj Yönetimi</h2>
        </div>
        <div className="grid grid-3">
          <div className="filter-card">
            <div className="filter-icon">📁</div>
            <div className="filter-label">Proje</div>
            <select className="select" value={selectedProj} onChange={e => {
              setSelectedProj(e.target.value);
              setSelectedEmp(null);
            }}>
              <option value="">Seçin</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="filter-card">
            <div className="filter-icon">👤</div>
            <div className="filter-label">Çalışan</div>
            <select className="select" value={selectedEmp?.id || ""} onChange={e => {
              const emp = employees.find(x => x.id === parseInt(e.target.value));
              setSelectedEmp(emp);
            }} disabled={!selectedProj}>
              <option value="">Seçin</option>
              {filteredEmp.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="filter-card">
            <div className="filter-icon">📅</div>
            <div className="filter-label">Ay</div>
            <input type="month" className="input" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        </div>

        {monthHolidays.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowHolidays(!showHolidays)}>
              {showHolidays ? '🔼' : '🔽'} Resmi Tatiller ({monthHolidays.length})
            </button>
            {showHolidays && (
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {monthHolidays.map(h => (
                  <div key={h.date} style={{ padding: 12, background: 'var(--bg-alt)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{h.name}</strong>
                    <span>{h.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedEmp && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{selectedEmp.name} - {month}</h2>
          </div>
          <AttendanceCalendar
            employee={selectedEmp}
            month={month}
            data={attendanceData}
            isAdmin={isAdmin}
            onSave={async (updatedData) => {
              const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('employee_id', selectedEmp.id)
                .eq('month', month)
                .single();

              if (existing) {
                await supabase.from('attendance').update({ data: updatedData }).eq('id', existing.id);
              } else {
                await supabase.from('attendance').insert([{ employee_id: selectedEmp.id, month, data: updatedData }]);
              }
              setAttendanceData(updatedData);
              toast.success("Kaydedildi!");
            }}
          />
        </div>
      )}
    </>
  );
}

function AttendanceCalendar({ employee, month, data, isAdmin, onSave }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [status, setStatus] = useState("present");
  const [note, setNote] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const firstDay = new Date(parseInt(year), parseInt(monthNum) - 1, 1).getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;

  const calDays = [];
  for (let i = 0; i < adjustedFirst; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  useEffect(() => {
    if (selectedDay) {
      const dayData = data[month]?.days?.[selectedDay] || {};
      setStatus(dayData.status || "present");
      setNote(dayData.note || "");
      setStartTime(dayData.startTime || "09:00");
      setEndTime(dayData.endTime || "18:00");
    }
  }, [selectedDay, data, month]);

  function handleSave() {
    const overtime = calculateOvertime(startTime, endTime);
    const updatedData = {
      ...data,
      [month]: {
        ...data[month],
        days: {
          ...data[month]?.days,
          [selectedDay]: { status, note, startTime, endTime, overtime: parseFloat(overtime) }
        }
      }
    };
    onSave(updatedData);
    setSelectedDay(null);
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 700, padding: 8 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {calDays.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;

          const dateStr = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
          const holiday = HOLIDAYS.find(h => h.date === dateStr);
          const dayData = data[month]?.days?.[day];
          const color = dayData?.status ? ATTENDANCE_STATUS[dayData.status].color : '#e5e7eb';

          return (
            <button
              key={day}
              onClick={() => isAdmin && setSelectedDay(day)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `2px solid ${color}`,
                background: dayData?.status || holiday ? color + '20' : '#fff',
                cursor: isAdmin ? 'pointer' : 'default',
                minHeight: 90,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>{day}</div>
              {holiday && <div style={{ fontSize: 10, color: ATTENDANCE_STATUS.holiday.color }}>{holiday.name}</div>}
              {dayData?.status && (
                <>
                  <div style={{ fontSize: 11, color, fontWeight: 600 }}>{ATTENDANCE_STATUS[dayData.status].label}</div>
                  {dayData.startTime && <div style={{ fontSize: 10 }}>{dayData.startTime}-{dayData.endTime}</div>}
                  {dayData.overtime > 0 && <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>FM: {dayData.overtime}s</div>}
                </>
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && selectedDay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg)',
            borderRadius: 20,
            padding: 32,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0 }}>{employee.name}</h3>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{selectedDay} {month}</div>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Durum</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(ATTENDANCE_STATUS).slice(0, 6).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: `2px solid ${val.color}`,
                      background: status === key ? val.color : 'transparent',
                      color: status === key ? '#fff' : val.color,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Mesai Saatleri (Türkiye)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Başlangıç</label>
                  <input type="time" className="input" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Çıkış</label>
                  <input type="time" className="input" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              {startTime && endTime && (
                <div style={{ marginTop: 8, padding: 12, background: 'var(--bg-alt)', borderRadius: 8 }}>
                  Fazla Mesai: <strong style={{ color: '#f59e0b' }}>{calculateOvertime(startTime, endTime)} saat</strong>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Not</label>
              <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>Kaydet</button>
              <button className="btn btn-secondary" onClick={() => setSelectedDay(null)} style={{ flex: 1 }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// REPORTS
function Reports() {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📈 Raporlar</h2>
      </div>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 72 }}>📊</div>
        <h3>Rapor Modülü</h3>
        <p style={{ color: 'var(--text-muted)' }}>Yakında eklenecek...</p>
      </div>
    </div>
  );
}

// ADMIN
function Admin() {
  const [section, setSection] = useState("projects");

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">⚙️ Admin Paneli</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {["projects", "employees", "users", "backup"].map(s => (
            <button
              key={s}
              className={`btn ${section === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSection(s)}
              style={{ flex: 1, minWidth: 150 }}
            >
              {{projects: "📁 Projeler", employees: "👥 Çalışanlar", users: "🔐 Kullanıcılar", backup: "💾 Yedek"}[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {section === "projects" && <AdminProjects />}
        {section === "employees" && <AdminEmployees />}
        {section === "users" && <AdminUsers />}
        {section === "backup" && <AdminBackup />}
      </div>
    </>
  );
}

function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('projects').select('*');
      setProjects(data || []);
    }
    load();
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    await supabase.from('projects').insert([{ name: newName, status: 'active' }]);
    setNewName("");
    const { data } = await supabase.from('projects').select('*');
    setProjects(data || []);
    toast.success("Eklendi!");
  }

  async function handleDelete(id) {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    await supabase.from('projects').delete().eq('id', id);
    const { data } = await supabase.from('projects').select('*');
    setProjects(data || []);
    toast.success("Silindi!");
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Yeni Proje Ekle</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input className="input" placeholder="Proje Adı" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn btn-primary" onClick={handleAdd}>Ekle</button>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Projeler ({projects.length})</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {projects.map(p => (
          <div key={p.id} style={{
            padding: 16,
            background: 'var(--bg-alt)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>{p.name}</strong>
            <button className="btn btn-secondary" onClick={() => handleDelete(p.id)}>🗑️ Sil</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [newName, setNewName] = useState("");
  const [newProj, setNewProj] = useState("");

  useEffect(() => {
    async function load() {
      const [e, p] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('projects').select('*')
      ]);
      setEmployees(e.data || []);
      setProjects(p.data || []);
    }
    load();
  }, []);

  async function handleAdd() {
    if (!newName.trim() || !newProj) return;
    await supabase.from('employees').insert([{ name: newName, project: newProj }]);
    setNewName("");
    setNewProj("");
    const { data } = await supabase.from('employees').select('*');
    setEmployees(data || []);
    toast.success("Eklendi!");
  }

  async function handleDelete(id) {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    await supabase.from('employees').delete().eq('id', id);
    const { data } = await supabase.from('employees').select('*');
    setEmployees(data || []);
    toast.success("Silindi!");
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Yeni Çalışan Ekle</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
          <input className="input" placeholder="Çalışan Adı" value={newName} onChange={e => setNewName(e.target.value)} />
          <select className="select" value={newProj} onChange={e => setNewProj(e.target.value)}>
            <option value="">Proje Seçin</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleAdd}>Ekle</button>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Çalışanlar ({employees.length})</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {employees.map(e => (
          <div key={e.id} style={{
            padding: 16,
            background: 'var(--bg-alt)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>{e.name}</strong>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>📁 {e.project}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => handleDelete(e.id)}>🗑️ Sil</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('*');
      setUsers(data || []);
    }
    load();
  }, []);

  async function handleRoleChange(id, newRole) {
    await supabase.from('users').update({ role: newRole }).eq('id', id);
    const { data } = await supabase.from('users').select('*');
    setUsers(data || []);
    toast.success("Güncellendi!");
  }

  return (
    <>
      <h3 style={{ marginBottom: 12 }}>Kullanıcılar ({users.length})</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {users.map(u => (
          <div key={u.id} style={{
            padding: 16,
            background: 'var(--bg-alt)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>{u.username}</strong>
            <select className="select" style={{ width: 150 }} value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
              <option value="user">Kullanıcı</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminBackup() {
  async function handleBackup() {
    const [records, projects, employees, users, attendance] = await Promise.all([
      supabase.from('records').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('users').select('*'),
      supabase.from('attendance').select('*')
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      records: records.data || [],
      projects: projects.data || [],
      employees: employees.data || [],
      users: users.data || [],
      attendance: attendance.data || []
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tvsteam_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success("Yedek indirildi!");
  }

  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>💾</div>
      <h3 style={{ marginBottom: 12 }}>Veri Yedekleme</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Tüm verilerinizi JSON formatında yedekleyin
      </p>
      <button className="btn btn-primary" onClick={handleBackup}>💾 Yedek Al</button>
    </div>
  );
}
