import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const fl = document.createElement("link");
fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap";
document.head.appendChild(fl);

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
const fmtTime = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;
const fmtMoney = n => `${Number(n).toFixed(2)} ₪`;
const fmtMoneyShort = n => n >= 1000 ? `${(n/1000).toFixed(1)}K ₪` : `${Math.round(n)} ₪`;
const fmtDate = d => new Date(d).toLocaleDateString("ru-RU", {day:"2-digit",month:"short",year:"numeric"});
const fmtDateShort = d => new Date(d).toLocaleDateString("ru-RU", {day:"2-digit",month:"short"});
const DAY_NAMES = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const dayName = d => DAY_NAMES[new Date(d).getDay()];
const isShabat = d => new Date(d).getDay() === 6;
const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
const toDateStr = d => { const dd = new Date(d); return `${dd.getFullYear()}-${pad(dd.getMonth()+1)}-${pad(dd.getDate())}`; };
const nowLocal = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

// All massage types — enabled state managed in settings
const ALL_TYPES = ["Классический","Расслабляющий","Лечебный","Спортивный","Антицеллюлитный","Глубокий тканевый"];
const DEFAULT_ENABLED_TYPES = ["Классический"];

const CLIENTS = ["Нили К.","Яэль С.","Ория Р.","Тали Н.","Шира В.","Ноа П.","Дана Ж.","Эран Ч.","Йони Б.","Гали Е."];

// ── DEMO DATA ─────────────────────────────────────────────────────────────────
function genSessions(rates, enabledTypes) {
  const sessions = [];
  const now = new Date();
  const start = new Date(now); start.setMonth(start.getMonth() - 3);
  let id = 1;
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d);
    const dow = d.getDay();
    if (dow === 6) continue;
    if (Math.random() < 0.28) continue;
    const cnt = Math.random() < 0.4 ? 1 : Math.random() < 0.7 ? 2 : 3;
    let hour = 9 + Math.floor(Math.random() * 3);
    for (let s = 0; s < cnt; s++) {
      const dur = 30 + Math.floor(Math.random() * 80);
      const startT = new Date(d); startT.setHours(hour, Math.floor(Math.random() * 60), 0);
      const endT = new Date(startT.getTime() + dur * 60000);
      const isWknd = isShabat(ds);
      const isHol = false;
      const rate = isHol ? rates.holiday : isWknd ? rates.weekend : rates.weekday;
      const types = enabledTypes.length ? enabledTypes : ALL_TYPES;
      sessions.push({
        id: id++, startTime: startT.toISOString(), endTime: endT.toISOString(),
        duration: dur, client: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
        type: types[Math.floor(Math.random() * types.length)], note: "", rate,
        earned: +(dur * rate).toFixed(2), isHoliday: isHol, isWeekend: isWknd
      });
      hour += Math.ceil(dur / 60) + 1; if (hour > 20) break;
    }
  }
  return sessions;
}

// ── ICONS ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size=20, color="currentColor", fill="none", sw=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IC = {
  play: "M5 3l14 9-14 9V3z", stop: "M6 6h12v12H6z", plus: "M12 5v14M5 12h14",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  history: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  close: "M18 6L6 18M6 6l12 12",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  prev: "M15 18l-6-6 6-6", next: "M9 18l6-6-6-6",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  holiday: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check: "M20 6L9 17l-5-5",
};

// ── PDF BUILDER ───────────────────────────────────────────────────────────────
function buildReportHTML(sessions, label, rates, showClient) {
  const total = sessions.reduce((a, s) => a + s.earned, 0);
  const mins = sessions.reduce((a, s) => a + s.duration, 0);
  const wd = sessions.filter(s => !s.isWeekend && !s.isHoliday);
  const we = sessions.filter(s => s.isWeekend && !s.isHoliday);
  const hol = sessions.filter(s => s.isHoliday);
  const rows = sessions.map((s, i) => `
    <tr style="background:${i%2===0?"#fff":"#f8fafc"}">
      <td>${fmtDate(s.startTime)}</td>
      <td>${dayName(s.startTime)}</td>
      <td>${new Date(s.startTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}–${new Date(s.endTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</td>
      ${showClient ? `<td>${s.client}</td>` : ""}
      <td>${s.type}</td>
      <td>${s.duration} мин</td>
      <td>${s.isHoliday ? "🎉 Праздник" : s.isWeekend ? "✡️ Суббота" : "📅 Будни"}</td>
      <td style="font-weight:700;color:#1a8a60">${fmtMoney(s.earned)}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>МассажПро — ${label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',Arial,sans-serif;background:#f0f4f8;padding:28px 20px}
  .page{max-width:860px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
  .top{background:linear-gradient(135deg,#0d2137,#1a3d5c);padding:26px 30px;display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:21px;font-weight:700;color:#4ecca3}.period{color:rgba(255,255,255,.55);font-size:13px;margin-top:4px}
  .tbox{text-align:right}.tlbl{font-size:11px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:1px}
  .tamt{font-size:36px;font-weight:700;color:#4ecca3;line-height:1.1}
  .body{padding:26px 30px}
  h2{font-size:12px;font-weight:700;color:#2d72c8;text-transform:uppercase;letter-spacing:.8px;margin:18px 0 11px;border-bottom:2px solid #e8f0fb;padding-bottom:5px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:4px}
  .sbox{border-radius:9px;padding:13px;border-left:4px solid #4ecca3;background:#f0fdf8}
  .sbox.w{border-left-color:#f0c060;background:#fffdf0}.sbox.h{border-left-color:#ff6b6b;background:#fff5f5}
  .sv{font-size:19px;font-weight:700}.sl{font-size:11px;color:#888;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{background:#1a3d5c;color:#fff;padding:9px 10px;text-align:left;font-weight:600}
  td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
  .foot{text-align:center;padding:16px;font-size:11px;color:#aaa;border-top:1px solid #eee;margin-top:4px}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style></head><body><div class="page">
  <div class="top">
    <div><div class="logo">💆 МассажПро</div>
    <div class="period">Период: <strong style="color:#fff">${label}</strong></div>
    <div class="period" style="margin-top:2px">Дата: ${fmtDate(new Date())}</div></div>
    <div class="tbox"><div class="tlbl">К выплате</div><div class="tamt">${fmtMoney(total)}</div>
    <div style="color:rgba(255,255,255,.45);font-size:12px;margin-top:4px">${sessions.length} сеансов · ${Math.floor(mins/60)}ч ${mins%60}м</div></div>
  </div>
  <div class="body">
    <h2>Сводка</h2>
    <div class="grid">
      <div class="sbox"><div class="sv">${fmtMoney(wd.reduce((a,s)=>a+s.earned,0))}</div><div class="sl">📅 Будние дни · ${wd.length} сеансов · ${rates.weekday}₪/мин</div></div>
      <div class="sbox w"><div class="sv">${fmtMoney(we.reduce((a,s)=>a+s.earned,0))}</div><div class="sl">✡️ Суббота · ${we.length} сеансов · ${rates.weekend}₪/мин</div></div>
      <div class="sbox h"><div class="sv">${fmtMoney(hol.reduce((a,s)=>a+s.earned,0))}</div><div class="sl">🎉 Праздник · ${hol.length} сеансов · ${rates.holiday}₪/мин</div></div>
    </div>
    <div class="grid" style="margin-top:10px">
      <div class="sbox"><div class="sv">${sessions.length}</div><div class="sl">Всего сеансов</div></div>
      <div class="sbox"><div class="sv">${Math.floor(mins/60)}ч ${mins%60}м</div><div class="sl">Рабочее время</div></div>
      <div class="sbox"><div class="sv">${sessions.length ? fmtMoney(total/sessions.length) : "0 ₪"}</div><div class="sl">Средний чек</div></div>
    </div>
    <h2>Все сеансы (${sessions.length})</h2>
    <table><thead><tr>
      <th>Дата</th><th>День</th><th>Время</th>${showClient?"<th>Клиент</th>":""}
      <th>Тип</th><th>Длит.</th><th>Статус</th><th>Заработок</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="foot">МассажПро · Автоматический ежемесячный отчёт · ${new Date().getFullYear()}</div>
</div></body></html>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  html{-webkit-text-size-adjust:100%;touch-action:manipulation}
  body{background:#0a0f1e}
  body{-webkit-tap-highlight-color:transparent}
  :root{
    --bg:#0a0f1e;--bg2:#111827;--bg3:#1a2235;--bg4:#232d42;
    --accent:#4ecca3;--accent2:#38b48b;--gold:#f0c060;--red:#ff6b6b;
    --text:#e8edf5;--text2:#8a99b3;--text3:#5a6a85;
    --border:rgba(78,204,163,0.15);--border2:rgba(255,255,255,0.06);
    --card:rgba(26,34,53,0.85);
    --fh:'Cormorant Garamond',serif;--fb:'DM Sans',sans-serif;
  }
  .app{font-family:var(--fb);background:var(--bg);min-height:100vh;color:var(--text);display:flex;flex-direction:column;max-width:480px;margin:0 auto;position:relative}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--accent2);border-radius:4px}
  .hdr{padding:14px 20px 10px;background:linear-gradient(180deg,rgba(10,15,30,.98) 0%,rgba(10,15,30,0) 100%);position:sticky;top:0;z-index:100;backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:space-between}
  .hdr-title{font-family:var(--fh);font-size:22px;font-weight:700;color:var(--accent)}
  .hdr-sub{font-size:11px;color:var(--text3);margin-top:1px}
  .nav{display:flex;background:rgba(17,24,39,.97);border-top:1px solid var(--border2);padding:8px 4px 12px;position:sticky;bottom:0;z-index:100;backdrop-filter:blur(16px)}
  .ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:5px 2px;border-radius:10px;transition:all .2s}
  .ni:hover{background:rgba(78,204,163,.07)}
  .ni-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;color:var(--text3)}
  .ni.on .ni-icon{color:var(--accent);background:rgba(78,204,163,.15)}
  .ni-label{font-size:9.5px;color:var(--text3);font-weight:500}
  .ni.on .ni-label{color:var(--accent)}
  .content{flex:1;overflow-y:auto;padding:0 16px 16px}
  .content{-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}
  .card{background:var(--card);border:1px solid var(--border2);border-radius:20px;padding:18px;margin-bottom:13px;backdrop-filter:blur(8px)}
  .csm{padding:13px 15px;border-radius:15px}
  .cglow{box-shadow:0 0 40px rgba(78,204,163,.08),0 8px 28px rgba(0,0,0,.4)}
  .cacc{border-color:rgba(78,204,163,.3);background:linear-gradient(135deg,rgba(78,204,163,.08),rgba(26,34,53,.9))}
  .cgold{border-color:rgba(240,192,96,.3);background:linear-gradient(135deg,rgba(240,192,96,.06),rgba(26,34,53,.9))}
  .btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:13px;font-family:var(--fb);font-weight:600;cursor:pointer;transition:all .2s;font-size:14px}
  .bprim{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#0a0f1e;padding:13px 24px;border-radius:15px;width:100%;justify-content:center;box-shadow:0 4px 18px rgba(78,204,163,.28)}
  .bprim:hover{transform:translateY(-1px)}
  .bdang{background:linear-gradient(135deg,#ff6b6b,#e05555);color:#fff;padding:13px 24px;border-radius:15px;width:100%;justify-content:center}
  .bgold{background:linear-gradient(135deg,var(--gold),#c89020);color:#0a0f1e;padding:11px 16px;border-radius:12px;width:100%;justify-content:space-between}
  .bgold:hover{transform:translateY(-1px)}
  .boutl{background:transparent;border:1px solid var(--border);color:var(--text2);padding:9px 16px;font-size:13px}
  .boutl:hover{border-color:var(--accent);color:var(--accent)}
  .bicon{background:var(--bg3);border:1px solid var(--border2);color:var(--text2);width:34px;height:34px;padding:0;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
  .bicon:hover{border-color:var(--accent);color:var(--accent)}
  .biconsm{background:var(--bg3);border:1px solid var(--border2);width:28px;height:28px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
  .lbl{font-size:11px;color:var(--text3);margin-bottom:5px;font-weight:600;letter-spacing:.6px;text-transform:uppercase}
  .inp{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:11px;padding:11px 13px;color:var(--text);font-family:var(--fb);font-size:14px;outline:none;transition:border-color .2s}
  .inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(78,204,163,.1)}
  .inp::placeholder{color:var(--text3)}
  select.inp{cursor:pointer}
  .r2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
  .r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:13px}
  .srow{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:13px}
  .sc{background:var(--card);border:1px solid var(--border2);border-radius:15px;padding:13px}
  .sv{font-family:var(--fh);font-size:24px;font-weight:700;color:var(--text);line-height:1.1}
  .svsm{font-family:var(--fh);font-size:18px;font-weight:700;color:var(--text)}
  .sl{font-size:11px;color:var(--text3);margin-top:2px;font-weight:500}
  .ca{color:var(--accent)}.cg{color:var(--gold)}.cr{color:var(--red)}
  .si{display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--border2);cursor:pointer;transition:opacity .15s}
  .si:hover{opacity:.8}.si:last-child{border-bottom:none}
  .sdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .sinfo{flex:1;min-width:0}
  .stitle{font-size:14px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .smeta{font-size:12px;color:var(--text3);margin-top:2px}
  .sright{text-align:right;flex-shrink:0}
  .searn{font-family:var(--fh);font-size:16px;font-weight:700;color:var(--accent)}
  .sdur{font-size:12px;color:var(--text3);margin-top:1px}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
  .bgg{background:rgba(78,204,163,.15);color:var(--accent)}
  .bggold{background:rgba(240,192,96,.15);color:var(--gold)}
  .bgr{background:rgba(255,107,107,.15);color:var(--red)}
  .sech{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
  .sect{font-family:var(--fh);font-size:18px;font-weight:600;color:var(--text)}
  .secsm{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:11px}
  .dh{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px;padding:5px 0 3px;display:flex;justify-content:space-between}
  /* OVERLAY / MODAL */
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(5px)}
  .modal{background:var(--bg2);border-radius:22px 22px 0 0;padding:22px 18px 30px;width:100%;max-width:480px;border-top:1px solid var(--border);max-height:90vh;overflow-y:auto}
  .mh{width:38px;height:4px;background:var(--bg4);border-radius:4px;margin:0 auto 18px}
  .mt{font-family:var(--fh);font-size:21px;font-weight:700;color:var(--text);margin-bottom:18px}
  /* HOLIDAY CONFIRM DIALOG — centered */
  .hol-ov{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)}
  .hol-box{background:var(--bg2);border:1px solid rgba(240,192,96,.3);border-radius:24px;padding:28px 24px;width:100%;max-width:360px;text-align:center;box-shadow:0 0 60px rgba(240,192,96,.12)}
  .hol-icon{font-size:48px;margin-bottom:16px;display:block}
  .hol-title{font-family:var(--fh);font-size:24px;font-weight:700;color:var(--gold);margin-bottom:10px}
  .hol-sub{font-size:14px;color:var(--text2);line-height:1.5;margin-bottom:24px}
  .hol-rate{font-size:13px;color:var(--text3);margin-bottom:24px;padding:10px 14px;background:rgba(240,192,96,.07);border:1px solid rgba(240,192,96,.2);border-radius:11px}
  .hol-btns{display:flex;gap:12px}
  .hol-yes{flex:1;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--gold),#c89020);color:#0a0f1e;font-family:var(--fb);font-size:15px;font-weight:700;cursor:pointer;transition:all .2s}
  .hol-yes:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(240,192,96,.35)}
  .hol-no{flex:1;padding:14px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text2);font-family:var(--fb);font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}
  .hol-no:hover{border-color:var(--accent);color:var(--accent)}
  /* PDF VIEWER */
  .pdf-ov{position:fixed;inset:0;background:#0a0f1e;z-index:300;display:flex;flex-direction:column}
  .pdf-bar{display:flex;align-items:center;gap:10px;padding:11px 15px;background:rgba(17,24,39,.98);border-bottom:1px solid var(--border2);flex-shrink:0}
  .pdf-title{font-family:var(--fh);font-size:16px;font-weight:700;color:var(--accent);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pdf-frame{flex:1;width:100%;border:none;background:#f0f4f8}
  /* TOGGLE */
  .togw{display:flex;background:var(--bg3);border-radius:11px;padding:3px;gap:3px;margin-bottom:13px}
  .tog{flex:1;text-align:center;padding:7px 4px;border-radius:9px;font-size:12px;font-weight:500;cursor:pointer;color:var(--text3);transition:all .2s}
  .tog.on{background:var(--accent);color:#0a0f1e;font-weight:700}
  /* RATE CARD */
  .rcard{display:flex;align-items:center;justify-content:space-between;background:var(--bg3);border:1px solid var(--border2);border-radius:13px;padding:13px 15px;margin-bottom:9px}
  .rinp{width:80px;background:var(--bg4);border:1px solid var(--border);border-radius:9px;padding:7px 9px;color:var(--text);font-family:var(--fb);font-size:15px;font-weight:700;text-align:right;outline:none}
  .rinp:focus{border-color:var(--accent)}
  /* TYPE TOGGLE ITEM */
  .type-item{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border2)}
  .type-item:last-child{border-bottom:none}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .pulse{animation:pulse 2s ease-in-out infinite}
  .adot{width:8px;height:8px;background:var(--accent);border-radius:50%;animation:pulse 1.5s ease-in-out infinite}
  .ct{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:7px 11px;font-family:var(--fb);font-size:12px}
  .divl{height:1px;background:var(--border2);margin:13px 0}
  .empty{text-align:center;padding:34px 18px;color:var(--text3)}
  .salrow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border2)}
  .salrow:last-child{border-bottom:none}
  .saltot{font-family:var(--fh);font-size:30px;font-weight:700;color:var(--accent)}
  .setitem{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--border2)}
  .setitem:last-child{border-bottom:none}
  .sw{position:relative;width:44px;height:24px}
  .sw input{opacity:0;width:0;height:0}
  .swsl{position:absolute;cursor:pointer;inset:0;background:var(--bg4);border-radius:24px;transition:.3s}
  .swsl:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:var(--text3);border-radius:50%;transition:.3s}
  input:checked+.swsl{background:var(--accent)}
  input:checked+.swsl:before{transform:translateX(20px);background:#0a0f1e}
  .bgglow2{position:fixed;top:-100px;left:50%;transform:translateX(-50%);width:300px;height:300px;background:radial-gradient(circle,rgba(78,204,163,.05) 0%,transparent 70%);pointer-events:none;z-index:0}
  .content,.nav,.hdr{position:relative;z-index:1}
  .fade{animation:fi .3s ease}
  @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .prog{height:5px;background:var(--bg4);border-radius:5px;overflow:hidden;margin-top:5px}
  .progf{height:100%;border-radius:5px;transition:width .6s}
  .range-hint{background:rgba(78,204,163,.07);border:1px solid rgba(78,204,163,.18);border-radius:11px;padding:9px 13px;margin-bottom:11px;font-size:13px;color:var(--text2)}
  /* CALENDAR */
  .cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .cal-month{font-family:var(--fh);font-size:16px;font-weight:700;color:var(--text)}
  .cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:5px}
  .cal-dn{text-align:center;font-size:10px;font-weight:700;color:var(--text3);padding:2px 0}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .cd{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:7px;cursor:pointer;transition:all .12s;font-size:11px;font-weight:500;border:1px solid transparent}
  .ni,.btn,.si,.tog,.cd,.hol-yes,.hol-no,.bicon,.biconsm{touch-action:manipulation}
  .cd:hover{background:rgba(78,204,163,.1)}
  .cd.has{background:rgba(78,204,163,.09);border-color:rgba(78,204,163,.2)}
  .cd.sel{background:var(--accent)!important;border-color:var(--accent)!important;color:#0a0f1e!important;font-weight:800}
  .cd.inr{background:rgba(78,204,163,.14);border-color:rgba(78,204,163,.22)}
  .cd.rse,.cd.ren{background:var(--accent)!important;color:#0a0f1e!important;font-weight:800}
  .cd.tod:not(.sel):not(.rse):not(.ren){border-color:rgba(240,192,96,.6)}
  .cd.shab{color:var(--gold)}
  .cd.emp{cursor:default}
  .cdot{width:4px;height:4px;border-radius:50%;margin-top:1px}
`;

// ── CHART TOOLTIP ─────────────────────────────────────────────────────────────
const CTT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="ct"><div style={{color:"var(--text3)",marginBottom:2}}>{label}</div><div style={{color:"var(--accent)",fontWeight:600}}>{fmtMoneyShort(payload[0].value)}</div></div>;
};

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function Calendar({ sessions, selectedDay, onSelectDay, rangeStart, rangeEnd, onRangeSelect, mode }) {
  const [viewDate, setViewDate] = useState(new Date());
  const y = viewDate.getFullYear(); const m = viewDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todStr = toDateStr(new Date());
  const byDay = {};
  sessions.forEach(s => { const k = toDateStr(s.startTime); if (!byDay[k]) byDay[k] = []; byDay[k].push(s); });
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const isInRange = ds => rangeStart && rangeEnd && ds >= rangeStart && ds <= rangeEnd;

  return (
    <div>
      <div className="cal-nav">
        <button className="biconsm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>
          <Icon d={IC.prev} size={13} color="var(--text2)" /></button>
        <div className="cal-month">{MONTHS_RU[m]} {y}</div>
        <button className="biconsm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>
          <Icon d={IC.next} size={13} color="var(--text2)" /></button>
      </div>
      <div className="cal-dow">
        {["Вс","Пн","Вт","Ср","Чт","Пт","Сб"].map((d, i) => (
          <div key={d} className="cal-dn" style={{color: i===6 ? "var(--gold)" : i===0 ? "var(--text2)" : ""}}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className="cd emp" />;
          const ds = `${y}-${pad(m+1)}-${pad(day)}`;
          const daySess = byDay[ds] || [];
          const isSat = new Date(ds).getDay() === 6;
          const isSel = mode === "day" ? selectedDay === ds : (ds === rangeStart || ds === rangeEnd);
          const inR = mode === "range" && isInRange(ds) && ds !== rangeStart && ds !== rangeEnd;
          const isToday = ds === todStr;
          return (
            <div key={day}
              className={`cd ${daySess.length?"has":""} ${isSel?"sel":""} ${inR?"inr":""} ${isToday&&!isSel?"tod":""} ${isSat&&!isSel?"shab":""}`}
              onClick={() => mode === "day" ? onSelectDay(ds) : onRangeSelect(ds)}>
              <span>{day}</span>
              {daySess.length > 0 && <div className="cdot" style={{background: isSel?"#0a0f1e": isSat?"#f0c060":"#4ecca3"}} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const [rates, setRates] = useState({ weekday: 18, weekend: 27, holiday: 35 });
  const [showClient, setShowClient] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState(DEFAULT_ENABLED_TYPES);
  const [reportEmail, setReportEmail] = useState("");
  const [sessions, setSessions] = useState(() => genSessions({weekday:18,weekend:27,holiday:35}, DEFAULT_ENABLED_TYPES));
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [modal, setModal] = useState(null); // 'add'|'detail'|'pdf'|'holiday'
  const [selSess, setSelSess] = useState(null);
  const [salPeriod, setSalPeriod] = useState("month");
  const [histMode, setHistMode] = useState("day");
  const [selDay, setSelDay] = useState(toDateStr(new Date()));
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [rangeStep, setRangeStep] = useState(0);
  const [form, setForm] = useState({ client:"", type:"Классический", note:"", startTime:"", endTime:"" });
  const [pdfContent, setPdfContent] = useState("");
  const [pdfLabel, setPdfLabel] = useState("");
  // Holiday override: { date: "YYYY-MM-DD", isHoliday: bool }
  const [holidayOverride, setHolidayOverride] = useState(null);
  const nextId = useRef(sessions.length + 1);
  const iframeRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(active.startTime)) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [active]);

  // Write to iframe when PDF modal opens
  useEffect(() => {
    if (modal === "pdf" && iframeRef.current && pdfContent) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open(); doc.write(pdfContent); doc.close();
    }
  }, [modal, pdfContent]);

  const todStr = toDateStr(new Date());
  const todDow = new Date().getDay(); // 0=Sun, 6=Sat

  // Determine today's rate considering holiday override
  const getTodayIsHoliday = useCallback(() => {
    if (holidayOverride && holidayOverride.date === todStr) return holidayOverride.isHoliday;
    return false;
  }, [holidayOverride, todStr]);

  const getRate = useCallback((ds, forceHoliday) => {
    const isSat = isShabat(ds);
    const isHol = forceHoliday !== undefined ? forceHoliday : (holidayOverride && holidayOverride.date === ds ? holidayOverride.isHoliday : false);
    const rate = isHol ? rates.holiday : isSat ? rates.weekend : rates.weekday;
    return { rate, isHoliday: isHol, isWeekend: isSat };
  }, [rates, holidayOverride]);

  const todIsHoliday = getTodayIsHoliday();
  const todIsShabbat = todDow === 6;
  const { rate: curRate } = getRate(todStr);
  const liveEarned = active ? +(Math.floor(elapsed / 60) * curRate).toFixed(2) : 0;

  // Active type options
  const activeTypes = enabledTypes.length ? enabledTypes : ["Классический"];

  // Called when user presses "Start"
  const handleStartPress = () => {
    // Check if today is already overridden or is Shabbat
    if (todIsShabbat) {
      // Shabbat is automatically recognized, no need to ask
      doStartSession(false);
      return;
    }
    if (holidayOverride && holidayOverride.date === todStr) {
      // Already answered today
      doStartSession(holidayOverride.isHoliday);
      return;
    }
    // Ask the user
    setModal("holiday");
  };

  const doStartSession = (isHolidayRate) => {
    setActive({
      startTime: new Date().toISOString(),
      client: form.client,
      type: form.type,
      note: form.note,
      forceHoliday: isHolidayRate
    });
    setElapsed(0);
  };

  const handleHolidayAnswer = (yes) => {
    // Save override for today
    setHolidayOverride({ date: todStr, isHoliday: yes });
    setModal(null);
    doStartSession(yes);
  };

  const stopSess = () => {
    if (!active) return;
    const et = new Date().toISOString();
    const dur = minutesBetween(active.startTime, et);
    const ds = toDateStr(active.startTime);
    const { rate, isHoliday, isWeekend: iw } = getRate(ds, active.forceHoliday);
    setSessions(s => [{
      id: nextId.current++, startTime: active.startTime, endTime: et,
      duration: Math.max(dur, 1), client: active.client || "Клиент",
      type: active.type, note: active.note || "", rate,
      earned: +(Math.max(dur, 1) * rate).toFixed(2), isHoliday, isWeekend: iw
    }, ...s]);
    setActive(null); setElapsed(0);
    setForm({ client:"", type: activeTypes[0] || "Классический", note:"", startTime:"", endTime:"" });
  };

  const addManual = () => {
    if (!form.startTime || !form.endTime) return;
    const dur = minutesBetween(form.startTime, form.endTime);
    if (dur <= 0) return;
    const ds = toDateStr(form.startTime);
    const { rate, isHoliday, isWeekend: iw } = getRate(ds);
    setSessions(s => [{
      id: nextId.current++, startTime: form.startTime, endTime: form.endTime,
      duration: dur, client: form.client || "Клиент", type: form.type, note: form.note,
      rate, earned: +(dur * rate).toFixed(2), isHoliday, isWeekend: iw
    }, ...s].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
    setModal(null);
    setForm({ client:"", type: activeTypes[0] || "Классический", note:"", startTime:"", endTime:"" });
  };

  const delSess = id => { setSessions(s => s.filter(x => x.id !== id)); setModal(null); setSelSess(null); };

  const handleRange = ds => {
    if (rangeStep === 0) { setRangeStart(ds); setRangeEnd(null); setRangeStep(1); }
    else { if (ds < rangeStart) { setRangeEnd(rangeStart); setRangeStart(ds); } else setRangeEnd(ds); setRangeStep(0); }
  };

  const openPDF = (offset) => {
    const d = new Date(); d.setMonth(d.getMonth() - offset);
    const y = d.getFullYear(); const mo = d.getMonth();
    const label = `${MONTHS_RU[mo]} ${y}`;
    const ms = sessions.filter(s => { const sd = new Date(s.startTime); return sd.getFullYear() === y && sd.getMonth() === mo; });
    setPdfContent(buildReportHTML(ms, label, rates, showClient));
    setPdfLabel(label); setModal("pdf");
  };

  const sendEmail = (offset) => {
    if (!reportEmail) { alert("Укажите email в настройках"); return; }
    const d = new Date(); d.setMonth(d.getMonth() - offset);
    const y = d.getFullYear(); const mo = d.getMonth();
    const label = `${MONTHS_RU[mo]} ${y}`;
    const ms = sessions.filter(s => { const sd = new Date(s.startTime); return sd.getFullYear() === y && sd.getMonth() === mo; });
    const total = ms.reduce((a, s) => a + s.earned, 0);
    const mins = ms.reduce((a, s) => a + s.duration, 0);
    const subj = encodeURIComponent(`МассажПро — Отчёт ${label}`);
    const body = encodeURIComponent(
      `Отчёт МассажПро за ${label}\n\n` +
      `К выплате: ${fmtMoney(total)}\n` +
      `Сеансов: ${ms.length}\n` +
      `Рабочее время: ${Math.floor(mins/60)}ч ${mins%60}м\n\n` +
      `Будние дни: ${fmtMoney(ms.filter(s=>!s.isWeekend&&!s.isHoliday).reduce((a,s)=>a+s.earned,0))}\n` +
      `Суббота: ${fmtMoney(ms.filter(s=>s.isWeekend).reduce((a,s)=>a+s.earned,0))}\n` +
      `Праздники: ${fmtMoney(ms.filter(s=>s.isHoliday).reduce((a,s)=>a+s.earned,0))}`
    );
    window.location.href = `mailto:${reportEmail}?subject=${subj}&body=${body}`;
  };

  const printPDF = () => { if (iframeRef.current) iframeRef.current.contentWindow.print(); };

  const getPeriodStart = p => { const d = new Date(); if (p==="week") d.setDate(d.getDate()-7); else if (p==="month") d.setMonth(d.getMonth()-1); else d.setMonth(d.getMonth()-3); return d; };

  const histSess = () => {
    if (histMode === "day") return sessions.filter(s => toDateStr(s.startTime) === selDay);
    if (histMode === "range" && rangeStart && rangeEnd) return sessions.filter(s => { const d = toDateStr(s.startTime); return d >= rangeStart && d <= rangeEnd; });
    return [];
  };
  const hs = histSess();

  const salSess = sessions.filter(s => new Date(s.startTime) >= getPeriodStart(salPeriod));
  const salTotal = salSess.reduce((a, s) => a + s.earned, 0);
  const salMins = salSess.reduce((a, s) => a + s.duration, 0);
  const salBreak = [
    { l:"Будние дни", col:"var(--accent)", f: s=>!s.isWeekend&&!s.isHoliday, rate: rates.weekday },
    { l:"Суббота (שבת)", col:"var(--gold)", f: s=>s.isWeekend&&!s.isHoliday, rate: rates.weekend },
    { l:"Праздники", col:"var(--red)", f: s=>s.isHoliday, rate: rates.holiday },
  ].map(r => { const g = salSess.filter(r.f); return { ...r, cnt: g.length, mins: g.reduce((a,s)=>a+s.duration,0), earned: g.reduce((a,s)=>a+s.earned,0) }; }).filter(r => r.mins > 0);

  const todSess = sessions.filter(s => toDateStr(s.startTime) === todStr);
  const todEarned = todSess.reduce((a, s) => a + s.earned, 0);
  const todMins = todSess.reduce((a, s) => a + s.duration, 0);

  const statSess = sessions.filter(s => new Date(s.startTime) >= getPeriodStart("month"));
  const statTotal = statSess.reduce((a, s) => a + s.earned, 0);
  const statMins = statSess.reduce((a, s) => a + s.duration, 0);
  const chartData = (() => { const m = {}; statSess.forEach(s => { const k = fmtDateShort(s.startTime); m[k] = (m[k]||0) + s.earned; }); return Object.entries(m).slice(-18).map(([date, earned]) => ({date, earned: +earned.toFixed(0)})); })();
  const PIE_C = ["#4ecca3","#f0c060","#ff6b6b","#9b59b6","#ff9a3c","#3498db"];
  const typeData = (() => { const m = {}; statSess.forEach(s => { m[s.type] = (m[s.type]||0) + s.earned; }); return Object.entries(m).map(([name, value]) => ({name, value: +value.toFixed(0)})); })();

  const dotC = s => s.isHoliday ? "var(--red)" : s.isWeekend ? "var(--gold)" : "var(--accent)";
  const badge = s => {
    if (s.isHoliday) return <span className="badge bgr">🎉 Праздник</span>;
    if (s.isWeekend) return <span className="badge bggold">✡️ שבת</span>;
    return <span className="badge bgg">Будни</span>;
  };
  const groupDay = arr => { const m = {}; arr.forEach(s => { const k = toDateStr(s.startTime); if (!m[k]) m[k]=[]; m[k].push(s); }); return Object.entries(m).sort((a,b) => new Date(b[0])-new Date(a[0])); };

  const TABS = [
    { id:"home", label:"Главная", icon:IC.home },
    { id:"history", label:"История", icon:IC.history },
    { id:"stats", label:"Анализ", icon:IC.chart },
    { id:"salary", label:"Зарплата", icon:IC.money },
    { id:"settings", label:"Настройки", icon:IC.settings },
  ];

  // Header status label
  const todayLabel = todIsHoliday ? "🎉 Праздник" : todIsShabbat ? "✡️ שבת Суббота" : "💼 Будни";

  return (<>
    <style>{css}</style>
    <div className="app">
      <div className="bgglow2" />

      {/* HEADER */}
      <div className="hdr">
        <div>
          <div className="hdr-title">💆 МассажПро</div>
          <div className="hdr-sub">{fmtDate(new Date())}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {active ? (
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(78,204,163,.12)",border:"1px solid rgba(78,204,163,.3)",borderRadius:20,padding:"5px 11px"}}>
              <div className="adot" /><span style={{fontSize:12,color:"var(--accent)",fontWeight:600}}>Сеанс</span>
            </div>
          ) : (
            <div style={{background:"rgba(78,204,163,.1)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 11px",fontSize:12,color:"var(--accent)"}}>
              {todayLabel}
            </div>
          )}
        </div>
      </div>

      <div className="content">
        <div className="fade" key={tab}>

          {/* ══════════════════════════════ HOME ══════════════════════════════ */}
          {tab === "home" && (<>
            <div className="srow">
              <div className="sc cacc">
                <div className="sl">Сегодня заработано</div>
                <div className="sv ca" style={{fontSize:21}}>{fmtMoneyShort(todEarned + liveEarned)}</div>
                {liveEarned > 0 && <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>+{fmtMoney(liveEarned)}...</div>}
              </div>
              <div className="sc">
                <div className="sl">Клиентов сегодня</div>
                <div className="sv">{todSess.length + (active ? 1 : 0)}</div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{Math.floor(todMins/60)}ч {todMins%60}м</div>
              </div>
            </div>

            {/* Holiday override info */}
            {holidayOverride && holidayOverride.date === todStr && (
              <div style={{marginBottom:13,padding:"10px 14px",background:holidayOverride.isHoliday?"rgba(255,107,107,.08)":"rgba(78,204,163,.06)",border:`1px solid ${holidayOverride.isHoliday?"rgba(255,107,107,.25)":"rgba(78,204,163,.2)"}`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13}}>
                <span style={{color:"var(--text2)"}}>
                  {holidayOverride.isHoliday ? "🎉 Сегодня применяется тариф праздника" : "📅 Сегодня применяется обычный тариф"}
                </span>
                <button style={{background:"transparent",border:"1px solid var(--border2)",borderRadius:7,padding:"3px 9px",color:"var(--text3)",cursor:"pointer",fontSize:11,fontFamily:"var(--fb)"}}
                  onClick={() => setHolidayOverride(null)}>
                  Изменить
                </button>
              </div>
            )}

            <div className={`card cglow ${active ? "cacc" : ""}`}>
              <div style={{textAlign:"center",marginBottom:13}}>
                <div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:7}}>
                  {active ? "● Идёт сеанс" : "Новый сеанс"}
                </div>
                {/* Timer ring */}
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",width:164,height:164}}>
                  <svg style={{transform:"rotate(-90deg)"}} width="164" height="164">
                    <circle cx="82" cy="82" r="72" fill="none" stroke="var(--bg4)" strokeWidth="7" />
                    <circle cx="82" cy="82" r="72" fill="none" stroke="var(--accent)" strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*72}`}
                      strokeDashoffset={`${2*Math.PI*72*(1-(elapsed%3600)/3600)}`}
                      style={{transition:"stroke-dashoffset 1s linear"}} />
                  </svg>
                  <div style={{position:"absolute",textAlign:"center"}}>
                    <div style={{fontFamily:"var(--fh)",fontSize:38,fontWeight:700,color:"var(--text)",letterSpacing:2,lineHeight:1}}>{fmtTime(elapsed)}</div>
                    {active
                      ? <div style={{fontSize:10,color:"var(--text3)",marginTop:3,letterSpacing:"1px",textTransform:"uppercase"}} className="pulse">● Запись</div>
                      : <div style={{fontSize:10,color:"var(--text3)",marginTop:3,textTransform:"uppercase",letterSpacing:"1px"}}>Ожидание</div>}
                  </div>
                </div>
                {active && (
                  <div style={{padding:"9px 13px",background:"var(--bg3)",borderRadius:11,fontSize:13,color:"var(--text2)"}}>
                    💰 <span style={{color:"var(--accent)",fontWeight:700,fontSize:16}}>{fmtMoney(liveEarned)}</span>
                    <span style={{fontSize:11,color:"var(--text3)",marginLeft:6}}>({curRate}₪/мин {active?.forceHoliday ? "· праздник" : todIsShabbat ? "· שבת" : ""})</span>
                  </div>
                )}
              </div>

              {!active && (<>
                {showClient && (
                  <div style={{marginBottom:11}}>
                    <div className="lbl">Имя клиента</div>
                    <input className="inp" placeholder="Имя клиента" value={form.client} onChange={e => setForm(f => ({...f, client:e.target.value}))} />
                  </div>
                )}
                {activeTypes.length > 1 && (
                  <div style={{marginBottom:11}}>
                    <div className="lbl">Тип массажа</div>
                    <select className="inp" value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}>
                      {activeTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {activeTypes.length === 1 && (
                  <div style={{marginBottom:11,padding:"9px 13px",background:"var(--bg3)",borderRadius:11,fontSize:13,color:"var(--text2)",display:"flex",alignItems:"center",gap:8}}>
                    <Icon d={IC.star} size={14} color="var(--accent)" fill="var(--accent)" />
                    <span>{activeTypes[0]}</span>
                  </div>
                )}
                <div style={{display:"flex",gap:9}}>
                  <button className="btn bprim" onClick={handleStartPress} style={{flex:1}}>
                    <Icon d={IC.play} size={17} color="#0a0f1e" fill="#0a0f1e" /> Начать
                  </button>
                  <button className="bicon" onClick={() => { setForm({client:"",type:activeTypes[0]||"Классический",note:"",startTime:nowLocal(),endTime:""}); setModal("add"); }}>
                    <Icon d={IC.plus} size={17} />
                  </button>
                </div>
              </>)}
              {active && (
                <button className="btn bdang" onClick={stopSess}>
                  <Icon d={IC.stop} size={17} color="#fff" fill="#fff" /> Завершить сеанс
                </button>
              )}
            </div>

            {/* Rates */}
            <div className="card csm">
              <div className="secsm" style={{marginBottom:9}}>Тарифы ₪/мин</div>
              <div style={{display:"flex",gap:9}}>
                {[
                  {l:"Будни", v:rates.weekday, a:!todIsHoliday&&!todIsShabbat},
                  {l:"שבת Суббота", v:rates.weekend, a:todIsShabbat&&!todIsHoliday},
                  {l:"Праздник", v:rates.holiday, a:todIsHoliday},
                ].map(r => (
                  <div key={r.l} style={{flex:1,textAlign:"center",background:r.a?"rgba(78,204,163,.12)":"var(--bg3)",border:`1px solid ${r.a?"rgba(78,204,163,.38)":"var(--border2)"}`,borderRadius:11,padding:"9px 4px"}}>
                    <div style={{fontSize:16,fontFamily:"var(--fh)",fontWeight:700,color:r.a?"var(--accent)":"var(--text2)"}}>{r.v}₪</div>
                    <div style={{fontSize:9,color:r.a?"var(--accent)":"var(--text3)",marginTop:2,lineHeight:1.3}}>{r.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {todSess.length > 0 && (
              <div className="card csm">
                <div className="secsm">Сегодня</div>
                {todSess.slice(0,3).map(s => (
                  <div key={s.id} className="si" onClick={() => { setSelSess(s); setModal("detail"); }}>
                    <div className="sdot" style={{background:dotC(s)}} />
                    <div className="sinfo">
                      <div className="stitle">{showClient ? s.client : s.type}</div>
                      <div className="smeta">{new Date(s.startTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}–{new Date(s.endTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    <div className="sright">
                      <div className="searn">{fmtMoneyShort(s.earned)}</div>
                      <div className="sdur">{s.duration} мин</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>)}

          {/* ══════════════════════════════ HISTORY ══════════════════════════════ */}
          {tab === "history" && (<>
            <div className="sech" style={{marginBottom:11}}>
              <div className="sect">История</div>
              <button className="btn boutl" style={{fontSize:12,padding:"6px 11px"}} onClick={() => { setForm({client:"",type:activeTypes[0]||"Классический",note:"",startTime:nowLocal(),endTime:""}); setModal("add"); }}>
                <Icon d={IC.plus} size={13} /> Добавить
              </button>
            </div>
            <div className="togw">
              <div className={`tog ${histMode==="day"?"on":""}`} onClick={() => setHistMode("day")}>📅 День</div>
              <div className={`tog ${histMode==="range"?"on":""}`} onClick={() => { setHistMode("range"); setRangeStart(null); setRangeEnd(null); setRangeStep(0); }}>📆 Диапазон</div>
            </div>
            <div className="card csm" style={{marginBottom:11}}>
              <Calendar sessions={sessions} selectedDay={histMode==="day"?selDay:null} onSelectDay={setSelDay}
                rangeStart={rangeStart} rangeEnd={rangeEnd} onRangeSelect={handleRange} mode={histMode} />
            </div>
            {histMode === "range" && (
              <div className="range-hint">
                {!rangeStart && "👆 Нажмите на первый день диапазона"}
                {rangeStart && !rangeEnd && `От: ${fmtDateShort(rangeStart)} → выберите конечный день`}
                {rangeStart && rangeEnd && <span>📆 <strong>{fmtDateShort(rangeStart)}</strong> — <strong>{fmtDateShort(rangeEnd)}</strong> · {hs.length} сеансов</span>}
              </div>
            )}
            {(histMode==="day" || (histMode==="range" && rangeStart && rangeEnd)) && (
              <div className="srow" style={{marginBottom:11}}>
                <div className="sc cacc">
                  <div className="sl">{histMode==="day" ? `${dayName(selDay)}, ${fmtDateShort(selDay)}` : "За период"}</div>
                  <div className="svsm ca">{fmtMoney(hs.reduce((a,s)=>a+s.earned,0))}</div>
                  {histMode==="day" && isShabat(selDay) && <span className="badge bggold" style={{marginTop:5}}>✡️ שבת</span>}
                </div>
                <div className="sc">
                  <div className="sl">Сеансов</div>
                  <div className="svsm">{hs.length}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{Math.floor(hs.reduce((a,s)=>a+s.duration,0)/60)}ч {hs.reduce((a,s)=>a+s.duration,0)%60}м</div>
                </div>
              </div>
            )}
            {hs.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:30,marginBottom:8}}>📋</div>
                <div>{histMode==="day" ? "Нет сеансов в этот день" : "Выберите диапазон на календаре"}</div>
              </div>
            ) : groupDay(hs).map(([date, ds]) => (
              <div key={date}>
                {histMode === "range" && (
                  <div className="dh">
                    <span>{dayName(date)}, {fmtDate(date)}</span>
                    <span style={{color:"var(--accent)"}}>{fmtMoneyShort(ds.reduce((a,s)=>a+s.earned,0))}</span>
                  </div>
                )}
                <div className="card csm" style={{marginBottom:9}}>
                  {ds.map(s => (
                    <div key={s.id} className="si" onClick={() => { setSelSess(s); setModal("detail"); }}>
                      <div className="sdot" style={{background:dotC(s)}} />
                      <div className="sinfo">
                        <div className="stitle" style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span>{showClient ? s.client : s.type}</span>{badge(s)}
                        </div>
                        <div className="smeta">
                          {new Date(s.startTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}–{new Date(s.endTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}
                          {showClient && <span style={{marginLeft:6}}>· {s.type}</span>}
                        </div>
                      </div>
                      <div className="sright">
                        <div className="searn">{fmtMoneyShort(s.earned)}</div>
                        <div className="sdur">{s.duration} мин · {s.rate}₪</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>)}

          {/* ══════════════════════════════ STATS ══════════════════════════════ */}
          {tab === "stats" && (<>
            <div className="sect" style={{marginBottom:13}}>Аналитика (месяц)</div>
            <div className="srow">
              <div className="sc cacc"><div className="sl">Доход за месяц</div><div className="sv ca">{fmtMoneyShort(statTotal)}</div><div className="sl" style={{marginTop:3}}>{statSess.length} сеансов</div></div>
              <div className="sc cgold"><div className="sl">Средний чек</div><div className="sv cg">{fmtMoneyShort(statSess.length?statTotal/statSess.length:0)}</div></div>
            </div>
            <div className="r3">
              <div className="sc"><div className="sl">Часов</div><div className="svsm">{Math.floor(statMins/60)}<span style={{fontSize:12,color:"var(--text3)"}}>ч</span></div></div>
              <div className="sc"><div className="sl">Клиентов</div><div className="svsm">{statSess.length}</div></div>
              <div className="sc"><div className="sl">Ср. мин</div><div className="svsm">{statSess.length?Math.round(statMins/statSess.length):0}<span style={{fontSize:12,color:"var(--text3)"}}>м</span></div></div>
            </div>
            <div className="card" style={{marginBottom:13}}>
              <div className="secsm">Доход по дням</div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={145}>
                  <AreaChart data={chartData} margin={{top:4,right:0,left:0,bottom:0}}>
                    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4ecca3" stopOpacity={0.3}/><stop offset="95%" stopColor="#4ecca3" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:"var(--text3)"}} tickLine={false} axisLine={false}/>
                    <YAxis hide /><Tooltip content={<CTT />}/>
                    <Area type="monotone" dataKey="earned" stroke="#4ecca3" strokeWidth={2} fill="url(#cg)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="empty" style={{padding:"14px 0"}}>Нет данных</div>}
            </div>
            {typeData.length > 0 && (
              <div className="card" style={{marginBottom:13}}>
                <div className="secsm">По типу массажа</div>
                <div style={{display:"flex",gap:11,alignItems:"center"}}>
                  <PieChart width={108} height={108}><Pie data={typeData} cx={50} cy={50} innerRadius={28} outerRadius={50} paddingAngle={2} dataKey="value">{typeData.map((e,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}</Pie></PieChart>
                  <div style={{flex:1}}>
                    {typeData.map((item,i)=>(
                      <div key={item.name} style={{marginBottom:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                          <span style={{color:"var(--text2)",display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:PIE_C[i%PIE_C.length],display:"inline-block"}}/>{item.name}</span>
                          <span style={{color:"var(--text)",fontWeight:600}}>{fmtMoneyShort(item.value)}</span>
                        </div>
                        <div className="prog"><div className="progf" style={{width:`${statTotal?(item.value/statTotal*100):0}%`,background:PIE_C[i%PIE_C.length]}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="card" style={{marginBottom:13}}>
              <div className="secsm">Будни / Суббота</div>
              {(() => {
                const wdE = statSess.filter(s=>!s.isWeekend&&!s.isHoliday).reduce((a,s)=>a+s.earned,0);
                const weE = statSess.filter(s=>s.isWeekend).reduce((a,s)=>a+s.earned,0);
                const holE = statSess.filter(s=>s.isHoliday).reduce((a,s)=>a+s.earned,0);
                const data = [["Будни",wdE,"#4ecca3"],["Суббота",weE,"#f0c060"],["Праздник",holE,"#ff6b6b"]].filter(([,v])=>v>0);
                return (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={data.map(([n,v])=>({n,v:+v.toFixed(0)}))} margin={{top:4,right:0,left:0,bottom:0}}>
                      <XAxis dataKey="n" tick={{fontSize:10,fill:"var(--text3)"}} tickLine={false} axisLine={false}/>
                      <YAxis hide/><Tooltip content={<CTT />}/>
                      <Bar dataKey="v" radius={[5,5,0,0]}>{data.map(([,, f],i)=><Cell key={i} fill={f}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </>)}

          {/* ══════════════════════════════ SALARY ══════════════════════════════ */}
          {tab === "salary" && (<>
            <div className="sect" style={{marginBottom:13}}>Расчёт зарплаты</div>
            <div className="togw">
              {[["week","7 дней"],["month","Месяц"],["3months","3 месяца"]].map(([v,l]) => (
                <div key={v} className={`tog ${salPeriod===v?"on":""}`} onClick={() => setSalPeriod(v)}>{l}</div>
              ))}
            </div>
            <div className="card cacc cglow" style={{textAlign:"center",marginBottom:13}}>
              <div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:7}}>К выплате</div>
              <div className="saltot">{fmtMoney(salTotal)}</div>
              <div style={{fontSize:13,color:"var(--text3)",marginTop:7}}>{salSess.length} сеансов · {Math.floor(salMins/60)}ч {salMins%60}м</div>
            </div>
            <div className="card" style={{marginBottom:13}}>
              <div className="secsm">Детализация</div>
              {salBreak.length === 0 && <div className="empty" style={{padding:"13px 0"}}>Нет данных</div>}
              {salBreak.map((r,i) => (
                <div key={i} className="salrow">
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:r.col}}>{r.l}</div>
                    <div style={{fontSize:12,color:"var(--text3)"}}>{r.cnt} сеансов · {Math.floor(r.mins/60)}ч {r.mins%60}м · {r.rate}₪/мин</div>
                  </div>
                  <div style={{fontFamily:"var(--fh)",fontSize:18,fontWeight:700,color:r.col}}>{fmtMoney(r.earned)}</div>
                </div>
              ))}
              {salBreak.length > 0 && (<><div className="divl"/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:600,fontSize:14}}>ИТОГО</div>
                  <div style={{fontFamily:"var(--fh)",fontSize:21,fontWeight:700,color:"var(--accent)"}}>{fmtMoney(salTotal)}</div>
                </div>
              </>)}
            </div>
            <div className="card" style={{marginBottom:13}}>
              <div className="secsm">Сеансы ({salSess.length})</div>
              {salSess.slice(0,12).map(s => (
                <div key={s.id} className="si">
                  <div className="sdot" style={{background:dotC(s)}} />
                  <div className="sinfo">
                    <div className="stitle">{showClient ? s.client : s.type}</div>
                    <div className="smeta">{fmtDateShort(s.startTime)}</div>
                  </div>
                  <div className="sright">
                    <div className="searn">{fmtMoney(s.earned)}</div>
                    <div className="sdur">{s.duration} мин</div>
                  </div>
                </div>
              ))}
              {salSess.length > 12 && <div style={{textAlign:"center",padding:"9px 0",fontSize:13,color:"var(--text3)"}}>+{salSess.length-12} сеансов</div>}
            </div>
          </>)}

          {/* ══════════════════════════════ SETTINGS ══════════════════════════════ */}
          {tab === "settings" && (<>
            <div className="sect" style={{marginBottom:15}}>Настройки</div>

            {/* RATES */}
            <div style={{marginBottom:22}}>
              <div className="secsm">Тарифы (₪/мин)</div>
              {[
                {k:"weekday", n:"Будние дни (Вс–Пт)", col:"var(--accent)"},
                {k:"weekend", n:"Суббота (שבת)", col:"var(--gold)"},
                {k:"holiday", n:"Праздничный тариф", col:"var(--red)"},
              ].map(r => (
                <div key={r.k} className="rcard">
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:r.col}}>{r.n}</div>
                    <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{r.k==="weekday"?"Базовая ставка":r.k==="holiday"?"Применяется по запросу при старте":"+"+Math.round((rates[r.k]/rates.weekday-1)*100)+"% к базовой"}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <input type="number" className="rinp" value={rates[r.k]} onChange={e => setRates(rt => ({...rt,[r.k]:+e.target.value||0}))} />
                    <span style={{fontSize:12,color:"var(--text3)"}}>₪</span>
                  </div>
                </div>
              ))}
            </div>

            {/* MASSAGE TYPES */}
            <div style={{marginBottom:22}}>
              <div className="secsm">Виды массажа</div>
              <div style={{fontSize:12,color:"var(--text3)",marginBottom:11,lineHeight:1.5,padding:"9px 11px",background:"rgba(78,204,163,.05)",border:"1px solid rgba(78,204,163,.12)",borderRadius:9}}>
                Включите нужные виды массажа. При включении одного — выбор скрыт, используется он автоматически.
              </div>
              <div className="card csm">
                {ALL_TYPES.map(t => {
                  const isOn = enabledTypes.includes(t);
                  return (
                    <div key={t} className="type-item">
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {t === "Классический" && <Icon d={IC.star} size={14} color="var(--accent)" fill="var(--accent)" />}
                        <span style={{fontSize:14,fontWeight:500,color:isOn?"var(--text)":"var(--text3)"}}>{t}</span>
                        {t === "Классический" && <span className="badge bgg" style={{fontSize:9}}>по умолч.</span>}
                      </div>
                      <label className="sw">
                        <input type="checkbox" checked={isOn} onChange={e => {
                          if (e.target.checked) setEnabledTypes(arr => [...arr, t]);
                          else {
                            // Don't allow disabling all types
                            const next = enabledTypes.filter(x => x !== t);
                            if (next.length === 0) return;
                            setEnabledTypes(next);
                          }
                        }} />
                        <span className="swsl" />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DISPLAY */}
            <div style={{marginBottom:22}}>
              <div className="secsm">Отображение</div>
              <div className="card csm">
                <div className="setitem">
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>Показывать имена клиентов</div>
                    <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>Включить поле имени в сеансах</div>
                  </div>
                  <label className="sw"><input type="checkbox" checked={showClient} onChange={e => setShowClient(e.target.checked)} /><span className="swsl" /></label>
                </div>
              </div>
            </div>

            {/* REPORTS */}
            <div style={{marginBottom:22}}>
              <div className="secsm">Ежемесячные отчёты PDF</div>
              <div className="card csm">
                <div style={{marginBottom:13}}>
                  <div className="lbl">Email для отправки</div>
                  <input className="inp" type="email" placeholder="your@email.com" value={reportEmail} onChange={e => setReportEmail(e.target.value)} />
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[0,1,2].map(offset => {
                    const d = new Date(); d.setMonth(d.getMonth() - offset);
                    const y = d.getFullYear(); const mo = d.getMonth();
                    const label = `${MONTHS_RU[mo]} ${y}`;
                    const ms = sessions.filter(s => { const sd = new Date(s.startTime); return sd.getFullYear()===y&&sd.getMonth()===mo; });
                    return (
                      <div key={offset} style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:13,padding:"11px 13px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{label}</div>
                            <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{ms.length} сеансов · {fmtMoney(ms.reduce((a,s)=>a+s.earned,0))}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button className="btn bgold" style={{flex:1,justifyContent:"center",padding:"9px 12px",fontSize:13}} onClick={() => openPDF(offset)}>
                            <Icon d={IC.pdf} size={14} color="#0a0f1e" /> Просмотр
                          </button>
                          <button className="btn" style={{flex:1,justifyContent:"center",padding:"9px 12px",fontSize:13,background:"var(--bg4)",border:"1px solid var(--border)",color:"var(--accent)",borderRadius:11,gap:6}} onClick={() => sendEmail(offset)}>
                            <Icon d={IC.mail} size={14} color="var(--accent)" /> Отправить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RATE EXAMPLE */}
            <div style={{marginBottom:22}}>
              <div className="secsm">Пример расчёта</div>
              <div className="card csm">
                {[{l:"60 мин (будни)",r:rates.weekday,m:60},{l:"90 мин (суббота)",r:rates.weekend,m:90},{l:"60 мин (праздник)",r:rates.holiday,m:60}].map((ex,i) => (
                  <div key={i} className="salrow" style={{padding:"7px 0"}}>
                    <span style={{fontSize:13,color:"var(--text2)"}}>{ex.l}</span>
                    <span style={{fontFamily:"var(--fh)",fontSize:16,fontWeight:700,color:"var(--accent)"}}>{fmtMoney(ex.m*ex.r)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>)}

        </div>
      </div>

      {/* NAV */}
      <nav className="nav">
        {TABS.map(t => (
          <div key={t.id} className={`ni ${tab===t.id?"on":""}`} onClick={() => setTab(t.id)}>
            <div className="ni-icon"><Icon d={t.icon} size={20} /></div>
            <div className="ni-label">{t.label}</div>
          </div>
        ))}
      </nav>

      {/* ════ HOLIDAY CONFIRM DIALOG ════ */}
      {modal === "holiday" && (
        <div className="hol-ov">
          <div className="hol-box">
            <span className="hol-icon">🎉</span>
            <div className="hol-title">Праздничный тариф?</div>
            <div className="hol-sub">Сегодня работа оплачивается по тарифу праздника?</div>
            <div className="hol-rate">
              Обычный: <strong style={{color:"var(--accent)"}}>{rates.weekday}₪/мин</strong>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              Праздник: <strong style={{color:"var(--gold)"}}>{rates.holiday}₪/мин</strong>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:5}}>Ответ запомнится до конца дня</div>
            </div>
            <div className="hol-btns">
              <button className="hol-yes" onClick={() => handleHolidayAnswer(true)}>
                ✓ Да, праздник
              </button>
              <button className="hol-no" onClick={() => handleHolidayAnswer(false)}>
                Нет, обычный
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL ADD ════ */}
      {modal === "add" && (
        <div className="ov" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="mh" />
            <div className="mt">Добавить сеанс</div>
            {showClient && (
              <div style={{marginBottom:13}}>
                <div className="lbl">Клиент</div>
                <input className="inp" placeholder="Имя" value={form.client} onChange={e => setForm(f => ({...f,client:e.target.value}))} />
              </div>
            )}
            {activeTypes.length > 1 && (
              <div style={{marginBottom:13}}>
                <div className="lbl">Тип массажа</div>
                <select className="inp" value={form.type} onChange={e => setForm(f => ({...f,type:e.target.value}))}>
                  {activeTypes.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
            <div className="r2">
              <div style={{marginBottom:13}}>
                <div className="lbl">Начало</div>
                <input type="datetime-local" className="inp" value={form.startTime} onChange={e => setForm(f => ({...f,startTime:e.target.value}))} />
              </div>
              <div style={{marginBottom:13}}>
                <div className="lbl">Конец</div>
                <input type="datetime-local" className="inp" value={form.endTime} onChange={e => setForm(f => ({...f,endTime:e.target.value}))} />
              </div>
            </div>
            {form.startTime && form.endTime && minutesBetween(form.startTime,form.endTime) > 0 && (() => {
              const dur = minutesBetween(form.startTime,form.endTime);
              const { rate } = getRate(toDateStr(form.startTime));
              return <div style={{background:"rgba(78,204,163,.1)",border:"1px solid rgba(78,204,163,.22)",borderRadius:11,padding:"9px 13px",marginBottom:11,fontSize:13}}>
                <span style={{color:"var(--text3)"}}>Длит: </span><strong style={{color:"var(--text)"}}>{dur} мин</strong>
                <span style={{margin:"0 7px",color:"var(--text3)"}}>·</span>
                <span style={{color:"var(--text3)"}}>Ставка: </span><strong style={{color:"var(--accent)"}}>{rate}₪/мин</strong>
                <span style={{margin:"0 7px",color:"var(--text3)"}}>·</span>
                <strong style={{color:"var(--accent)",fontSize:15}}>{fmtMoney(dur*rate)}</strong>
              </div>;
            })()}
            <div style={{marginBottom:13}}>
              <div className="lbl">Примечание</div>
              <input className="inp" placeholder="Комментарий..." value={form.note} onChange={e => setForm(f => ({...f,note:e.target.value}))} />
            </div>
            <div style={{display:"flex",gap:9}}>
              <button className="btn boutl" style={{flex:1}} onClick={() => setModal(null)}>Отмена</button>
              <button className="btn bprim" style={{flex:2}} onClick={addManual}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL DETAIL ════ */}
      {modal === "detail" && selSess && (
        <div className="ov" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="mh" />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div>
                <div className="mt" style={{marginBottom:4}}>{showClient ? selSess.client : selSess.type}</div>
                {badge(selSess)}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"var(--fh)",fontSize:26,fontWeight:700,color:"var(--accent)"}}>{fmtMoney(selSess.earned)}</div>
                <div style={{fontSize:12,color:"var(--text3)"}}>{selSess.rate}₪/мин</div>
              </div>
            </div>
            <div className="card csm" style={{marginBottom:13}}>
              {[["Тип",selSess.type],...(showClient?[["Клиент",selSess.client]]:[]),
                ["Дата",fmtDate(selSess.startTime)],
                ["Начало",new Date(selSess.startTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})],
                ["Конец",new Date(selSess.endTime).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})],
                ["Длительность",`${selSess.duration} мин`],
                ["Ставка",`${selSess.rate} ₪/мин`],
                ["Тип дня",selSess.isHoliday?"🎉 Праздник":selSess.isWeekend?"✡️ Суббота":"📅 Будни"]
              ].map(([k,v]) => (
                <div key={k} className="salrow" style={{padding:"7px 0"}}>
                  <span style={{fontSize:13,color:"var(--text3)"}}>{k}</span>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:9}}>
              <button className="btn bdang" style={{flex:1,fontSize:13,padding:"11px"}} onClick={() => { if (window.confirm("Удалить сеанс?")) delSess(selSess.id); }}>
                <Icon d={IC.trash} size={13} /> Удалить
              </button>
              <button className="btn boutl" style={{flex:1}} onClick={() => setModal(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ PDF VIEWER ════ */}
      {modal === "pdf" && (
        <div className="pdf-ov">
          <div className="pdf-bar">
            <button className="bicon" onClick={() => setModal(null)}>
              <Icon d={IC.close} size={17} color="var(--accent)" />
            </button>
            <div className="pdf-title">📄 {pdfLabel}</div>
            <button className="btn" style={{background:"linear-gradient(135deg,var(--accent),var(--accent2))",color:"#0a0f1e",padding:"8px 14px",fontSize:13,borderRadius:10,gap:6,flexShrink:0,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:600}} onClick={printPDF}>
              <Icon d={IC.print} size={14} color="#0a0f1e" /> Печать
            </button>
          </div>
          <iframe ref={iframeRef} className="pdf-frame" title="PDF Report"
            sandbox="allow-same-origin allow-scripts allow-popups allow-modals" />
        </div>
      )}
    </div>
  </>);
}
