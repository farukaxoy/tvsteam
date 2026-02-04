import React, { useEffect, useMemo, useRef, useState } from "react";
import "./style.css";
import { createClient } from "@supabase/supabase-js";


// Format timestamp/date for UI
function formatDate(value) {
  try {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value ?? "");
  }
}

/*
 PATCHED FOR VITE + NETLIFY + DARK MODE + MOBILE RESPONSIVE + CONFLICT DETECTION
 - LOGIN_CSS / THEME_CSS tanımsız hatası giderildi
 - Dark mode desteği eklendi (localStorage ile tema kaydı)
 - Mobil responsive tasarım iyileştirildi
 - Conflict detection (çakışma tespiti) eklendi
 - URL yapısı düzenlendi (xxx.xx/veri-girisi formatı)
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


// --- tiny toast helper (no dependency, prevents ReferenceError) ---
// Usage: toast("msg"), toast.success("..."), toast.error("...") etc.
function toast(message, opts){
  try{
    const msg = (typeof message === "string") ? message : JSON.stringify(message);
    // lightweight: console + optional alert for errors
    if(opts?.type === "error") console.error(msg);
    else console.log(msg);
  }catch(e){}
}
toast.success = (m)=>toast(m,{type:"success"});
toast.error   = (m)=>toast(m,{type:"error"});
toast.info    = (m)=>toast(m,{type:"info"});
toast.warn    = (m)=>toast(m,{type:"warn"});

// --- backup helpers (download/import JSON) ---
function downloadJsonFile(obj, filename){
  try{
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "tvsteam_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }catch(e){
    console.error(e);
    alert("Yedek indirilemedi. Konsolu kontrol edin.");
  }
}

function readJsonFile(file){
  return new Promise((resolve, reject)=>{
    try{
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const txt = String(reader.result || "");
          resolve(JSON.parse(txt));
        }catch(err){ reject(err); }
      };
      reader.onerror = (e)=>reject(e);
      reader.readAsText(file);
    }catch(err){ reject(err); }
  });
}




// --- project key normalizer (SOCAR / TUPRAS_IZMIR vs "Tüpraş İzmir" etc.) ---
function canonProj(v){
  return String(v || "")
    .trim()
    .toUpperCase()
    .replaceAll("İ","I").replaceAll("İ","I")
    .replaceAll("ı","I")
    .replaceAll("Ğ","G").replaceAll("ğ","G")
    .replaceAll("Ü","U").replaceAll("ü","U")
    .replaceAll("Ş","S").replaceAll("ş","S")
    .replaceAll("Ö","O").replaceAll("ö","O")
    .replaceAll("Ç","C").replaceAll("ç","C")
    .replace(/\s+/g, "_");
}

// --- date helpers (YYYY-MM-DD) ---
function isoDate(d){
  if(!d) return "";
  const dt = (d instanceof Date) ? d : new Date(d);
  if(Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const day = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function addDays(iso, days){
  const dt = new Date(iso);
  if(Number.isNaN(dt.getTime())) return "";
  dt.setDate(dt.getDate() + Number(days||0));
  return isoDate(dt);
}
function diffDays(fromIso, toIso){
  const a = new Date(fromIso);
  const b = new Date(toIso);
  if(Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000*60*60*24));
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

/* Dark Mode */
[data-theme="dark"] {
  --lp-bgA:#0f172a;
  --lp-bgB:#1e293b;
  --lp-green:rgba(16,185,129,.45);
  --lp-blue:rgba(59,130,246,.40);
  --lp-text:rgba(248,250,252,.95);
  --lp-muted:rgba(248,250,252,.65);
  --lp-border:rgba(248,250,252,.15);
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

[data-theme="dark"] .loginArt{
  background:rgba(30,41,59,.45);
  border:1px solid rgba(248,250,252,.15);
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

[data-theme="dark"] .loginCard{
  background:rgba(30,41,59,.65);
  border:1px solid rgba(248,250,252,.15);
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

[data-theme="dark"] .loginLabel{
  color:rgba(248,250,252,.85);
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

[data-theme="dark"] .loginInputLine{
  border-bottom:2px solid rgba(248,250,252,.28);
}

.loginInputLine::placeholder{ color:rgba(15,23,42,.35); }
[data-theme="dark"] .loginInputLine::placeholder{ color:rgba(248,250,252,.35); }
.loginInputLine:focus{ border-bottom-color: rgba(15,23,42,.55); }
[data-theme="dark"] .loginInputLine:focus{ border-bottom-color: rgba(248,250,252,.55); }

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

/* Theme Toggle Button */
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  background: var(--lp-bgB);
  border: 2px solid var(--lp-border);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(0,0,0,.1);
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0,0,0,.15);
}

@media (max-width: 768px) {
  .theme-toggle {
    width: 44px;
    height: 44px;
    font-size: 20px;
    top: 16px;
    right: 16px;
  }
}
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

[data-theme="dark"] .topNav{
  background: rgba(30,41,59,.85);
  border-bottom: 1px solid rgba(248,250,252,.08);
}

.brandRow{ display:flex; align-items:center; gap:10px; min-width: 220px; }
.brandDot{
  width: 10px; height:10px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(59,130,246,.9), rgba(16,185,129,.85));
  box-shadow: 0 6px 18px rgba(59,130,246,.20);
}
.brandTitle{ font-weight: 800; letter-spacing: .2px; color:#0f172a; }
[data-theme="dark"] .brandTitle{ color:#f1f5f9; }
.brandSub{ font-size: 12px; color: rgba(15,23,42,.60); margin-top:2px; }
[data-theme="dark"] .brandSub{ color: rgba(248,250,252,.60); }

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

[data-theme="dark"] .navBtn{
  border: 1px solid rgba(248,250,252,.10);
  background: rgba(51,65,85,.70);
  color: rgba(248,250,252,.82);
}

.navBtn:hover{ transform: translateY(-1px); box-shadow: 0 10px 26px rgba(15,23,42,.10); border-color: rgba(15,23,42,.16); }
[data-theme="dark"] .navBtn:hover{ box-shadow: 0 10px 26px rgba(0,0,0,.20); border-color: rgba(248,250,252,.16); }

.navBtn.active{
  background: rgba(59,130,246,.10);
  border-color: rgba(59,130,246,.35);
  color: rgba(30,64,175,.95);
}

[data-theme="dark"] .navBtn.active{
  background: rgba(59,130,246,.25);
  border-color: rgba(59,130,246,.45);
  color: rgba(147,197,253,.95);
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

[data-theme="dark"] .userPill{
  border: 1px solid rgba(248,250,252,.10);
  background: rgba(51,65,85,.70);
  color: rgba(248,250,252,.80);
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

/* Mobile Responsive */
@media (max-width: 900px){
  .brandRow{ min-width: unset; }
  .navRight{ min-width: unset; }
  .topNav{ align-items:flex-start; flex-direction:column; }
  .navRight{ width:100%; justify-content:space-between; }
  .navTabs{ width: 100%; }
  .userPill{ max-width: 100%; flex: 1; }
}

@media (max-width: 640px){
  .topNav{ padding: 10px 12px; }
  .navBtn{ padding: 6px 10px; font-size: 13px; }
  .userPill{ padding: 6px 8px; font-size: 13px; }
  .logoutBtn{ padding: 6px 10px; font-size: 13px; }
}
`;

const THEME_CSS = `
/* Dark Mode & Responsive Theme Additions */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-color: #e5e7eb;
  --border-focus: #3b82f6;
}

[data-theme="dark"] {
  --bg-primary: #1e293b;
  --bg-secondary: #0f172a;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #334155;
  --border-focus: #60a5fa;
}

body {
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Conflict Warning Styles */
.conflict-warning {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

[data-theme="dark"] .conflict-warning {
  background: rgba(239, 68, 68, 0.15);
  border-color: #f87171;
}

@media (max-width: 768px) {
  .conflict-warning {
    padding: 12px;
    gap: 8px;
    font-size: 14px;
  }
}

.conflict-warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.conflict-warning-content {
  flex: 1;
}

.conflict-warning-title {
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 8px;
}

[data-theme="dark"] .conflict-warning-title {
  color: #fca5a5;
}

.conflict-warning-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}

.conflict-warning-list li {
  padding: 4px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .conflict-warning-list li {
    font-size: 13px;
  }
}

/* Modal/Dialog Responsive */
.modal-overlay {
  padding: 20px;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 12px;
  }
}

.modal-content {
  max-height: 90vh;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .modal-content {
    max-height: 85vh;
  }
}

/* Table Responsive */
@media (max-width: 768px) {
  table {
    font-size: 13px;
  }
  th, td {
    padding: 8px 10px;
  }
}

/* Grid Responsive */
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .grid-4 {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
`;

// ===================== AUTH MODE =====================
// Supabase client (DB + Auth)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
const USE_LOCAL_STATE = false; // ✅ Artık ana kaynak Supabase

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

/* ===================== PUANTAJ DURUM TANIMLARI ===================== */
const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  PAID_LEAVE: "paid_leave",
  UNPAID_LEAVE: "unpaid_leave",
  SICK_LEAVE: "sick_leave",
  EXCUSE: "excuse",
  WEEKEND: "weekend",
  HOLIDAY: "holiday",
  HALF_DAY: "half_day"
};

const ATTENDANCE_LABELS = {
  present: "Çalıştı",
  absent: "Gelmedi",
  paid_leave: "Ücretli İzin",
  unpaid_leave: "Ücretsiz İzin",
  sick_leave: "Hastalık İzni",
  excuse: "Mazeret",
  weekend: "Hafta Sonu",
  holiday: "Resmi Tatil",
  half_day: "Yarım Gün"
};

const ATTENDANCE_COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  paid_leave: "#3b82f6",
  unpaid_leave: "#f59e0b",
  sick_leave: "#8b5cf6",
  excuse: "#6366f1",
  weekend: "#6b7280",
  holiday: "#ec4899",
  half_day: "#14b8a6"
};

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

function defaultDocRegisterTypes(){
  // Personel Evrak Takip için varsayılan evrak türleri (admin panelinden değiştirilebilir)
  // validityDays: geçerlilik süresi (gün), warnDays: kaç gün kala uyarı verilsin
  const base = [
    { name: "İSG Eğitim Sertifikası", validityDays: 365, warnDays: 30 },
    { name: "Sağlık Raporu", validityDays: 365, warnDays: 30 },
    { name: "Yüksekte Çalışma Eğitimi", validityDays: 730, warnDays: 60 },
    { name: "Ehliyet / SRC (varsa)", validityDays: 1825, warnDays: 90 }
  ];
  return base.map(x => ({
    id: uid("dt"),
    name: x.name,
    validityDays: x.validityDays,
    warnDays: x.warnDays,
    active: true
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


function findProjectAny(projects, value){
  const vRaw = (value ?? "").toString().trim();
  if(!vRaw) return null;
  const v = vRaw;
  const sv = slugKey(vRaw);
  const arr = Array.isArray(projects) ? projects : [];
  return arr.find(p => {
    const pid = (p?.id ?? "").toString().trim();
    const pcode = (p?.project_code ?? p?.code ?? p?.projectCode ?? "").toString().trim();
    const pname = (p?.name ?? "").toString().trim();

    // exact matches
    if(pid === v || pcode === v || pname === v) return true;

    // slug matches
    const spid = slugKey(pid);
    const spcode = slugKey(pcode);
    const spname = slugKey(pname);

    if(spid === sv || spcode === sv || spname === sv) return true;

    // tolerate short codes like "izmit" matching "tupras-izmit" etc.
    if(sv && (spname.includes(sv) || spcode.includes(sv) || spid.includes(sv))) return true;

    // and vice-versa (in case stored key is shorter)
    if(sv && (sv.includes(spname) || sv.includes(spcode) || sv.includes(spid))) return true;

    return false;
  }) || null;
}
function seedState(){
  const categories = defaultCategories();
  return {
    categories,
    employees: [], // 👷 ÇALIŞANLAR
    attendance: {}, // 📅 PUANTAJ: { [employeeId]: { [monthKey]: { days: {...}, stats: {...} } } }
    docTemplates: defaultDocTemplates(), // 📄 İmzalı evrak şablonları
    employeeDocs: {}, // { [employeeId]: { [docKey]: { signed, signedAt } } }
    docRegisterTypes: defaultDocRegisterTypes(), // 🗂️ Evrak Takip türleri (geçerlilik)
    employeeDocRegister: {}, // { [employeeId]: { [typeId]: { issueDate, expiresAt } } }
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
        // Bu proje hangi kategorileri görebilir?
        // (Admin panelden değiştirilebilir)
        enabledCategoryKeys: categories.map(c => c.key),
        fieldVisibility: {},
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


function EvrakTypeAdmin({ docRegisterTypes, onAdd, onUpdate, onDelete }){
  const [name, setName] = useState("");
  const [validityDays, setValidityDays] = useState("365");
  const [warnDays, setWarnDays] = useState("30");

  const safe = Array.isArray(docRegisterTypes) ? docRegisterTypes : [];

  return (
    <>
      <div className="row" style={{flexWrap:"wrap", marginTop:12}}>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Evrak adı (örn: Sağlık Raporu)" style={{minWidth:280}} />
        <input className="input" value={validityDays} onChange={e=>setValidityDays(e.target.value)} placeholder="Geçerlilik (gün)" style={{width:160}} />
        <input className="input" value={warnDays} onChange={e=>setWarnDays(e.target.value)} placeholder="Uyarı (gün kala)" style={{width:170}} />
        <button
          className="btn primary"
          type="button"
          onClick={()=>{
            const n = String(name||"").trim();
            const v = Number(validityDays||0);
            const w = Number(warnDays||0);
            if(!n || !v) return;
            onAdd(n, v, w);
            setName(""); setValidityDays("365"); setWarnDays("30");
          }}
          disabled={!String(name||"").trim() || !Number(validityDays||0)}
        >
          Evrak Türü Ekle
        </button>
      </div>

      <div className="tableWrap" style={{marginTop:12}}>
        <table>
          <thead>
            <tr>
              <th>Evrak</th>
              <th style={{width:150}}>Geçerlilik (gün)</th>
              <th style={{width:150}}>Uyarı (gün)</th>
              <th style={{width:110}}>Aktif</th>
              <th style={{width:120}}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {safe.map(t => (
              <tr key={t.id}>
                <td><b>{t.name}</b></td>
                <td>
                  <input
                    className="input"
                    style={{width:"100%"}}
                    value={String(t.validityDays ?? "")}
                    onChange={e=>onUpdate(t.id, { validityDays: Number(e.target.value||0) })}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    style={{width:"100%"}}
                    value={String(t.warnDays ?? "")}
                    onChange={e=>onUpdate(t.id, { warnDays: Number(e.target.value||0) })}
                  />
                </td>
                <td>
                  <label style={{display:"inline-flex", alignItems:"center", gap:8}}>
                    <input
                      type="checkbox"
                      checked={t.active !== false}
                      onChange={e=>onUpdate(t.id, { active: e.target.checked })}
                    />
                    <span className="small">{t.active !== false ? "Açık" : "Kapalı"}</span>
                  </label>
                </td>
                <td>
                  <button className="btn danger" type="button" onClick={()=>onDelete(t.id)}>Sil</button>
                </td>
              </tr>
            ))}
            {safe.length===0 && (
              <tr><td colSpan="5">Henüz evrak türü yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
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

  const [auth, setAuth] = useState(null);
  const [activeProjectCode, setActiveProjectCode] = useState("GLOBAL"); // tek ortak DB kaydı
  const [availableProjectCodes, setAvailableProjectCodes] = useState([]); // admin için
 // {username, role, project?}

  // Supabase oturumu varsa (sayfa yenilenince) otomatik giriş yap
  useEffect(() => {
    if(!supabase) return;
    (async () => {
      try{
        const { data } = await supabase.auth.getSession();
        const sess = data?.session;
        const email = sess?.user?.email;
        if(email){
          // 2) Kullanıcının yetkisini (rol + proje) Supabase'ten al
          const key = String(email || "").trim().toLowerCase().split("@")[0];
          let role = "member";
          let project = "";
          try{
            const { data: access } = await supabase
              .from("user_access")
              .select("role, project_code")
              .eq("user_id", sess.user.id)
              .maybeSingle();
            if(access){
              role = access.role || role;
              project = access.project_code || "";
            }
          }catch(eAcc){
            console.error(eAcc);
          }
          setAuth({ username: key, role, project, email });
          // Buluttan veriyi çek
          try{
            const remote = await loadStateFromSupabase("GLOBAL");
            if(remote && typeof remote === "object"){
              setState(normalizeState(remote));
            }
          }catch(e2){
            console.error(e2);
          }
        }
      }catch(e){
        console.error(e);
      }
    })();
  }, []);
  const [tab, setTab] = useState("home");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  
  // URL routing - path'e göre tab ayarlama
  useEffect(() => {
    const path = window.location.pathname;
    const routes = {
      home: "/anasayfa",
      "/": "home",
      "/anasayfa": "home",
      "/veri-girisi": "entry",
      "/dokuman": "docs",
      "/evrak-takip": "docTrack",
      "/puantaj": "attendance",
      "/aksiyonlar": "actions",
      "/duyurular": "announcements",
      "/iletisim": "contact",
      "/onaylar": "approvals",
      "/personel": "employees",
      "/admin": "admin"
    };
    const matchedTab = routes[path];
    if (matchedTab) {
      setTab(matchedTab);
    }
  }, []);
  
  // Navigate fonksiyonu - tab değiştiğinde URL'i güncelle
  const navigate = (newTab) => {
    setTab(newTab);
    const routes = {
      home: "/anasayfa",
      "dashboard": "/",
      "entry": "/veri-girisi",
      "docs": "/dokuman",
      "docTrack": "/evrak-takip",
      "attendance": "/puantaj",
      "actions": "/aksiyonlar",
      "announcements": "/duyurular",
      "contact": "/iletisim",
      "approvals": "/onaylar",
      "employees": "/personel",
      "admin": "/admin"
    };
    const newPath = routes[newTab] || "/";
    window.history.pushState({}, "", newPath);
  };

  const [activeYear, setActiveYear] = useState(initY);
  const [activeMonth, setActiveMonth] = useState(initM);

  const [state, setState] = useState(() => {
    if (USE_LOCAL_STATE) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.categories)) return normalizeState(parsed);
        } catch {}
      }
    }
    return seedState();
  });

  /* login */
  const [lu, setLu] = useState("");
  const [lp, setLp] = useState("");
    const [showPw, setShowPw] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });
  const [theme, setTheme] = useState(() => localStorage.getItem("APP_THEME") || "light");
  const [toasts, setToasts] = useState([]);
  
  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);
  
  // Toggle dark mode function
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const pushToast = (text, kind="info", title="") => {
    const id = uid("t");
    const t = { id, text: String(text || ""), kind, title: title || (kind==="danger" ? "Hata" : kind==="warn" ? "Uyarı" : kind==="ok" ? "Başarılı" : "Bilgi") };
    setToasts(prev => [t, ...prev].slice(0, 5));
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const closeToast = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  /* left panel actions */
  const [search, setSearch] = useState("");
  

  // --- Backup (JSON) ---
  const handleDownloadBackup = () => {
    const ts = new Date();
    const pad = (n)=>String(n).padStart(2,"0");
    const name = `tvsteam_backup_${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.json`;
    downloadJsonFile(state, name);
    toast.success("Yedek indirildi.");
  };

  const handleImportBackup = async (file) => {
    if(!file) return;
    try{
      const data = await readJsonFile(file);
      const normalized = normalizeState(data);
      setState(normalized);
      toast.success("Yedek içe aktarıldı.");
    }catch(e){
      console.error(e);
      toast.error("Yedek içe aktarılamadı. Dosya JSON mu kontrol et.");
      alert("Yedek içe aktarılamadı. Dosya bozuk veya JSON değil.");
    }
  };
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
    // 1) Local cache (isteğe bağlı). Ana kaynak Supabase.
    if (USE_LOCAL_STATE) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }

    // 2) Buluta kaydet (debounce)
    if(!auth || !supabase) return;
    if(window.__supabaseSaveTimer) clearTimeout(window.__supabaseSaveTimer);

    window.__supabaseSaveTimer = setTimeout(async () => {
      try{
        await saveStateToSupabase(state);
      }catch(e){
        console.error(e);
        // sessiz: kullanıcıyı sürekli rahatsız etmeyelim
      }
    }, 900);
  }, [state, auth]);

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
    return findProjectAny(state.projects, auth.project);
  }, [auth, isAdmin, state.projects, entryProjectId]);

  // If a non-admin user's project isn't present in GLOBAL state yet, create it automatically.
  // This prevents "Proje bulunamadı" for new projects like TUPRAS_IZMIT / TUPRAS_IZMIR.
  useEffect(() => {
    if(!auth || isAdmin) return;
    const codeRaw = auth.project;
    if(!codeRaw) return;

    const existing = findProjectAny(state.projects, codeRaw);
    if(existing) return;

    updateState(next => {
      const projects = Array.isArray(next.projects) ? next.projects : [];
      const cats = Array.isArray(next.categories) ? next.categories : [];
      const code = String(codeRaw).trim();

      // Avoid duplicates if something adds it concurrently
      if(projects.some(p => p?.id === code || p?.project_code === code)) return;

      const pretty = code
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      projects.push({
        id: code,
        project_code: code,
        name: pretty,
        is_active: true,
        enabledCategoryKeys: cats.map(c => c.key),
        fieldVisibility: {}
      });

      next.projects = projects;
      // Ensure itemsByCategory has buckets for all categories (existing logic usually already does this)
      next.itemsByCategory = next.itemsByCategory || {};
      cats.forEach(c => { if(!next.itemsByCategory[c.key]) next.itemsByCategory[c.key] = []; });
    });
  }, [auth?.project, auth?.email, isAdmin, state.projects, state.categories]);
  // Cleanup legacy projects (old Izmir/Izmit entries) and keep only canonical project_code ones
  useEffect(() => {
    if(!isAdmin) return;
    updateState(next => {
      if(!Array.isArray(next.projects)) return;
      next.projects = next.projects.filter(p => {
        if(!p) return false;
        // keep projects that have a project_code or are GLOBAL
        if(p.id === "GLOBAL" || p.project_code) return true;
        return false;
      });
    });
  }, [isAdmin]);


  /* ===== normalization: kategori eklendiğinde projelere alan aç ===== */
  function normalizeState(s){
    const next = s; // deepClone zaten updateState'de yapılıyor, tekrar yapmayalım

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
    // ensure project_code exists for reliable matching (auth.project may be a code)
    next.projects = (next.projects || []).map(p => {
      const pp = p || {};
      if(!pp.project_code && (pp.id || pp.name)){
        pp.project_code = (pp.id ?? "").toString().trim() || slugKey((pp.name ?? "").toString());
      }
      if(!pp.id && pp.project_code) pp.id = pp.project_code;
      if(!pp.enabledCategoryKeys) pp.enabledCategoryKeys = [];
      if(!pp.fieldVisibility) pp.fieldVisibility = {}; // { [categoryKey]: string[] hiddenFieldKeys }
      return pp;
    });

    // Remove legacy duplicate projects created only by display-name.
// IMPORTANT: normalizeState may auto-fill project_code, so we remove by NAME regardless,
// but always KEEP canonical coded projects.
const keepCodes = new Set(["TUPRAS_IZMIT","TUPRAS_IZMIR","GLOBAL"]);
const legacyNames = new Set([
  "Tupras İzmir","Tupras Izmir","Tüpraş İzmir","Tüpraş Izmir",
  "Tupras İzmit","Tupras Izmit","Tüpraş İzmit","Tüpraş Izmit"
]);
next.projects = (next.projects || []).filter(p => {
  if(!p) return false;
  const code = (p.project_code || p.id || "").toString().trim();
  if(keepCodes.has(code)) return true;
  if(legacyNames.has((p.name || "").toString().trim())) return false;
  return true;
});

    next.employees ||= [];
    next.attendance ||= {}; // 📅 PUANTAJ

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

    // evrak takip (validity)
    const defaultReg = defaultDocRegisterTypes();
    if(!Array.isArray(next.docRegisterTypes) || next.docRegisterTypes.length === 0){
      next.docRegisterTypes = defaultReg;
    }else{
      // keep existing; add missing defaults by name
      const names = new Set(next.docRegisterTypes.map(x => (x?.name||"").trim().toLowerCase()).filter(Boolean));
      for(const t of defaultReg){
        const n = (t.name||"").trim().toLowerCase();
        if(!names.has(n)){
          next.docRegisterTypes.push(t);
          names.add(n);
        }
      }
    }
    next.employeeDocRegister ||= {};

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
      p.fieldVisibility ||= {};
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
    
  /* ===== AUTH (SUPABASE) ===== */
  function accountFromEmail(email){
    const e = String(email || "").trim().toLowerCase();
    const key = e.includes("@") ? e.split("@")[0] : e;
    const info = (CREDENTIALS && CREDENTIALS[key]) ? CREDENTIALS[key] : null;

    if(info){
      return {
        username: key,
        role: info.role || "user",
        project: info.project || ""
      };
    }
    // Varsayılan: admin değilse user gibi davranır
    return { username: key, role: "user", project: "" };
  }

  async function loadStateFromSupabase(projectCodeOverride){
    if(!supabase) return null;
    // Tek satırda tüm uygulama verisini tutuyoruz (local kurguyu bozmamak için)
    const project_code = "GLOBAL"; // tek ortak kayıt
    const { data, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("project_code", project_code)
      .maybeSingle();

    if(error) throw error;
    return data?.data ?? null;
  }

  async function saveStateToSupabase(nextState, projectCodeOverride){
    if(!supabase) return;
        const project_code = "GLOBAL"; // tek ortak kayıt
    const payload = {
      project_code,
      data: nextState,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from("app_state")
      .upsert(payload, { onConflict: "project_code" });

    if(error) throw error;
  }

  async function doLogin(){
    setLoginError("");

    const email = (lu || "").trim();
    const password = (lp || "").trim();

    if(!email || !password){
      setLoginError("E-posta ve şifre zorunlu.");
      pushToast("E-posta ve şifre zorunlu.", "warn");
      return;
    }

    try{
      // 1) Supabase giriş
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if(error) throw error;

      // 2) Kullanıcının yetkisini (rol + proje) Supabase'ten al
      const user = data?.user;
      const userEmail = user?.email || email;
      const key = String(userEmail || "").trim().toLowerCase().split("@")[0];

      const { data: access, error: accessErr } = await supabase
        .from("user_access")
        .select("role, project_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if(accessErr) throw accessErr;
      if(!access) throw new Error("Bu kullanıcı için proje/rol tanımı yapılmamış (user_access tablosu).");

      const role = access.role || "member";
      setAuth({ username: key, role, project: access.project_code || "", email: userEmail });

      // Proje seçimi: kullanıcı tek proje, admin çok proje
      let chosenCode = "GLOBAL";
      setAvailableProjectCodes([]);
      setActiveProjectCode("GLOBAL");

      // 3) Buluttan en güncel veriyi çek (varsa)
      try{
        const remote = await loadStateFromSupabase("GLOBAL");
        if(remote && typeof remote === "object"){
          // Local kurguyu bozmamak için normalize edip kur
          setState(normalizeState(remote));
          pushToast("Buluttaki veriler yüklendi.", "ok");
        }else{
          // Bulutta boşsa ilk kez kaydet
          await saveStateToSupabase(state);
          pushToast("Bulut veri alanı hazırlandı.", "ok");
        }
      }catch(e2){
        console.error(e2);
        pushToast("Buluttan veri okunamadı. Local veri ile devam.", "warn");
      }

      setNotifOpen(false);
      navigate("dashboard");
    }catch(e){
      console.error(e);
      setLoginError(e?.message || "Giriş yapılamadı.");
      pushToast(e?.message || "Giriş yapılamadı.", "err");
    }
  }


  async function doLogout(){
    try{
      if(supabase) await supabase.auth.signOut();
    }catch{}
    setAuth(null);
    navigate("dashboard");
    setNotifOpen(false);
  }

  /* ===== ACCESS: visible projects ===== */
  const visibleProjects = useMemo(() => {
    if(!auth) return [];
    if(isAdmin) return state.projects;
    const mine = findProjectAny(state.projects, auth.project);
    return mine ? [mine] : [];
  }, [state.projects, auth, isAdmin]);


  // Bu proje hangi kategorileri görsün? (admin: admin sekmesinde hepsi, diğer sekmelerde seçili proje)
  const visibleCategories = useMemo(() => {
    const all = Array.isArray(state.categories) ? state.categories : [];
    // Admin "admin" sekmesinde her şeyi görsün (kategori yönetimi vs.)
    if(isAdmin && tab === "admin") return all;

    const p = entryProject || null;
    const keys = Array.isArray(p?.enabledCategoryKeys) ? p.enabledCategoryKeys : null;
    if(keys){
      const keyset = new Set(keys);
      const filtered = all.filter(c => keyset.has(c.key));
      return filtered;
    }
    return all;
  }, [state.categories, isAdmin, tab, entryProject]);

  const activeCategory = useMemo(() => {
    if(!visibleCategories || visibleCategories.length===0) return null;
    return visibleCategories.find(c => c.key === categoryKey) || visibleCategories[0] || null;
  }, [visibleCategories, categoryKey]);

  useEffect(() => {
    if(visibleCategories.length && !visibleCategories.some(c => c.key === categoryKey)){
      setCategoryKey(visibleCategories[0].key);
    }
  }, [visibleCategories, categoryKey]);

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



  // 🔔 Bildirim paneli: dışarı tıklayınca kapat
  useEffect(() => {
    function onDown(e){
      if(!notifOpen) return;
      const el = notifRef.current;
      if(el && !el.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notifOpen]);

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
  // Önce state'den gerekli bilgileri al
  const cat = state.categories.find((c) => c.key === catKey);
  const p = state.projects.find((pp) => pp.id === projectId);
  const it0 = p?.itemsByCategory?.[catKey]?.find((x) => x.id === itemId);
  const requestedBy = it0?.requestedBy;
  const itemName = it0?.name;

  updateState((d) => {
    const it = findItem(d, projectId, catKey, itemId);
    if (!it) return;
    it.approved = true;
    it.approvedAt = new Date().toISOString();
    it.approvedBy = auth?.username || "admin";
  });

  // İstek atan kullanıcıya bildirim (best effort)
  if (requestedBy) {
    pushNotification({
      to: requestedBy,
      title: `${cat?.itemLabel || "Kayıt"} Onaylandı`,
      body: `${p?.name || ""} • ${cat?.itemLabel || "Kayıt"}: ${itemName}`,
      level: "ok",
    });
  }
  
  pushToast(`${cat?.itemLabel || "Kayıt"} onaylandı.`, "ok");
}

  function rejectItem(projectId, catKey, itemId){
    if(!confirm("Talep reddedilsin mi? (silinir)")) return;
    
    // Önce state'den gerekli bilgileri al
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
    
    pushToast(`${cat?.itemLabel || "Kayıt"} reddedildi.`, "warn");
  }

  /* ===== MONTHLY EDIT / SUBMIT / APPROVE ===== */
  function setMonthlyField(projectId, catKey, itemId, monthOrField, fieldOrValue, maybeValue){
    // Desteklenen çağrılar:
    // 1 setMonthlyField(projectId, catKey, itemId, fieldKey, value)  -> aktif ay
    // 2 setMonthlyField(projectId, catKey, itemId, monthKey, fieldKey, value) -> verilen ay
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
    // Önce state'den gerekli bilgileri al
    const cat = state.categories.find(c => c.key === catKey);
    const p0 = state.projects.find(pp => pp.id === projectId);
    const it0 = p0?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    const req = it0?.months?.[monthKey]?.submittedBy || it0?.requestedBy;
    const itemName = it0?.name;

    updateState(d => {
      const it = findItem(d, projectId, catKey, itemId);
      if(!it) return;
      ensureMonthSlot(it, monthKey, cat);

      it.months[monthKey].approved = true;
      it.months[monthKey].approvedAt = new Date().toISOString();
      it.months[monthKey].approvedBy = auth?.username || "admin";
      it.months[monthKey].submitted = false;
    });

    if(req){
      pushNotification({
        to: req,
        title: `Aylık Veri Onaylandı`,
        body: `${p0?.name} • ${cat?.itemLabel || "Kayıt"}: ${itemName || "-"} • Ay: ${monthKey}`,
        level: "ok"
      });
    }
    
    pushToast("Aylık veri onaylandı.", "ok");
  }

  function rejectMonth(projectId, catKey, itemId){
    // Önce state'den gerekli bilgileri al
    const cat = state.categories.find(c => c.key === catKey);
    const p0 = state.projects.find(pp => pp.id === projectId);
    const it0 = p0?.itemsByCategory?.[catKey]?.find(x => x.id === itemId);
    const req = it0?.months?.[monthKey]?.submittedBy || it0?.requestedBy;
    const itemName = it0?.name;

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
        body: `${p0?.name} • ${cat?.itemLabel || "Kayıt"}: ${itemName || "-"} • Ay: ${monthKey}`,
        level: "danger"
      });
    }
    
    pushToast("Aylık veri reddedildi.", "warn");
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

  /* ===== PUANTAJ YÖNETİMİ ===== */
  
  // Puantaj istatistiklerini yeniden hesapla
  function recalculateAttendanceStats(monthData, totalDays){
    const counts = {
      present: 0,
      absent: 0,
      paid_leave: 0,
      unpaid_leave: 0,
      sick_leave: 0,
      excuse: 0,
      weekend: 0,
      holiday: 0,
      half_day: 0,
      unset: 0
    };
    
    for(let i = 1; i <= totalDays; i++){
      const day = monthData.days[i];
      if(day && day.status){
        counts[day.status] = (counts[day.status] || 0) + 1;
      } else {
        counts.unset++;
      }
    }
    
    const workDays = counts.present + (counts.half_day * 0.5);
    
    monthData.stats = {
      ...counts,
      totalDays,
      workDays,
      completionRate: ((totalDays - counts.unset) / totalDays * 100).toFixed(1)
    };
  }
  
  // Tek gün için puantaj kaydet
  function setAttendanceDay(employeeId, monthKey, day, status, note = ""){
    updateState(d => {
      if(!d.attendance) d.attendance = {};
      if(!d.attendance[employeeId]) d.attendance[employeeId] = {};
      if(!d.attendance[employeeId][monthKey]){
        d.attendance[employeeId][monthKey] = { days: {}, stats: {} };
      }
      
      const month = d.attendance[employeeId][monthKey];
      
      month.days[day] = {
        status,
        note: (note || "").trim(),
        updatedBy: auth?.username || "admin",
        updatedAt: new Date().toISOString()
      };
      
      recalculateAttendanceStats(month, monthDays);
    });
    
    pushToast("Puantaj kaydedildi.", "ok");
  }
  
  // Toplu puantaj kayıt (örn: tüm hafta sonları)
  function bulkSetAttendance(employeeId, monthKey, days, status){
    updateState(d => {
      if(!d.attendance) d.attendance = {};
      if(!d.attendance[employeeId]) d.attendance[employeeId] = {};
      if(!d.attendance[employeeId][monthKey]){
        d.attendance[employeeId][monthKey] = { days: {}, stats: {} };
      }
      
      const month = d.attendance[employeeId][monthKey];
      
      days.forEach(day => {
        month.days[day] = {
          status,
          note: "",
          updatedBy: auth?.username || "admin",
          updatedAt: new Date().toISOString()
        };
      });
      
      recalculateAttendanceStats(month, monthDays);
    });
    
    pushToast(`${days.length} gün toplu kaydedildi.`, "ok");
  }
  
  // Hafta sonlarını otomatik işaretle
  function autoMarkWeekends(employeeId, monthKey, year, month){
    const weekends = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for(let day = 1; day <= daysInMonth; day++){
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if(dayOfWeek === 0 || dayOfWeek === 6){
        weekends.push(day);
      }
    }
    
    if(weekends.length > 0){
      bulkSetAttendance(employeeId, monthKey, weekends, "weekend");
    }
  }
  
  // Resmi tatilleri işaretle
  function autoMarkHolidays(employeeId, monthKey, year, month){
    const holidays = getHolidaysForMonth(year, month);
    if(holidays.length > 0){
      bulkSetAttendance(employeeId, monthKey, holidays, "holiday");
    }
  }
  
  // Türkiye resmi tatilleri
  function getHolidaysForMonth(year, month){
    const holidays = [];
    
    const fixedHolidays = {
      1: [1],
      4: [23],
      5: [1, 19],
      8: [30],
      10: [29]
    };
    
    if(fixedHolidays[month]){
      holidays.push(...fixedHolidays[month]);
    }
    
    return holidays;
  }
  
  // Puantaj excel export
  function exportAttendanceToExcel(employeeId, monthKey){
    const employee = state.employees.find(e => e.id === employeeId);
    const monthData = state.attendance?.[employeeId]?.[monthKey];
    
    if(!employee || !monthData) {
      pushToast("Veri bulunamadı.", "warn");
      return;
    }
    
    const [year, month] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let csv = "Gün,Tarih,Durum,Not\n";
    
    for(let day = 1; day <= daysInMonth; day++){
      const date = new Date(year, month - 1, day);
      const dateStr = date.toLocaleDateString("tr-TR");
      const dayData = monthData.days[day];
      const status = dayData?.status ? ATTENDANCE_LABELS[dayData.status] : "-";
      const note = (dayData?.note || "").replace(/,/g, ";");
      
      csv += `${day},${dateStr},${status},${note}\n`;
    }
    
    csv += "\n\nİSTATİSTİKLER\n";
    csv += `Toplam Gün,${monthData.stats?.totalDays || 0}\n`;
    csv += `Çalışma Günü,${monthData.stats?.workDays || 0}\n`;
    csv += `Tam Gün Çalıştı,${monthData.stats?.present || 0}\n`;
    csv += `Ücretli İzin,${monthData.stats?.paid_leave || 0}\n`;
    csv += `Hastalık İzni,${monthData.stats?.sick_leave || 0}\n`;
    csv += `Gelmedi,${monthData.stats?.absent || 0}\n`;
    
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employee.name}_${monthKey}_puantaj.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    pushToast("Puantaj raporu indirildi.", "ok");
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
    if(!name){
      pushToast("Kategori adı zorunlu.", "warn");
      return;
    }

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
    pushToast("Kategori eklendi.", "ok");
  }

  // ===== ADMIN: PROJE EKLE / KATEGORİ YETKİSİ =====
  function adminAddProject(projectName, enabledCategoryKeys){
    const name = String(projectName || "").trim();
    if(!name){
      pushToast("Proje adı zorunlu.", "warn");
      return;
    }
    
    // Duplicate check
    if(state.projects.some(p => canonProj(p.name) === canonProj(name))){
      pushToast("Bu proje zaten var.", "warn");
      return;
    }
    
    updateState(next => {
      next.projects = Array.isArray(next.projects) ? next.projects : [];
      const cats = Array.isArray(next.categories) ? next.categories : [];
      const itemsByCategory = cats.reduce((acc, c) => {
        acc[c.key] = [];
        return acc;
      }, {});
      next.projects.push({
        id: uid("prj"),
        name,
        enabledCategoryKeys: Array.isArray(enabledCategoryKeys) && enabledCategoryKeys.length ? enabledCategoryKeys : cats.map(c => c.key),
        fieldVisibility: {},
        itemsByCategory
      });
    });
    pushToast("Proje eklendi.", "ok");
  }

  function adminSetProjectCategories(projectId, enabledCategoryKeys){
    updateState(next => {
      const cats = Array.isArray(next.categories) ? next.categories : [];
      const keys = Array.isArray(enabledCategoryKeys) ? enabledCategoryKeys.filter(Boolean) : [];
      const p = (next.projects || []).find(x => x.id === projectId);
      if(!p){ pushToast("Proje bulunamadı.", "warn"); return; }
      p.enabledCategoryKeys = keys.length ? keys : cats.map(c => c.key);
      // Not: itemsByCategory yapısı zaten tüm kategoriler için mevcut kalsın.
      // Gizli kategori sadece arayüzde görünmez; veri kaybı olmaz.
    });
    pushToast("Proje kategorileri güncellendi.", "ok");
  }

  function adminSetProjectHiddenFields(projectId, categoryKey, hiddenFieldKeys){
    updateState(next => {
      const p = (next.projects || []).find(x => x.id === projectId);
      if(!p) return;
      p.fieldVisibility = p.fieldVisibility && typeof p.fieldVisibility === "object" ? p.fieldVisibility : {};
      const k = String(categoryKey || "").trim();
      if(!k) return;
      p.fieldVisibility[k] = {
        hiddenFieldKeys: Array.isArray(hiddenFieldKeys) ? hiddenFieldKeys.filter(Boolean) : []
      };
    });
    pushToast("Proje alan görünürlüğü güncellendi.", "ok");
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

  /* ===== ADMIN: EVRAK TAKİP TÜRLERİ (Geçerlilik) ===== */
  const adminAddDocRegisterType = (nameArg, validityDaysArg, warnDaysArg) => {
    if(!isAdmin) return;
    const name = String(nameArg || "").trim();
    const validityDays = Number(validityDaysArg || 0);
    const warnDays = Number(warnDaysArg || 0);

    if(!name || !validityDays){
      pushToast("Evrak adı ve geçerlilik (gün) zorunlu.", "warn");
      return;
    }

    updateState(d => {
      if(!Array.isArray(d.docRegisterTypes)) d.docRegisterTypes = [];
      d.docRegisterTypes.push({
        id: uid("dt"),
        name,
        validityDays,
        warnDays: Number.isFinite(warnDays) ? warnDays : 0,
        active: true
      });
    });

    pushToast("Evrak türü eklendi.", "ok");
  }

  function adminUpdateDocRegisterType(typeId, patch){
    if(!isAdmin) return;
    updateState(d => {
      if(!Array.isArray(d.docRegisterTypes)) d.docRegisterTypes = [];
      const ix = d.docRegisterTypes.findIndex(x => x.id === typeId);
      if(ix < 0) return;
      d.docRegisterTypes[ix] = { ...d.docRegisterTypes[ix], ...(patch || {}) };
    });
  }

  function adminDeleteDocRegisterType(typeId){
    if(!isAdmin) return;
    const t = (state.docRegisterTypes || []).find(x => x.id === typeId);
    if(!t) return;
    if(!confirm(`Evrak türü silinsin mi? (${t.name})`)) return;

    updateState(d => {
      d.docRegisterTypes = (d.docRegisterTypes || []).filter(x => x.id !== typeId);
      const reg = d.employeeDocRegister || {};
      for(const empId of Object.keys(reg)){
        if(reg[empId] && reg[empId][typeId]) delete reg[empId][typeId];
      }
    });

    pushToast("Evrak türü silindi.", "warn");
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
      pushToast("E-mail / şifre / proje zorunlu.", "warn");
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
    const all = state.projects || [];
    if(isAdmin) return all;

    // member: tek proje görür (user_access.project_code)
    const target = canonProj(auth.project || auth.projectId || "");
    if(!target) return [];
    const p = all.find(pr => {
      const prKey = canonProj(pr.code || pr.projectCode || pr.project || pr.name || pr.id);
      return prKey === target;
    });
    return p ? [p] : [];
  }, [state.projects, auth, isAdmin]);
  const dashboardRows = useMemo(() => {
    if(!auth) return [];
    const cat = activeCategory;
    if(!cat) return [];

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
    if(!cat) return [];
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
    if(!entryProject || !activeCategory) return [];
    const p = entryProject;
    const cat = activeCategory;
    const arr = p.itemsByCategory?.[cat.key] || [];
    return arr.filter(it => cat.approval?.item && !it.approved && it.requestedBy === auth.username);
  }, [auth, isAdmin, entryProject, activeCategory]);

  /* ===================== LOGIN SCREEN ===================== */

  
  // 🎨 MODERN NAVBAR COMPONENT (v005)
  function ModernNavbar() {
    return (
      <header className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <button 
              className="theme-toggle-modern" 
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className="navbar-brand">
              📊 TVS Team Veri Takip
            </div>
          </div>

          <nav className="navbar-center">
            <button 
              className={`navbar-tab ${tab === 'home' ? 'active' : ''}`}
              onClick={() => navigate('home')}
            >
              🏠 Anasayfa
            </button>
            <button 
              className={`navbar-tab ${tab === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`navbar-tab ${tab === 'entry' ? 'active' : ''}`}
              onClick={() => navigate('entry')}
            >
              ✍️ Veri Girişi
            </button>
            <button 
              className={`navbar-tab ${tab === 'attendance' ? 'active' : ''}`}
              onClick={() => navigate('attendance')}
            >
              📅 Puantaj
            </button>
            <button 
              className={`navbar-tab ${tab === 'actions' ? 'active' : ''}`}
              onClick={() => navigate('actions')}
            >
              🎯 Aksiyonlar
            </button>
            {isAdmin && (
              <button 
                className={`navbar-tab ${tab === 'admin' ? 'active' : ''}`}
                onClick={() => navigate('admin')}
              >
                ⚙️ Admin
              </button>
            )}
          </nav>

          <div className="navbar-right">
            <div className="user-avatar-modern">
              {auth?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button className="logout-btn-modern" onClick={handleLogout}>
              Çıkış
            </button>
          </div>
        </div>
      </header>
    );
  }

  // 🏠 HOME PAGE COMPONENT (v005)
  function HomePage() {
    const totalProjects = state.projects?.length || 0;
    const totalEmployees = state.employees?.length || 0;
    const totalRecords = state.categories?.reduce((sum, cat) => {
      return sum + state.projects?.reduce((pSum, proj) => {
        return pSum + (proj.itemsByCategory?.[cat.key]?.length || 0);
      }, 0);
    }, 0) || 0;

    return (
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        <div className="home-hero">
          <h1>Hoş Geldiniz, {auth?.username}! 👋</h1>
          <p>TVS Team Veri Takip Sistemi ile projelerinizi kolayca yönetin</p>
        </div>

        <div className="home-stats">
          <div className="stat-card-modern" onClick={() => navigate('dashboard')}>
            <div className="stat-value-modern">{totalProjects}</div>
            <div className="stat-label-modern">Toplam Proje</div>
          </div>
          <div className="stat-card-modern" onClick={() => navigate('employees')}>
            <div className="stat-value-modern">{totalEmployees}</div>
            <div className="stat-label-modern">Toplam Çalışan</div>
          </div>
          <div className="stat-card-modern" onClick={() => navigate('dashboard')}>
            <div className="stat-value-modern">{totalRecords}</div>
            <div className="stat-label-modern">Toplam Kayıt</div>
          </div>
          <div className="stat-card-modern">
            <div className="stat-value-modern">✓</div>
            <div className="stat-label-modern">Sistem Aktif</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 20 }}>⚡ Hızlı Erişim</h2>
          <div className="grid grid-3" style={{ gap: 16 }}>
            <button 
              className="btn" 
              style={{ padding: 24, fontSize: 16, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none' }}
              onClick={() => navigate('entry')}
            >
              ✍️ Yeni Veri Girişi
            </button>
            <button 
              className="btn" 
              style={{ padding: 24, fontSize: 16, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #14b8a6)', color: 'white', border: 'none' }}
              onClick={() => navigate('attendance')}
            >
              📅 Puantaj İşlemleri
            </button>
            <button 
              className="btn" 
              style={{ padding: 24, fontSize: 16, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #fb923c)', color: 'white', border: 'none' }}
              onClick={() => navigate('actions')}
            >
              🎯 Aksiyonlar
            </button>
          </div>
        </div>
      </div>
    );
  }



  if(!auth){
    return (
      <div className="loginHero" data-theme={darkMode ? "dark" : "light"}>
        <button 
          className="theme-toggle" 
          onClick={toggleDarkMode}
          aria-label="Tema Değiştir"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
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
              <label className="loginLabel">E-mail</label>
              <input
                className="loginInputLine"
                value={lu}
                onChange={(e) => { setLu(e.target.value); if(loginError) setLoginError(""); }}
                placeholder="E-mail Adresinizi Yazınız"
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
    <div className="appShell" data-theme={darkMode ? "dark" : "light"}>
      <button 
        className="theme-toggle" 
        onClick={toggleDarkMode}
        aria-label="Tema Değiştir"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
      <div className="topNav">
        <div className="brandRow">
          <div className="brandDot" />
          <div>
            <div className="brandTitle">Aylık Takip Formu</div>
            <div className="brandSub">Scaffolding Control Services</div>
          </div>
        </div>

        <div className="navTabs">
          <button className={"navBtn " + (tab === "dashboard" ? "active" : "")} type="button" onClick={() => navigate("dashboard")}>Dashboard</button>
          <button className={"navBtn " + (tab === "entry" ? "active" : "")} type="button" onClick={() => navigate("entry")}>Veri Girişi</button>
          <button className={"navBtn " + (tab === "docs" ? "active" : "")} type="button" onClick={() => navigate("docs")}>Dokümanlar</button>
          <button className={"navBtn " + (tab === "docTrack" ? "active" : "")} type="button" onClick={() => navigate("docTrack")}>Evrak Takip</button>
          <button className={"navBtn " + (tab === "attendance" ? "active" : "")} type="button" onClick={() => navigate("attendance")}>Puantaj</button>
          <button className={"navBtn " + (tab === "actions" ? "active" : "")} type="button" onClick={() => navigate("actions")}>Aksiyonlar</button>
          <button className={"navBtn " + (tab === "announcements" ? "active" : "")} type="button" onClick={() => navigate("announcements")}>Duyurular</button>
          <button className={"navBtn " + (tab === "contact" ? "active" : "")} type="button" onClick={() => navigate("contact")}>İletişim</button>
          {isAdmin && (
            <>
              <button className={"navBtn " + (tab === "approvals" ? "active" : "")} type="button" onClick={() => navigate("approvals")}>Onaylar</button>
              <button className={"navBtn " + (tab === "employees" ? "active" : "")} type="button" onClick={() => navigate("employees")}>Personel</button>
              <button className={"navBtn " + (tab === "admin" ? "active" : "")} type="button" onClick={() => navigate("admin")}>Admin</button>
            </>
          )}
        </div>

        <div className="navRight">
          <div ref={notifRef} style={{ position: "relative", marginRight: 10 }}>
            <button
              type="button"
              className="navBtn"
              style={{ padding: "8px 10px", minWidth: 44 }}
              onClick={() => setNotifOpen(v => !v)}
              title="Bildirimler"
            >
              <span style={{ fontSize: 16 }}>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: "#d81b60",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "1px 7px",
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: "18px",
                    display: "inline-block"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

           {notifOpen && (
  <div
    style={{
      position: "absolute",
      right: 0,
      top: "110%",
      width: 360,
      maxWidth: "80vw",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 10,
      zIndex: 50,
      boxShadow: "0 10px 30px rgba(0,0,0,.12)"
    }}
  >

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>Bildirimler</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="miniBtn" onClick={markAllRead}>Tümü okundu</button>
                    <button type="button" className="miniBtn" onClick={() => setNotifOpen(false)}>Kapat</button>
                  </div>
                </div>

                {myNotifications.length === 0 ? (
                  <div style={{ opacity: .8, padding: 8 }}>Bildirim yok.</div>
                ) : (
                  <div style={{ maxHeight: 360, overflow: "auto" }}>
                    {myNotifications.slice(0, 30).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          updateState(d => {
                            const nn = (d.notifications || []).find(x => x.id === n.id);
                            if(nn) nn.read = true;
                          });
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,.08)",
                          background: n.read ? "rgba(255,255,255,.03)" : "rgba(76,175,80,.10)",
                          marginBottom: 8,
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 800 }}>{n.title || "Bildirim"}</div>
                          <div style={{ opacity: .7, fontSize: 12 }}>{formatDate(n.createdAt)}</div>
                        </div>
                        {n.body ? <div style={{ opacity: .9, marginTop: 4, fontSize: 13 }}>{n.body}</div> : null}
                        {!n.read ? <div style={{ marginTop: 6, fontSize: 12, opacity: .85 }}>• okunmadı</div> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="userPill" title={auth?.username || ""}>
            <span>{auth?.username || "Kullanıcı"}</span>
            <span className="small" style={{opacity:.7}}>{isAdmin ? "Admin" : (auth?.projectName || "Proje")}</span>
          </div>
          {auth?.role === "admin" && availableProjectCodes?.length > 0 && (
            <select
              className="projectSelect"
              value={activeProjectCode || ""}
              onChange={async (e) => {
                const code = e.target.value;
                setActiveProjectCode(code);
                try{
                  const remote = await loadStateFromSupabase(code);
                  if(remote) setState(normalizeState(remote));
                }catch(err){
                  console.error(err);
                  alert(err?.message || "Proje verisi yüklenemedi");
                }
              }}
              title="Admin proje seçimi"
              style={{ marginRight: 10, padding: "6px 8px", borderRadius: 8 }}
            >
              {availableProjectCodes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button className="logoutBtn" type="button" onClick={() => { setAuth(null); setLu(""); setLp(""); navigate("dashboard"); setNotifOpen(false); }}>Çıkış</button>
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
              {visibleCategories.map((c) => (
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
                    placeholder={`${activeCategory?.itemLabel || "Kayıt"} adı (ör: Faruk Aksoy / 34 ABC 123)`}
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
                    {visibleCategories.map((c) => (
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
                attendance={state.attendance}
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
                  onDownloadBackup={handleDownloadBackup}
                  onImportBackup={handleImportBackup}
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
                  hiddenFieldKeys={entryProject?.fieldVisibility?.[activeCategory?.key]?.hiddenFieldKeys || []}
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
                onDownloadBackup={handleDownloadBackup}
                onImportBackup={handleImportBackup}
                isAdmin={isAdmin}
                monthKey={monthKey}
                categories={state.categories}
                projects={visibleProjects}
                docTemplates={state.docTemplates}
                docRegisterTypes={state.docRegisterTypes}
                adminAddDocTemplate={adminAddDocTemplate}
                adminDeleteDocTemplate={adminDeleteDocTemplate}
                adminAddDocRegisterType={adminAddDocRegisterType}
                adminUpdateDocRegisterType={adminUpdateDocRegisterType}
                adminDeleteDocRegisterType={adminDeleteDocRegisterType}
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
                adminAddProject={adminAddProject}
                adminSetProjectCategories={adminSetProjectCategories}
          adminSetProjectHiddenFields={adminSetProjectHiddenFields}
              />

              <ProjectUserMapping
                authUsers={state.authUsers}
                projects={visibleProjects}
                onUpsert={adminUpsertAuthUser}
                onDelete={adminDeleteAuthUser}
              />

              <VehiclesAdminView
                isAdmin={isAdmin}
                auth={auth}
                categories={state.categories}
                projects={visibleProjects}
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
              projects={visibleProjects}
              updateState={updateState}
            />
          )}

          {tab === "docs" && (
            <DocsView
              isAdmin={isAdmin}
              auth={auth}
              projects={visibleProjects}
              employees={state.employees}
              docTemplates={state.docTemplates}
              employeeDocs={state.employeeDocs}
              updateState={updateState}
            />
          )}

          {tab === "docTrack" && (
            <DocTrackingView
              isAdmin={isAdmin}
              auth={auth}
              projects={visibleProjects}
              employees={state.employees}
              docRegisterTypes={state.docRegisterTypes}
              employeeDocRegister={state.employeeDocRegister}
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

          {tab === "attendance" && (
            <AttendanceView
              isAdmin={isAdmin}
              auth={auth}
              employees={state.employees}
              projects={visibleProjects}
              monthKey={monthKey}
              monthDays={monthDays}
              attendance={state.attendance}
              setAttendanceDay={setAttendanceDay}
              bulkSetAttendance={bulkSetAttendance}
              autoMarkWeekends={autoMarkWeekends}
              autoMarkHolidays={autoMarkHolidays}
              exportAttendanceToExcel={exportAttendanceToExcel}
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

      </div>
      <div className="footer">© {new Date().getFullYear()} 2026 Faruk Aksoy • TVS Proje Takip Platformu</div>
    </div>
  );

}

/* ===================== VIEWS ===================== */

function DashboardView({ monthKey, category, rows, projects, employees, actions, categories, isAdmin, attendance }){
  const [dashTab, setDashTab] = useState("genel");

  /* ─── aggregations ─── */
  const totals = useMemo(() => {
    const t = { itemsApproved:0, monthApproved:0, sums:{}, mealsSum:0 };
    for(const f of (category?.fields || [])) if(f.type === "number") t.sums[f.key] = 0;
    for(const r of rows){
      t.itemsApproved += safeNum(r.itemsApproved);
      t.monthApproved += safeNum(r.monthApproved);
      for(const k of Object.keys(r.sums || {})) t.sums[k] = safeNum(t.sums[k]) + safeNum(r.sums[k]);
      t.mealsSum += safeNum(r.mealsSum);
    }
    return t;
  }, [rows, category]);

  const { projectBlocks, grand, grandCompletion } = useMemo(() => {
    const prjs = Array.isArray(projects) ? projects : [];
    const emps = Array.isArray(employees) ? employees : [];
    const att  = attendance || {};
    const zeroAgg = () => ({ present:0, absent:0, paid_leave:0, unpaid_leave:0, sick_leave:0, excuse:0, weekend:0, holiday:0, half_day:0, unset:0, totalDays:0, workDays:0 });
    const blocks = prjs.map(proj => {
      const projEmps = emps.filter(e => e.project === proj.name);
      const agg = zeroAgg();
      projEmps.forEach(emp => {
        const s = att[emp.id]?.[monthKey]?.stats || {};
        agg.present += (s.present||0); agg.absent += (s.absent||0);
        agg.paid_leave += (s.paid_leave||0); agg.unpaid_leave += (s.unpaid_leave||0);
        agg.sick_leave += (s.sick_leave||0); agg.excuse += (s.excuse||0);
        agg.weekend += (s.weekend||0); agg.holiday += (s.holiday||0);
        agg.half_day += (s.half_day||0); agg.unset += (s.unset||0);
        agg.totalDays += (s.totalDays||0); agg.workDays += (s.workDays||0);
      });
      return { proj, projEmps, agg };
    });
    const g = { ...zeroAgg(), empCount:0 };
    blocks.forEach(b => {
      g.present += b.agg.present; g.absent += b.agg.absent;
      g.paid_leave += b.agg.paid_leave; g.unpaid_leave += b.agg.unpaid_leave;
      g.sick_leave += b.agg.sick_leave; g.excuse += b.agg.excuse;
      g.weekend += b.agg.weekend; g.holiday += b.agg.holiday;
      g.half_day += b.agg.half_day; g.unset += b.agg.unset;
      g.totalDays += b.agg.totalDays; g.workDays += b.agg.workDays;
      g.empCount += b.projEmps.length;
    });
    const comp = g.totalDays > 0 ? ((g.totalDays - g.unset) / g.totalDays * 100).toFixed(1) : "0";
    return { projectBlocks: blocks, grand: g, grandCompletion: comp };
  }, [projects, employees, attendance, monthKey]);

  /* trend: son 6 ay */
  const trendMonths = useMemo(() => {
    const [curY, curM] = monthKey.split("-").map(Number);
    const labels = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Ekim","Kas","Ara"];
    const out = [];
    for(let i = 5; i >= 0; i--){
      let m = curM - i, y = curY;
      while(m < 1){ m += 12; y--; }
      out.push({ mk:`${y}-${String(m).padStart(2,"0")}`, label: labels[m-1] + (y !== curY ? " '"+String(y).slice(2) : "") });
    }
    return out;
  }, [monthKey]);

  const trendData = useMemo(() => {
    const emps = Array.isArray(employees) ? employees : [];
    const att  = attendance || {};
    const projNames = new Set((Array.isArray(projects) ? projects : []).map(p => p.name));
    return trendMonths.map(({ mk, label }) => {
      let present=0, absent=0, izin=0, workDays=0, totalDays=0, unset=0;
      emps.forEach(emp => {
        if(!projNames.has(emp.project)) return;
        const s = att[emp.id]?.[mk]?.stats;
        if(!s) return;
        present += (s.present||0); absent += (s.absent||0);
        izin += (s.paid_leave||0)+(s.unpaid_leave||0)+(s.sick_leave||0);
        workDays += (s.workDays||0); totalDays += (s.totalDays||0); unset += (s.unset||0);
      });
      return { label, present, absent, izin, workDays, completion: totalDays > 0 ? Number(((totalDays-unset)/totalDays*100).toFixed(0)) : 0 };
    });
  }, [trendMonths, employees, attendance, projects]);

  /* ─── shared styles ─── */
  const heroKpi = { flex:"1 1 140px", background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"18px 20px", display:"flex", flexDirection:"column", gap:4 };
  const heroKpiDark = { background:"#1e293b", borderColor:"#334155" };
  const sectionTab = (active) => ({
    padding:"10px 20px", border:"none", borderBottom: active ? "2.5px solid #3b82f6" : "2.5px solid transparent",
    background:"transparent", cursor:"pointer", fontWeight: active ? 700 : 500, fontSize:14,
    color: active ? "#1d4ed8" : "#64748b", transition:"all .15s", whiteSpace:"nowrap"
  });

  /* ─── RENDER ─── */
  return (
    <div style={{display:"flex", flexDirection:"column", gap:16}}>

      {/* ════════════════ HERO HEADER ════════════════ */}
      <div style={{
        background:"linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius:20, padding:"24px 28px 20px", color:"#fff"
      }}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:18}}>
          <div>
            <div style={{fontSize:22, fontWeight:800, letterSpacing:"-.3px"}}>Dashboard</div>
            <div style={{fontSize:13, color:"rgba(255,255,255,.55)", marginTop:2}}>
              {category?.name} • {monthKey} • Sadece onaylı veriler
            </div>
          </div>
          <div style={{display:"flex", gap:8}}>
            <span style={{background:"rgba(16,185,129,.18)", color:"#34d399", padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700}}>● Onaylı</span>
            <span style={{background:"rgba(59,130,246,.18)", color:"#60a5fa", padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700}}>{monthKey}</span>
          </div>
        </div>

        {/* KPI Pills Row */}
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          {[
            { label:"Toplam Proje", value: (projects||[]).length, color:"#60a5fa", bg:"rgba(59,130,246,.15)" },
            { label:"Toplam Personel", value: grand.empCount, color:"#a78bfa", bg:"rgba(167,139,250,.15)" },
            { label:"Onaylı Kayıt", value: totals.itemsApproved, color:"#34d399", bg:"rgba(16,185,129,.15)" },
            { label:"Onaylı Aylık", value: totals.monthApproved, color:"#fbbf24", bg:"rgba(251,191,36,.15)" },
            { label:"Geldi", value: grand.present, color:"#34d399", bg:"rgba(16,185,129,.15)" },
            { label:"Gelmedi", value: grand.absent, color:"#f87171", bg:"rgba(239,68,68,.15)" },
            { label:"Tamamlanma", value: grandCompletion+"%", color:"#fff", bg:"rgba(255,255,255,.10)" }
          ].map(k => (
            <div key={k.label} style={{ flex:"1 1 100px", background: k.bg, borderRadius:12, padding:"12px 14px" }}>
              <div style={{fontSize:11, color:"rgba(255,255,255,.5)", fontWeight:600, textTransform:"uppercase", letterSpacing:".6px"}}>{k.label}</div>
              <div style={{fontSize:22, fontWeight:800, color: k.color, marginTop:2}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div style={{marginTop:16}}>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
            <span style={{fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600}}>Genel Tamamlanma</span>
            <span style={{fontSize:12, color:"#34d399", fontWeight:700}}>{grandCompletion}%</span>
          </div>
          <div style={{height:8, background:"rgba(255,255,255,.12)", borderRadius:999, overflow:"hidden"}}>
            <div style={{height:"100%", width: grandCompletion+"%", background:"linear-gradient(90deg,#10b981,#3b82f6)", borderRadius:999, transition:"width .4s ease"}} />
          </div>
        </div>
      </div>

      {/* ════════════════ SECTION TAB BAR ════════════════ */}
      <div style={{
        display:"flex", gap:0, borderBottom:"1px solid #e5e7eb", background:"#fff",
        borderRadius:"14px 14px 0 0", overflowX:"auto", overflowY:"hidden"
      }}>
        {[
          { key:"genel",      label:"📊 Genel" },
          { key:"aksiyonlar", label:"✅ Aksiyonlar" },
          { key:"puantaj",    label:"📅 Puantaj" },
          { key:"trend",      label:"📈 Trend" },
          { key:"raporlar",   label:"📄 Raporlar" }
        ].map(t => (
          <button key={t.key} type="button" style={sectionTab(dashTab === t.key)} onClick={() => setDashTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB CONTENT ════════════════ */}
      <div className="card" style={{borderRadius:"0 0 16px 16px", borderTopLeftRadius:0, borderTopRightRadius:0}}>

        {/* ──── GENEL ──── */}
        {dashTab === "genel" && (
          <div>
            {/* Grafik satırı */}
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
              <div style={{fontWeight:700, fontSize:16}}>Kategori Özeti — {category?.name}</div>
              <Badge kind="ok">Proje Bazlı</Badge>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10}}>
              {(category?.fields || []).filter(f=>f.type==="number" && f.key!=="mealCount").map(f => (
                <BarChart key={f.key} title={f.label} data={rows.map(r => ({ label: r.name, value: safeNum(r.sums?.[f.key]) }))} />
              ))}
              {(category?.special?.meals || (category?.fields||[]).some(f=>f.key==="mealCount") || totals.mealsSum>0) ? (
                <BarChart title="Yemek" data={rows.map(r => ({ label: r.name, value: safeNum(r.mealsSum) }))} />
              ) : null}
            </div>

            {/* Özet tablo */}
            <div style={{marginTop:24}}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>Proje Özeti</div>
              <div className="tableWrap">
                <table>
                  <thead><tr>
                    <th>Proje</th>
                    <th>Onaylı {category?.itemLabel || "Kayıt"}</th>
                    <th>Onaylı Aylık</th>
                    {(category?.fields || []).filter(f=>f.type==="number" && f.key!=="mealCount").map(f=>(<th key={f.key}>{f.label}</th>))}
                    {(category?.special?.meals || (category?.fields||[]).some(f=>f.key==="mealCount")) ? <th>Yemek</th> : null}
                  </tr></thead>
                  <tbody>
                    {rows.map(r=>(
                      <tr key={r.id}>
                        <td><b>{r.name}</b></td>
                        <td>{r.itemsApproved}</td>
                        <td>{r.monthApproved}</td>
                        {(category?.fields || []).filter(f=>f.type==="number" && f.key!=="mealCount").map(f=>(<td key={f.key}>{safeNum(r.sums?.[f.key])}</td>))}
                        {(category?.special?.meals || (category?.fields||[]).some(f=>f.key==="mealCount")) ? <td>{r.mealsSum}</td> : null}
                      </tr>
                    ))}
                    {rows.length===0 && <tr><td colSpan="99">Kayıt yok.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kişi bazlı — sadece experts */}
            {category?.key === "experts" && (
              <div style={{marginTop:24}}>
                <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>Kişi Bazlı — Onaylı Aylık</div>
                <div className="tableWrap">
                  <table>
                    <thead><tr>
                      <th>Proje</th><th>Uzman</th>
                      {(category?.fields || []).filter(f=>f.type==="number" && f.key!=="mealCount").map(f=>(<th key={f.key}>{f.label}</th>))}
                      {(category?.special?.meals || (category?.fields||[]).some(f=>f.key==="mealCount")) ? <th>Yemek</th> : null}
                    </tr></thead>
                    <tbody>
                      {(() => {
                        const out = [];
                        for(const p of (Array.isArray(projects) ? projects : [])){
                          for(const it of (p.itemsByCategory?.[category.key] || [])){
                            if(category.approval?.item && !it.approved) continue;
                            const slot = it.months?.[monthKey];
                            if(!slot || !slot.approved) continue;
                            const dft = slot.draft || {};
                            const rec = { project: p.name, name: it.name, nums: {}, meals: category?.special?.meals ? (Object.prototype.hasOwnProperty.call(dft,"mealCount") ? safeNum(dft.mealCount) : (Array.isArray(dft.meals) ? dft.meals.length : 0)) : null };
                            const hidden = Array.isArray(p?.fieldVisibility?.[category?.key]?.hiddenFieldKeys) ? p.fieldVisibility[category.key].hiddenFieldKeys : [];
                            for(const f of (category.fields || [])) { if(!hidden.includes(f.key) && f.type === "number") rec.nums[f.key] = safeNum(dft[f.key]); }
                            out.push(rec);
                          }
                        }
                        out.sort((a,b)=> (a.project+a.name).localeCompare(b.project+b.name,"tr"));
                        return out.map((r,i)=>(
                          <tr key={r.project+"_"+r.name+"_"+i}>
                            <td><b>{r.project}</b></td><td>{r.name}</td>
                            {(category?.fields||[]).filter(f=>f.type==="number"&&f.key!=="mealCount").map(f=>(<td key={f.key}>{safeNum(r.nums?.[f.key])}</td>))}
                            {category?.special?.meals ? <td>{safeNum(r.meals)}</td> : null}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── AKSIYONLAR ──── */}
        {dashTab === "aksiyonlar" && (
          <div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
              <div style={{fontWeight:700, fontSize:16}}>Proje Aksiyon Durumu</div>
              <Badge kind="warn">Durum Bazlı</Badge>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10}}>
              {(Array.isArray(projects) ? projects : []).map(p => {
                const list = (Array.isArray(actions) ? actions : []).filter(a => a?.project === p.name);
                const openN = list.filter(a => (a.status||"open")==="open").length;
                const progN = list.filter(a => (a.status||"open")==="in_progress").length;
                const doneN = list.filter(a => (a.status||"open")==="done"||(a.status||"open")==="user_done").length;
                const closedN = list.filter(a => (a.status||"open")==="closed").length;
                const total = list.length;
                const doneRate = total > 0 ? Math.round((doneN+closedN)/total*100) : 0;
                return (
                  <div key={p.id} style={{
                    background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"16px 18px",
                    borderTop: openN > 0 ? "3px solid #ef4444" : "3px solid #10b981"
                  }}>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
                      <div style={{fontWeight:700, fontSize:14}}>{p.name}</div>
                      <span style={{
                        background: openN > 0 ? "#fef2f2" : "#ecfdf5", color: openN > 0 ? "#dc2626" : "#16a34a",
                        padding:"2px 10px", borderRadius:999, fontSize:12, fontWeight:700
                      }}>{total} aksiyon</span>
                    </div>

                    {/* Mini donut-style satırlar */}
                    {[
                      { label:"Açık", val:openN, color:"#ef4444", bg:"#fef2f2" },
                      { label:"Devam", val:progN, color:"#f59e0b", bg:"#fffbeb" },
                      { label:"Tamamlandı", val:doneN, color:"#10b981", bg:"#ecfdf5" },
                      { label:"Kapalı", val:closedN, color:"#6366f1", bg:"#eef2ff" }
                    ].map(s => (
                      <div key={s.label} style={{display:"flex", alignItems:"center", gap:8, padding:"4px 0"}}>
                        <div style={{width:8, height:8, borderRadius:999, background:s.color, flexShrink:0}} />
                        <span style={{fontSize:13, flex:1, color:"#374151"}}>{s.label}</span>
                        <span style={{fontSize:13, fontWeight:700, background:s.bg, color:s.color, padding:"1px 8px", borderRadius:999}}>{s.val}</span>
                      </div>
                    ))}

                    {/* Mini progress */}
                    <div style={{marginTop:10}}>
                      <div style={{height:6, background:"#f3f4f6", borderRadius:999, overflow:"hidden"}}>
                        <div style={{height:"100%", width: doneRate+"%", background:"linear-gradient(90deg,#10b981,#6366f1)", borderRadius:999, transition:"width .3s"}} />
                      </div>
                      <div style={{fontSize:11, color:"#9ca3af", marginTop:4, textAlign:"right"}}>{doneRate}% tamamlandı</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──── PUANTAJ ──── */}
        {dashTab === "puantaj" && (
          <div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>Puantaj Özeti</div>
              <Badge kind="ok">{monthKey}</Badge>
            </div>

            {/* Proje kartları */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10}}>
              {projectBlocks.map(({ proj, projEmps, agg }) => {
                const comp = agg.totalDays > 0 ? ((agg.totalDays - agg.unset) / agg.totalDays * 100).toFixed(0) : 0;
                const att = attendance || {};
                return (
                  <div key={proj.id} style={{
                    background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"16px 18px",
                    borderLeft:"4px solid #3b82f6"
                  }}>
                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
                      <div style={{fontWeight:700, fontSize:14}}>{proj.name}</div>
                      <span style={{background:"#eff6ff", color:"#2563eb", padding:"2px 10px", borderRadius:999, fontSize:12, fontWeight:700}}>{projEmps.length} kişi</span>
                    </div>

                    {/* 3 stat box */}
                    <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10}}>
                      {[
                        { val: agg.present, label:"Geldi", color:"#10b981", bg:"#ecfdf5" },
                        { val: agg.absent, label:"Gelmedi", color:"#ef4444", bg:"#fef2f2" },
                        { val: agg.paid_leave+agg.unpaid_leave+agg.sick_leave, label:"İzin", color:"#3b82f6", bg:"#eff6ff" }
                      ].map(s => (
                        <div key={s.label} style={{textAlign:"center", padding:"8px 4px", background:s.bg, borderRadius:10}}>
                          <div style={{fontWeight:800, fontSize:18, color:s.color}}>{s.val}</div>
                          <div style={{fontSize:11, color:"#6b7280"}}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{height:8, background:"#f3f4f6", borderRadius:999, overflow:"hidden", marginBottom:4}}>
                      <div style={{height:"100%", width: comp+"%", background:"linear-gradient(90deg,#10b981,#3b82f6)", borderRadius:999, transition:"width .3s"}} />
                    </div>
                    <div style={{fontSize:11, color:"#9ca3af", display:"flex", justifyContent:"space-between"}}>
                      <span>{comp}% tamamlandı</span>
                      <span>{agg.workDays} iş günü</span>
                    </div>

                    {/* Personel mini liste */}
                    {projEmps.length > 0 && (
                      <div style={{marginTop:12, paddingTop:10, borderTop:"1px solid #f3f4f6"}}>
                        {projEmps.map(emp => {
                          const es = att[emp.id]?.[monthKey]?.stats || {};
                          const eComp = es.totalDays > 0 ? ((es.totalDays-(es.unset||0))/es.totalDays*100).toFixed(0) : 0;
                          return (
                            <div key={emp.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"3px 0", fontSize:13}}>
                              <span style={{color:"#374151"}}>{emp.name}</span>
                              <div style={{display:"flex", alignItems:"center", gap:6}}>
                                <span style={{color:"#10b981", fontWeight:700}}>{es.present||0}</span>
                                {(es.absent||0)>0 && <span style={{color:"#ef4444", fontWeight:700}}>{es.absent}</span>}
                                <span style={{color:"#9ca3af", fontSize:11}}>{eComp}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detay tablosu */}
            <div style={{marginTop:24}}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>Personel Detay</div>
              <div className="tableWrap">
                <table>
                  <thead><tr>
                    <th>Proje</th><th>Personel</th><th>İş Günü</th><th>Geldi</th><th>Yarım</th>
                    <th>Ücr. İzin</th><th>Üçr. İzin</th><th>Hastalık</th><th>Mazeret</th>
                    <th>Gelmedi</th><th>H.Sonu</th><th>Tatil</th><th>Tamaml.</th>
                  </tr></thead>
                  <tbody>
                    {projectBlocks.map(({ proj, projEmps }) =>
                      projEmps.map(emp => {
                        const es = (attendance||{})[emp.id]?.[monthKey]?.stats || {};
                        const eComp = es.totalDays > 0 ? ((es.totalDays-(es.unset||0))/es.totalDays*100).toFixed(1) : "-";
                        return (
                          <tr key={emp.id}>
                            <td><b>{proj.name}</b></td><td>{emp.name}</td>
                            <td>{es.workDays||0}</td><td>{es.present||0}</td><td>{es.half_day||0}</td>
                            <td>{es.paid_leave||0}</td><td>{es.unpaid_leave||0}</td><td>{es.sick_leave||0}</td>
                            <td>{es.excuse||0}</td>
                            <td style={{color:"#ef4444", fontWeight:(es.absent||0)>0?700:400}}>{es.absent||0}</td>
                            <td>{es.weekend||0}</td><td>{es.holiday||0}</td><td>{eComp}%</td>
                          </tr>
                        );
                      })
                    )}
                    {grand.empCount===0 && <tr><td colSpan="13">Personel kayıt yok.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──── TREND ──── */}
        {dashTab === "trend" && (
          <div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>Son 6 Ay Trend</div>
              <Badge kind="ok">Karşılaştırma</Badge>
            </div>

            {/* Trend bar groups */}
            {[
              { title:"Çalışma Günü", key:"workDays", color:"#3b82f6" },
              { title:"Geldi", key:"present", color:"#10b981" },
              { title:"Gelmedi", key:"absent", color:"#ef4444" },
              { title:"İzin", key:"izin", color:"#f59e0b" }
            ].map(metric => {
              const max = Math.max(1, ...trendData.map(d => d[metric.key]));
              return (
                <div key={metric.key} style={{
                  background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"18px 20px", marginBottom:12
                }}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                    <div style={{width:10, height:10, borderRadius:999, background:metric.color}} />
                    <div style={{fontWeight:700, fontSize:14, color:"#1e293b"}}>{metric.title}</div>
                  </div>
                  <div style={{display:"flex", gap:6, alignItems:"flex-end", height:80}}>
                    {trendData.map((d, i) => {
                      const val = d[metric.key];
                      const pct = Math.max(6, (val / max) * 72);
                      return (
                        <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%"}}>
                          <div style={{fontSize:12, fontWeight:800, color:metric.color, marginBottom:4}}>{val}</div>
                          <div style={{width:"70%", height: pct+"px", background:metric.color, borderRadius:"5px 5px 0 0", transition:"height .3s", opacity:.85}} />
                          <div style={{fontSize:10, color:"#9ca3af", marginTop:4, textAlign:"center", whiteSpace:"nowrap"}}>{d.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Tamamlanma trend — renk kodlu */}
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"18px 20px", marginBottom:12 }}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                <div style={{fontWeight:700, fontSize:14, color:"#1e293b"}}>Tamamlanma Oranı (%)</div>
              </div>
              <div style={{display:"flex", gap:6, alignItems:"flex-end", height:80}}>
                {trendData.map((d, i) => {
                  const pct = d.completion;
                  const barH = Math.max(6, (pct / 100) * 72);
                  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%"}}>
                      <div style={{fontSize:12, fontWeight:800, color, marginBottom:4}}>{pct}%</div>
                      <div style={{width:"70%", height: barH+"px", background:color, borderRadius:"5px 5px 0 0", transition:"height .3s"}} />
                      <div style={{fontSize:10, color:"#9ca3af", marginTop:4, textAlign:"center", whiteSpace:"nowrap"}}>{d.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex", gap:16, marginTop:12, justifyContent:"center"}}>
                {[{c:"#10b981",t:"≥ 80%"},{c:"#f59e0b",t:"60–79%"},{c:"#ef4444",t:"< 60%"}].map(l => (
                  <div key={l.t} style={{display:"flex", alignItems:"center", gap:5, fontSize:12}}>
                    <div style={{width:10, height:10, borderRadius:3, background:l.c}} />
                    <span style={{color:"#64748b"}}>{l.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proje bazlı tablo */}
            <div style={{marginTop:8}}>
              <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>Proje Bazlı — İş Günü Trend</div>
              <div className="tableWrap">
                <table>
                  <thead><tr>
                    <th>Proje</th>
                    {trendData.map((d,i) => <th key={i}>{d.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {(Array.isArray(projects)?projects:[]).map(proj => {
                      const projEmps = (Array.isArray(employees)?employees:[]).filter(e => e.project === proj.name);
                      return (
                        <tr key={proj.id}>
                          <td><b>{proj.name}</b></td>
                          {trendMonths.map((tm, mi) => {
                            let wd = 0;
                            projEmps.forEach(emp => { wd += ((attendance||{})[emp.id]?.[tm.mk]?.stats?.workDays || 0); });
                            return <td key={mi}>{wd}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ──── RAPORLAR ──── */}
        {dashTab === "raporlar" && (
          <div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>Aylık PDF Raporlar</div>
              <Badge>{monthKey}</Badge>
            </div>
            <div style={{color:"#6b7280", fontSize:14, marginBottom:16}}>
              Butona tıkla → rapor yeni sekmede açılır → tarayıcıdan PDF olarak kaydet.
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10}}>
              {(Array.isArray(projects) ? projects : []).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProjectMonthlyReport({ project: p, category, monthKey, employees })}
                  style={{
                    background:"linear-gradient(135deg, #1e293b, #334155)", color:"#fff",
                    border:"none", borderRadius:12, padding:"18px 16px", cursor:"pointer",
                    textAlign:"left", transition:"transform .12s, box-shadow .12s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
                >
                  <div style={{fontSize:11, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".8px", fontWeight:600}}>PDF Rapor</div>
                  <div style={{fontSize:15, fontWeight:700, marginTop:4}}>{p.name}</div>
                  <div style={{fontSize:12, color:"rgba(255,255,255,.45)", marginTop:6}}>{category?.name} • {monthKey}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
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
        <Badge kind="ok">Sayı</Badge>
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
  const hiddenKeys = Array.isArray(project?.fieldVisibility?.[category?.key]?.hiddenFieldKeys)
    ? project.fieldVisibility[category.key].hiddenFieldKeys
    : [];
  const fields = (Array.isArray(category?.fields) ? category.fields : []).filter(f => !hiddenKeys.includes(f.key));
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
                  disabled={!isAdmin && approved}
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
  onDownloadBackup,
  onImportBackup,
  monthKey,
  monthDays,
  project,
  category,
  items,
  employees,
  setMonthlyField,
  toggleMeal,
  submitMonth,
  hiddenFieldKeys
}){
  if(!project){
    return <div className="card">Proje bulunamadı.</div>;
  }

  // Gizli alanları filtrele
  const visibleFields = useMemo(() => {
    const hidden = Array.isArray(hiddenFieldKeys) ? hiddenFieldKeys : [];
    return (category?.fields || []).filter(f => !hidden.includes(f.key));
  }, [category, hiddenFieldKeys]);

  return (
    <>
      {isAdmin && (
      <div className="card">
        <div className="cardTitleRow">
          <h2>Admin • Yedekleme</h2>
        </div>
        <div className="row" style={{gap:10, flexWrap:"wrap", marginTop:10}}>
          <button className="btn primary" onClick={onDownloadBackup}>Yedek Al (JSON)</button>

          <label className="btn" style={{cursor:"pointer"}}>
            Yedek Yükle (JSON)
            <input
              type="file"
              accept="application/json,.json"
              style={{display:"none"}}
              onChange={(e)=>{
                const f = e.target.files?.[0];
                e.target.value = "";
                onImportBackup?.(f);
              }}
            />
          </label>
          <div className="small" style={{alignSelf:"center"}}>
            Not: Yedek yükleme mevcut verinin üstüne yazar. Yüklemeden önce “Yedek Al” önerilir.
          </div>
        </div>
      </div>
      )}

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
            hiddenFieldKeys={hiddenFieldKeys}
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
                {visibleFields.map(f => (
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
                    disabled={(!isAdmin && approved) || inactive}
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

function ExpertsEntryCompactView({ isAdmin, monthKey, monthDays, project, category, items, employees, setMonthlyField, toggleMeal, submitMonth, hiddenFieldKeys }){
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if(!q) return (items || []);
    return (items || []).filter(it => (it.name || "").toLowerCase().includes(q));
  }, [items, search]);

  // Gizli alanları filtrele
  const visibleFields = React.useMemo(() => {
    const hidden = Array.isArray(hiddenFieldKeys) ? hiddenFieldKeys : [];
    return (category?.fields || []).filter(f => !hidden.includes(f.key));
  }, [category, hiddenFieldKeys]);


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

                    {(isAdmin || !approved) && (
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
                  {visibleFields.map(f => {
                    if(f.key === "mealCount") {
                      return (
                        <div key={f.key}>
                          <div className="lbl">{f.label}</div>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={mealCount}
                            disabled={(!isAdmin && approved) || inactive}
                            onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, "mealCount", Number(e.target.value||0))}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={f.key}>
                        <div className="lbl">{f.label}</div>
                        <input
                          className="input"
                          type="number"
                          value={draft[f.key] ?? 0}
                          disabled={(!isAdmin && approved) || inactive}
                          onChange={e=>setMonthlyField(project.id, category.key, it.id, monthKey, f.key, Number(e.target.value||0))}
                        />
                      </div>
                    );
                  })}
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

function AdminView(props){
  const {
onDownloadBackup,
  onImportBackup,
isAdmin,
  monthKey,
  categories,
  projects,
  docTemplates,
  docRegisterTypes,
  adminAddDocRegisterType,
  adminUpdateDocRegisterType,
  adminDeleteDocRegisterType,
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
  adminDeleteCategory,
  adminAddProject,
  adminSetProjectCategories,
  adminSetProjectHiddenFields

  } = props;

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Doküman Tanımları ekleme inputu için local state
  const [newDocName, setNewDocName] = useState("");

  // Proje yönetimi local state
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCatKeys, setNewProjectCatKeys] = useState(() => safeCategories.map(c=>c.key));

  const [selectedProjectId, setSelectedProjectId] = useState(safeProjects?.[0]?.id || "");
  const [selectedProjectCatKeys, setSelectedProjectCatKeys] = useState(() => {
    const p = safeProjects?.[0];
    const keys = Array.isArray(p?.enabledCategoryKeys) ? p.enabledCategoryKeys : safeCategories.map(c=>c.key);
    return keys;
  });

  const [selectedProjectFieldCatKey, setSelectedProjectFieldCatKey] = useState("experts");
  const selectedProject = safeProjects.find(p => p.id === selectedProjectId);
  const selectedFieldCategory = safeCategories.find(c => c.key === selectedProjectFieldCatKey) || safeCategories[0];
  const selectedFieldHiddenKeys = Array.isArray(selectedProject?.fieldVisibility?.[selectedProjectFieldCatKey]?.hiddenFieldKeys)
    ? selectedProject.fieldVisibility[selectedProjectFieldCatKey].hiddenFieldKeys
    : [];
  const [localHiddenKeys, setLocalHiddenKeys] = useState(selectedFieldHiddenKeys);

  useEffect(() => {
    const hk = Array.isArray(selectedProject?.fieldVisibility?.[selectedProjectFieldCatKey]?.hiddenFieldKeys)
      ? selectedProject.fieldVisibility[selectedProjectFieldCatKey].hiddenFieldKeys
      : [];
    setLocalHiddenKeys(hk);
  }, [selectedProjectId, selectedProjectFieldCatKey]);

  useEffect(() => {
    // kategori listesi değişirse yeni proje seçimlerini güncelle
    setNewProjectCatKeys(prev => {
      const all = safeCategories.map(c=>c.key);
      if(!prev || prev.length === 0) return all;
      // eski anahtarlar varsa koru, yoksa düşür
      const set = new Set(all);
      const next = prev.filter(k => set.has(k));
      return next.length ? next : all;
    });
  }, [safeCategories]);

  useEffect(() => {
    // seçili proje değişince checkbox'ları projeden oku
    if(!safeProjects.length) return;
    const pid = selectedProjectId || safeProjects[0].id;
    if(!pid) return;
    const p = safeProjects.find(x=>x.id===pid) || safeProjects[0];
    const keys = Array.isArray(p?.enabledCategoryKeys) ? p.enabledCategoryKeys : safeCategories.map(c=>c.key);
    setSelectedProjectCatKeys(keys);
    if(!selectedProjectId) setSelectedProjectId(pid);
  }, [safeProjects, safeCategories, selectedProjectId]);


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
              <h3>🏗️ Proje Yönetimi</h3>
              <Badge kind="warn">Sadece Admin</Badge>
            </div>

            <div className="small" style={{marginTop:6}}>
              Yeni proje ekleyebilir ve her proje için hangi kategorilerin görüneceğini seçebilirsin.
            </div>

            <div style={{height:10}} />

            {/* Yeni proje ekleme */}
            <div className="row" style={{flexWrap:"wrap", gap:8}}>
              <input
                className="input"
                value={newProjectName}
                onChange={e=>setNewProjectName(e.target.value)}
                placeholder="Yeni proje adı (örn: Petkim)"
                style={{minWidth:260}}
              />
              <button
                className="btn"
                onClick={() => {
                  const keys = newProjectCatKeys.length ? newProjectCatKeys : safeCategories.map(c=>c.key);
                  adminAddProject(newProjectName, keys);
                  setNewProjectName("");
                }}
              >
                Proje Ekle
              </button>
            </div>

            <div className="small" style={{marginTop:8, opacity:.85}}>Yeni projede açık olacak kategoriler:</div>
            <div className="row" style={{flexWrap:"wrap", gap:10, marginTop:6}}>
              {safeCategories.map(c => {
                const checked = newProjectCatKeys.includes(c.key);
                return (
                  <label key={c.key} className="pill" style={{display:"inline-flex", alignItems:"center", gap:8}}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setNewProjectCatKeys(prev => {
                          const set = new Set(prev || []);
                          if(set.has(c.key)) set.delete(c.key);
                          else set.add(c.key);
                          return Array.from(set);
                        });
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>

            <hr className="sep" style={{marginTop:14}} />

            {/* Var olan projelerde kategori görünürlüğü */}
            <div className="cardTitleRow">
              <h4>Mevcut Proje • Kategori Yetkisi</h4>
            </div>

            <div className="row" style={{flexWrap:"wrap", gap:8, marginTop:8}}>
              <select
                className="input"
                value={selectedProjectId || ""}
                onChange={(e)=>setSelectedProjectId(e.target.value)}
                style={{minWidth:260}}
              >
                {safeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                className="btn"
                onClick={() => adminSetProjectCategories(selectedProjectId, selectedProjectCatKeys)}
              >
                Kaydet
              </button>
            </div>

            <div className="row" style={{flexWrap:"wrap", gap:10, marginTop:10}}>
              {safeCategories.map(c => {
                const checked = selectedProjectCatKeys.includes(c.key);
                return (
                  <label key={c.key} className="pill" style={{display:"inline-flex", alignItems:"center", gap:8}}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedProjectCatKeys(prev => {
                          const set = new Set(prev || []);
                          if(set.has(c.key)) set.delete(c.key);
                          else set.add(c.key);
                          return Array.from(set);
                        });
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
            <div style={{height:14}} />
            <div className="small" style={{marginTop:6}}>
              Proje bazlı <b>alan</b> görünürlüğü: Örn. SOCAR "Takip" görsün, Tüpraş görmesin.
            </div>

            <div className="row" style={{flexWrap:"wrap", gap:8, marginTop:10, alignItems:"center"}}>
              <label className="small" style={{minWidth:120}}>Kategori</label>
              <select
                className="select"
                value={selectedProjectFieldCatKey}
                onChange={(e)=>setSelectedProjectFieldCatKey(e.target.value)}
              >
                {safeCategories.map(c => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>

              <button
                className="btn"
                onClick={() => adminSetProjectHiddenFields(selectedProjectId, selectedProjectFieldCatKey, localHiddenKeys)}
                disabled={!selectedProjectId}
              >
                Alanları Kaydet
              </button>
            </div>

            <div className="row" style={{flexWrap:"wrap", gap:10, marginTop:10}}>
              {(selectedFieldCategory?.fields || []).map(f => {
                const isHidden = (localHiddenKeys || []).includes(f.key);
                return (
                  <label key={f.key} className="pill" style={{display:"inline-flex", alignItems:"center", gap:8}}>
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={() => {
                        setLocalHiddenKeys(prev => {
                          const set = new Set(prev || []);
                          if(set.has(f.key)) set.delete(f.key);
                          else set.add(f.key);
                          return Array.from(set);
                        });
                      }}
                    />
                    <span>{f.label}</span>
                  </label>
                );
              })}
            </div>

          </div>
        )}

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


        {isAdmin && (
          <div className="card" style={{marginTop:12}}>
            <div className="cardTitleRow">
              <h3>🗂️ Evrak Takip • Evrak Türleri</h3>
              <Badge kind="warn">Sadece Admin</Badge>
            </div>

            <div className="small" style={{marginTop:6}}>
              Evrak adını ve geçerlilik süresini tanımla. Sistem bitiş tarihini hesaplar ve yaklaşınca uyarı üretir.
            </div>

            <EvrakTypeAdmin
              docRegisterTypes={docRegisterTypes}
              onAdd={adminAddDocRegisterType}
              onUpdate={adminUpdateDocRegisterType}
              onDelete={adminDeleteDocRegisterType}
            />
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
          <label className="label">E-mail</label>
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
        canonProj(e.project) === canonProj(auth.project) &&
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

      // 1 Manuel çalışan kaydı (admin eklediği) -> default onaylı
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

      // 2 Veri girişi için: aynı kişiyi ilgili projenin "Uzmanlar (experts)" kategorisine de ekle
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
  // For docs tracking we need a stable "project key" to filter employees.
  // Employees are stored with employee.project = project.name (not project_code).
  const myProject = useMemo(() => {
    if(isAdmin) return null;
    return findProjectAny(projects, auth?.project) || null; // auth.project is project_code
  }, [isAdmin, projects, auth?.project]);

  const [projectName, setProjectName] = useState(() => {
    if(isAdmin) return (projects?.[0]?.name || "");
    return myProject?.name || myProject?.id || "";
  });
  const [employeeId, setEmployeeId] = useState("");

  // Keep project selection in sync
  useEffect(() => {
    if(isAdmin){
      if(projects?.length && !projects.some(p => p.name === projectName)){
        setProjectName(projects[0]?.name || "");
      }
      return;
    }
    const nm = myProject?.name || myProject?.id || "";
    if(projectName !== nm) setProjectName(nm);
  }, [isAdmin, projects, myProject, projectName]);

  const projectEmployees = useMemo(() => {
    // Doküman takibi: pasif personel de listelensin (etiketle gösterilir)
    if(!projectName) return [];
    const code = String(auth?.project || "").trim();
    const mineName = myProject?.name || "";
    const mineId = myProject?.id || "";
    return (employees || []).filter(e => {
      const p = e?.project || "";
      // Primary: employee.project == project.name
      if(p === projectName) return true;
      // Fallbacks for older data / mismatches
      if(mineName && p === mineName) return true;
      if(mineId && p === mineId) return true;
      if(code && p === code) return true; // if someone stored project_code into employee.project
      return false;
    });
  }, [employees, projectName, auth?.project, myProject]);

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


function DocTrackingView({ isAdmin, auth, projects, employees, docRegisterTypes, employeeDocRegister, updateState }){
  const today = isoDate(new Date());
  const safeTypes = useMemo(() => (Array.isArray(docRegisterTypes) ? docRegisterTypes : []).filter(t => t && t.active !== false), [docRegisterTypes]);

  const visibleEmployees = useMemo(() => {
    const arr = Array.isArray(employees) ? employees : [];
    if(isAdmin){
      // admin: ham liste; aşağıda projectFilter ile süzülecek
      return arr;
    }
    // kullanıcı: kendi projesinin personeli (employee.project bazen "proje adı", bazen "project_code" olabiliyor)
    const mine = (Array.isArray(projects) && projects.length) ? projects[0] : null;
    const allow = new Set([
      canonProj(auth?.project),
      canonProj(mine?.project_code),
      canonProj(mine?.id),
      canonProj(mine?.name),
    ].filter(Boolean));
    return arr.filter(e => allow.has(canonProj(e?.project)));
  }, [employees, isAdmin, auth?.project, projects]);


  // proje bazlı görüntüleme (admin seçebilir, kullanıcı kendi projesine kilitli)
  const mineProject = useMemo(() => ((Array.isArray(projects) && projects.length) ? projects[0] : null), [projects]);
  const mineProjectName = useMemo(() => {
    // Çalışan kayıtlarında genelde employee.project = "Proje Adı" tutuluyor.
    // Bu yüzden non-admin için filtre anahtarı olarak proje adını (yoksa code/id) kullanıyoruz.
    return String(mineProject?.name || mineProject?.project_code || mineProject?.id || auth?.project || "").trim();
  }, [mineProject, auth?.project]);

  const allProjectNames = useMemo(() => {
    const set = new Set();
    (Array.isArray(projects) ? projects : []).forEach(p => p?.name && set.add(p.name));
    // fallback: employees içinden de topla
    (Array.isArray(employees) ? employees : []).forEach(e => e?.project && set.add(e.project));
    // admin dropdown için stabil liste
    return Array.from(set);
  }, [projects, employees]);

  const [projectFilter, setProjectFilter] = useState(() => {
    if(!isAdmin) return mineProjectName;
    return (allProjectNames[0] || "");
  });

  useEffect(() => {
    // kullanıcı için proje kilitli (proje adı)
    if(!isAdmin){
      const p = mineProjectName;
      if(p && projectFilter !== p) setProjectFilter(p);
      return;
    }
    // admin için seçili proje geçerli değilse ilkine çek
    if(projectFilter && allProjectNames.includes(projectFilter)) return;
    if(allProjectNames[0]) setProjectFilter(allProjectNames[0]);
  }, [isAdmin, mineProjectName, allProjectNames]);

  // proje bazlı filtre
  const curProjectName = String(isAdmin ? (projectFilter || "") : mineProjectName).trim();

  // non-admin: visibleEmployees zaten projeye göre filtreli (canonProj). Burada tekrar string eşleştirme yapmıyoruz.
  const employeesInProject = isAdmin
    ? (curProjectName ? (visibleEmployees || []).filter(e => String(e.project || "").trim() === curProjectName) : (visibleEmployees || []))
    : (visibleEmployees || []);
const filteredEmployees = employeesInProject;

  const [empId, setEmpId] = useState(() => (filteredEmployees[0]?.id || ""));
  useEffect(() => {
    if(!filteredEmployees.some(e => e.id === empId)){
      setEmpId(filteredEmployees[0]?.id || "");
    }
  }, [filteredEmployees, empId]);

  const emp = useMemo(() => filteredEmployees.find(e => e.id === empId) || null, [filteredEmployees, empId]);
  const empInactive = emp ? (emp.active === false) : false;
  const reg = (employeeDocRegister && empId && employeeDocRegister[empId]) ? employeeDocRegister[empId] : {};

  const alerts = useMemo(() => {
    const out = [];
    for(const e of employeesInProject){
      const r = (employeeDocRegister && employeeDocRegister[e.id]) ? employeeDocRegister[e.id] : {};
      for(const t of safeTypes){
        const rec = r?.[t.id];
        if(!rec?.expiresAt) continue;
        const left = diffDays(today, rec.expiresAt);
        if(left === null) continue;
        if(left < 0){
          out.push({ level:"danger", employee:e.name, project:e.project, doc:t.name, expiresAt:rec.expiresAt, left });
        }else if(left <= Number(t.warnDays||0)){
          out.push({ level:"warn", employee:e.name, project:e.project, doc:t.name, expiresAt:rec.expiresAt, left });
        }
      }
    }
    out.sort((a,b)=> (a.left - b.left));
    return out.slice(0, 50);
  }, [employeesInProject, employeeDocRegister, safeTypes, today]);

  function setIssue(typeId, issueDate, validityDays){
    updateState(d => {
      if(!d.employeeDocRegister) d.employeeDocRegister = {};
      if(!d.employeeDocRegister[empId]) d.employeeDocRegister[empId] = {};
      if(!issueDate){
        if(d.employeeDocRegister[empId][typeId]) delete d.employeeDocRegister[empId][typeId];
        return;
      }
      const expiresAt = addDays(issueDate, Number(validityDays||0));
      d.employeeDocRegister[empId][typeId] = { issueDate, expiresAt };
    });
  }

  return (
    <>
      <div className="card">
        <div className="cardTitleRow">
          <h2>🗂️ Personel Evrak Takip</h2>
          <Badge>{today}</Badge>
        </div>
        <div className="small" style={{marginTop:6}}>
          Evrak türleri admin panelinden tanımlanır. Tarih girince bitiş tarihi otomatik hesaplanır; yaklaşınca uyarı görünür.
        </div>

        <hr className="sep" />

        
        <div className="row" style={{flexWrap:"wrap", gap:12, alignItems:"flex-end", marginTop:10}}>
          <div style={{flex:"1 1 260px"}}>
            <span className="lbl">Proje</span>
            <select
              className="input"
              value={projectFilter || ""}
              onChange={e => setProjectFilter(e.target.value)}
              disabled={!isAdmin}
              title={!isAdmin ? "Kullanıcılar kendi projesine kilitlidir" : "Projeye göre uyarıları filtrele"}
            >
              {allProjectNames.map(pn => (
                <option key={pn} value={pn}>{pn}</option>
              ))}
            </select>
          </div>
          <div style={{display:"flex", gap:10, alignItems:"center", flex:"0 0 auto"}}>
            <Badge kind="default">Yaklaşan: {alerts.filter(a=>a.level==="warn").length}</Badge>
            <Badge kind="danger">Süresi Dolan: {alerts.filter(a=>a.level==="danger").length}</Badge>
          </div>
        </div>

<div className="row" style={{flexWrap:"wrap", alignItems:"flex-end"}}>
          <div style={{flex:"1 1 320px"}}>
            <span className="lbl">Personel</span>
            <select className="input" value={empId || ""} onChange={e=>setEmpId(e.target.value)}>
              {filteredEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.project}{e.active === false ? " (Pasif)" : ""}
                </option>
              ))}
            </select>
          </div>
          {emp && (
            <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <Pill kind={empInactive ? "danger" : "ok"}>{empInactive ? "Pasif" : "Aktif"}</Pill>
              <span className="small">{emp.role || "Personel"}</span>
            </div>
          )}
        </div>

        {empInactive && (
          <div className="small" style={{marginTop:10}}>
            <Badge kind="danger">Pasif personel</Badge> olduğu için bu ekranda tarih girişi kapalı.
          </div>
        )}

        <div className="tableWrap" style={{marginTop:12}}>
          <table>
            <thead>
              <tr>
                <th>Evrak</th>
                <th style={{width:160}}>Veriliş</th>
                <th style={{width:160}}>Bitiş</th>
                <th style={{width:140}}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {safeTypes.map(t => {
                const rec = reg?.[t.id] || {};
                const expiresAt = rec.expiresAt || (rec.issueDate ? addDays(rec.issueDate, Number(t.validityDays||0)) : "");
                const left = expiresAt ? diffDays(today, expiresAt) : null;

                let badgeKind = "default";
                let statusText = "—";
                if(expiresAt && left !== null){
                  if(left < 0){ badgeKind = "danger"; statusText = `Süresi Doldu (${Math.abs(left)}g)`; }
                  else if(left <= Number(t.warnDays||0)){ badgeKind = "warn"; statusText = `Yaklaşıyor (${left}g)`; }
                  else { badgeKind = "ok"; statusText = `Geçerli (${left}g)`; }
                }

                return (
                  <tr key={t.id}>
                    <td>
                      <b>{t.name}</b>
                      <div className="small">Geçerlilik: {t.validityDays} gün • Uyarı: {t.warnDays} gün</div>
                    </td>
                    <td>
                      <input
                        className="input"
                        type="date"
                        value={rec.issueDate || ""}
                        onChange={e=>setIssue(t.id, e.target.value, t.validityDays)}
                        disabled={empInactive}
                      />
                    </td>
                    <td>
                      <input className="input" type="date" value={expiresAt || ""} readOnly disabled />
                    </td>
                    <td>
                      <Badge kind={badgeKind}>{statusText}</Badge>
                    </td>
                  </tr>
                );
              })}
              {safeTypes.length===0 && (
                <tr><td colSpan="4">Henüz evrak türü tanımlı değil. (Admin &gt; Evrak Takip • Evrak Türleri)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="cardTitleRow">
          <h3>Proje Bazlı Uyarılar</h3>
          <Badge kind={alerts.some(a=>a.level==="danger") ? "danger" : alerts.some(a=>a.level==="warn") ? "warn" : "ok"}>
            {alerts.length} kayıt
          </Badge>
        </div>

        <div className="tableWrap" style={{marginTop:10}}>
          <table>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Evrak</th>
                <th style={{width:140}}>Bitiş</th>
                <th style={{width:140}}>Kalan</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={i}>
                  <td><b>{a.employee}</b></td>
                  <td>{a.doc}</td>
                  <td>{a.expiresAt}</td>
                  <td><Badge kind={a.level === "danger" ? "danger" : "warn"}>{a.left < 0 ? `${Math.abs(a.left)}g geçti` : `${a.left}g`}</Badge></td>
                </tr>
              ))}
              {alerts.length===0 && (
                <tr><td colSpan="4">Şu an yaklaşan / süresi dolmuş evrak yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


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

/* ===================== PUANTAJ GÖRÜNÜMLERİ ===================== */

function AttendanceView({ 
  isAdmin, 
  auth, 
  employees, 
  projects, 
  monthKey, 
  monthDays,
  attendance,
  setAttendanceDay,
  bulkSetAttendance,
  autoMarkWeekends,
  autoMarkHolidays,
  exportAttendanceToExcel
}) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Member kendi projesi için yazabilir, admin hepsini
  const myProjectName = !isAdmin ? (auth?.project || "") : "";

  const projectEmployees = useMemo(() => {
    const list = employees || [];
    if(isAdmin && selectedProject){
      const pName = (projects || []).find(p => p.id === selectedProject)?.name;
      return pName ? list.filter(e => e.project === pName) : list;
    }
    if(!isAdmin && myProjectName){
      return list.filter(e => e.project === myProjectName);
    }
    return list;
  }, [employees, selectedProject, projects, isAdmin, myProjectName]);

  // Seçilen personel bu kullanıcının projesi mi? → yazma izni
  const canEdit = useMemo(() => {
    if(isAdmin) return true;
    if(!selectedEmployee) return false;
    const emp = (employees || []).find(e => e.id === selectedEmployee);
    return emp?.project === myProjectName;
  }, [isAdmin, selectedEmployee, employees, myProjectName]);
  
  const employee = useMemo(() => {
    return (employees || []).find(e => e.id === selectedEmployee) || null;
  }, [employees, selectedEmployee]);
  
  const monthData = useMemo(() => {
    if(!selectedEmployee) return null;
    return attendance?.[selectedEmployee]?.[monthKey] || { days: {}, stats: {} };
  }, [attendance, selectedEmployee, monthKey]);
  
  const [year, month] = monthKey.split("-").map(Number);
  
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="h2">📅 Aylık Puantaj Takibi</div>
          <div className="muted">
            Personel devam durumu ve izin takibi - {monthKey}
            {!isAdmin && myProjectName && <span style={{marginLeft:10, color:"#3b82f6", fontWeight:600}}>• {myProjectName}</span>}
          </div>
        </div>
      </div>
      
      <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10, marginTop:12}}>
        {isAdmin && (
          <div className="field">
            <label>Proje</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
              <option value="">Tüm Projeler</option>
              {(projects || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="field">
          <label>Personel</label>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
            <option value="">Personel Seçin</option>
            {projectEmployees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.title || "Personel"})
              </option>
            ))}
          </select>
        </div>
        
        <div className="field">
          <label>Görünüm</label>
          <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
            <option value="grid">Tablo Görünümü</option>
            <option value="calendar">Takvim Görünümü</option>
            <option value="summary">Özet Rapor</option>
          </select>
        </div>
      </div>
      
      {!selectedEmployee ? (
        <div className="muted" style={{marginTop:20, padding:20, textAlign:"center"}}>
          👆 Yukarıdan personel seçin
        </div>
      ) : (
        <>
          {canEdit && (
            <div className="row" style={{gap:8, marginTop:12, flexWrap:"wrap"}}>
              <button 
                className="btn" 
                onClick={() => autoMarkWeekends(selectedEmployee, monthKey, year, month)}
              >
                🗓️ Hafta Sonlarını İşaretle
              </button>
              <button 
                className="btn" 
                onClick={() => autoMarkHolidays(selectedEmployee, monthKey, year, month)}
              >
                🎉 Resmi Tatilleri İşaretle
              </button>
              <button 
                className="btn primary" 
                onClick={() => exportAttendanceToExcel(selectedEmployee, monthKey)}
              >
                📥 Excel İndir
              </button>
            </div>
          )}
          {!canEdit && (
            <div className="small" style={{marginTop:10, color:"#f59e0b"}}>
              ⚠️ Bu personel başka bir projede — sadece görüntüleme modunda.
            </div>
          )}
          
          {viewMode === "grid" && (
            <AttendanceGridView
              employee={employee}
              monthKey={monthKey}
              monthDays={monthDays}
              monthData={monthData}
              isAdmin={canEdit}
              setAttendanceDay={setAttendanceDay}
            />
          )}
          
          {viewMode === "calendar" && (
            <AttendanceCalendarView
              employee={employee}
              monthKey={monthKey}
              year={year}
              month={month}
              monthDays={monthDays}
              monthData={monthData}
              isAdmin={canEdit}
              setAttendanceDay={setAttendanceDay}
            />
          )}
          
          {viewMode === "summary" && (
            <AttendanceSummaryView
              employee={employee}
              monthKey={monthKey}
              monthData={monthData}
            />
          )}
        </>
      )}
    </div>
  );
}

function AttendanceGridView({ employee, monthKey, monthDays, monthData, isAdmin, setAttendanceDay }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [status, setStatus] = useState("present");
  const [note, setNote] = useState("");
  
  const days = Array.from({ length: monthDays }, (_, i) => i + 1);
  
  function handleSave(){
    if(!selectedDay) return;
    setAttendanceDay(employee.id, monthKey, selectedDay, status, note);
    setSelectedDay(null);
    setStatus("present");
    setNote("");
  }
  
  return (
    <div style={{marginTop:16}}>
      {monthData.stats && (
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:16}}>
          <StatCard label="Çalışma Günü" value={monthData.stats.workDays || 0} color="#10b981" />
          <StatCard label="Geldi" value={monthData.stats.present || 0} color="#3b82f6" />
          <StatCard label="İzin" value={(monthData.stats.paid_leave || 0) + (monthData.stats.sick_leave || 0)} color="#f59e0b" />
          <StatCard label="Gelmedi" value={monthData.stats.absent || 0} color="#ef4444" />
          <StatCard label="Tamamlanma" value={`${monthData.stats.completionRate || 0}%`} color="#8b5cf6" />
        </div>
      )}
      
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:60}}>Gün</th>
              <th style={{width:100}}>Haftanın Günü</th>
              <th>Durum</th>
              <th style={{width:"40%"}}>Not</th>
              {isAdmin && <th style={{width:80}}>İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const dayData = monthData.days?.[day];
              const [year, month] = monthKey.split("-").map(Number);
              const date = new Date(year, month - 1, day);
              const dayName = date.toLocaleDateString("tr-TR", { weekday: "short" });
              
              return (
                <tr key={day} style={{
                  background: dayData?.status ? ATTENDANCE_COLORS[dayData.status] + "15" : "transparent"
                }}>
                  <td style={{fontWeight:600}}>{day}</td>
                  <td className="small">{dayName}</td>
                  <td>
                    {dayData?.status ? (
                      <span className="pill" style={{
                        background: ATTENDANCE_COLORS[dayData.status],
                        color: "#fff"
                      }}>
                        {ATTENDANCE_LABELS[dayData.status]}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td className="small muted">{dayData?.note || "-"}</td>
                  {isAdmin && (
                    <td>
                      <button 
                        className="btn" 
                        onClick={() => {
                          setSelectedDay(day);
                          setStatus(dayData?.status || "present");
                          setNote(dayData?.note || "");
                        }}
                      >
                        Düzenle
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {isAdmin && selectedDay && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 500,
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "2px solid #e5e7eb"
            }}>
              <h3 style={{margin:0}}>{employee.name} - {selectedDay} {monthKey}</h3>
              <button className="btn" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            
            <div className="field">
              <label>Durum</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="field">
              <label>Not / Açıklama</label>
              <textarea 
                value={note} 
                onChange={e => setNote(e.target.value)}
                placeholder="İsteğe bağlı açıklama..."
                rows={3}
              />
            </div>
            
            <div className="row" style={{gap:8, marginTop:16}}>
              <button className="btn primary" onClick={handleSave}>Kaydet</button>
              <button className="btn" onClick={() => setSelectedDay(null)}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceCalendarView({ employee, monthKey, year, month, monthDays, monthData, isAdmin, setAttendanceDay }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [status, setStatus] = useState("present");
  const [note, setNote] = useState("");
  
  const firstDay = new Date(year, month - 1, 1).getDay();
  const calendarDays = [];
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  
  for(let i = 0; i < startOffset; i++){
    calendarDays.push(null);
  }
  
  for(let i = 1; i <= monthDays; i++){
    calendarDays.push(i);
  }
  
  function handleSave(){
    if(!selectedDay) return;
    setAttendanceDay(employee.id, monthKey, selectedDay, status, note);
    setSelectedDay(null);
    setStatus("present");
    setNote("");
  }
  
  return (
    <div style={{marginTop:16}}>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(7, 1fr)",
        gap:8,
        marginBottom:8
      }}>
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
          <div key={d} style={{
            textAlign:"center",
            fontWeight:700,
            fontSize:14,
            color:"#6b7280",
            padding:"8px 0"
          }}>
            {d}
          </div>
        ))}
      </div>
      
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(7, 1fr)",
        gap:8
      }}>
        {calendarDays.map((day, idx) => {
          if(!day) {
            return <div key={`empty-${idx}`} />;
          }
          
          const dayData = monthData.days?.[day];
          const bgColor = dayData?.status ? ATTENDANCE_COLORS[dayData.status] : "#f3f4f6";
          
          return (
            <button
              key={day}
              onClick={() => isAdmin && setSelectedDay(day)}
              style={{
                padding:12,
                borderRadius:12,
                border:"2px solid " + (dayData?.status ? bgColor : "#e5e7eb"),
                background: dayData?.status ? bgColor + "20" : "#fff",
                cursor: isAdmin ? "pointer" : "default",
                textAlign:"center",
                minHeight:80,
                display:"flex",
                flexDirection:"column",
                justifyContent:"space-between"
              }}
            >
              <div style={{fontWeight:700, fontSize:18}}>{day}</div>
              {dayData?.status && (
                <div className="small" style={{
                  color: bgColor,
                  fontWeight:600,
                  marginTop:4
                }}>
                  {ATTENDANCE_LABELS[dayData.status]}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {isAdmin && selectedDay && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            width: "100%",
            maxWidth: 500
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20
            }}>
              <h3 style={{margin:0}}>{employee.name} - {selectedDay} {monthKey}</h3>
              <button className="btn" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            
            <div className="grid" style={{gridTemplateColumns:"repeat(3, 1fr)", gap:8}}>
              {Object.entries(ATTENDANCE_LABELS).slice(0, 6).map(([key, label]) => (
                <button
                  key={key}
                  className="btn"
                  style={{
                    background: status === key ? ATTENDANCE_COLORS[key] : "transparent",
                    color: status === key ? "#fff" : ATTENDANCE_COLORS[key],
                    border: `2px solid ${ATTENDANCE_COLORS[key]}`,
                    fontWeight: status === key ? 700 : 400
                  }}
                  onClick={() => setStatus(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <div className="field" style={{marginTop:12}}>
              <label>Tüm Durumlar</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="field">
              <label>Açıklama / Not</label>
              <textarea 
                value={note} 
                onChange={e => setNote(e.target.value)}
                placeholder="İsteğe bağlı..."
                rows={3}
              />
            </div>
            
            <div className="row" style={{gap:8, marginTop:16}}>
              <button className="btn primary" onClick={handleSave}>Kaydet</button>
              <button className="btn" onClick={() => setSelectedDay(null)}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceSummaryView({ employee, monthKey, monthData }){
  if(!monthData.stats){
    return <div className="muted" style={{marginTop:20}}>İstatistik hesaplanmadı.</div>;
  }
  
  const stats = monthData.stats;
  
  return (
    <div style={{marginTop:16}}>
      <div className="card" style={{background:"#f9fafb"}}>
        <h3>{employee.name} - {monthKey} Özet Raporu</h3>
        
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginTop:16}}>
          <SummaryItem label="Toplam Gün" value={stats.totalDays} />
          <SummaryItem label="Çalışma Günü" value={stats.workDays} color="#10b981" />
          <SummaryItem label="Tam Gün Çalıştı" value={stats.present} color="#3b82f6" />
          <SummaryItem label="Yarım Gün" value={stats.half_day} color="#14b8a6" />
          <SummaryItem label="Ücretli İzin" value={stats.paid_leave} color="#f59e0b" />
          <SummaryItem label="Ücretsiz İzin" value={stats.unpaid_leave} color="#fb923c" />
          <SummaryItem label="Hastalık İzni" value={stats.sick_leave} color="#8b5cf6" />
          <SummaryItem label="Mazeret" value={stats.excuse} color="#6366f1" />
          <SummaryItem label="Hafta Sonu" value={stats.weekend} color="#6b7280" />
          <SummaryItem label="Resmi Tatil" value={stats.holiday} color="#ec4899" />
          <SummaryItem label="Gelmedi" value={stats.absent} color="#ef4444" />
          <SummaryItem label="Girilmemiş" value={stats.unset} color="#9ca3af" />
        </div>
        
        <div style={{marginTop:20, padding:16, background:"#fff", borderRadius:12}}>
          <div style={{fontSize:18, fontWeight:700, marginBottom:8}}>
            Tamamlanma Oranı
          </div>
          <div style={{
            height:40,
            background:"#e5e7eb",
            borderRadius:999,
            overflow:"hidden",
            position:"relative"
          }}>
            <div style={{
              height:"100%",
              width: stats.completionRate + "%",
              background:"linear-gradient(90deg, #10b981, #3b82f6)",
              transition:"width 0.3s ease"
            }} />
            <div style={{
              position:"absolute",
              inset:0,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontWeight:700,
              color:"#1f2937"
            }}>
              {stats.completionRate}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }){
  return (
    <div style={{
      padding:16,
      background:"#fff",
      borderRadius:12,
      border:"2px solid " + (color ? color + "20" : "#e5e7eb")
    }}>
      <div style={{
        fontSize:28,
        fontWeight:800,
        color: color || "#1f2937"
      }}>
        {value}
      </div>
      <div className="small muted" style={{marginTop:4}}>{label}</div>
    </div>
  );
}

function StatCard({ label, value, color }){
  return (
    <div style={{
      padding:"12px 16px",
      borderRadius:12,
      border:`2px solid ${color}20`,
      background:`${color}08`,
      textAlign:"center"
    }}>
      <div style={{fontSize:24, fontWeight:800, color}}>{value}</div>
      <div className="small muted">{label}</div>
    </div>
  );
}

// Simple ErrorBoundary to avoid blank screen on runtime errors

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