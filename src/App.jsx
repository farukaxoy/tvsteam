import React, { useEffect, useMemo, useRef, useState } from "react";
import "./style.css";

/*
 PATCHED FOR VITE + NETLIFY
 - LOGIN_CSS / THEME_CSS tanımsız hatası giderildi
 - Eski injectStyle mantığı bozulmadı ama crash yapmaz
 - CSS asıl olarak style.css üzerinden gelir
*/

// 🔧 PATCH: eski referanslar crash etmesin diye boş tanımlar

// --- style injection helper (safe for SSR) ---
function injectStyle(cssText, id){
  if(typeof document === "undefined") return;
  if(!cssText || !String(cssText).trim()) return;
  const styleId = id || ("style_" + Math.random().toString(36).slice(2));
  let tag = document.getElementById(styleId);
  if(!tag){
    tag = document.createElement("style");
    tag.id = styleId;
    document.head.appendChild(tag);
  }
  if(tag.textContent !== cssText) tag.textContent = cssText;
}

const LOGIN_CSS = `
:root{
  --lp-bgA:#f4f7ff;
  --lp-bgB:#ffffff;
  --lp-green:rgba(16,185,129,.35);
  --lp-blue:rgba(59,130,246,.30);
  --lp-text:rgba(15,23,42,.92);
  --lp-muted:rgba(15,23,42,.60);
  --lp-border:rgba(15,23,42,.10);
}

/* Full page */
.loginHero{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:32px 16px;
  background:
    radial-gradient(900px 520px at 8% 90%, var(--lp-green), transparent 62%),
    radial-gradient(900px 520px at 92% 10%, var(--lp-blue), transparent 60%),
    linear-gradient(180deg, var(--lp-bgA), var(--lp-bgB));
  color:var(--lp-text);
}

.loginShell{
  width:min(1100px, 100%);
  display:grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap:28px;
  align-items:center;
}

@media (max-width: 920px){
  .loginShell{ grid-template-columns: 1fr; }
  .loginArt{ display:none; }
}

.loginArt{
  position:relative;
  height:420px;
  border-radius:26px;
  overflow:hidden;
  background:rgba(255,255,255,.35);
  border:1px solid rgba(255,255,255,.35);
  box-shadow: 0 20px 70px rgba(15,23,42,.10);
}

.loginArtBlob{
  position:absolute;
  inset:-80px;
  background:
    radial-gradient(240px 180px at 30% 30%, rgba(59,130,246,.35), transparent 60%),
    radial-gradient(260px 200px at 70% 70%, rgba(16,185,129,.28), transparent 60%),
    radial-gradient(220px 180px at 80% 20%, rgba(99,102,241,.18), transparent 58%);
  filter: blur(10px);
}

.loginArtSvg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  opacity:.95;
}

.loginCard{
  background:rgba(255,255,255,.55);
  border:1px solid rgba(255,255,255,.55);
  border-radius:26px;
  backdrop-filter: blur(12px);
  box-shadow: 0 22px 70px rgba(15,23,42,.12);
  padding:34px 34px 26px;
}

.loginHead{ margin-bottom:26px; }
.loginKicker{
  font-size:14px;
  letter-spacing:.2px;
  color:var(--lp-muted);
  margin-bottom:8px;
}
.loginH1{
  font-size:44px;
  line-height:1.05;
  margin:0;
  font-weight:800;
}

@media (max-width: 520px){
  .loginCard{ padding:26px 22px 20px; }
  .loginH1{ font-size:34px; }
}

.loginBody{ margin-top:6px; }

.loginLabel{
  display:block;
  font-size:14px;
  font-weight:700;
  color:rgba(15,23,42,.78);
  margin:12px 0 10px;
}

.loginInputLine{
  width:100%;
  border:none;
  border-bottom:2px solid rgba(15,23,42,.28);
  background:transparent;
  padding:12px 0;
  outline:none;
  font-size:16px;
  color:var(--lp-text);
}
.loginInputLine::placeholder{ color:rgba(15,23,42,.35); }
.loginInputLine:focus{ border-bottom-color: rgba(15,23,42,.55); }

.loginPassRow{
  position:relative;
  display:flex;
  align-items:center;
}
.loginEye{
  position:absolute;
  right:0;
  top:50%;
  transform:translateY(-50%);
  border:none;
  background:transparent;
  cursor:pointer;
  font-size:18px;
  padding:6px 8px;
  opacity:.8;
}
.loginEye:hover{ opacity:1; }

.loginBtnWide{
  margin-top:28px;
  width:100%;
  height:48px;
  border:none;
  border-radius:12px;
  cursor:pointer;
  font-weight:800;
  font-size:18px;
  background:rgba(255,255,255,.90);
  box-shadow: 0 10px 24px rgba(15,23,42,.12);
}

.loginError{
  margin-top:12px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(185,28,28,.25);
  background:rgba(254,226,226,.65);
  color:rgba(127,29,29,.95);
  font-weight:800;
  font-size:13px;
}
.loginBtnWide:hover{ transform: translateY(-1px); }
.loginBtnWide:active{ transform: translateY(0px); }
`;


const NAV_CSS = `
/* Top navigation */
.appShell{ min-height: 100vh; display:flex; flex-direction:column; }
.topNav{
  position: sticky; top: 0; z-index: 50;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(15,23,42,.08);
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(10px);
}
.brandRow{ display:flex; align-items:center; gap:10px; min-width: 220px; }
.brandDot{
  width: 10px; height:10px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(59,130,246,.9), rgba(16,185,129,.85));
  box-shadow: 0 6px 18px rgba(59,130,246,.20);
}
.brandTitle{ font-weight: 800; letter-spacing: .2px; color:#0f172a; }
.brandSub{ font-size: 12px; color: rgba(15,23,42,.60); margin-top:2px; }

.navTabs{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.navBtn{
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.70);
  color: rgba(15,23,42,.82);
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
  cursor:pointer;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease;
}
.navBtn:hover{ transform: translateY(-1px); box-shadow: 0 10px 26px rgba(15,23,42,.10); border-color: rgba(15,23,42,.16); }
.navBtn.active{
  background: rgba(59,130,246,.10);
  border-color: rgba(59,130,246,.35);
  color: rgba(30,64,175,.95);
}
.navRight{ display:flex; align-items:center; gap:10px; min-width: 220px; justify-content:flex-end; }
.userPill{
  border: 1px solid rgba(15,23,42,.10);
  background: rgba(255,255,255,.70);
  border-radius: 999px;
  padding: 8px 10px;
  display:flex; align-items:center; gap:8px;
  color: rgba(15,23,42,.80);
  font-weight: 700;
  max-width: 260px;
}
.userPill span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.logoutBtn{
  border: 1px solid rgba(239,68,68,.25);
  background: rgba(239,68,68,.06);
  color: rgba(185,28,28,.92);
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 800;
  cursor:pointer;
}
.logoutBtn:hover{ background: rgba(239,68,68,.10); }

/* Keep main grid from touching top */
.mainArea{ padding: 16px; }
@media (max-width: 900px){
  .brandRow{ min-width: unset; }
  .navRight{ min-width: unset; }
  .topNav{ align-items:flex-start; flex-direction:column; }
  .navRight{ width:100%; justify-content:space-between; }
}
`;

const THEME_CSS = "";

// ===================== AUTH MODE =====================
// Local fixed-credentials mode (no Supabase Auth)
const supabase = null;

/* ===================== UYGULAMA ===================== */
/* NOT: Buradan aşağısı senin mevcut 5098 satırlık kodundur.
   SADECE üst kısma bu patch eklenmiştir.
*/

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
// AŞAĞIYA MEVCUT App.jsx DOSYANIN TAMAMINI AYNEN YAPIŞTIR
// ⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆

/* =========================================================
   VERİ TAKİP & ONAY SİSTEMİ (LIVE SERVER)
   ---------------------------------------------------------
   React CDN + Babel ile direkt çalışır.
   ---------------------------------------------------------
   ✅ 5 proje (SOCAR, Tüpraş İzmir/İzmit/Kırıkkale/Batman)
   ✅ Admin tüm projeleri görür
   ✅ Proje kullanıcıları sadece kendi projesini görür
   ✅ Uzman gibi ARAÇ ekleme (plaka vb) -> admin onayı
   ✅ Aylık araç verileri (KM, bakım tarihi, durum, not) -> admin onayı
   ✅ Admin panelinden yeni KATEGORİ ve ALAN tanımlama (dinamik)
   ✅ Bildirim sistemi (admin ve kullanıcı için)
   ✅ Onaylanmadan veri dashboard/raporda görünmez
   ✅ İletişim mesajlarını sadece admin görür
   ---------------------------------------------------------
   NOT: Bu demo LocalStorage kullanır. Gerçek güvenlik için backend gerekir.
========================================================= */

/* ===================== SETTINGS ===================== */

const STORAGE_KEY = "veri_takip_secure_v4";

/* ===================== MODERN LOGIN CSS (INJECTED) ===================== */

/* ===================== THEME + TOAST CSS (INJECTED) ===================== */

/* 5 PROJE (SABİT) */
const PROJECT_NAMES = [
  "SOCAR",
  "Tüpraş İzmir",
  "Tüpraş İzmit",
  "Tüpraş Kırıkkale",
  "Tüpraş Batman"
];

/* KULLANICILAR (SABİT) */
const CREDENTIALS = {
  admin: { password: "admin123", role: "admin" },


  farukaksoy: { password: "Faruk*123", role: "admin" },
  socar: { password: "socar123", role: "user", project: "SOCAR" },
  tupras_izmir: { password: "izmir123", role: "user", project: "Tüpraş İzmir" },
  tupras_izmit: { password: "izmit123", role: "user", project: "Tüpraş İzmit" },
  tupras_kirikkale: { password: "kirikkale123", role: "user", project: "Tüpraş Kırıkkale" },
  tupras_batman: { password: "batman123", role: "user", project: "Tüpraş Batman" }
};

/* ROLLER (Admin panelinden kullanıcı ekleme için) */
const ROLE_OPTIONS = [
  { value: "user", label: "Kullanıcı" },
  { value: "team_leader", label: "Ekip Lideri" },
  { value: "project_leader", label: "Proje Lideri" },
  { value: "admin", label: "Admin" }
];
function roleLabel(role){
  return ROLE_OPTIONS.find(r => r.value === role)?.label || String(role || "-");
}

/* ===================== MONTHLY CHECKLIST (FIXED) ===================== */
const MONTHLY_CHECK_ITEMS = [
  "İlkyardım çantası kontrolü",
  "Şirket Aracı Kontrolü",
  "Yangın Tüplerinin göz ile kontrolü",
  "Aylık Proje Denetim Raporu",
  "Noter Onaylı İSG defteri",
  "Gözlem ve Ramakkala Kontrol"
];

const MONTHLY_CAT_KEY = "monthly_controls";

/* ===================== HELPERS ===================== */

const uid = (p="id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now()}`;

function safeNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function nowYearMonth(){
  const d = new Date();
  return { y: d.getFullYear(), m: String(d.getMonth()+1).padStart(2,"0") };
}
function daysInMonth(year, month01){
  return new Date(year, Number(month01), 0).getDate();
}
function deepClone(x){ return JSON.parse(JSON.stringify(x)); }
function formatDT(iso){
  try{ return new Date(iso).toLocaleString(); }catch{ return iso; }
}

// Backward-compat alias (some views used old name)
function fmtDateTime(iso){ return formatDT(iso); }

function clampDay(d, max){ return Math.max(1, Math.min(max, d)); }
function slugKey(s){
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[çÇ]/g,"c")
    .replace(/[ğĞ]/g,"g")
    .replace(/[ıİ]/g,"i")
    .replace(/[öÖ]/g,"o")
    .replace(/[şŞ]/g,"s")
    .replace(/[üÜ]/g,"u")
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"")
    .slice(0, 40) || "alan";
}

/* ===================== DEFAULT CATEGORIES =====================
   category = {
     id, key, name, itemLabel,
     approval: { item: true, month: true },
     fields: [{key,label,type, options?, unit?}],
     special: { meals?: true } // uzman yemek takibi gibi
   }
============================================================== */

function defaultCategories(){
  return [
    {
      id: uid("cat"),
      key: "experts",
      name: "Uzmanlar",
      itemLabel: "Uzman",
      approval: { item: true, month: true },
      special: { meals: true },
      fields: [
        { key: "onay", label: "Onay", type: "number" },
        { key: "guncelleme", label: "Güncelleme", type: "number" },
        { key: "merdiven", label: "Merdiven", type: "number" },
        { key: "gozlem", label: "Gözlem", type: "number" },
        { key: "takip", label: "Takip", type: "number" },
        { key: "mealCount", label: "Yemek", type: "number" }
      ]
    },
    {
      id: uid("cat"),
      key: "vehicles",
      name: "Araçlar",
      itemLabel: "Araç",
      approval: { item: true, month: true },
      special: { meals: false },
      fields: [
        { key: "km", label: "Aylık KM", type: "number", unit: "km" },
        { key: "bakim_tarihi", label: "Bakım Tarihi", type: "date" },
        { key: "durum", label: "Araç Durumu", type: "select", options: ["Aktif", "Serviste", "Arızalı", "Pasif"] },
        { key: "not", label: "Not / Arıza-Kusur", type: "text" }
      ]
    }
    ,
    {
      id: uid("cat"),
      key: "monthly_controls",
      name: "Aylık Kontroller",
      itemLabel: "Kontrol",
      approval: { item: false, month: true },
      special: { meals: false },
      fields: [
        { key: "durum", label: "Durum", type: "select", options: ["Yapıldı", "Bekliyor", "Yapılmadı"] },
        { key: "tarih", label: "Tarih", type: "date" },
        { key: "kontrol_eden", label: "Kontrol Eden Uzman", type: "select", options: ["Seçiniz"] }
      ]
    }

  ];
}

/* ===================== DEFAULT DOCUMENT TEMPLATES =====================
   docTemplate = { key, name, required:true }
   employeeDocs[employeeId][templateKey] = { signed:bool, signedAt:"YYYY-MM-DD" }
======================================================================= */

function defaultDocTemplates(){
  const names = [
    "Kişisel Koruyucu Ekipman Kullanım Talimatı",
    "Yüksekte Çalışma Talimatı",
    "Şirket Aracı Kullanma Talimatı",
    "FG-067 Kişisel Koruyucu Donanım Zimmet Formu",
    "FG-126 Araç Kullanım Sözleşmesi",
    "FG-127 Araç Zimmet Tutanağı",
    "FG-142 Oryantasyon Eğitim Formu",
    "Belirsiz/Belirli Süreli İş Sözleşmesi",
    "Bilgi Teknolojisine Yönelik Güvenlik Mevzuatları",
    "Personel Bağımsızlık, Tarafsızlık, Gizlilik Beyanı",
    "Kişisel Verilerin İşlenmesine İlişkin Aydınlatma",
    "TÜV SÜD Davranış Kuralları",
    "İSG Talimatı",
    "Disiplin Prosedürü",
    "Dakika Çalışan Kullanım Kılavuzu",
    "Oryantasyon Formu ve İş Teklif Mektubu",
    "Çalışan Açık Rıza Metni",
    "Çalışan Aydınlatma Metni",
    "TÜV SÜD Etik Kurallar"
  ];
  return names.map(n => ({
    key: slugKey(n),
    name: n,
    required: true
  }));
}

/* ===================== STATE MODEL =====================
state = {
  categories: [category...],
  projects: [
    { id, name,
      itemsByCategory: {
        [categoryKey]: [
          { id, name, approved, requestedBy, createdAt,
            meta?: { ... }          // örn: plaka vb (şimdilik name alanında plaka da yazılabilir)
            months: {
              "YYYY-MM": {
                draft: { ...fields..., meals?:[] },
                submitted, submittedAt, submittedBy,
                approved, approvedAt, approvedBy
              }
            }
          }
        ]
      }
    }
  ],
  contacts: [...],
  notifications: [
    { id, to: "admin" | username, title, body, createdAt, read:false, level:"info|warn|ok|danger" }
  ]
}
========================================================= */

function seedState(){
  const categories = defaultCategories();
  return {
    categories,
    employees: [], // 👷 ÇALIŞANLAR
    docTemplates: defaultDocTemplates(), // 📄 İmzalı evrak şablonları
    employeeDocs: {}, // { [employeeId]: { [docKey]: { signed, signedAt } } }
    actions: [], // ✅ Aksiyon / Düzeltici Faaliyet
    announcements: [], // 📣 Duyurular (admin yayınlar)
    authUsers: [], // 🔐 Admin tanımlı proje kullanıcıları
    projects: PROJECT_NAMES.map(name => {
      const itemsByCategory = categories.reduce((acc, c) => {
        acc[c.key] = [];
        return acc;
      }, {});

      // ✅ Sabit Aylık Kontroller (proje bazlı)
      if(Array.isArray(itemsByCategory["monthly_controls"])){
        itemsByCategory["monthly_controls"] = MONTHLY_CHECK_ITEMS.map(label => ({
          id: uid("item"),
          name: label,
          approved: true,
          requestedBy: "system",
          createdAt: new Date().toISOString(),
          months: {}
        }));
      }

      return {
        id: uid("prj"),
        name,
        itemsByCategory
      };
    }),
    contacts: [],
    notifications: []
  };
}

/* ===================== UI ATOMS ===================== */

function TabButton({active, onClick, children}){
  return (
    <button className={active ? "tab active" : "tab"} onClick={onClick}>
      {children}
    </button>
  );
}

function Badge({kind="default", children}){
  const cls = kind === "ok" ? "badge ok" : kind === "warn" ? "badge warn" : kind === "danger" ? "badge danger" : "badge";
  return <span className={cls}>{children}</span>;
}

function Pill({kind="default", children}){
  const cls = kind === "ok" ? "pill ok" : kind === "warn" ? "pill warn" : kind === "danger" ? "pill danger" : "pill";
  return <span className={cls}>{children}</span>;
}

function AdminMessageComposer({ projects, users, onSend }){
  const [scopeType, setScopeType] = React.useState("all");
  const [scopeValue, setScopeValue] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  return (
    <>
      <div className="row" style={{gap:10, flexWrap:"wrap", marginTop:12}}>
        <div style={{flex:"1 1 160px"}}>
          <span className="lbl">Hedef</span>
          <select className="input" value={scopeType} onChange={e=>{ setScopeType(e.target.value); setScopeValue(""); }}>
            <option value="all">Tüm Kullanıcılar</option>
            <option value="project">Proje</option>
            <option value="user">Tek Kullanıcı</option>
          </select>
        </div>

        {scopeType === "project" && (
          <div style={{flex:"1 1 220px"}}>
            <span className="lbl">Proje</span>
            <select className="input" value={scopeValue} onChange={e=>setScopeValue(e.target.value)}>
              <option value="">Seçiniz…</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {scopeType === "user" && (
          <div style={{flex:"1 1 260px"}}>
            <span className="lbl">Kullanıcı</span>
            <select className="input" value={scopeValue} onChange={e=>setScopeValue(e.target.value)}>
              <option value="">Seçiniz…</option>
              {users.map(u => <option key={u.username} value={u.username}>{u.username} • {u.project}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="row" style={{marginTop:10}}>
        <div style={{flex:1}}>
          <span className="lbl">Başlık</span>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mesaj başlığı" />
        </div>
      </div>

      <div className="row" style={{marginTop:10}}>
        <div style={{flex:1}}>
          <span className="lbl">Mesaj</span>
          <textarea className="input" value={body} onChange={e=>setBody(e.target.value)} placeholder="Mesaj içeriği..." />
        </div>
      </div>

      <div className="row" style={{marginTop:10, justifyContent:"flex-end", flexWrap:"wrap"}}>
        <button
          className="btn primary"
          onClick={() => {
            if(scopeType!=="all" && !scopeValue){ alert("Hedef seçimi eksik."); return; }
            if(!title.trim() || !body.trim()){ alert("Başlık ve mesaj zorunlu."); return; }
            onSend({ scopeType, scopeValue, title, body });
            setTitle(""); setBody("");
          }}
        >Gönder</button>
      </div>
    </>
  );
}

function IconBell({active=false}){
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{opacity: active ? 1 : .85}}>
      <path d="M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 9a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

function LogoMark(){
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M8 11.2h8M8 14.2h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

/* ===================== MAIN APP ===================== */

function Toasts({ items, onClose }){
  if(!items || items.length === 0) return null;
  return (
    <div className="toastWrap">
      {items.map(t => (
        <div key={t.id} className={"toast " + (t.kind ? ("t-" + t.kind) : "t-info")}>
          <div className="toastDot" />
          <div className="toastMain">
            <div className="toastTitle">{t.title || "Bilgi"}</div>
            <div className="toastText">{t.text}</div>
          </div>
          <button className="toastX" type="button" onClick={() => onClose(t.id)} aria-label="Kapat">✕</button>
        </div>
      ))}
    </div>
  );
}

function AppInner(){
// ensure login styles override style.css
useEffect(() => {
  injectStyle(LOGIN_CSS, "vtp_login_css");
}, []);

  const { y: initY, m: initM } = nowYearMonth();

  const [auth, setAuth] = useState(null); // {username, role, project?}
  const [tab, setTab] = useState("dashboard");

  const [activeYear, setActiveYear] = useState(initY);
  const [activeMonth, setActiveMonth] = useState(initM);

  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      try{
        const parsed = JSON.parse(raw);
        if(parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.categories)) return normalizeState(parsed);
      }catch{}
    }
    return seedState();
  });

  /* login */
  const [lu, setLu] = useState("");
  const [lp, setLp] = useState("");
    const [showPw, setShowPw] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("APP_THEME") || "light");
  const [toasts, setToasts] = useState([]);

  const pushToast = (text, kind="info", title="") => {
    const id = uid("t");
    const t = { id, text: String(text || ""), kind, title: title || (kind==="danger" ? "Hata" : kind==="warn" ? "Uyarı" : kind==="ok" ? "Başarılı" : "Bilgi") };
    setToasts(prev => [t, ...prev].slice(0, 5));
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const closeToast = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  /* left panel actions */
  const [search, setSearch] = useState("");
  const [categoryKey, setCategoryKey] = useState("experts");
  const [newItemName, setNewItemName] = useState("");

  /* admin entry: project selector */
  const [entryProjectId, setEntryProjectId] = useState(null);

  
  /* admin dashboard: project filter */
  const [dashProjectId, setDashProjectId] = useState("ALL");
/* contact */
  const [contactText, setContactText] = useState("");

  /* admin: category editor */
  const [catName, setCatName] = useState("");
  const [catItemLabel, setCatItemLabel] = useState("");
  const [catFieldLabel, setCatFieldLabel] = useState("");
  const [catFieldType, setCatFieldType] = useState("number");
  const [catFieldOptions, setCatFieldOptions] = useState("");
  const [catFieldUnit, setCatFieldUnit] = useState("");

  /* notifications panel */
  const [notifOpen, setNotifOpen] = useState(false);

  // Modern login styles (injected once)
useEffect(() => {
  if(document.getElementById("login-modern-css")) return;
  const st = document.createElement("style");
  st.id = "login-modern-css";
  st.textContent = LOGIN_CSS;
  document.head.appendChild(st);
}, []);

// Top nav styles (injected once)
useEffect(() => {
  if(document.getElementById("nav-modern-css")) return;
  const st = document.createElement("style");
  st.id = "nav-modern-css";
  st.textContent = NAV_CSS;
  document.head.appendChild(st);
}, []);

// kategori silme vb. durumlarda aktif kategori geçersiz kalmasın
useEffect(() => {
  const keys = (state.categories || []).map(c => c.key);
  if(keys.length === 0) return;
  if(!keys.includes(categoryKey)){
    setCategoryKey(keys[0]);
  }
}, [state.categories]);

// Theme + toast styles (injected once)
useEffect(() => {
  if(document.getElementById("theme-modern-css")) return;
  const st = document.createElement("style");
  st.id = "theme-modern-css";
  st.textContent = THEME_CSS;
  document.head.appendChild(st);
}, []);

// Apply theme
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("APP_THEME", theme);
}, [theme]);

useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const isAdmin = auth?.role === "admin";
  const monthKey = `${activeYear}-${activeMonth}`;
  const monthDays = useMemo(() => daysInMonth(activeYear, activeMonth), [activeYear, activeMonth]);

  // admin "Veri Girişi" için proje seçimi
  useEffect(() => {
    if(!auth) return;
    if(isAdmin){
      const firstId = state.projects?.[0]?.id || null;
      // seçili proje yoksa veya artık yoksa ilk projeye dön
      if(!entryProjectId || !state.projects.some(p => p.id === entryProjectId)){
        setEntryProjectId(firstId);
      }
    } else {
      // kullanıcı için proje seçimi yok
      if(entryProjectId) setEntryProjectId(null);
    }
  }, [auth, isAdmin, state.projects, entryProjectId]);

  const entryProject = useMemo(() => {
    if(!auth) return null;
    if(isAdmin){
      return state.projects.find(p => p.id === entryProjectId) || state.projects[0] || null;
    }
    // kullanıcı: kendi projesi
    return state.projects.find(p => p.name === auth.project) || null;
  }, [auth, isAdmin, state.projects, entryProjectId]);

  /* ===== normalization: kategori eklendiğinde projelere alan aç ===== */
  function normalizeState(s){
    const next = deepClone(s);

    // --- ensure defaults exist (without breaking existing dynamic categories) ---
    const defaultCats = defaultCategories();
    if(!Array.isArray(next.categories) || next.categories.length === 0){
      next.categories = defaultCats;
    }else{
      const existingKeys = new Set(next.categories.map(c => c && c.key).filter(Boolean));
      for(const dc of defaultCats){
        if(!existingKeys.has(dc.key)){
          next.categories.push(dc);
          existingKeys.add(dc.key);
        }
      }
    }

    next.projects ||= [];
    next.employees ||= [];

    // documents
    const defaultTmpl = defaultDocTemplates();
    if(!Array.isArray(next.docTemplates) || next.docTemplates.length === 0){
      next.docTemplates = defaultTmpl;
    }else{
      const tmplKeys = new Set(next.docTemplates.map(t => t && t.key).filter(Boolean));
      for(const dt of defaultTmpl){
        if(!tmplKeys.has(dt.key)){
          next.docTemplates.push(dt);
          tmplKeys.add(dt.key);
        }
      }
    }
    next.employeeDocs ||= {};

    next.actions ||= [];
    next.announcements ||= [];

    next.contacts ||= [];
    next.notifications ||= [];

    
// ensure employeeDocs has all templates
const tmplKeys = (next.docTemplates || []).map(t => t.key);
for(const emp of (next.employees || [])){
  next.employeeDocs[emp.id] ||= {};
  for(const tk of tmplKeys){
    if(!next.employeeDocs[emp.id][tk]){
      next.employeeDocs[emp.id][tk] = { signed: false, signedAt: "" };
    }else{
      next.employeeDocs[emp.id][tk].signed = !!next.employeeDocs[emp.id][tk].signed;
      next.employeeDocs[emp.id][tk].signedAt ||= "";
    }
  }
}

// ensure each project has itemsByCategory for all categories
    for(const p of next.projects){
      p.itemsByCategory ||= {};
      for(const c of next.categories){
        if(!Array.isArray(p.itemsByCategory[c.key])) p.itemsByCategory[c.key] = [];
      }
    }

    // seed fixed monthly controls as items (per project)
    const mc = next.categories.find(c => c.key === MONTHLY_CAT_KEY);
    if(mc){
      for(const p of next.projects){
        p.itemsByCategory ||= {};
        let arr = p.itemsByCategory[mc.key];
        if(!Array.isArray(arr)) arr = [];
        const names = new Set(arr.map(x => (x.name || "").trim()));
        for(const nm of MONTHLY_CHECK_ITEMS){
          if(!names.has(nm)){
            arr.push({
              id: uid("item"),
              name: nm,
              approved: true,
              requestedBy: "system",
              createdAt: new Date().toISOString(),
              months: {}
            });
          }
        }
        // stable ordering
        arr.sort((a,b)=> MONTHLY_CHECK_ITEMS.indexOf(a.name) - MONTHLY_CHECK_ITEMS.indexOf(b.name));
  
    if(!Array.isArray(next.authUsers)) next.authUsers = [];
      p.itemsByCategory[mc.key] = arr;
      }
    }

    return next;
  }

  function updateState(mutator){
    setState(prev => {
      const next = deepClone(prev);
      mutator(next);
      return normalizeState(next);
    });
  }

  /* ===== AUTH ===== */
    async function doLogin(){
    setLoginError("");
    const uRaw = (lu || "").trim();
    const u = uRaw.toLowerCase();
    const p = (lp || "").trim();

    if(!u || !p){
      setLoginError("Kullanıcı adı ve şifre zorunlu.");
      pushToast("Kullanıcı adı ve şifre zorunlu.", "warn");
      return;
    }

    // 1) Admin panelinden eklenen kullanıcılar (state.authUsers)
    const panelUsers = Array.isArray(state.authUsers) ? state.authUsers.filter(Boolean) : [];

    // 2) Kod içindeki sabit hesaplar (CREDENTIALS) — panel kullanıcıları yoksa / yedek olarak
    const fallbackUsers = Object.entries(CREDENTIALS || {}).map(([username, info]) => ({
      username,
      password: info?.password || "",
      role: info?.role || "user",
      project: info?.project || ""
    }));

    // Panel kullanıcıları varsa öncelik onlarda. Yine de birleşik arama yapalım (panel > fallback).
    const byUsername = new Map();
    for(const rec of fallbackUsers){
      const key = String(rec.username || "").trim().toLowerCase();
      if(key) byUsername.set(key, rec);
    }
    for(const rec of panelUsers){
      const key = String(rec.username || "").trim().toLowerCase();
      if(key) byUsername.set(key, rec); // panel kullanıcıları override
    }

    const rec = byUsername.get(u);

    if(!rec || String(rec.password || "") !== p){
      setLoginError("Kullanıcı adı veya şifre hatalı.");
      pushToast("Kullanıcı adı veya şifre hatalı.", "danger");
      return;
    }

    // Admin tüm projeleri görür; diğer roller kendi projesiyle giriş yapar.
    const role = rec.role || "user";
    const projectName = (role === "admin") ? "" : (rec.project || "");
    const pr = projectName ? (state.projects || []).find(pp => pp.name === projectName) : null;

    setLoginError("");

    setAuth({
      username: rec.username || uRaw,
      role,
      project: projectName,
      projectId: pr ? pr.id : null,
      projectName,
      userId: null
    });

    setLp("");
    pushToast("Giriş başarılı.", "ok");
  }

  async function doLogout(){
    try{
      if(supabase) await supabase.auth.signOut();
    }catch{}
    setAuth(null);
    setTab("dashboard");
    setNotifOpen(false);
  }

  /* ===== ACCESS: visible projects ===== */
  const visibleProjects = useMemo(() => {
    if(!auth) return [];
    if(isAdmin) return state.projects;
    return state.projects.filter(p => p.name === auth.project);
  }, [state.projects, auth, isAdmin]);

  const activeCategory = useMemo(() => {
    return state.categories.find(c => c.key === categoryKey) || state.categories[0];
  }, [state.categories, categoryKey]);

  useEffect(() => {
    if(state.categories.length && !state.categories.some(c => c.key === categoryKey)){
      setCategoryKey(state.categories[0].key);
    }
  }, [state.categories, categoryKey]);

  /* ===== NOTIFICATIONS ===== */
  function pushNotification({to, title, body, level="info"}){
    updateState(d => {
      d.notifications.unshift({
        id: uid("n"),
        to,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
        level
      });
    });
  }

  const myNotifications = useMemo(() => {
    if(!auth) return [];
    const target = isAdmin ? "admin" : auth.username;
    return (state.notifications || []).filter(n => n.to === target);
  }, [state.notifications, auth, isAdmin]);

  const unreadCount = useMemo(() => {
    return myNotifications.filter(n => !n.read).length;
  }, [myNotifications]);

  function markAllRead(){
    if(!auth) return;
    const target = isAdmin ? "admin" : auth.username;
    updateState(d => {
      for(const n of d.notifications){
        if(n.to === target) n.read = true;
      }
    });
  }

  /* ===== FINDERS ===== */
  function findProject(d, projectId){
    return d.projects.find(p => p.id === projectId);
  }
  function findItem(d, projectId, catKey, itemId){
    const p = findProject(d, projectId);
    if(!p) return null;
    const arr = p.itemsByCategory?.[catKey] || [];
    return arr.find(x => x.id === itemId);
  }

  function ensureMonthSlot(item, mk, category){
    item.months ||= {};
    if(!item.months[mk]){
      item.months[mk] = {
        draft: buildDefaultDraft(category),
        submitted: false,
        submittedAt: null,
        submittedBy: null,
        approved: false,
        approvedAt: null,
        approvedBy: null
      };
    }
    // draft ensure
    item.months[mk].draft ||= buildDefaultDraft(category);
    // meals ensure
    if(category?.special?.meals){
      if(!Array.isArray(item.months[mk].draft.meals)) item.months[mk].draft.meals = [];
    }
  }

  function buildDefaultDraft(category){
    const draft = {};
    for(const f of (category?.fields || [])){
      if(f.type === "number") draft[f.key] = 0;
      else if(f.type === "date") draft[f.key] = "";
      else if(f.type === "select") draft[f.key] = (f.options && f.options[0]) ? f.options[0] : "";
      else draft[f.key] = "";
    }
    if(category?.special?.meals) draft.meals = [];
    return draft;
  }

  /* ===== ITEM REQUEST (Uzman/Araç/Diğer kategori) ===== */
  function requestItem(projectId) {
  const name = (newItemName || "").trim();
  if (!name) return;

  const c = activeCategory;

  updateState((d) => {
    const p = findProject(d, projectId);
    if (!p) return;

    p.itemsByCategory[c.key] ||= [];
    p.itemsByCategory[c.key].push({
      id: uid("item"),
      name,
      // Admin ekliyorsa direkt onaylı olsun; kullanıcı ekliyorsa kategori onayı varsa beklesin
      approved: isAdmin ? true : c.approval?.item ? false : true,
      requestedBy: isAdmin ? "admin" : auth.username,
      createdAt: new Date().toISOString(),
      months: {},
    });
  });

  setNewItemName("");

  if (!isAdmin) {
    pushNotification({
      to: "admin",
      title: `Yeni ${activeCategory.itemLabel} Talebi`,
      body: `${auth.project} • ${activeCategory.itemLabel}: ${name}`,
      level: "warn",
    });
    pushToast(`${activeCategory.itemLabel} talebi admin onayına gönderildi.`, "danger");
  } else {
    pushToast(`${activeCategory.itemLabel} eklendi.`, "ok");
  }
}

  function approveItem(projectId, catKey, itemId) {
  const cat = state.categories.find((c) => c.key === catKey);

  updateState((d) => {
    const it = findItem(d, projectId, catKey, itemId);
    if (!it) return;
    it.approved = true;
    it.approvedAt = new Date().toISOString();
    it.approvedBy = auth.username;
  });

  // İstek atan kullanıcıya bildirim (best effort)
  const p = state.projects.find((pp) => pp.id === projectId);
  const it0 = p?.itemsByCategory?.[catKey]?.find((x) => x.id === itemId);
  if (it0?.requestedBy) {
    pushNotification({
      to: it0.requestedBy,
      title: `${cat?.itemLabel || "Kayıt"} Onaylandı`,
      body: `${p?.name || ""} • ${cat?.itemLabel || "Kayıt"}: ${it0.name}`,
      level: "ok",
    });
  }
}

  function rejectItem(projectId, catKey, itemId){
    if(!confirm("Talep reddedilsin mi? (silinir)")) return;
    const p0 = state.projects.find(pp => pp.id === projectId);
    const it0 = p0?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    const req = it0?.requestedBy;
    const name = it0?.name;
    const cat = state.categories.find(c => c.key === catKey);

    updateState(d => {
      const p = findProject(d, projectId);
      if(!p) return;
      p.itemsByCategory[catKey] = (p.itemsByCategory[catKey] || []).filter(x => x.id !== itemId);
    });

    if(req){
      pushNotification({
        to: req,
        title: `${cat?.itemLabel || "Kayıt"} Reddedildi`,
        body: `${p0?.name} • ${cat?.itemLabel || "Kayıt"}: ${name}`,
        level: "danger"
      });
    }
  }

  /* ===== MONTHLY EDIT / SUBMIT / APPROVE ===== */
  function setMonthlyField(projectId, catKey, itemId, monthOrField, fieldOrValue, maybeValue){
    // Desteklenen çağrılar:
    // 1) setMonthlyField(projectId, catKey, itemId, fieldKey, value)  -> aktif ay
    // 2) setMonthlyField(projectId, catKey, itemId, monthKey, fieldKey, value) -> verilen ay
    const cat = (state.categories || []).find(c => c.key === catKey);
    const mk = (maybeValue === undefined) ? monthKey : monthOrField;
    const fieldKey = (maybeValue === undefined) ? monthOrField : fieldOrValue;
    const value = (maybeValue === undefined) ? fieldOrValue : maybeValue;

    if(!cat) return;

    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;

      ensureMonthSlot(it, mk, cat);

      // kullanıcı onaylı veriyi değiştiremesin
      if(!isAdmin && it.months?.[mk]?.approved) return;

      const f = (cat.fields || []).find(ff => ff.key === fieldKey);

      if(!it.months[mk].draft) it.months[mk].draft = {};

      // Field admin tarafından silindiyse / eski şema varsa yine de kaydet (geriye dönük uyumluluk)
      if(!f){
        const vStr = String(value);
        const isNumLike = (typeof value === "number") || /^-?\d+(?:\.\d+)?$/.test(vStr);
        it.months[mk].draft[fieldKey] = isNumLike ? safeNum(value) : value;
      } else if(f.type === "number") {
        it.months[mk].draft[fieldKey] = safeNum(value);
      } else {
        it.months[mk].draft[fieldKey] = value;
      }

      // değer değişince yeniden gönderilebilir olsun
      it.months[mk].submitted = false;
    });
  }

  function toggleMeal(projectId, itemId, day){
    const catKey = "experts";
    const cat = state.categories.find(c => c.key === catKey);
    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;
      ensureMonthSlot(it, monthKey, cat);

      if(!isAdmin && it.months[monthKey].approved) return;

      const arr = it.months[monthKey].draft.meals || [];
      const has = arr.includes(day);
      const next = has ? arr.filter(x => x !== day) : [...arr, day];
      it.months[monthKey].draft.meals = next
        .map(x => clampDay(x, monthDays))
        .filter((v,i,a) => a.indexOf(v) === i)
        .sort((a,b)=>a-b);

      if(!isAdmin){
        it.months[monthKey].submitted = false;
      }
    });
  }

  function submitMonth(projectId, catKey, itemId){
    const cat = state.categories.find(c => c.key === catKey);
    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;
      ensureMonthSlot(it, monthKey, cat);

      if(cat.approval?.item && !it.approved) return;

      it.months[monthKey].submitted = true;
      it.months[monthKey].submittedAt = new Date().toISOString();
      it.months[monthKey].submittedBy = auth.username;

      it.months[monthKey].approved = false;
      it.months[monthKey].approvedAt = null;
      it.months[monthKey].approvedBy = null;
    });

    const p = state.projects.find(pp => pp.id === projectId);
    const it0 = p?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    pushNotification({
      to: "admin",
      title: `Aylık ${cat?.itemLabel || "Kayıt"} Onayı`,
      body: `${auth.project} • ${cat?.itemLabel || "Kayıt"}: ${it0?.name || "-"} • Ay: ${monthKey}`,
      level: "warn"
    });

    pushToast("Aylık veri admin onayına gönderildi.", "danger");
  }

  function approveMonth(projectId, catKey, itemId){
    const cat = state.categories.find(c => c.key === catKey);
    const p0 = state.projects.find(pp => pp.id === projectId);
    const it0 = p0?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    const req = it0?.months?.[monthKey]?.submittedBy || it0?.requestedBy;

    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;
      ensureMonthSlot(it, monthKey, cat);

      it.months[monthKey].approved = true;
      it.months[monthKey].approvedAt = new Date().toISOString();
      it.months[monthKey].approvedBy = auth.username;
      it.months[monthKey].submitted = false;
    });

    if(req){
      pushNotification({
        to: req,
        title: `Aylık Veri Onaylandı`,
        body: `${p0?.name} • ${cat?.itemLabel || "Kayıt"}: ${it0?.name || "-"} • Ay: ${monthKey}`,
        level: "ok"
      });
    }
  }

  function rejectMonth(projectId, catKey, itemId){
    const cat = state.categories.find(c => c.key === catKey);
    const p0 = state.projects.find(pp => pp.id === projectId);
    const it0 = p0?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    const req = it0?.months?.[monthKey]?.submittedBy || it0?.requestedBy;

    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;
      ensureMonthSlot(it, monthKey, cat);

      it.months[monthKey].approved = false;
      it.months[monthKey].approvedAt = null;
      it.months[monthKey].approvedBy = null;
      it.months[monthKey].submitted = false;
    });

    if(req){
      pushNotification({
        to: req,
        title: `Aylık Veri Reddedildi`,
        body: `${p0?.name} • ${cat?.itemLabel || "Kayıt"}: ${it0?.name || "-"} • Ay: ${monthKey}`,
        level: "danger"
      });
    }
  }

  /* ===== CONTACT ===== */
  function sendContact(){
    const txt = (contactText || "").trim();
    if(!txt) return;

    updateState(d => {
      d.contacts.unshift({
        id: uid("msg"),
        fromUser: auth.username,
        fromProject: auth.project || "ADMIN",
        message: txt,
        createdAt: new Date().toISOString()
      });
    });

    pushNotification({
      to: "admin",
      title: "İletişim Mesajı",
      body: `${auth.project} • ${auth.username}: ${txt.slice(0, 80)}${txt.length>80 ? "…" : ""}`,
      level: "info"
    });

    setContactText("");
    alert("Mesaj gönderildi (sadece admin görür).");
  }

  // 📣 Duyuru yayınla (admin)
  function addAnnouncement({ scopeType, scopeValue, title, body }){
    const t = (title || "").trim();
    const b = (body || "").trim();
    if(!t || !b) return;

    const ann = {
      id: uid("ann"),
      scopeType: scopeType || "all", // all | project | user
      scopeValue: scopeValue || "",
      title: t,
      body: b,
      createdAt: Date.now(),
      createdBy: auth.username
    };

    updateState(d => {
      d.announcements ||= [];
      d.announcements.unshift(ann);
    });

    // hedef kitleye bildirim (kısa)
    const shortBody = `${t}: ${b.slice(0, 90)}${b.length>90 ? "…" : ""}`;
    if(ann.scopeType === "all"){
      // tüm kullanıcılar + admin (görsün)
      for(const u of Object.keys(CREDENTIALS)){
        pushNotification({ to: u, title: "Duyuru", body: shortBody, level: "info" });
      }
    }else if(ann.scopeType === "project"){
      for(const u of Object.keys(CREDENTIALS)){
        if(u === "admin") { pushNotification({ to: u, title: "Duyuru", body: shortBody, level: "info" }); continue; }
        const cred = CREDENTIALS[u];
        if(cred && cred.project === ann.scopeValue){
          pushNotification({ to: u, title: "Duyuru", body: shortBody, level: "info" });
        }
      }
    }else if(ann.scopeType === "user"){
      pushNotification({ to: ann.scopeValue, title: "Duyuru", body: shortBody, level: "info" });
      pushNotification({ to: "admin", title: "Duyuru", body: `@${ann.scopeValue} • ${shortBody}`, level: "info" });
    }

    toast({ title: "Duyuru yayınlandı", body: t, level: "ok" });
  }

  // ✉️ Admin -> Kullanıcı mesajı (iletişim alanından)
  function adminSendMessage({ scopeType, scopeValue, title, body }){
    const t = (title || "").trim();
    const b = (body || "").trim();
    if(!t || !b) return;

    const shortBody = `${t}: ${b.slice(0, 120)}${b.length>120 ? "…" : ""}`;

    if(scopeType === "all"){
      for(const u of Object.keys(CREDENTIALS)){
        if(u === "admin") continue;
        pushNotification({ to: u, title: `Admin Mesajı • ${t}`, body: b, level: "info" });
      }
    }else if(scopeType === "project"){
      for(const u of Object.keys(CREDENTIALS)){
        if(u === "admin") continue;
        const cred = CREDENTIALS[u];
        if(cred && cred.project === scopeValue){
          pushNotification({ to: u, title: `Admin Mesajı • ${t}`, body: b, level: "info" });
        }
      }
    }else if(scopeType === "user"){
      pushNotification({ to: scopeValue, title: `Admin Mesajı • ${t}`, body: b, level: "info" });
    }

    toast({ title: "Mesaj gönderildi", body: shortBody, level: "ok" });
  }

  /* ===== ADMIN: DYNAMIC CATEGORY + FIELD ===== */
  function adminAddCategory(){
    const name = (catName || "").trim();
    const itemLabel = (catItemLabel || "").trim() || "Kayıt";
    if(!name) return;

    const keyBase = slugKey(name);
    let key = keyBase;
    let i = 1;
    while(state.categories.some(c => c.key === key)){
      i++;
      key = `${keyBase}_${i}`;
    }

    updateState(d => {
      d.categories.push({
        id: uid("cat"),
        key,
        name,
        itemLabel,
        approval: { item: true, month: true },
        special: { meals: false },
        fields: []
      });

      // projelere alan aç
      for(const p of d.projects){
        p.itemsByCategory ||= {};
        if(!Array.isArray(p.itemsByCategory[key])) p.itemsByCategory[key] = [];
      }
    });

    setCatName("");
    setCatItemLabel("");
    setCategoryKey(key);
    pushToast("Kategori eklendi.", "danger");
  }

  function adminAddField(){
    const c = activeCategory;
    if(!c) return;

    const label = (catFieldLabel || "").trim();
    if(!label) return;

    let key = slugKey(label);
    let i = 1;
    while(c.fields.some(f => f.key === key)){
      i++;
      key = `${key}_${i}`;
    }

    const type = catFieldType;
    const unit = (catFieldUnit || "").trim();
    const options = (catFieldOptions || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const field = {
      key,
      label,
      type
    };
    if(unit) field.unit = unit;
    if(type === "select") field.options = options.length ? options : ["Seçiniz"];

    updateState(d => {
      const cat = d.categories.find(x => x.key === c.key);
      if(!cat) return;
      cat.fields.push(field);

      // mevcut itemların draftlarını genişlet (mevcut aylar için sadece default boş)
      for(const p of d.projects){
        const arr = p.itemsByCategory?.[cat.key] || [];
        for(const it of arr){
          it.months ||= {};
          for(const mk of Object.keys(it.months)){
            it.months[mk].draft ||= {};
            if(!(field.key in it.months[mk].draft)){
              it.months[mk].draft[field.key] = (type === "number") ? 0 : "";
            }
          }
        }
      }
    });

    setCatFieldLabel("");
    setCatFieldUnit("");
    setCatFieldOptions("");
    pushToast("Alan eklendi.", "danger");
  }

  function adminDeleteField(fieldKey){
    if(!confirm("Bu alan silinsin mi? (mevcut verilerde de kaldırılır)")) return;
    const c = activeCategory;
    updateState(d => {
      const cat = d.categories.find(x => x.key === c.key);
      if(!cat) return;
      cat.fields = cat.fields.filter(f => f.key !== fieldKey);

      for(const p of d.projects){
        const arr = p.itemsByCategory?.[cat.key] || [];
        for(const it of arr){
          for(const mk of Object.keys(it.months || {})){
            if(it.months[mk]?.draft) delete it.months[mk].draft[fieldKey];
          }
        }
      }
    });
  }

  function adminDeleteCategory(catKey){
    const cat = state.categories.find(c => c.key === catKey);
    if(!cat) return;
    if(!confirm(`Kategori silinsin mi? (${cat.name})\nBu işlem ilgili tüm proje verilerini de kaldırır!`)) return;

    updateState(d => {
      // kategoriyi sil
      d.categories = (d.categories || []).filter(c => c.key !== catKey);

      // projelerde ilgili category verisini kaldır
      for(const p of (d.projects || [])){
        if(p.itemsByCategory && p.itemsByCategory[catKey]){
          delete p.itemsByCategory[catKey];
        }
      }

      // eğer aktif kategori silindiyse ilk kategoriye düş
      const still = (d.categories || [])[0];
      if(still && catKey === categoryKey){
        // categoryKey state'i dışarıdan set edemiyoruz burada; aşağıda useEffect ile düzelteceğiz
      }
    });

    pushToast(`Kategori silindi: ${cat.name}`, "danger");
  }

  
  /* ===== ADMIN USER MAPPING (PROJECT ACCESS) ===== */
  /* ===== ADMIN: DOKÜMAN ŞABLONLARI (Sadece Admin) ===== */
  function adminAddDocTemplate(nameArg, keyArg){
    if(!isAdmin) return;
    const name = String(nameArg || "").trim();
    if(!name){
      toast({ title:"Doküman adı boş", body:"Lütfen doküman adını gir.", level:"warn" });
      return;
    }

    const base = slugKey(String(keyArg || "").trim() || name) || uid("doc");
    let key = base;
    let i = 1;
    while((state.docTemplates || []).some(d => d.key === key)){
      i++;
      key = `${base}_${i}`;
    }

    updateState(d => {
      if(!Array.isArray(d.docTemplates)) d.docTemplates = [];
      d.docTemplates.push({ key, name, required: true });
    });

    toast({ title:"Doküman eklendi", body:name, level:"ok" });
  }

  function adminDeleteDocTemplate(docKey){
    if(!isAdmin) return;
    const doc = (state.docTemplates || []).find(d => d.key === docKey);
    if(!doc) return;
    if(!confirm(`Doküman silinsin mi? (${doc.name})`)) return;

    updateState(d => {
      d.docTemplates = (d.docTemplates || []).filter(x => x.key !== docKey);
      // Çalışan imza kayıtlarından da kaldır
      const ed = d.employeeDocs || {};
      for(const empId of Object.keys(ed)){
        if(ed[empId] && ed[empId][docKey]) delete ed[empId][docKey];
      }
    });

    toast({ title:"Doküman silindi", body:doc.name, level:"warn" });
  }

  async function adminUpsertAuthUser(username, password, projectName, role){
    const u = (username || "").trim().toLowerCase();
    const p = (password || "").trim();
    const pr = (projectName || "").trim();
    const rr = (role || "").trim() || "user";

    const allowed = new Set(ROLE_OPTIONS.map(r => r.value));
    const finalRole = allowed.has(rr) ? rr : "user";

    // Admin haricinde proje zorunlu
    if(!u || !p || (finalRole !== "admin" && !pr)){
      pushToast("Kullanıcı adı / şifre / proje zorunlu.", "warn");
      return;
    }

    // Legacy fallback (single-device local storage)
    updateState(d => {
      if(!Array.isArray(d.authUsers)) d.authUsers = [];
      const ix = d.authUsers.findIndex(x => x && x.username === u);
      const rec = { username: u, password: p, project: pr, role: finalRole };
      if(ix >= 0) d.authUsers[ix] = rec;
      else d.authUsers.push(rec);
    });
    pushToast("Kullanıcı kaydedildi (local).", "ok");
  }
  function adminDeleteAuthUser(username){
    const u = (username || "").trim();
    if(!u) return;
    if(!confirm(`Kullanıcı silinsin mi? (${u})`)) return;
    updateState(d => {
      d.authUsers = (d.authUsers || []).filter(x => x && x.username !== u);
    });
    pushToast("Kullanıcı silindi.", "success");
  }

/* ===== DASHBOARD (APPROVED ONLY) ===== */
  const dashboardProjects = useMemo(() => {
    if(!auth) return [];
    if(isAdmin) return state.projects || [];
    const p = (state.projects || []).find(pr => pr.id === auth.projectId);
    return p ? [p] : [];
  }, [state.projects, auth, isAdmin]);
  const dashboardRows = useMemo(() => {
    if(!auth) return [];
    const cat = activeCategory;

    return dashboardProjects.map(p => {
      const arr = p.itemsByCategory?.[cat.key] || [];
      let itemsApproved = 0;
      let monthApproved = 0;

      const sums = {};
      for(const f of (cat.fields || [])){
        if(f.type === "number") sums[f.key] = 0;
      }
      let mealsSum = 0;

      for(const it of arr){
        if(cat.approval?.item && !it.approved) continue;
        itemsApproved++;

        const slot = it.months?.[monthKey];
        if(!slot || !slot.approved) continue;
        monthApproved++;

        const dft = slot.draft || {};
        for(const f of (cat.fields || [])){
          if(f.type === "number") sums[f.key] += safeNum(dft[f.key]);
        }
        // Yemek: yeni (mealCount) + eski (meals[]) uyumluluğu
        if(Object.prototype.hasOwnProperty.call(dft, "mealCount")){
          mealsSum += safeNum(dft.mealCount);
        } else if(Array.isArray(dft.meals)){
          mealsSum += dft.meals.length;
        }
      }

      return {
        id: p.id,
        name: p.name,
        itemsApproved,
        monthApproved,
        sums,
        mealsSum
      };
    });
  }, [dashboardProjects, activeCategory, monthKey, auth]);

  /* ===== APPROVAL QUEUES (admin) ===== */
  const pendingItemRequests = useMemo(() => {
    if(!isAdmin) return [];
    const out = [];
    for(const p of state.projects){
      for(const cat of state.categories){
        const arr = p.itemsByCategory?.[cat.key] || [];
        for(const it of arr){
          if(cat.approval?.item && !it.approved){
            out.push({
              projectId: p.id, projectName: p.name,
              catKey: cat.key, catName: cat.name, itemLabel: cat.itemLabel,
              itemId: it.id, itemName: it.name,
              requestedBy: it.requestedBy,
              createdAt: it.createdAt
            });
          }
        }
      }
    }
    out.sort((a,b)=> String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    return out;
  }, [state.projects, state.categories, isAdmin]);

  const pendingMonthApprovals = useMemo(() => {
    if(!isAdmin) return [];
    const out = [];
    for(const p of state.projects){
      for(const cat of state.categories){
        const arr = p.itemsByCategory?.[cat.key] || [];
        for(const it of arr){
          if(cat.approval?.item && !it.approved) continue;

          const slot = it.months?.[monthKey];
          if(slot?.submitted && !slot?.approved){
            out.push({
              projectId: p.id, projectName: p.name,
              catKey: cat.key, catName: cat.name, itemLabel: cat.itemLabel,
              itemId: it.id, itemName: it.name,
              submittedBy: slot.submittedBy,
              submittedAt: slot.submittedAt
            });
          }
        }
      }
    }
    out.sort((a,b)=> String(b.submittedAt||"").localeCompare(String(a.submittedAt||"")));
    return out;
  }, [state.projects, state.categories, isAdmin, monthKey]);

  /* ===== FILTERED ITEMS FOR ENTRY ===== */
  const entryItems = useMemo(() => {
    if(!auth) return [];
    const p = entryProject;
    if(!p) return [];

    const cat = activeCategory;
    const arrAll = p.itemsByCategory?.[cat.key] || [];
    const q = (search || "").trim().toLowerCase();

    // kullanıcı: sadece onaylı itemlar
    const arr = isAdmin ? arrAll.filter(it => (!cat.approval?.item || it.approved)) : arrAll.filter(it => (!cat.approval?.item || it.approved));

    return arr.filter(it => !q || (it.name||"").toLowerCase().includes(q));
  }, [auth, entryProject, activeCategory, search, isAdmin]);

  const entryExperts = useMemo(() => {
    if(!entryProject) return [];
    return entryProject.itemsByCategory?.["experts"] || [];
  }, [entryProject]);

  const myPendingItems = useMemo(() => {
    if(!auth || isAdmin) return [];
    const p = state.projects.find(pp => pp.name === auth.project);
    if(!p) return [];
    const cat = activeCategory;
    const arr = p.itemsByCategory?.[cat.key] || [];
    return arr.filter(it => cat.approval?.item && !it.approved && it.requestedBy === auth.username);
  }, [auth, isAdmin, visibleProjects, activeCategory]);

  /* ===================== LOGIN SCREEN ===================== */

  if(!auth){
    return (
      <div className="loginHero">
        <div className="loginShell">
          <div className="loginArt" aria-hidden="true">
            <div className="loginArtBlob" />
            <svg className="loginArtSvg" viewBox="0 0 640 520" role="img" aria-label="">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="rgba(59,130,246,.25)" />
                  <stop offset="1" stopColor="rgba(16,185,129,.18)" />
                </linearGradient>
              </defs>
              <rect x="40" y="60" width="560" height="380" rx="42" fill="url(#g1)" />
              <rect x="120" y="120" width="250" height="200" rx="20" fill="rgba(255,255,255,.75)" />
              <rect x="390" y="140" width="150" height="120" rx="18" fill="rgba(255,255,255,.6)" />
              <circle cx="470" cy="340" r="42" fill="rgba(255,255,255,.65)" />
              <rect x="210" y="340" width="240" height="18" rx="9" fill="rgba(255,255,255,.55)" />
              <rect x="210" y="370" width="200" height="14" rx="7" fill="rgba(255,255,255,.45)" />
            </svg>
          </div>

          <div className="loginCard">
            <div className="loginHead">
              <div className="loginKicker">Scaffolding Control Services</div>
              <div className="loginH1">Aylık Takip Formu</div>
            </div>

            <div className="loginBody">
              <label className="loginLabel">E‑Mail</label>
              <input
                className="loginInputLine"
                value={lu}
                onChange={(e) => { setLu(e.target.value); if(loginError) setLoginError(""); }}
                placeholder="kullanici@firma.com"
                autoComplete="username"
              />

              <div style={{ height: 12 }} />

              <label className="loginLabel">Password</label>
              <div className="loginPassRow">
                <input
                  className="loginInputLine"
                  type={showPw ? "text" : "password"}
                  value={lp}
                  onChange={(e) => { setLp(e.target.value); if(loginError) setLoginError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e)=>{ if(e.key === "Enter") doLogin(); }}
                />
                <button
                  className="loginEye"
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              <button className="loginBtnWide" type="button" onClick={doLogin}>
                Giriş
              </button>
              {loginError ? (
                <div className="loginError" role="alert">{loginError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      <div className="topNav">
        <div className="brandRow">
          <div className="brandDot" />
          <div>
            <div className="brandTitle">Aylık Takip Formu</div>
            <div className="brandSub">Scaffolding Control Services</div>
          </div>
        </div>

        <div className="navTabs">
          <button className={"navBtn " + (tab === "dashboard" ? "active" : "")} type="button" onClick={() => setTab("dashboard")}>Dashboard</button>
          <button className={"navBtn " + (tab === "entry" ? "active" : "")} type="button" onClick={() => setTab("entry")}>Veri Girişi</button>
          <button className={"navBtn " + (tab === "docs" ? "active" : "")} type="button" onClick={() => setTab("docs")}>Dokümanlar</button>
          <button className={"navBtn " + (tab === "actions" ? "active" : "")} type="button" onClick={() => setTab("actions")}>Aksiyonlar</button>
          <button className={"navBtn " + (tab === "announcements" ? "active" : "")} type="button" onClick={() => setTab("announcements")}>Duyurular</button>
          <button className={"navBtn " + (tab === "contact" ? "active" : "")} type="button" onClick={() => setTab("contact")}>İletişim</button>
          {isAdmin && (
            <>
              <button className={"navBtn " + (tab === "approvals" ? "active" : "")} type="button" onClick={() => setTab("approvals")}>Onaylar</button>
              <button className={"navBtn " + (tab === "employees" ? "active" : "")} type="button" onClick={() => setTab("employees")}>Personel</button>
              <button className={"navBtn " + (tab === "admin" ? "active" : "")} type="button" onClick={() => setTab("admin")}>Admin</button>
            </>
          )}
        </div>

        <div className="navRight">
          <div className="userPill" title={auth?.username || ""}>
            <span>{auth?.username || "Kullanıcı"}</span>
            <span className="small" style={{opacity:.7}}>{isAdmin ? "Admin" : (auth?.projectName || "Proje")}</span>
          </div>
          <button className="logoutBtn" type="button" onClick={() => { setAuth(null); setLu(""); setLp(""); setTab("dashboard"); setNotifOpen(false); }}>Çıkış</button>
        </div>
      </div>

      <div className="mainArea">
      <div className={`grid ${tab === "dashboard" ? "gridSingle" : ""}`}>
        {/* LEFT PANEL */}
        {tab !== "dashboard" && (
          <div className="card">
            <div className="cardTitleRow">
              <h3>Filtreler</h3>
              <Badge kind="ok">{monthDays} gün</Badge>
            </div>

            <div className="small" style={{ marginTop: 6 }}>
              Kategori seç (Uzman/Araç/diğer). Veri girişi ve dashboard o kategoriye göre çalışır.
            </div>

            <hr className="sep" />

            <div className="row">
              <select
                className="input sm"
                value={activeYear}
                onChange={(e) => setActiveYear(safeNum(e.target.value))}
              >
                {yearOptions().map((yy) => (
                  <option key={yy} value={yy}>{yy}</option>
                ))}
              </select>

              <select
                className="input sm"
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
              >
                {monthOptions().map((mm) => (
                  <option key={mm.key} value={mm.key}>{mm.label}</option>
                ))}
              </select>
            </div>

            <div style={{ height: 10 }} />

            {isAdmin && tab === "entry" && (
              <>
                <select
                  className="input"
                  value={entryProjectId || ""}
                  onChange={(e) => setEntryProjectId(e.target.value)}
                >
                  {(state.projects || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div style={{ height: 10 }} />
              </>
            )}

            <select
              className="input sm"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
            >
              {state.categories.map((c) => (
                <option key={c.key} value={c.key}>{c.name}</option>
              ))}
            </select>

            <div style={{ height: 10 }} />

            <input
              className="input sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${activeCategory?.itemLabel || "Kayıt"} ara...`}
            />

            {!isAdmin && activeCategory?.key !== "monthly_controls" && (
              <>
                <hr className="sep" />
                <div className="cardTitleRow">
                  <h3>{activeCategory?.itemLabel || "Kayıt"} Talebi</h3>
                  <Badge kind="warn">Admin onayı</Badge>
                </div>

                <div style={{ marginTop: 10 }} className="row">
                  <input
                    className="input"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={`${activeCategory?.itemLabel || "Kayıt"} adı (ör: Uğur Kuzu / 34 ABC 123)`}
                  />
                  <button className="btn primary" onClick={() => requestItem(visibleProjects[0]?.id)}>
                    Gönder
                  </button>
                </div>

                {myPendingItems.length > 0 && (
                  <>
                    <hr className="sep" />
                    <div className="cardTitleRow">
                      <h3>Bekleyen Taleplerim</h3>
                      <Badge kind="warn">{myPendingItems.length}</Badge>
                    </div>
                    <div className="list">
                      {myPendingItems.map((it) => (
                        <div key={it.id} className="item">
                          <div className="itemLeft">
                            <b>{it.name}</b>
                            <span className="small">{formatDT(it.createdAt)}</span>
                          </div>
                          <Badge kind="warn">Onay Bekliyor</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {isAdmin && (
              <>
                <hr className="sep" />
                <div className="cardTitleRow">
                  <h3>Bekleyenler</h3>
                  <Badge kind={(pendingItemRequests.length + pendingMonthApprovals.length) ? "warn" : "ok"}>
                    {pendingItemRequests.length + pendingMonthApprovals.length}
                  </Badge>
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Onaylar sekmesinden yönet.
                </div>
              </>
            )}
          </div>
        )}

        {/* RIGHT CONTENT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "dashboard" && (
            <>
              <div className="card">
                <div className="cardTitleRow">
                  <h3>Dashboard Hızlı Filtreler</h3>
                </div>

                <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  {isAdmin && (
                    <select
                      className="input sm"
                      value={dashProjectId}
                      onChange={(e) => setDashProjectId(e.target.value)}
                      style={{ minWidth: 130 }}
                    >
                      <option value="ALL">Tüm Projeler</option>
                      {(state.projects || []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}

                  <select
                    className="input sm"
                    value={activeYear}
                    onChange={(e) => setActiveYear(safeNum(e.target.value))}
                    style={{ minWidth: 110 }}
                  >
                    {yearOptions().map((yy) => (
                      <option key={yy} value={yy}>{yy}</option>
                    ))}
                  </select>

                  <select
                    className="input sm"
                    value={activeMonth}
                    onChange={(e) => setActiveMonth(e.target.value)}
                    style={{ minWidth: 130 }}
                  >
                    {monthOptions().map((mm) => (
                      <option key={mm.key} value={mm.key}>{mm.label}</option>
                    ))}
                  </select>

                  <select
                    className="input sm"
                    value={categoryKey}
                    onChange={(e) => setCategoryKey(e.target.value)}
                    style={{ minWidth: 130 }}
                  >
                    {state.categories.map((c) => (
                      <option key={c.key} value={c.key}>{c.name}</option>
                    ))}
                  </select>

                  <input
                    className="input sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${activeCategory?.itemLabel || "Kayıt"} ara...`}
                    style={{ minWidth: 240, flex: 1 }}
                  />
                </div>

                <div className="small" style={{ marginTop: 10 }}>
                  Bu filtreler, dashboard görünümünü ve hesaplamaları etkiler.
                </div>
              </div>

              <DashboardView
                categories={state.categories}
                monthKey={monthKey}
                category={activeCategory}
                rows={dashboardRows}
                projects={dashboardProjects}
                employees={state.employees}
                actions={state.actions}
                isAdmin={isAdmin}
              />
            </>
          )}

          {tab === "entry" && (
            <>
              <div className="card">
                <div className="cardTitleRow">
                  <h3>Hızlı Menü</h3>
                  <Badge>Veri Girişi</Badge>
                </div>

                {(() => {
                  const KEY_MONTHLY = MONTHLY_CAT_KEY;

                  // Try to detect an equipment-like category even if key isn't exactly "equipment"
                  const equipCat = state.categories.find(c =>
                    c.key === "equipment" || /ekipman/i.test(c.name) || /ekipman/i.test(c.key)
                  );
                  const equipKey = equipCat?.key;

                  const prefKeys = [
                    "experts",
                    "vehicles",
                    ...(equipKey ? [equipKey] : []),
                    KEY_MONTHLY
                  ];

                  const ordered = [
                    ...prefKeys
                      .map(k => state.categories.find(c => c.key === k))
                      .filter(Boolean),
                    ...state.categories.filter(c => !prefKeys.includes(c.key))
                  ].slice(0, 10);

                  const btnStyle = {
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12
                  };

                  return (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                          gap: 10,
                          marginTop: 12
                        }}
                      >
                        {ordered.map(c => {
                          const icon =
                            c.key === "experts" ? "👷" :
                            c.key === "vehicles" ? "🚗" :
                            c.key === KEY_MONTHLY ? "✅" :
                            (/ekipman/i.test(c.name) || /ekipman/i.test(c.key)) ? "🧰" :
                            "📌";

                          return (
                            <button
                              key={c.key}
                              className={categoryKey === c.key ? "btn primary" : "btn"}
                              style={btnStyle}
                              onClick={() => { setCategoryKey(c.key); setSearch(""); }}
                              title={c.name}
                            >
                              <span style={{fontSize:16}}>{icon}</span>
                              <b style={{fontWeight:900}}>{c.name}</b>
                            </button>
                          );
                        })}
                      </div>

                      <div className="small" style={{marginTop:10}}>
                        Kategoriyi seç → sağ tarafta ilgili forma veri gir.
                      </div>
                    </>
                  );
                })()}
              </div>

              {activeCategory?.key === MONTHLY_CAT_KEY ? (
                <MonthlyControlsView
                  isAdmin={isAdmin}
                  monthKey={monthKey}
                  project={entryProject}
                  category={activeCategory}
                  items={entryItems}
                  experts={entryExperts}
                  employees={state.employees}
                  setMonthlyField={setMonthlyField}
                  submitMonth={submitMonth}
                />
              ) : (
                <EntryView
                  isAdmin={isAdmin}
                  monthKey={monthKey}
                  monthDays={monthDays}
                  project={entryProject}
                  category={activeCategory}
                  items={entryItems}
                  experts={entryExperts}
                  employees={state.employees}
                  setMonthlyField={setMonthlyField}
                  toggleMeal={toggleMeal}
                  submitMonth={submitMonth}
                />
              )}
            </>
          )}

          {isAdmin && tab === "approvals" && (
            <ApprovalsView
              monthKey={monthKey}
              pendingItems={pendingItemRequests}
              pendingMonths={pendingMonthApprovals}
              approveItem={approveItem}
              rejectItem={rejectItem}
              approveMonth={approveMonth}
              rejectMonth={rejectMonth}
            />
          )}

          {isAdmin && tab === "admin" && (
            <>
              <AdminView
                isAdmin={isAdmin}
                monthKey={monthKey}
                categories={state.categories}
                projects={state.projects}
                docTemplates={state.docTemplates}
                adminAddDocTemplate={adminAddDocTemplate}
                adminDeleteDocTemplate={adminDeleteDocTemplate}
                catName={catName}
                setCatName={setCatName}
                catItemLabel={catItemLabel}
                setCatItemLabel={setCatItemLabel}
                adminAddCategory={adminAddCategory}
                activeCategory={activeCategory}
                catFieldLabel={catFieldLabel}
                setCatFieldLabel={setCatFieldLabel}
                catFieldType={catFieldType}
                setCatFieldType={setCatFieldType}
                catFieldOptions={catFieldOptions}
                setCatFieldOptions={setCatFieldOptions}
                catFieldUnit={catFieldUnit}
                setCatFieldUnit={setCatFieldUnit}
                adminAddField={adminAddField}
                adminDeleteField={adminDeleteField}
                adminDeleteCategory={adminDeleteCategory}
              />

              <ProjectUserMapping
                authUsers={state.authUsers}
                projects={state.projects}
                onUpsert={adminUpsertAuthUser}
                onDelete={adminDeleteAuthUser}
              />

              <VehiclesAdminView
                isAdmin={isAdmin}
                auth={auth}
                categories={state.categories}
                projects={state.projects}
                updateState={updateState}
                pushToast={pushToast}
              />
            </>
          )}

          {tab === "employees" && (
            <EmployeesView
              isAdmin={isAdmin}
              auth={auth}
              employees={state.employees}
              projects={state.projects}
              updateState={updateState}
            />
          )}

          {tab === "docs" && (
            <DocsView
              isAdmin={isAdmin}
              auth={auth}
              projects={state.projects}
              employees={state.employees}
              docTemplates={state.docTemplates}
              employeeDocs={state.employeeDocs}
              updateState={updateState}
            />
          )}

          {tab === "actions" && (
            <ActionsView
              auth={auth}
              projects={dashboardProjects}
              employees={state.employees}
              actions={state.actions}
              updateState={updateState}
            />
          )}

          {tab === "announcements" && (
            <AnnouncementsView
              isAdmin={isAdmin}
              auth={auth}
              announcements={state.announcements}
              projects={PROJECT_NAMES}
              addAnnouncement={addAnnouncement}
            />
          )}

          {tab === "contact" && (
            <ContactView
              isAdmin={isAdmin}
              auth={auth}
              contacts={state.contacts}
              contactText={contactText}
              setContactText={setContactText}
              sendContact={sendContact}
              adminSendMessage={adminSendMessage}
              projects={PROJECT_NAMES}
              users={Object.keys(CREDENTIALS)
                .filter((u) => u !== "admin")
                .map((u) => ({ username: u, project: CREDENTIALS[u].project }))}
            />
          )}
        </div>
      </div>

      <div className="footer">© {new Date().getFullYear()} Faruk Aksoy • Veri Takip Platformu</div>
      </div>
    </div>
  );

}

/* ===================== VIEWS ===================== */

function DashboardView({ monthKey, category, rows, projects, employees, actions, categories, isAdmin }){
  const totals = useMemo(() => {
    const t = { itemsApproved:0, monthApproved:0, sums:{}, mealsSum:0 };
    for(const f of (category?.fields || [])){
      if(f.type === "number") t.sums[f.key] = 0;
    }

    for(const r of rows){
      t.itemsApproved += safeNum(r.itemsApproved);
      t.monthApproved += safeNum(r.monthApproved);
      for(const k of Object.keys(r.sums || {})){
        t.sums[k] = safeNum(t.sums[k]) + safeNum(r.sums[k]);
      }
      t.mealsSum += safeNum(r.mealsSum);
    }
    return t;
  }, [rows, category]);

  return (
    <div className="card">
      <div className="cardTitleRow">
        <h2>Dashboard • {category?.name}</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
          <Badge kind="ok">Onaylı veriler</Badge>
          <Badge>{monthKey}</Badge>
        </div>
      </div>

      <div className="small" style={{marginTop:6}}>
        Bu ekranda sadece <b>admin onaylı</b> aylık veriler hesaplanır.
      </div>

      {/* Proje Aksiyon Sayıları */}
<hr className="sep" />
<div className="cardTitleRow">
  <h3>Proje Aksiyon Sayıları</h3>
  <Badge kind="warn">Durum Bazlı</Badge>
</div>
<div className="small" style={{marginTop:6}}>
  Detaylar için <b>Aksiyonlar</b> menüsünü kullan.
</div>

<div style={{
  marginTop:10,
  display:"grid",
  gridTemplateColumns:"repeat(5, minmax(150px, 1fr))",
  gap:8,
  overflowX:"auto"
}}>
  {(Array.isArray(projects) ? projects : []).map(p => {
    const list = (Array.isArray(actions) ? actions : []).filter(a => a?.project === p.name);
    const count = (st) => list.filter(a => (a.status || "open") === st).length;
    const openN = count("open");
    const progN = count("in_progress");
    const doneN = list.filter(a => (a.status || "open") === "done" || (a.status || "open") === "user_done").length;
    const closedN = count("closed");

    const rowStyle = {display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"2px 0"};
    const labelStyle = {fontSize:12, opacity:.9};

    return (
      <div
        key={p.id}
        className="card"
        style={{
          minWidth:150,
          padding:"10px 12px",
          borderRadius:12
        }}
      >
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
          <div style={{fontWeight:700, fontSize:13, lineHeight:"16px"}}>{p.name}</div>
          <Badge kind={openN ? "danger" : "ok"}>{list.length}</Badge>
        </div>

        <div style={{marginTop:8}}>
          <div style={rowStyle}>
            <span style={labelStyle}>Açık</span>
            <Badge kind="danger">{openN}</Badge>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Devam</span>
            <Badge kind="warn">{progN}</Badge>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Tamam</span>
            <Badge kind="ok">{doneN}</Badge>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Kapalı</span>
            <Badge kind="ok">{closedN}</Badge>
          </div>
        </div>
      </div>
    );
  })}
</div>

<div className="kpiRow">
        <KPI label={`Onaylı ${category?.itemLabel || "Kayıt"}`} value={totals.itemsApproved}/>
        <KPI label="Onaylı Aylık Kayıt" value={totals.monthApproved}/>
        {Object.keys(totals.sums).map(k=>(
          <KPI key={k} label={(category.fields.find(f=>f.key===k)?.label)||k} value={totals.sums[k]}/>
        ))}
        {(category?.special?.meals || (category?.fields||[]).some(f=>f.key==="mealCount") || totals.mealsSum>0) ? <KPI label="Yemek" value={totals.mealsSum}/> : null}
      </div>

      {/* Grafikler */}
      <div style={{marginTop:14}}>
        <div className="cardTitleRow">
          <h3>Grafikli Özet</h3>
          <Badge kind="ok">Proje Bazlı</Badge>
        </div>

        <div className="small" style={{marginTop:6}}>
          Seçili kategori: <b>{category?.name}</b> • Sadece <b>onaylı aylık</b> veriler.
        </div>

        <div style={{marginTop:12, display:"grid", gridTemplateColumns:"repeat(5, minmax(180px, 1fr))", gap:8, overflowX:"auto"}}>
          {(category?.fields || []).filter(f=>f.type==="number").map(f => (
            <BarChart
              key={f.key}
              title={f.label}
              data={rows.map(r => ({ label: r.name, value: safeNum(r.sums?.[f.key]) }))}
            />
          ))}
          {category?.special?.meals ? (
            <BarChart
              title="Yemek"
              data={rows.map(r => ({ label: r.name, value: safeNum(r.mealsSum) }))}
            />
          ) : null}
        </div>
      </div>

      {/* Aylık Proje Raporu (PDF/Print) */}
      <hr className="sep" />
      <div className="cardTitleRow">
        <h3>Aylık Proje Raporu</h3>
        <Badge>{monthKey}</Badge>
      </div>
      <div className="small" style={{marginTop:6}}>
        Butona tıkla → rapor yeni sekmede açılır → tarayıcıdan <b>PDF olarak kaydet</b>.
      </div>

      <div style={{marginTop:10, display:"flex", gap:10, flexWrap:"wrap"}}>
        {(Array.isArray(projects) ? projects : []).map(p => (
          <button
            key={p.id}
            className="btn primary"
            onClick={() => openProjectMonthlyReport({ project: p, category, monthKey, employees })}
          >
            {p.name} • PDF Rapor
          </button>
        ))}
      </div>

      <hr className="sep" />

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Proje</th>
              <th>Onaylı {category?.itemLabel || "Kayıt"}</th>
              <th>Onaylı Aylık</th>
              {(category?.fields || []).filter(f=>f.type==="number").map(f=>(
                <th key={f.key}>{f.label}</th>
              ))}
              {category?.special?.meals ? <th>Yemek</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.itemsApproved}</td>
                <td>{r.monthApproved}</td>
                {(category?.fields || []).filter(f=>f.type==="number").map(f=>(
                  <td key={f.key}>{safeNum(r.sums?.[f.key])}</td>
                ))}
                {category?.special?.meals ? <td>{r.mealsSum}</td> : null}
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan="99">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Kişi bazlı (Uzmanlar) */}
      {category?.key === "experts" && (
        <>

          <hr className="sep" />
          <div className="cardTitleRow">
            <h3>Kişi Bazlı • Onaylı Aylık</h3>
            <Badge>{monthKey}</Badge>
          </div>

          <div className="small" style={{marginTop:6}}>
            Sadece <b>admin onaylı</b> uzman aylıkları listelenir.
          </div>

          <div className="tableWrap" style={{marginTop:10}}>
            <table>
              <thead>
                <tr>
                  <th>Proje</th>
                  <th>Uzman</th>
                  {(category?.fields || []).filter(f=>f.type==="number").map(f=>(
                    <th key={f.key}>{f.label}</th>
                  ))}
                  {category?.special?.meals ? <th>Yemek</th> : null}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const out = [];
                  const prjs = Array.isArray(projects) ? projects : [];
                  for(const p of prjs){
                    const arr = p.itemsByCategory?.[category.key] || [];
                    for(const it of arr){
                      if(category.approval?.item && !it.approved) continue;
                      const slot = it.months?.[monthKey];
                      if(!slot || !slot.approved) continue;

                      const dft = slot.draft || {};
                      const rec = {
                        project: p.name,
                        name: it.name,
                        nums: {},
                        meals: category?.special?.meals ? ((Object.prototype.hasOwnProperty.call(dft, "mealCount") ? safeNum(dft.mealCount) : (Array.isArray(dft.meals) ? dft.meals.length : 0))) : null
                      };
                      for(const f of (category.fields || [])){
                        if(f.type === "number") rec.nums[f.key] = safeNum(dft[f.key]);
                      }
                      out.push(rec);
                    }
                  }
                  out.sort((a,b)=> (a.project+a.name).localeCompare(b.project+b.name,"tr"));
                  return out.map((r,i)=>(
                    <tr key={r.project + "_" + r.name + "_" + i}>
                      <td><b>{r.project}</b></td>
                      <td>{r.name}</td>
                      {(category?.fields || []).filter(f=>f.type==="number").map(f=>(
                        <td key={f.key}>{safeNum(r.nums?.[f.key])}</td>
                      ))}
                      {category?.special?.meals ? <td>{safeNum(r.meals)}</td> : null}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
      {true && (
        <div className="small" style={{marginTop:10}}>
          Kullanıcı ekranında sadece kendi projesi listelenir.
        </div>
      )}
    </div>
  );
}

function KPI({label, value}){
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <div className="v">{String(value)}</div>
    </div>
  );
}

function BarChart({ title, data }){
  const max = Math.max(1, ...(data || []).map(d => safeNum(d.value)));
  return (
    <div className="card" style={{padding:14}}>
      <div className="cardTitleRow">
        <h4 style={{margin:0}}>{title}</h4>
        <Badge kind="ok">Bar</Badge>
      </div>
      <div style={{marginTop:10, display:"flex", flexDirection:"column", gap:8}}>
        {(data || []).map(d => {
          const v = safeNum(d.value);
          const w = Math.max(2, Math.round((v / max) * 100));
          return (
            <div key={d.label} style={{display:"grid", gridTemplateColumns:"130px 1fr 60px", gap:10, alignItems:"center"}}>
              <div className="small" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={d.label}>
                {d.label}
              </div>
              <div style={{background:"rgba(11,94,215,.10)", borderRadius:10, height:12, overflow:"hidden"}}>
                <div style={{width: w + "%", height:"100%", background:"rgba(11,94,215,.55)"}} />
              </div>
              <div style={{textAlign:"right"}}><b>{String(v)}</b></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function openProjectMonthlyReport({ project, category, monthKey, employees }){
  const html = buildMonthlyReportHTML({ project, category, monthKey, employees });

  const w = window.open("", "_blank");
  if(!w){
    alert("Popup engellendi. Tarayıcıda pop-up izni verip tekrar dene.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();

  // kısa gecikme: font/layout otursun
  setTimeout(() => {
    w.print();
  }, 300);
}

function buildMonthlyReportHTML({ project, category, monthKey, employees }){
  const prjName = project?.name || "-";
  const catName = category?.name || "-";
  const catKey = category?.key;

  // Çalışan listesi: employees + (uzmanlar -> çalışan gibi)
  const manual = (Array.isArray(employees) ? employees : [])
    .filter(e => e.project === prjName && e.approved === true && e.active !== false)
    .map(e => ({ name: e.name, role: e.role || "Çalışan" }));

  const experts = (project?.itemsByCategory?.experts || [])
    .filter(it => it.approved === true)
    .map(it => ({ name: it.name, role: "Uzman" }));

  const staff = [...experts, ...manual]
    .sort((a,b)=> (a.role+a.name).localeCompare(b.role+b.name, "tr"));

  // Kategori bazlı onaylı aylık tablo
  const items = (project?.itemsByCategory?.[catKey] || [])
    .filter(it => (!category?.approval?.item || it.approved === true))
    .map(it => {
      const slot = it.months?.[monthKey];
      if(!slot || !slot.approved) return null;
      const dft = slot.draft || {};
      const nums = (category?.fields || []).filter(f=>f.type==="number")
        .map(f => ({ label: f.label, key: f.key, val: safeNum(dft[f.key]) }));
      const texts = (category?.fields || []).filter(f=>f.type!=="number")
        .map(f => ({ label: f.label, key: f.key, val: (dft[f.key] ?? "") }));
      const meals = category?.special?.meals ? ((Object.prototype.hasOwnProperty.call(dft, "mealCount") ? safeNum(dft.mealCount) : (Array.isArray(dft.meals) ? dft.meals.length : 0))) : null;
      return { name: it.name, nums, texts, meals };
    })
    .filter(Boolean);

  const numFields = (category?.fields || []).filter(f=>f.type==="number");
  const hasMeals = !!category?.special?.meals;

  const totals = {};
  for(const f of numFields) totals[f.key] = 0;
  let mealsTotal = 0;
  for(const it of items){
    for(const n of it.nums) totals[n.key] += safeNum(n.val);
    if(hasMeals) mealsTotal += safeNum(it.meals);
  }

  const style = `
    <style>
      *{ box-sizing:border-box; }
      body{ font-family: Arial, Helvetica, sans-serif; margin:24px; color:#111; }
      .top{ display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
      .brand{ display:flex; gap:12px; align-items:center; }
      .logo{ width:42px; height:42px; border-radius:12px; background:#0b5ed7; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; }
      h1{ margin:0; font-size:20px; }
      .meta{ color:#444; font-size:12px; margin-top:4px; }
      .box{ border:1px solid #e6e6e6; border-radius:14px; padding:14px; margin-top:14px; }
      table{ width:100%; border-collapse:collapse; margin-top:10px; }
      th, td{ border-bottom:1px solid #eee; padding:8px; text-align:left; font-size:12px; vertical-align:top; }
      th{ background:#fafafa; font-size:12px; }
      .kpiRow{ display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;}
      .kpi{ border:1px solid #eee; border-radius:12px; padding:10px 12px; min-width:140px;}
      .kpi .k{ font-size:11px; color:#444;}
      .kpi .v{ font-size:16px; font-weight:900; margin-top:4px;}
      .muted{ color:#666; font-size:12px; }
      .foot{ margin-top:16px; font-size:11px; color:#666; display:flex; justify-content:space-between; gap:10px; }
      @media print { button{ display:none; } }
    </style>
  `;

  const staffRows = staff.length
    ? staff.map(s => `<tr><td><b>${escapeHtml(s.name)}</b></td><td>${escapeHtml(s.role)}</td></tr>`).join("")
    : `<tr><td colspan="2">Kayıt yok.</td></tr>`;

  const headerCols = `
    <th>${escapeHtml(category?.itemLabel || "Kayıt")}</th>
    ${numFields.map(f => `<th>${escapeHtml(f.label)}</th>`).join("")}
    ${hasMeals ? `<th>Yemek</th>` : ``}
  `;

  const itemRows = items.length
    ? items.map(it => `
      <tr>
        <td><b>${escapeHtml(it.name)}</b></td>
        ${numFields.map(f => {
          const x = it.nums.find(n => n.key === f.key);
          return `<td>${escapeHtml(String(x?.val ?? 0))}</td>`;
        }).join("")}
        ${hasMeals ? `<td>${escapeHtml(String(it.meals ?? 0))}</td>` : ``}
      </tr>
    `).join("")
    : `<tr><td colspan="${1 + numFields.length + (hasMeals?1:0)}">Bu ay onaylı kayıt yok.</td></tr>`;

  const totalsRow = `
    <tr>
      <td><b>TOPLAM</b></td>
      ${numFields.map(f => `<td><b>${escapeHtml(String(totals[f.key] ?? 0))}</b></td>`).join("")}
      ${hasMeals ? `<td><b>${escapeHtml(String(mealsTotal))}</b></td>` : ``}
    </tr>
  `;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(prjName)} • ${escapeHtml(monthKey)} • Rapor</title>
        ${style}
      </head>
      <body>
        <div class="top">
          <div class="brand">
            <div class="logo">VT</div>
            <div>
              <h1>${escapeHtml(prjName)} • Aylık Rapor</h1>
              <div class="meta">Ay: <b>${escapeHtml(monthKey)}</b> • Kategori: <b>${escapeHtml(catName)}</b></div>
            </div>
          </div>
          <div class="muted">Rapor: Veri Takip Sistemi • Faruk Aksoy</div>
        </div>

        <div class="box">
          <div><b>Çalışan Listesi</b> <span class="muted">(Onaylı • Aktif)</span></div>
          <table>
            <thead><tr><th>Ad Soyad</th><th>Görev</th></tr></thead>
            <tbody>${staffRows}</tbody>
          </table>
        </div>

        <div class="box">
          <div><b>${escapeHtml(catName)}</b> <span class="muted">(Onaylı Aylık Kayıtlar)</span></div>
          <div class="kpiRow">
            <div class="kpi"><div class="k">Kayıt</div><div class="v">${items.length}</div></div>
            ${numFields.map(f => `<div class="kpi"><div class="k">${escapeHtml(f.label)}</div><div class="v">${escapeHtml(String(totals[f.key] ?? 0))}</div></div>`).join("")}
            ${hasMeals ? `<div class="kpi"><div class="k">Yemek</div><div class="v">${escapeHtml(String(mealsTotal))}</div></div>` : ``}
          </div>

          <table>
            <thead><tr>${headerCols}</tr></thead>
            <tbody>
              ${itemRows}
              ${items.length ? totalsRow : ``}
            </tbody>
          </table>

          <div class="foot">
            <div>Oluşturma: ${new Date().toLocaleString()}</div>
            <div>© ${new Date().getFullYear()} • Veri Takip • Faruk Aksoy</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MonthlyControlsView({
  isAdmin,
  monthKey,
  project,
  category,
  items,
  experts,
  employees,
  setMonthlyField,
  submitMonth
}){
  const safeItems = Array.isArray(items) ? items : [];
  const fields = Array.isArray(category?.fields) ? category.fields : [];
  const expertOptions = React.useMemo(() => {
    const a = Array.isArray(experts) ? experts : [];
    const namesA = a.map(x => x?.name).filter(Boolean);

    // Eğer projede onaylı/ekli uzman yoksa, çalışan listesinden "Uzman" rolünü fallback al
    const emp = Array.isArray(employees) ? employees : [];
    const namesB = emp
      .filter(e => (e?.projectId === project?.id) && /uzman/i.test(String(e?.role || "")))
      .map(e => e?.name)
      .filter(Boolean);

    // uniq
    return Array.from(new Set([...namesA, ...namesB]));
  }, [experts, employees, project]);

  if(!project){
    return <div className="card"><div className="small">Proje seçili değil.</div></div>;
  }

  return (
    <div className="card">
      <div className="cardTitleRow">
        <h2>{category?.name || "Aylık Kontroller"} • {project.name}</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
          <Badge>{monthKey}</Badge>
          <Badge kind="warn">Admin onayı</Badge>
        </div>
      </div>

      <div className="small" style={{marginTop:6}}>
        Kontrol satırlarına veriyi gir → her satır için <b>Onaya Gönder</b>.
      </div>

      <hr className="sep" />

      <div style={{display:"grid", gap:12}}>
        {safeItems.map(it => {
          const slot = it.months?.[monthKey] || {};
          const draft = slot.draft || {};
          const approved = !!slot.approved;
          const submitted = !!slot.submitted;

          return (
            <div key={it.id} className="card" style={{background:"#fff"}}>
              <div className="cardTitleRow">
                <h3 style={{margin:0}}>{it.name}</h3>
                <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
                  {approved && <Badge kind="ok">Onaylı</Badge>}
                  {!approved && submitted && <Badge kind="warn">Bekliyor</Badge>}
                  {!approved && !submitted && <Badge kind="danger">Taslak</Badge>}
                </div>
              </div>

              <div style={{marginTop:10, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:10}}>
                {fields.map(f => (
                  <div key={f.key}>
                    <div className="small" style={{fontWeight:800, opacity:.85, marginBottom:6}}>{f.label}</div>
                    {f.type === "select" ? (
                      <select
                        className="input"
                        value={draft[f.key] || ""}
                        onChange={e=>setMonthlyField(project.id, category.key, it.id, f.key, e.target.value)}
                        disabled={!isAdmin && approved}
                      >
                        <option value="">Seç...</option>
                        {( (f.key==='kontrol_eden') ? expertOptions : (f.options || []) ).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : f.type === "date" ? (
                      <input
                        className="input"
                        type="date"
                        value={draft[f.key] || ""}
                        onChange={e=>setMonthlyField(project.id, category.key, it.id, f.key, e.target.value)}
                        disabled={!isAdmin && approved}
                      />
                    ) : f.type === "number" ? (
                      <input
                        className="input"
                        type="number"
                        value={draft[f.key] ?? ""}
                        onChange={e=>setMonthlyField(project.id, category.key, it.id, f.key, e.target.value)}
                        disabled={!isAdmin && approved}
                      />
                    ) : (
                      <input
                        className="input"
                        value={draft[f.key] || ""}
                        onChange={e=>setMonthlyField(project.id, category.key, it.id, f.key, e.target.value)}
                        disabled={!isAdmin && approved}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
                <button
                  className="btn primary"
                  onClick={()=>submitMonth(project.id, category.key, it.id)}
                  disabled={approved}
                  title={approved ? "Onaylı veri kilitli." : "Admin onayına gönder"}
                >
                  Onaya Gönder
                </button>
                {approved && <Badge kind="ok">Bu ay onaylandı</Badge>}
                {!approved && submitted && <Badge kind="warn">Admin onayı bekleniyor</Badge>}
              </div>
            </div>
          );
        })}

        {safeItems.length === 0 && (
          <div className="small">Kontrol satırı bulunamadı.</div>
        )}
      </div>
    </div>
  );
}

function ApprovalsView({
  monthKey,
  pendingItems,
  pendingMonths,
  approveItem,
  rejectItem,
  approveMonth,
  rejectMonth
}){
  const items = Array.isArray(pendingItems) ? pendingItems : [];
  const months = Array.isArray(pendingMonths) ? pendingMonths : [];

  return (
    <div className="card">
      <div className="cardTitleRow">
        <h2>Onaylar</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
          <Badge kind="warn">Bekleyen</Badge>
          <Badge>{monthKey}</Badge>
        </div>
      </div>

      <div className="small" style={{marginTop:6}}>
        Burada item talepleri ve aylık veri onaylarını yönetirsin.
      </div>

      <hr className="sep" />
      <div className="cardTitleRow">
        <h3>Bekleyen Kayıt Talepleri</h3>
        <Badge kind={items.length ? "danger" : "ok"}>{items.length}</Badge>
      </div>

      <div style={{overflowX:"auto", marginTop:10}}>
        <table className="table">
          <thead>
            <tr>
              <th>Proje</th>
              <th>Kategori</th>
              <th>Kayıt</th>
              <th>İsteyen</th>
              <th>Tarih</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={`${r.projectId}_${r.catKey}_${r.itemId}`}>
                <td><b>{r.projectName}</b></td>
                <td>{r.catName}</td>
                <td>{r.itemName}</td>
                <td>{r.requestedBy || "-"}</td>
                <td className="small">{fmtDateTime(r.createdAt)}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn primary" onClick={()=>approveItem(r.projectId, r.catKey, r.itemId)}>Onayla</button>{" "}
                  <button className="btn danger" onClick={()=>rejectItem(r.projectId, r.catKey, r.itemId)}>Reddet</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6}>Bekleyen kayıt talebi yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <hr className="sep" />
      <div className="cardTitleRow">
        <h3>Bekleyen Aylık Veri Onayları</h3>
        <Badge kind={months.length ? "warn" : "ok"}>{months.length}</Badge>
      </div>

      <div style={{overflowX:"auto", marginTop:10}}>
        <table className="table">
          <thead>
            <tr>
              <th>Proje</th>
              <th>Kategori</th>
              <th>Kayıt</th>
              <th>Gönderen</th>
              <th>Gönderim</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {months.map(r => (
              <tr key={`${r.projectId}_${r.catKey}_${r.itemId}`}>
                <td><b>{r.projectName}</b></td>
                <td>{r.catName}</td>
                <td>{r.itemName}</td>
                <td>{r.submittedBy || "-"}</td>
                <td className="small">{fmtDateTime(r.submittedAt)}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn primary" onClick={()=>approveMonth(r.projectId, r.catKey, r.itemId)}>Onayla</button>{" "}
                  <button className="btn danger" onClick={()=>rejectMonth(r.projectId, r.catKey, r.itemId)}>Reddet</button>
                </td>
              </tr>
            ))}
            {months.length === 0 && (
              <tr><td colSpan={6}>Bekleyen aylık veri yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntryView({
  isAdmin,
  monthKey,
  monthDays,
  project,
  category,
  items,
  employees,
  setMonthlyField,
  toggleMeal,
  submitMonth
}){
  if(!project){
    return <div className="card">Proje bulunamadı.</div>;
  }

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>Veri Girişi • {category?.name}</h2>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
            <Badge>{project.name}</Badge>
            <Badge kind="ok">{monthKey}</Badge>
          </div>
        </div>
        <div className="small" style={{marginTop:6}}>
          {category?.itemLabel || "Kayıt"} onaylıysa görünür. Aylık veriyi girip <b>Onaya Gönder</b> yap.
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="small">
            Onaylı {category?.itemLabel || "kayıt"} yok. Soldan talep gönderebilirsin (admin onayı gerekir).
          </div>
        </div>
      ) : (
        (category && (category.key==="experts" || (category.special && category.special.meals))) ? (
          <ExpertsEntryCompactView
            isAdmin={isAdmin}
            monthKey={monthKey}
            monthDays={monthDays}
            project={project}
            category={category}
            items={items}
            employees={employees}
            setMonthlyField={setMonthlyField}
            toggleMeal={toggleMeal}
            submitMonth={submitMonth}
          />
        ) : (
          items.map(it => {
          const empId = it?.meta?.employeeId;
          const emp = empId ? (employees || []).find(e => e.id === empId) : null;
          const inactive = !!emp && emp.active === false;

          const slot = it.months?.[monthKey];
          const submitted = slot?.submitted === true;
          const approved = slot?.approved === true;
          const draft = slot?.draft || {};
          const meals = Array.isArray(draft.meals) ? draft.meals : [];

          return (
            <div className="card" key={it.id}>
              <div className="cardTitleRow">
                <h3 style={{display:"flex", alignItems:"center", gap:10}}>{it.name}{inactive ? <Badge kind="danger">Pasif</Badge> : null}</h3>
                <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
                  {approved && <Badge kind="ok">Onaylandı</Badge>}
                  {!approved && submitted && <Badge kind="warn">Onay Bekliyor</Badge>}
                  {!approved && !submitted && <Badge>Draft</Badge>}
                </div>
              </div>
              {inactive ? (
                <div className="small" style={{marginTop:8, fontWeight:800, color:"rgba(127,29,29,.95)"}}>
                  Bu personel pasife alındığı için bu kayda veri girişi yapılamaz.
                </div>
              ) : null}

              <hr className="sep" />

              {/* Fields */}
              <div className="row" style={{flexWrap:"wrap"}}>
                {(category?.fields || []).map(f => (
                  <div key={f.key} style={{minWidth:220, flex:"1 1 240px"}}>
                    <div className="small" style={{fontWeight:900, marginBottom:6}}>
                      {f.label}{f.unit ? ` (${f.unit})` : ""}
                    </div>

                    {f.type === "select" ? (() => {
                      const selectOptions = (category?.key === "monthly_controls" && f.key === "kontrol_eden")
                        ? [
                            "Seçiniz",
                            ...(employees || []).filter(e => e.active !== false && e.approved !== false && e.project === project.name).map(e => e.name),
                            ...(project.itemsByCategory?.experts || []).filter(x => x.approved).map(x => x.name)
                          ].filter((v,i,a) => a.indexOf(v) === i)
                        : (f.options || ["Seçiniz"]);
                      return (
                        <select
                          className="input"
                          value={draft[f.key] ?? ""}
                          disabled={inactive || (!isAdmin && approved)}
                          onChange={(ev)=>setMonthlyField(project.id, category.key, it.id, f.key, ev.target.value)}
                        >
                          {selectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      );
                    })() : (
                      <input
                        className="input"
                        type={f.type === "number" ? "number" : (f.type === "date" ? "date" : "text")}
                        value={draft[f.key] ?? (f.type==="number" ? 0 : "")}
                        disabled={inactive || (!isAdmin && approved)}
                        onChange={(ev)=>setMonthlyField(project.id, category.key, it.id, f.key, ev.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Meals for experts */}
              {category?.special?.meals && (
                <>
                  <hr className="sep" />
                  <div className="cardTitleRow">
                    <div style={{fontWeight:900}}>Yemek Takibi</div>
                    <div className="small">Toplam: <b>{meals.length}</b></div>
                  </div>

                  <div className="mealGrid">
                    {Array.from({length: monthDays}).map((_,i)=>{
                      const day = i+1;
                      const checked = meals.includes(day);
                      return (
                        <label
                          key={day}
                          className="mealCell"
                          style={{ background: checked ? "rgba(11,94,215,.08)" : "rgba(255,255,255,.85)" }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={inactive || (!isAdmin && approved)}
                            onChange={()=>toggleMeal(project.id, it.id, day)}
                          />
                          <span style={{fontSize:12}}>{day}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {!isAdmin && (
                <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
                  <button
                    className="btn primary"
                    onClick={()=>submitMonth(project.id, category.key, it.id)}
                    disabled={approved || inactive}
                    title={approved ? "Onaylı veri kilitli." : "Admin onayına gönder"}
                  >
                    Onaya Gönder
                  </button>
                  {approved && <Badge kind="ok">Bu ay onaylandı</Badge>}
                  {!approved && submitted && <Badge kind="warn">Admin onayı bekleniyor</Badge>}
                </div>
              )}
            </div>
          );
        })
        )
      )}
    </>
  );
}

function ExpertsEntryCompactView({ isAdmin, monthKey, monthDays, project, category, items, employees, setMonthlyField, toggleMeal, submitMonth }){
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if(!q) return (items || []);
    return (items || []).filter(it => (it.name || "").toLowerCase().includes(q));
  }, [items, search]);


  function isInactiveItem(it){
    const empId = it?.meta?.employeeId;
    if(!empId) return false;
    const e = (employees || []).find(x => x.id === empId);
    return !!e && e.active === false;
  }

  function getSlot(it){
    const slot = it.months?.[monthKey];
    const draft = slot?.draft || {};
    const meals = Array.isArray(draft.meals) ? draft.meals : []; // geriye dönük destek
    const mealCount = Number.isFinite(draft.mealCount) ? Number(draft.mealCount||0) : (meals.length || 0);
    return { slot, draft, meals, mealCount, submitted: slot?.submitted===true, approved: slot?.approved===true };
  }

  const totalMeals = React.useMemo(() => {
    return (filtered || []).reduce((sum, it) => sum + (getSlot(it).mealCount || 0), 0);
  }, [filtered, monthKey]);

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h3>Uzman Veri Girişi</h3>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
            <Badge kind="info">Toplam Yemek: {totalMeals}</Badge>
            <Badge kind="default">{filtered.length} uzman</Badge>
          </div>
        </div>

        <div className="row" style={{marginTop:12, gap:10, flexWrap:"wrap"}}>
          <div style={{flex:"1 1 260px"}}>
            <input className="input sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Uzman ara..." />
          </div>
          <div className="small" style={{flex:"1 1 320px"}}>
            Yemek artık <b>sayı</b> olarak girilir. (Gün seçimi kaldırıldı — istersen tekrar ekleriz.)
          </div>
        </div>

        <hr className="sep" />

        <div className="stackList">
          {filtered.map(it => {
        const inactive = isInactiveItem(it);
            const { draft, mealCount, submitted, approved } = getSlot(it);

            return (
              <div key={it.id} className="miniCard">
                <div className="miniCardHead">
                  <div>
                    <div style={{fontWeight:800}}>{it.name}{inactive && <Badge kind="danger">Pasif</Badge>}</div>
                    <div className="small" style={{marginTop:2, opacity:.85}}>
                      {approved ? "Onaylandı" : submitted ? "Onay bekliyor" : "Taslak"}
                    </div>
                  </div>

                  <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end"}}>
                    {approved && <Badge kind="ok">Onaylandı</Badge>}
                    {!approved && submitted && <Badge kind="warn">Bekliyor</Badge>}
                    {!approved && !submitted && <Badge kind="danger">Taslak</Badge>}

                    {!approved && (
                      <button
                        className={"btn " + (submitted ? "ghost" : "primary")}
                        disabled={submitted || inactive}
                        onClick={() => submitMonth(project.id, category.key, it.id)}
                        title={submitted ? "Bu ay için zaten onaya gönderildi." : "Bu ay verilerini onaya gönder"}
                      >
                        {submitted ? "Gönderildi" : "Onaya Gönder"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="miniGrid">
                  <div>
                    <div className="lbl">Onay</div>
                    <input
                      className="input"
                      type="number"
                      value={draft.onay ?? 0}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "onay", Number(e.target.value||0))}
                    />
                  </div>

                  <div>
                    <div className="lbl">Güncelleme</div>
                    <input
                      className="input"
                      type="number"
                      value={draft.guncelleme ?? 0}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "guncelleme", Number(e.target.value||0))}
                    />
                  </div>

                  <div>
                    <div className="lbl">Merdiven</div>
                    <input
                      className="input"
                      type="number"
                      value={draft.merdiven ?? 0}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "merdiven", Number(e.target.value||0))}
                    />
                  </div>

                  <div>
                    <div className="lbl">Gözlem</div>
                    <input
                      className="input"
                      type="number"
                      value={draft.gozlem ?? 0}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "gozlem", Number(e.target.value||0))}
                    />
                  </div>

                  <div>
                    <div className="lbl">Takip</div>
                    <input
                      className="input"
                      type="number"
                      value={draft.takip ?? 0}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "takip", Number(e.target.value||0))}
                    />
                  </div>

                  <div>
                    <div className="lbl">Yemek</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={mealCount}
                      disabled={approved || inactive}
                      onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "mealCount", Number(e.target.value||0))}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length===0 && <div className="small">Kayıt yok.</div>}
        </div>
      </div>
    </>
  );
}

function AdminView({
  isAdmin,
  monthKey,
  categories,
  projects,
  docTemplates,
  adminAddDocTemplate,
  adminDeleteDocTemplate,
  catName, setCatName,
  catItemLabel, setCatItemLabel,
  adminAddCategory,
  activeCategory,
  catFieldLabel, setCatFieldLabel,
  catFieldType, setCatFieldType,
  catFieldOptions, setCatFieldOptions,
  catFieldUnit, setCatFieldUnit,
  adminAddField,
  adminDeleteField,
  adminDeleteCategory
}){
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Doküman Tanımları ekleme inputu için local state
  const [newDocName, setNewDocName] = useState("");

  const summaryRows = useMemo(() => {
    const out = [];
    for(const p of safeProjects){
      for(const c of safeCategories){
        const arr = p.itemsByCategory?.[c.key] || [];
        const total = arr.length;
        const approvedItems = arr.filter(it => !c.approval?.item || it.approved).length;

        let approvedMonths = 0;
        let pendingMonths = 0;

        for(const it of arr){
          if(c.approval?.item && !it.approved) continue;
          const slot = it.months?.[monthKey];
          if(!slot) continue;
          if(slot.approved) approvedMonths++;
          else if(slot.submitted) pendingMonths++;
        }

        out.push({
          id: `${p.id}_${c.key}`,
          project: p.name,
          category: c.name,
          total,
          approvedItems,
          approvedMonths,
          pendingMonths
        });
      }
    }
    return out;
  }, [projects, categories, monthKey]);

  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteCatKey, setDeleteCatKey] = useState((safeCategories && safeCategories[0] && safeCategories[0].key) ? safeCategories[0].key : "");

  useEffect(() => {
    // kategori listesi değişirse seçimi düzelt
    if(!safeCategories || safeCategories.length === 0) return;
    if(!safeCategories.some(c => c.key === deleteCatKey)){
      setDeleteCatKey(safeCategories[0].key);
    }
  }, [categories]);

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>Admin • Kategori Yönetimi</h2>
          <Badge>{monthKey}</Badge>
        </div>
        <div className="small" style={{marginTop:6}}>
          Yeni kategori oluşturabilir, alanlar ekleyebilirsin. (Uzman/Araç gibi)
        </div>

        <hr className="sep" />

        {isAdmin && (
          <div className="card" style={{marginTop:12}}>
            <div className="cardTitleRow">
              <h3>📌 Doküman Tanımları</h3>
              <Badge kind="warn">Sadece Admin</Badge>
            </div>

            <div className="row" style={{flexWrap:"wrap", marginTop:10}}>
              <input
                className="input"
                value={newDocName}
                onChange={e=>setNewDocName(e.target.value)}
                placeholder="Yeni doküman adı (örn: KVKK Aydınlatma Metni)"
                style={{minWidth:320}}
              />
              <button className="btn primary" onClick={()=>{ adminAddDocTemplate(String(newDocName||"").trim()); setNewDocName(""); }} disabled={!String(newDocName||"").trim()}>
                Doküman Ekle
              </button>
            </div>

            <div className="tableWrap" style={{marginTop:10}}>
              <table>
                <thead>
                  <tr>
                    <th>Doküman</th>
                    <th style={{width:120}}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {(docTemplates || []).map(dt => (
                    <tr key={dt.key}>
                      <td><b>{dt.name}</b> <span className="small">({dt.key})</span></td>
                      <td>
                        <button className="btn danger" onClick={()=>adminDeleteDocTemplate(dt.key)}>Sil</button>
                      </td>
                    </tr>
                  ))}
                  {(docTemplates || []).length===0 && (
                    <tr><td colSpan="2">Henüz doküman tanımı yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="small" style={{marginTop:10}}>
              Bu alandan yeni bir doküman tanımı eklediğinde, tüm projelerde “Dokümanlar” listesinə otomatik yansır.
            </div>
          </div>
        )}

        <div className="row">
          <input className="input" value={catName} onChange={e=>setCatName(e.target.value)} placeholder="Yeni kategori adı (örn: Ekipman)" />
          <input className="input" value={catItemLabel} onChange={e=>setCatItemLabel(e.target.value)} placeholder="Kayıt etiketi (örn: Ekipman)" />
        </div>

        <div style={{marginTop:10}}>
          <button className="btn primary" onClick={adminAddCategory}>Kategori Ekle</button>
        </div>
        
        <hr className="sep" />

        <div className="cardTitleRow">
          <h3>Kategori Silme</h3>
          <button
            className={deleteMode ? "btn danger" : "btn"}
            onClick={() => setDeleteMode(v => !v)}
            title="Kategori silme modunu aç/kapat"
          >
            {deleteMode ? "Silme Modu: Açık" : "Silme Modu: Kapalı"}
          </button>
        </div>

        <div className="small" style={{marginTop:6}}>
          Silme modu açıkken seçtiğin kategori tüm projelerden kaldırılır. (Geri alınamaz)
        </div>

        {deleteMode && (
          <div style={{marginTop:10}} className="row">
            <select className="input" value={deleteCatKey || ""} onChange={e=>setDeleteCatKey(e.target.value)}>
              {(categories || []).map(c => <option key={c.key} value={c.key}>{c.name} ({c.key})</option>)}
            </select>
            <button className="btn danger" onClick={() => adminDeleteCategory(deleteCatKey)}>
              Kategoriyi Sil
            </button>
          </div>
        )}

      </div>

      <div className="card">
        <div className="cardTitleRow">
          <h2>Alan Yönetimi • {activeCategory?.name}</h2>
          <Badge>{activeCategory?.key}</Badge>
        </div>
        <div className="small" style={{marginTop:6}}>
          Bu kategoriye aylık doldurulacak alanlar ekle. (KM, bakım tarihi, durum vb.)
        </div>

        <hr className="sep" />

        <div className="row">
          <input className="input" value={catFieldLabel} onChange={e=>setCatFieldLabel(e.target.value)} placeholder="Alan adı (örn: Servis KM)" />
          <select className="input" value={catFieldType} onChange={e=>setCatFieldType(e.target.value)}>
            <option value="number">Sayı</option>
            <option value="text">Metin</option>
            <option value="date">Tarih</option>
            <option value="select">Seçim</option>
          </select>
        </div>

        <div style={{height:10}} />

        <div className="row">
          <input className="input" value={catFieldUnit} onChange={e=>setCatFieldUnit(e.target.value)} placeholder="Birim (opsiyonel) örn: km" />
          <input className="input" value={catFieldOptions} onChange={e=>setCatFieldOptions(e.target.value)} placeholder="Seçim seçenekleri (virgül) örn: Aktif,Serviste,Arızalı" disabled={catFieldType !== "select"} />
        </div>

        <div style={{marginTop:10, display:"flex", gap:10, flexWrap:"wrap"}}>
          <button className="btn primary" onClick={adminAddField}>Alan Ekle</button>
          <Badge kind="warn">Alan silmek veri de siler</Badge>
        </div>

        <hr className="sep" />

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Alan Key</th>
                <th>Etiket</th>
                <th>Tip</th>
                <th>Birim</th>
                <th>Seçenek</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(activeCategory?.fields || []).map(f=>(
                <tr key={f.key}>
                  <td><code>{f.key}</code></td>
                  <td>{f.label}</td>
                  <td>{f.type}</td>
                  <td>{f.unit || "-"}</td>
                  <td>{f.type==="select" ? (f.options || []).join(", ") : "-"}</td>
                  <td><button className="btn danger" onClick={()=>adminDeleteField(f.key)}>Sil</button></td>
                </tr>
              ))}
              {(activeCategory?.fields || []).length===0 && <tr><td colSpan={6}>Bu kategoride alan yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="cardTitleRow">
          <h2>Admin Özet</h2>
          <Badge>Proje • Kategori</Badge>
        </div>

        <hr className="sep" />

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Proje</th>
                <th>Kategori</th>
                <th>Kayıt</th>
                <th>Onaylı Kayıt</th>
                <th>Aylık Onaylı</th>
                <th>Aylık Bekleyen</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(r=>(
                <tr key={r.id}>
                  <td><b>{r.project}</b></td>
                  <td>{r.category}</td>
                  <td>{r.total}</td>
                  <td>{r.approvedItems}</td>
                  <td>{r.approvedMonths}</td>
                  <td>{r.pendingMonths}</td>
                </tr>
              ))}
              {summaryRows.length===0 && <tr><td colSpan={6}>Veri yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AnnouncementsView({ isAdmin, auth, announcements, projects, addAnnouncement }){
  const [scopeType, setScopeType] = React.useState("all");
  const [scopeValue, setScopeValue] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const visible = React.useMemo(() => {
    const list = Array.isArray(announcements) ? announcements : [];
    return list.filter(a => {
      if(!a) return false;
      if(a.scopeType === "all") return true;
      if(a.scopeType === "project") return (auth && auth.project) === a.scopeValue;
      if(a.scopeType === "user") return (auth && auth.username) === a.scopeValue;
      return true;
    });
  }, [announcements, auth]);

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>Duyurular</h2>
          <Badge kind="info">Güncel</Badge>
        </div>
        <div className="small" style={{marginTop:6}}>
          {isAdmin ? "Duyuru yayınlayabilir ve kullanıcıları bilgilendirebilirsin." : "Admin tarafından yayınlanan duyurular burada görünür."}
        </div>

        {isAdmin && (
          <>
            <hr className="sep" />
            <div className="row" style={{gap:10, flexWrap:"wrap"}}>
              <div style={{flex:"1 1 160px"}}>
                <span className="lbl">Hedef</span>
                <select className="input" value={scopeType} onChange={e=>{ setScopeType(e.target.value); setScopeValue(""); }}>
                  <option value="all">Tüm Kullanıcılar</option>
                  <option value="project">Proje</option>
                  <option value="user">Tek Kullanıcı</option>
                </select>
              </div>

              {scopeType === "project" && (
                <div style={{flex:"1 1 220px"}}>
                  <span className="lbl">Proje</span>
                  <select className="input" value={scopeValue} onChange={e=>setScopeValue(e.target.value)}>
                    <option value="">Seçiniz…</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {scopeType === "user" && (
                <div style={{flex:"1 1 220px"}}>
                  <span className="lbl">Kullanıcı (username)</span>
                  <input className="input" value={scopeValue} onChange={e=>setScopeValue(e.target.value)} placeholder="örn: ugur / okan / faruk" />
                </div>
              )}
            </div>

            <div className="row" style={{marginTop:10}}>
              <div style={{flex:1}}>
                <span className="lbl">Başlık</span>
                <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Duyuru başlığı" />
              </div>
            </div>

            <div className="row" style={{marginTop:10}}>
              <div style={{flex:1}}>
                <span className="lbl">Mesaj</span>
                <textarea className="input" value={body} onChange={e=>setBody(e.target.value)} placeholder="Duyuru içeriği..." />
              </div>
            </div>

            <div className="row" style={{marginTop:10, justifyContent:"flex-end"}}>
              <button
                className="btn primary"
                onClick={() => {
                  if(scopeType!=="all" && !scopeValue){ alert("Hedef seçimi eksik."); return; }
                  addAnnouncement({ scopeType, scopeValue, title, body });
                  setTitle(""); setBody("");
                }}
              >Duyuru Yayınla</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="cardTitleRow">
          <h3>Yayınlananlar</h3>
          <Badge>{visible.length}</Badge>
        </div>

        <div className="list">
          {visible.map(a => (
            <div key={a.id} className="item" style={{alignItems:"flex-start"}}>
              <div className="itemLeft">
                <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
                  <b>{a.title}</b>
                  <Badge kind="default">{new Date(a.createdAt).toLocaleString("tr-TR")}</Badge>
                </div>
                <div className="small" style={{marginTop:6, whiteSpace:"pre-wrap"}}>{a.body}</div>
              </div>
              <div className="itemActions">
                <Badge kind="info">{a.scopeType === "all" ? "Tüm" : a.scopeType === "project" ? `Proje: ${a.scopeValue}` : `Kullanıcı: ${a.scopeValue}`}</Badge>
              </div>
            </div>
          ))}
          {visible.length===0 && <div className="small">Henüz duyuru yok.</div>}
        </div>
      </div>
    </>
  );
}

function ContactView({ 
  isAdmin, 
  auth, 
  contacts, 
  contactText, 
  setContactText, 
  sendContact, 
  adminSendMessage, 
  projects, 
  users 
}){
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>İletişim</h2>
          <Badge kind={isAdmin ? "ok" : "warn"}>{isAdmin ? "Admin Görür" : "Mesaj Gönder"}</Badge>
        </div>
        <div className="small" style={{marginTop:6}}>
          Kullanıcı mesajları sadece admin tarafından görüntülenir.
        </div>

        {!isAdmin && (
          <>
            <hr className="sep" />
            <textarea
              className="input"
              value={contactText}
              onChange={e=>setContactText(e.target.value)}
              placeholder="Mesajınız..."
            />
            <div style={{marginTop:10}}>
              <button className="btn primary" onClick={sendContact}>Gönder</button>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="card">
            <div className="cardTitleRow">
              <h3>Admin Mesajı Gönder</h3>
              <Badge kind="info">Bildirim</Badge>
            </div>
            <div className="small" style={{marginTop:6}}>
              Buradan kullanıcılara duyuru/mesaj gönderebilirsin. Mesajlar bildirim olarak düşer.
            </div>

            <AdminMessageComposer
              projects={safeProjects}
              users={safeUsers}
              onSend={(payload)=>adminSendMessage(payload)}
            />
          </div>

          <div className="card">
            <div className="cardTitleRow">
              <h3>Gelen Mesajlar</h3>
              <Badge kind={safeContacts.length ? "warn" : "ok"}>{safeContacts.length}</Badge>
            </div>

            <div className="list">
              {safeContacts.length === 0 ? (
                <div className="small">Henüz mesaj yok.</div>
              ) : (
                safeContacts.slice(0, 80).map(c=>(
                  <div key={c.id} className="item" style={{alignItems:"flex-start"}}>
                    <div className="itemLeft">
                      <b>{c.fromUser}</b>
                      <span className="small">{c.fromProject} • {formatDT(c.createdAt)}</span>
                      <div style={{marginTop:8, whiteSpace:"pre-wrap"}}>{c.message}</div>
                    </div>
                    <Badge kind="warn">Kayıt</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ProjectUserMapping({ authUsers, projects, onUpsert, onDelete }){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [project, setProject] = useState(projects?.[0]?.name || "SOCAR");

  useEffect(() => {
    if(projects && projects.length && !projects.some(p => p.name === project)){
      setProject(projects[0].name);
    }
  }, [projects]);

  const rows = (authUsers || []).slice().sort((a,b)=> (a.username||"").localeCompare(b.username||""));

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="cardTitleRow">
        <h3>Proje Kullanıcı Tanımlama</h3>
        <span className="pill">Admin</span>
      </div>

      <div className="grid2">
        <div>
          <label className="label">Kullanıcı Adı</label>
          <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="socar_ahmet" />
        </div>
        <div>
          <label className="label">Şifre</label>
          <input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" />
        </div>
        <div>
          <label className="label">Proje</label>
          <select className="input" value={project} onChange={e=>setProject(e.target.value)}>
            {(projects||[]).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div style={{display:"flex", alignItems:"flex-end", gap:8}}>
          <button className="btn ok" type="button" onClick={()=>{ onUpsert(username, password, project); setUsername(""); setPassword(""); }}>
            Kaydet
          </button>
          <div className="small" style={{opacity:.8}}>Aynı proje verilerini görür.</div>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <div className="small" style={{marginBottom:6, opacity:.85}}>Tanımlı kullanıcılar</div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Proje</th>
                <th style={{width:120}}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={3} className="small">Henüz kullanıcı yok.</td></tr>
              ) : rows.map(u => (
                <tr key={u.username}>
                  <td><b>{u.username}</b></td>
                  <td>{u.project}</td>
                  <td>
                    <button className="btn danger" type="button" onClick={()=>onDelete(u.username)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeesView({ isAdmin, auth, employees, projects, updateState }) {
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const ql = (q || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    const manualRaw = (Array.isArray(employees) ? employees : []);
    const manual = manualRaw.map(e => ({...e, source:"employees"}));

    // Adminin eklediği çalışan -> experts kaydıyla linkleniyorsa,
    // aynı kişiyi iki kez göstermeyelim (duplicate fix)
    const linkedExpertIds = new Set(
      manualRaw.map(e => e?.expertItemId).filter(Boolean)
    );

    // Uzmanlar (experts) -> çalışan gibi göster (aktif uzmanlar)
    const expertList = [];
    for(const p of (Array.isArray(projects) ? projects : [])){
      const arr = p.itemsByCategory?.experts || [];
      for(const it of arr){
        if(it?.approved !== true) continue;
        if(linkedExpertIds.has(it.id)) continue;
        expertList.push({
          id: "exp_" + it.id,
          name: it.name,
          role: "Uzman",
          project: p.name,
          active: true,
          approved: true,
          source: "experts",
          projectId: p.id,
          itemId: it.id
        });
      }
    }

    let arr = [...expertList, ...manual];

    // kullanıcı sadece kendi projesi + aktif + onaylı
    if(!isAdmin){
      arr = arr.filter(e =>
        e.project === auth.project &&
        e.active !== false &&
        e.approved === true
      );
    }else{
      // admin için opsiyonel proje filtresi
      if(projectFilter) arr = arr.filter(e => e.project === projectFilter);
    }

    if(ql){
      arr = arr.filter(e => {
        const n = (e.name || "").toLowerCase();
        const r = (e.role || "").toLowerCase();
        const p = (e.project || "").toLowerCase();
        return n.includes(ql) || r.includes(ql) || p.includes(ql);
      });
    }
    return arr;
  }, [employees, isAdmin, auth, projectFilter, ql]);

  const grouped = useMemo(() => {
    const map = {};
    for(const e of filtered){
      const key = e.project || "—";
      map[key] ||= [];
      map[key].push(e);
    }
    for(const k of Object.keys(map)){
      map[k].sort((a,b)=> String(a.name||"").localeCompare(String(b.name||""), "tr"));
    }
    return map;
  }, [filtered]);

  function addEmployee(name, role, project){
    updateState(d => {
      d.employees ||= [];

      const empId = uid("emp");
      const cleanName = (name||"").trim();
      const cleanRole = (role||"").trim();
      const cleanProject = project;

      // 1) Manuel çalışan kaydı (admin eklediği) -> default onaylı
      const emp = {
        id: empId,
        name: cleanName,
        role: cleanRole,
        project: cleanProject,
        active: true,
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: auth.username,
        createdAt: new Date().toISOString(),
        // uzman (experts) kaydıyla eşleştirme için
        expertItemId: null
      };

      // 2) Veri girişi için: aynı kişiyi ilgili projenin "Uzmanlar (experts)" kategorisine de ekle
      // Böylece kullanıcılar/veri girişi ekranı kişiyi görür ve aylık veri girilebilir.
      const prj = (d.projects || []).find(p => p.name === cleanProject);
      if(prj){
        prj.itemsByCategory ||= {};
        prj.itemsByCategory.experts ||= [];

        // aynı isimde uzman varsa tekrar ekleme
        const exists = (prj.itemsByCategory.experts || []).find(x =>
          String(x.name||"").trim().toLowerCase() === cleanName.toLowerCase()
        );

        if(exists){
          // zaten varsa sadece linkle
          emp.expertItemId = exists.id;
          // admin eklediyse onaylı olduğundan emin ol
          exists.approved = true;
          exists.approvedAt ||= new Date().toISOString();
          exists.approvedBy ||= auth.username;
        }else{
          const itemId = uid("item");
          prj.itemsByCategory.experts.push({
            id: itemId,
            name: cleanName,
            approved: true,
            requestedBy: auth.username,
            createdAt: new Date().toISOString(),
            meta: { role: cleanRole, employeeId: empId, source: "admin_employee" },
            months: {}
          });
          emp.expertItemId = itemId;
        }
      }

      d.employees.push(emp);
    });
  }

  function toggleActive(empId){
    updateState(d => {
      const e = (d.employees || []).find(x => x.id === empId);
      if(!e) return;
      e.active = !e.active;
    });
  }

  function deleteEmployee(row){
    if(!isAdmin) return;

    const msg = row.source === "employees"
      ? `Çalışan kaydı silinsin mi?\n(Bu işlem aylık uzman verilerini silmez.)\n${row.project} • ${row.name}`
      : `UZMAN kaydı silinsin mi?\n(DİKKAT: Aylık veriler de silinir.)\n${row.project} • ${row.name}`;

    if(!confirm(msg)) return;

    updateState(d => {
      d.employees ||= [];

      if(row.source === "employees"){
        // Manuel çalışan sil: sadece employees kaydını kaldır.
        // Uzman (experts) tarafındaki aylık veriler KALSIN.
        d.employees = (d.employees || []).filter(x => x.id !== row.id);

      }else if(row.source === "experts"){
        // Uzman sil: ilgili projeden experts kaydını kaldır (aylık veriler de gider).
        const p = (d.projects || []).find(pp => pp.id === row.projectId);
        if(!p) return;
        p.itemsByCategory ||= {};
        p.itemsByCategory.experts = (p.itemsByCategory.experts || []).filter(x => x.id !== row.itemId);

        // Bu uzmana bağlı manuel çalışan kaydı varsa sadece linki kopar (employees kaydı dursun)
        d.employees = (d.employees || []).map(e => (
          e.expertItemId === row.itemId ? ({...e, expertItemId: null}) : e
        ));
      }
    });
  }

  return (
    <div className="card">
      <div className="cardTitleRow">
        <h2>👷 Çalışanlar</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
          <Badge>{isAdmin ? "Tüm Projeler" : auth.project}</Badge>
          <Badge kind="ok">{filtered.length}</Badge>
        </div>
      </div>

      <div className="small" style={{marginTop:6}}>
        Çalışanlar proje bazlı listelenir. (İsim • Görev)
      </div>

      <hr className="sep" />

      <div className="row" style={{flexWrap:"wrap"}}>
        <input
          className="input"
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="İsim / görev / proje ara..."
          style={{minWidth:240, flex:"1 1 260px"}}
        />

        {isAdmin && (
          <select
            className="input"
            value={projectFilter}
            onChange={e=>setProjectFilter(e.target.value)}
            style={{minWidth:220, flex:"0 0 220px"}}
          >
            <option value="">Tüm Projeler</option>
            {projects.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {isAdmin && <EmployeeAddForm projects={projects} onAdd={addEmployee} />}

      <hr className="sep" />

      {/* Proje bazlı listeler */}
      {Object.keys(grouped).length === 0 ? (
        <div className="small">Çalışan yok.</div>
      ) : (
        Object.keys(grouped).sort((a,b)=>a.localeCompare(b,"tr")).map(prj => (
          <div key={prj} style={{marginTop:10}}>
            <div className="cardTitleRow">
              <h3 style={{margin:0}}>{prj}</h3>
              <Badge kind="warn">{grouped[prj].length}</Badge>
            </div>

            <div className="tableWrap" style={{marginTop:8}}>
              <table>
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Görev</th>
                    <th>Durum</th>
                    {isAdmin ? <th></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {grouped[prj].map(e => (
                    <tr key={e.id} style={{opacity: e.active ? 1 : .65}}>
                      <td style={{display:"flex", alignItems:"center", gap:8}}><div className="avatar" style={{width:26, height:26, fontSize:12}} title={e.name}>{(String(e.name||"U").slice(0,1)).toUpperCase()}</div><b>{e.name}</b></td>
                      <td>{e.role || "-"}</td>
                      <td>
                        <Badge kind={e.active ? "ok" : "warn"}>{e.active ? "Aktif" : "Pasif"}</Badge>
                      </td>
                      {isAdmin ? (
                        <td style={{textAlign:"right"}}>
                          {e.source === "employees" ? (
                            <button className="btn" onClick={()=>toggleActive(e.id)}>
                              {e.active ? "Pasif Yap" : "Aktif Yap"}
                            </button>
                          ) : (
                            <Badge kind="ok">Uzman</Badge>
                          )}
                          <button className="btn danger" style={{marginLeft:8}} onClick={()=>deleteEmployee(e)}>
                            Sil
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EmployeeAddForm({ projects, onAdd }){
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [project, setProject] = useState("");
return (
    <>
      <hr className="sep" />
      <div className="cardTitleRow">
        <h3>Yeni Çalışan Ekle</h3>
        <Badge kind="ok">Admin</Badge>
      </div>

      <div className="row" style={{flexWrap:"wrap"}}>
        <input className="input" placeholder="Ad Soyad" value={name} onChange={e=>setName(e.target.value)} style={{minWidth:220, flex:"1 1 240px"}} />
        <select className="input" value={role} onChange={e=>setRole(e.target.value)} style={{minWidth:220, flex:"1 1 240px"}}>
          <option value="">Görev</option>
          <option value="Ekip Lideri">Ekip Lideri</option>
          <option value="Ekip Lider Yardımcısı">Ekip Lider Yardımcısı</option>
          <option value="Proje Lideri">Proje Lideri</option>
          <option value="Proje Lider Yardımcısı">Proje Lider Yardımcısı</option>
          <option value="İskele Kontrol Uzmanı">İskele Kontrol Uzmanı</option>
        </select>
        <select className="input" value={project} onChange={e=>setProject(e.target.value)} style={{minWidth:220, flex:"0 0 220px"}}>
          <option value="">Proje</option>
          {projects.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <button
          className="btn primary"
          onClick={() => {
            if(!name.trim() || !project) return;
            onAdd(name, role, project);
            setName(""); setRole(""); setProject("");
          }}
          style={{flex:"0 0 auto"}}
        >
          Ekle
        </button>
      </div>
    </>
  );
}

/* ===================== DOCS VIEW ===================== */

function DocsView({
  isAdmin,
  auth,
  projects,
  employees,
  docTemplates,
  employeeDocs,
  updateState
}){
  const [projectName, setProjectName] = useState(isAdmin ? (projects?.[0]?.name || "") : (auth?.project || ""));
  const [employeeId, setEmployeeId] = useState("");

  function adminAddDocTemplate(nameArg){
    if(!isAdmin) return;
    const name = String(nameArg || "").trim();
    if(!name) return;
    const baseKey = slugKey(name);
    updateState(d => {
      d.docTemplates ||= [];
      let key = baseKey;
      let i = 2;
      while(d.docTemplates.some(t => t.key === key)){
        key = `${baseKey}_${i++}`;
      }
      d.docTemplates.push({ key, name });
    });
  }

  function adminDeleteDocTemplate(key){
    if(!isAdmin) return;
    if(!key) return;
    if(!confirm("Bu doküman tanımını silmek istiyor musun?")) return;
    updateState(d => {
      d.docTemplates ||= [];
      d.docTemplates = d.docTemplates.filter(t => t.key !== key);
      // optional: remove from employeeDocs to keep storage clean
      if(d.employeeDocs){
        Object.keys(d.employeeDocs).forEach(empId => {
          if(d.employeeDocs[empId]) delete d.employeeDocs[empId][key];
        });
      }
    });
  }

  useEffect(() => {
    if(!isAdmin){
      setProjectName(auth?.project || "");
    }else{
      if(projects?.length && !projects.some(p => p.name === projectName)){
        setProjectName(projects[0]?.name || "");
      }
    }
  }, [isAdmin, auth, projects]);

  const projectEmployees = useMemo(() => {
    // Doküman takibi: pasif personel de listelensin (etiketle gösterilir)
    return (employees || []).filter(e => (projectName ? e.project === projectName : true));
  }, [employees, projectName]);

  useEffect(() => {
    if(projectEmployees.length === 0){
      setEmployeeId("");
      return;
    }
    if(employeeId && projectEmployees.some(e => e.id === employeeId)) return;
    setEmployeeId(projectEmployees[0].id);
  }, [projectEmployees]);

  const selectedEmp = useMemo(() => projectEmployees.find(e => e.id === employeeId) || null, [projectEmployees, employeeId]);

  function setDocSigned(empId, docKey, signed){
    updateState(d => {
      d.employeeDocs ||= {};
      d.employeeDocs[empId] ||= {};
      d.employeeDocs[empId][docKey] ||= { signed:false, signedAt:"" };
      d.employeeDocs[empId][docKey].signed = !!signed;
      if(!signed) d.employeeDocs[empId][docKey].signedAt = "";
    });
  }

  function setDocDate(empId, docKey, dateStr){
    updateState(d => {
      d.employeeDocs ||= {};
      d.employeeDocs[empId] ||= {};
      d.employeeDocs[empId][docKey] ||= { signed:false, signedAt:"" };
      d.employeeDocs[empId][docKey].signedAt = dateStr || "";
      d.employeeDocs[empId][docKey].signed = !!(dateStr || "").trim();
    });
  }

  const summary = useMemo(() => {
    const t = { total: 0, signed: 0 };
    if(!selectedEmp) return t;
    for(const dt of (docTemplates || [])){
      t.total++;
      const rec = employeeDocs?.[selectedEmp.id]?.[dt.key];
      const ok = !!rec?.signed && !!String(rec?.signedAt || "").trim();
      if(ok) t.signed++;
    }
    return t;
  }, [selectedEmp, docTemplates, employeeDocs]);

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>📄 Doküman Takibi</h2>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
            <Badge kind="ok">İmza Tarihli</Badge>
            {selectedEmp ? <Badge>{summary.signed}/{summary.total}</Badge> : <Badge kind="warn">Çalışan yok</Badge>}
          </div>
        </div>

        <div className="small" style={{marginTop:6}}>
          Her çalışan için imzalanması gereken evrakların durumu ve imza tarihi burada takip edilir.
        </div>

        <hr className="sep" />

        <div className="row" style={{flexWrap:"wrap"}}>
          {isAdmin ? (
            <select className="input" value={projectName} onChange={e=>setProjectName(e.target.value)}>
              {(projects || []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          ) : (
            <input className="input" value={projectName} disabled />
          )}

          <select className="input" value={employeeId} onChange={e=>setEmployeeId(e.target.value)} disabled={projectEmployees.length===0}>
            {projectEmployees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} {e.role ? `• ${e.role}` : ""}{e.active === false ? " (Pasif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedEmp && (
        <div className="card">
          <div className="cardTitleRow">
            <h3>{selectedEmp.name}</h3>
            <Badge>{selectedEmp.project}</Badge>
            {selectedEmp.active === false && <Badge kind="warn">Pasif</Badge>}
          </div>

          <hr className="sep" />

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Evrak</th>
                  <th>İmzalı</th>
                  <th>İmza Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {(docTemplates || []).map(dt => {
                  const rec = employeeDocs?.[selectedEmp.id]?.[dt.key] || { signed:false, signedAt:"" };
                  const ok = !!rec.signed && !!String(rec.signedAt||"").trim();
                  return (
                    <tr key={dt.key}>
                      <td style={{minWidth:320}}><b>{dt.name}</b></td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!rec.signed}
                          onChange={e => setDocSigned(selectedEmp.id, dt.key, e.target.checked)}
                        />
                        {ok ? <span className="small" style={{marginLeft:8}}>(tamam)</span> : <span className="small" style={{marginLeft:8}}>(eksik)</span>}
                      </td>
                      <td>
                        <input
                          className="input"
                          type="date"
                          value={rec.signedAt || ""}
                          onChange={e => setDocDate(selectedEmp.id, dt.key, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {(docTemplates || []).length===0 && <tr><td colSpan="3">Evrak tanımı yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== OPTIONS ===================== *//* ===================== OPTIONS ===================== */

function yearOptions(){
  const y = new Date().getFullYear();
  return [y-2, y-1, y, y+1, y+2];
}
function monthOptions(){
  return [
    {key:"01", label:"Ocak"},
    {key:"02", label:"Şubat"},
    {key:"03", label:"Mart"},
    {key:"04", label:"Nisan"},
    {key:"05", label:"Mayıs"},
    {key:"06", label:"Haziran"},
    {key:"07", label:"Temmuz"},
    {key:"08", label:"Ağustos"},
    {key:"09", label:"Eylül"},
    {key:"10", label:"Ekim"},
    {key:"11", label:"Kasım"},
    {key:"12", label:"Aralık"}
  ];
}

/* ===================== ACTIONS (Corrective / Action List) ===================== */

function ActionsView({ auth, projects, employees, actions, updateState }){
  const isAdmin = auth?.role === "admin";

  // kullanıcı: proje sabit; admin: seçebilir
  const [projectName, setProjectName] = React.useState(
    isAdmin ? (projects?.[0]?.name || "SOCAR") : (auth?.project || (projects?.[0]?.name || "SOCAR"))
  );

  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [q, setQ] = React.useState("");

  // admin create
  const [title, setTitle] = React.useState("");
  const [atype, setAtype] = React.useState("Düzeltici Faaliyet");
  const [priority, setPriority] = React.useState("Orta");
  const [dueDate, setDueDate] = React.useState("");

  // keep selected project valid & lock for user
  React.useEffect(() => {
    if(!projects?.length) return;
    if(!isAdmin){
      setProjectName(auth?.project || projects[0]?.name || "SOCAR");
      return;
    }
    if(!projects.some(p => p.name === projectName)){
      setProjectName(projects[0].name);
    }
  }, [projects, isAdmin, auth?.project]);

  const STATUS_META = {
    open:       { label:"Açık",                 kind:"danger" },
    in_progress:{ label:"Devam",                kind:"warn"   },
    done:       { label:"Tamamlandı",           kind:"ok"     },
    user_done:  { label:"Kullanıcı Tamamladı",  kind:"ok"     },
    closed:     { label:"Admin Kapattı",        kind:"ok"     }
  };

  const PRIORITY_META = {
    "Yüksek": { kind:"danger" },
    "Orta":   { kind:"warn"   },
    "Düşük":  { kind:"default"}
  };

  function statusBadgeKind(st){
    return (STATUS_META[st] || STATUS_META.open).kind;
  }
  function statusLabel(st){
    return (STATUS_META[st] || STATUS_META.open).label;
  }
  function priorityKind(p){
    return (PRIORITY_META[p] || PRIORITY_META["Orta"]).kind;
  }

  const filtered = React.useMemo(() => {
    const list = Array.isArray(actions) ? actions : [];
    const s = (q || "").trim().toLowerCase();

    return list
      .filter(a => a && a.project === projectName)
      .filter(a => statusFilter === "all" ? true : (a.status || "open") === statusFilter)
      .filter(a => priorityFilter === "all" ? true : (a.priority || "Orta") === priorityFilter)
      .filter(a => typeFilter === "all" ? true : (a.type || "Düzeltici Faaliyet") === typeFilter)
      .filter(a => {
        if(!s) return true;
        return (
          (a.title || "").toLowerCase().includes(s) ||
          (a.notes || "").toLowerCase().includes(s) ||
          (a.type || "").toLowerCase().includes(s) ||
          (a.priority || "").toLowerCase().includes(s)
        );
      })
      .sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [actions, projectName, statusFilter, priorityFilter, typeFilter, q]);

  function createAction(){
    if(!isAdmin) return;
    const t = (title || "").trim();
    if(!t) return;

    updateState(d => {
      d.actions ||= [];
      d.actions.unshift({
        id: uid("act"),
        project: projectName,
        title: t,
        type: atype,
        priority,
        dueDate: dueDate || "",
        status: "open",
        notes: "",
        createdAt: new Date().toISOString(),
        createdBy: auth.username || "admin"
      });
      // bilgi amaçlı admin notification
      d.notifications ||= [];
      d.notifications.unshift({
        id: uid("n"),
        to: "admin",
        title: "Yeni aksiyon oluşturuldu",
        body: `${projectName}: ${t}`,
        createdAt: new Date().toISOString(),
        read: false,
        level: "info"
      });
      if(d.notifications.length > 300) d.notifications.length = 300;
    });

    setTitle(""); setDueDate(""); setPriority("Orta"); setAtype("Düzeltici Faaliyet");
  }

  function updateAction(id, patch){
    if(!isAdmin) return;
    updateState(d => {
      d.actions ||= [];
      const a = d.actions.find(x => x.id === id);
      if(!a) return;
      Object.assign(a, patch);
      a.updatedAt = new Date().toISOString();
      a.updatedBy = auth.username || "admin";
    });
  }

function userMarkDone(id){
  // kullanıcı: sadece kendi projesindeki aksiyon için "Kullanıcı Tamamladı" bildirimi
  if(isAdmin) return;
  updateState(d => {
    d.actions ||= [];
    const a = d.actions.find(x => x.id === id);
    if(!a) return;
    if(a.project !== projectName) return;
    if(a.status === "closed") return;
    a.status = "user_done";
    a.userDoneAt = new Date().toISOString();
    a.userDoneBy = auth?.username || "user";
    // kullanıcı not ekleyemiyor; kısa log alanı
    const line = `Kullanıcı tamamladı: ${formatDT(a.userDoneAt)} • ${a.userDoneBy}`;
    a.notes = (a.notes && String(a.notes).trim()) ? (String(a.notes).trim() + "\n" + line) : line;
    a.updatedAt = a.userDoneAt;
    a.updatedBy = a.userDoneBy;
    // admin'e bildirim
    d.notifications ||= [];
    d.notifications.unshift({
      id: uid("n"),
      to: "admin",
      title: "Kullanıcı tamamladı bildirimi",
      body: `${a.project}: ${a.title}`,
      createdAt: new Date().toISOString(),
      read: false,
      level: "warn"
    });
    if(d.notifications.length > 300) d.notifications.length = 300;
  });
}

  function deleteAction(id){
    if(!isAdmin) return;
    if(!confirm("Aksiyonu silmek istiyor musun?")) return;
    updateState(d => {
      d.actions ||= [];
      d.actions = d.actions.filter(x => x.id !== id);
    });
  }

  function quickSetStatus(id, st){
    if(!isAdmin) return;
    const patch = { status: st };
    if(st === "closed"){
      patch.closedAt = new Date().toISOString();
      patch.closedBy = auth.username || "admin";
    }
    updateAction(id, patch);
  }

  return (
    <div className="card">
      <div className="cardTitleRow">
        <h2>📝 Aksiyonlar</h2>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
          <Badge kind={isAdmin ? "ok" : "warn"}>{isAdmin ? "Admin" : "Kullanıcı (Sadece Görüntüleme)"}</Badge>
          <Badge>{projectName}</Badge>
          <Badge kind={filtered.length ? "warn" : "ok"}>{filtered.length}</Badge>
        </div>
      </div>

      <div className="row" style={{marginTop: 10, flexWrap:"wrap"}}>
        <div style={{minWidth: 220, flex:"0 0 220px"}}>
          <label className="lbl">Proje</label>
          {isAdmin ? (
            <select className="input" value={projectName} onChange={e=>setProjectName(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          ) : (
            <input className="input" value={projectName} disabled />
          )}
        </div>

        <div style={{minWidth: 160, flex:"0 0 160px"}}>
          <label className="lbl">Durum</label>
          <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">Hepsi</option>
            <option value="open">Açık</option>
            <option value="in_progress">Devam</option>
            <option value="done">Tamamlandı</option>
            <option value="user_done">Kullanıcı Tamamladı</option>
            <option value="closed">Kapalı</option>
          </select>
        </div>

        <div style={{minWidth: 160, flex:"0 0 160px"}}>
          <label className="lbl">Öncelik</label>
          <select className="input" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}>
            <option value="all">Hepsi</option>
            <option value="Yüksek">Yüksek</option>
            <option value="Orta">Orta</option>
            <option value="Düşük">Düşük</option>
          </select>
        </div>

        <div style={{minWidth: 200, flex:"0 0 200px"}}>
          <label className="lbl">Tür</label>
          <select className="input" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            <option value="all">Hepsi</option>
            <option value="Düzeltici Faaliyet">Düzeltici Faaliyet</option>
            <option value="Önleyici Faaliyet">Önleyici Faaliyet</option>
            <option value="Aksiyon">Aksiyon</option>
          </select>
        </div>

        <div style={{flex: 1, minWidth: 240}}>
          <label className="lbl">Ara</label>
          <input className="input" placeholder="Başlık / not / tür / öncelik..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
      </div>

      {isAdmin && (
        <>
          <hr className="sep" />
          <div className="card" style={{background:"#fff"}}>
            <div className="cardTitleRow" style={{marginBottom:8}}>
              <h3 style={{margin:0}}>➕ Yeni Aksiyon (Proje Bazlı)</h3>
              <Badge kind="ok">Admin</Badge>
            </div>

            <div className="row" style={{flexWrap:"wrap"}}>
              <div style={{flex: 1, minWidth: 260}}>
                <label className="lbl">Başlık</label>
                <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Örn: Yangın tüplerinin doluluk kontrolü yapılacak" />
              </div>

              <div style={{minWidth: 210}}>
                <label className="lbl">Tür</label>
                <select className="input" value={atype} onChange={e=>setAtype(e.target.value)}>
                  <option>Düzeltici Faaliyet</option>
                  <option>Önleyici Faaliyet</option>
                  <option>Aksiyon</option>
                </select>
              </div>

              <div style={{minWidth: 150}}>
                <label className="lbl">Öncelik</label>
                <select className="input" value={priority} onChange={e=>setPriority(e.target.value)}>
                  <option>Yüksek</option>
                  <option>Orta</option>
                  <option>Düşük</option>
                </select>
              </div>

              <div style={{minWidth: 180}}>
                <label className="lbl">Hedef Tarih</label>
                <input className="input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
              </div>

              <div style={{minWidth: 140, display:"flex", alignItems:"flex-end"}}>
                <button className="btn primary" type="button" onClick={createAction}>Oluştur</button>
              </div>
            </div>

            <div className="small" style={{marginTop:10}}>
              Not: Aksiyonlar proje bazlıdır. Sorumlu kişi alanı kaldırıldı.
            </div>
          </div>
        </>
      )}

      <hr className="sep" />

      {/* Responsive, scroll'suz liste */}
      <div className="list" style={{gap:10}}>
        {filtered.length === 0 ? (
          <div className="small">Bu projede filtrelere uyan aksiyon yok.</div>
        ) : (
          filtered.map(a => {
            const st = a.status || "open";
            const pr = a.priority || "Orta";
            const bg =
              st === "open" ? "rgba(220,53,69,.06)" :
              st === "in_progress" ? "rgba(255,193,7,.10)" :
              st === "done" ? "rgba(25,135,84,.08)" :
              "rgba(108,117,125,.08)";

            return (
              <div key={a.id} className="item" style={{alignItems:"stretch", background:bg, borderRadius:14, padding:12, position:"relative"}}>
                <div className="actionCornerTag" data-kind={statusBadgeKind(st)}>
                  {statusLabel(st)}
                </div>
                <div className="itemLeft" style={{gap:6}}>
                  <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                    <Badge kind={statusBadgeKind(st)}>{statusLabel(st)}</Badge>
                    <Badge kind={priorityKind(pr)}>{pr}</Badge>
                    <Badge>{a.type || "Düzeltici Faaliyet"}</Badge>
                    {a.dueDate ? <Badge kind="warn">Hedef: {a.dueDate}</Badge> : <Badge>Hedef: -</Badge>}
                  </div>

                  <div style={{display:"flex", gap:8, alignItems:"baseline", flexWrap:"wrap", marginTop:4}}>
                    <b style={{fontSize:15}}>{a.title}</b>
                    <span className="small" style={{opacity:.8}}>
                      {a.createdAt ? `• ${formatDT(a.createdAt)}` : ""}
                      {a.createdBy ? ` • ${a.createdBy}` : ""}
                    </span>
                  </div>

                  <div style={{marginTop:8}}>
                    {isAdmin ? (
                      <textarea
                        className="input"
                        style={{minHeight:54}}
                        placeholder="Not / açıklama..."
                        value={a.notes || ""}
                        onChange={e=>updateAction(a.id, { notes: e.target.value })}
                      />
                    ) : (
                      <div className="small" style={{whiteSpace:"pre-wrap"}}>
                        {String(a.notes || "").trim() ? a.notes : "Not yok."}
                      </div>
                    )}
                  </div>

                  {a.updatedAt && (
                    <div className="small" style={{opacity:.75, marginTop:6}}>
                      Güncelleme: {formatDT(a.updatedAt)} {a.updatedBy ? `• ${a.updatedBy}` : ""}
                    </div>
                  )}
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="itemActions" style={{minWidth:220, justifyContent:"flex-end", flexWrap:"wrap"}}>
                    <select
                      className="input"
                      style={{padding:"8px 10px", minWidth:140}}
                      value={st}
                      onChange={e=>updateAction(a.id, { status: e.target.value })}
                      title="Durum"
                    >
                      <option value="open">Açık</option>
                      <option value="in_progress">Devam</option>
                      <option value="done">Tamamlandı</option>
                      <option value="user_done">Kullanıcı Tamamladı</option>
                      <option value="closed">Admin Kapattı</option>
                    </select>

                    <button className="btn" type="button" onClick={()=>quickSetStatus(a.id, "in_progress")}>Devam</button>
                    <button className="btn" type="button" onClick={()=>quickSetStatus(a.id, "done")}>Tamam</button>
                    <button className="btn" type="button" onClick={()=>quickSetStatus(a.id, "closed")}>Kapat</button>
                    <button className="btn danger" type="button" onClick={()=>deleteAction(a.id)}>Sil</button>
                  </div>
                )}

{!isAdmin && (
  <div className="itemActions" style={{minWidth:220, justifyContent:"flex-end", flexWrap:"wrap"}}>
    {st !== "closed" && st !== "user_done" ? (
      <button className="btn ok" type="button" onClick={()=>userMarkDone(a.id)}>
        Tamamlandı Bildir
      </button>
    ) : (
      <span className="small" style={{opacity:.8}}>
        {st === "user_done" ? "Admin kapanışı bekleniyor" : "Kapalı"}
      </span>
    )}
  </div>
)}

              </div>
            );
          })
        )}
      </div>

      {!isAdmin && (
        <div className="small" style={{marginTop:10}}>
          Kullanıcı sadece kendi projesinin aksiyonlarını görüntüler. Düzenleme ve ekleme admin yetkisindedir.
        </div>
      )}
    </div>
  );
}

/* ===================== MOUNT ===================== */

// Simple ErrorBoundary to avoid blank screen on runtime errors

function VehiclesAdminView({ isAdmin, auth, categories, projects, updateState, pushToast }) {
  if(!isAdmin) return null;

  const vehiclesCat = useMemo(() => {
    return (categories || []).find(c => c && c.key === "vehicles");
  }, [categories]);

  const [projectId, setProjectId] = useState(() => (projects && projects[0] ? projects[0].id : ""));
  const [vehicleName, setVehicleName] = useState("");
  const [q, setQ] = useState("");

  // Keep selected project valid when projects change
  useEffect(() => {
    if(projectId && (projects || []).some(p => p.id === projectId)) return;
    setProjectId((projects && projects[0] ? projects[0].id : ""));
  }, [projects]);

  const selectedProject = useMemo(() => (projects || []).find(p => p.id === projectId) || null, [projects, projectId]);

  const list = useMemo(() => {
    const p = selectedProject;
    if(!p) return [];
    const arr = (p.itemsByCategory && p.itemsByCategory["vehicles"]) ? p.itemsByCategory["vehicles"] : [];
    const ql = (q || "").trim().toLowerCase();
    return (arr || []).filter(it => {
      if(!ql) return true;
      return String(it?.name || "").toLowerCase().includes(ql);
    });
  }, [selectedProject, q]);

  function addVehicle(){
    const name = (vehicleName || "").trim();
    if(!name){
      pushToast && pushToast("Araç adı/plaka zorunlu.", "warn");
      return;
    }
    const pid = projectId;
    if(!pid){
      pushToast && pushToast("Proje seçmelisin.", "warn");
      return;
    }

    updateState(d => {
      const p = (d.projects || []).find(x => x.id === pid);
      if(!p) return;
      if(!p.itemsByCategory) p.itemsByCategory = {};
      if(!Array.isArray(p.itemsByCategory.vehicles)) p.itemsByCategory.vehicles = [];
      p.itemsByCategory.vehicles.push({
        id: uid("item"),
        name,
        approved: true,                 // admin eklerken direkt onaylı
        requestedBy: auth?.username || "admin",
        createdAt: new Date().toISOString(),
        months: {}
      });
    });

    setVehicleName("");
    pushToast && pushToast("Araç eklendi.", "ok");
  }

  function approveVehicle(itemId){
    updateState(d => {
      const p = (d.projects || []).find(x => x.id === projectId);
      if(!p) return;
      const arr = p.itemsByCategory?.vehicles || [];
      const it = arr.find(x => x.id === itemId);
      if(!it) return;
      it.approved = true;
      it.approvedAt = new Date().toISOString();
      it.approvedBy = auth?.username || "admin";
    });
    pushToast && pushToast("Araç onaylandı.", "ok");
  }

  function deleteVehicle(itemId){
    if(!confirm("Bu aracı silmek istiyor musun?")) return;
    updateState(d => {
      const p = (d.projects || []).find(x => x.id === projectId);
      if(!p) return;
      const arr = p.itemsByCategory?.vehicles || [];
      p.itemsByCategory.vehicles = arr.filter(x => x.id !== itemId);
    });
    pushToast && pushToast("Araç silindi.", "ok");
  }

  function renameVehicle(itemId, nextName){
    const name = (nextName || "").trim();
    if(!name) return;
    updateState(d => {
      const p = (d.projects || []).find(x => x.id === projectId);
      if(!p) return;
      const it = (p.itemsByCategory?.vehicles || []).find(x => x.id === itemId);
      if(!it) return;
      it.name = name;
    });
    pushToast && pushToast("Araç güncellendi.", "ok");
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="cardHeader">
        <div>
          <div className="h2">Araç Yönetimi</div>
          <div className="muted">Admin: Araç ekle / onayla / sil. Kullanıcıların talep ettiği onaysız araçlar burada da görünür.</div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10}}>
        <div className="field">
          <label>Proje</label>
          <select value={projectId} onChange={e=>setProjectId(e.target.value)}>
            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Araç ara</label>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Plaka / ad..." />
        </div>

        <div className="field">
          <label>Yeni araç (plaka/ad)</label>
          <div style={{display:"flex", gap:8}}>
            <input value={vehicleName} onChange={e=>setVehicleName(e.target.value)} placeholder="34 ABC 123 • Ford Transit" />
            <button className="btn primary" onClick={addVehicle}>Ekle</button>
          </div>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {!vehiclesCat && (
          <div className="muted" style={{marginBottom:8}}>
            Not: "vehicles" kategorisi bulunamadı. Admin → Kategori Tanımları kısmından "Araçlar" kategorisini oluşturmalısın.
          </div>
        )}

        {(!selectedProject) ? (
          <div className="muted">Proje seç.</div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:"40%"}}>Araç</th>
                  <th>Durum</th>
                  <th>İsteyen</th>
                  <th style={{width:210}}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr><td colSpan={4} className="muted">Kayıt yok.</td></tr>
                )}
                {list.map(it => (
                  <tr key={it.id}>
                    <td>
                      <EditableText
                        value={it.name}
                        onSave={(val)=>renameVehicle(it.id, val)}
                      />
                    </td>
                    <td>
                      {it.approved ? <span className="pill ok">Onaylı</span> : <span className="pill warn">Onay bekliyor</span>}
                    </td>
                    <td className="muted">{it.requestedBy || "-"}</td>
                    <td>
                      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                        {!it.approved && <button className="btn" onClick={()=>approveVehicle(it.id)}>Onayla</button>}
                        <button className="btn danger" onClick={()=>deleteVehicle(it.id)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Küçük inline edit bileşeni (Admin listelerinde pratik düzenleme için)
function EditableText({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");

  useEffect(() => setV(value || ""), [value]);

  if(!editing){
    return (
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <div style={{fontWeight:600}}>{value || "-"}</div>
        <button className="btn" onClick={()=>setEditing(true)}>Düzenle</button>
      </div>
    );
  }

  return (
    <div style={{display:"flex", alignItems:"center", gap:8}}>
      <input value={v} onChange={e=>setV(e.target.value)} />
      <button className="btn primary" onClick={()=>{ onSave && onSave(v); setEditing(false); }}>Kaydet</button>
      <button className="btn" onClick={()=>{ setV(value || ""); setEditing(false); }}>İptal</button>
    </div>
  );
}

class ErrorBoundary extends React.Component{
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  componentDidCatch(error, info){ try{ console.error(error, info); }catch(e){} }
  render(){
    if(this.state.error){
      return (
        <div style={{padding:16, fontFamily:"ui-sans-serif, system-ui"}}>
          <h2 style={{margin:"0 0 8px 0"}}>Uygulama Hatası</h2>
          <div style={{opacity:.8, marginBottom:10}}>Konsoldaki ilk hata satırını bana atarsan tek seferde düzeltirim.</div>
          <pre style={{whiteSpace:"pre-wrap", background:"rgba(0,0,0,.06)", padding:12, borderRadius:12}}>
            {String(this.state.error && (this.state.error.stack || this.state.error.message || this.state.error))}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App(){
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}