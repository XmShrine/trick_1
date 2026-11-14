'use strict';

/* =========================================================
   mini bujo — 极简子弹笔记模板
   数据：一个 JSON 对象 D。实时暂存到 localStorage，
   并可关联一个本地 .json 文件（File System Access API）自动写入。
   ========================================================= */

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');

const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds(new Date());
const wdIdx = s => (pd(s).getDay() + 6) % 7;
const mondayOf = s => addDays(s, -wdIdx(s));
const dim = (y, m) => new Date(y, m, 0).getDate();
const fmtMD = s => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`;
const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function weekNo(s) {
  const d = pd(s); d.setDate(d.getDate() + 3 - wdIdx(s));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7);
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WD_CN = ['一', '二', '三', '四', '五', '六', '日'];
const WD_FULL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MOODS = ['red', 'orange', 'yellow', 'green', 'blue'];
const DEFAULT_MOOD_LABELS = {
  red: '压力大 · stressful / angry',
  orange: '低落 · sad / insecure',
  yellow: '疲惫 · tired / uneventful',
  green: '高效 · productive / positive',
  blue: '放松 · chill / lazy',
};
const DEFAULT_HABITS = ['shower 洗澡', 'exercise 运动', 'reading 阅读', 'study 学习', 'journal 日记'];
const DEFAULT_SCORES = ['productivity 效率', 'energy 精力'];
const DEFAULT_LISTS = ['reading list', 'watch list', 'fun list', 'deliveries 快递'];

/* ---------- storage ---------- */
const LS_DOC = 'mini-bujo.doc', LS_UI = 'mini-bujo.ui';
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 隐私模式等 */ } }

function blankDoc() {
  return { app: 'mini-bujo', v: 1, updatedAt: 0, settings: { sym: 'box' }, moodLabels: { ...DEFAULT_MOOD_LABELS }, days: {}, weeks: {}, months: {}, cols: [] };
}
function normalize(d) {
  const b = blankDoc();
  if (!d || typeof d !== 'object') return b;
  return {
    ...b, ...d,
    settings: { ...b.settings, ...(d.settings || {}) },
    moodLabels: { ...b.moodLabels, ...(d.moodLabels || {}) },
    days: d.days || {}, weeks: d.weeks || {}, months: d.months || {},
    cols: Array.isArray(d.cols) ? d.cols : [],
  };
}
function parseDoc(txt) {
  try {
    const o = JSON.parse(txt);
    if (!o || typeof o !== 'object' || !('days' in o || 'weeks' in o)) return null;
    return normalize(o);
  } catch { return null; }
}
function isEmptyDay(o) {
  return !o.dot && !o.mood && !o.main?.length && !o.light?.length && !o.note && !o.mlog
    && !o.cards?.length && !Object.values(o.times || {}).some(Boolean);
}
function serialize() {
  const days = {};
  for (const [k, v] of Object.entries(D.days)) if (!isEmptyDay(v)) days[k] = v;
  return JSON.stringify({ ...D, days }, null, 1);
}

let D = normalize(lsGet(LS_DOC));
const UI = Object.assign({ view: 'week', col: null, q: '', hideBanner: false }, lsGet(LS_UI) || {});
UI.date = today();
const saveUI = () => lsSet(LS_UI, JSON.stringify(UI));

/* ---------- model accessors ---------- */
function day(s) {
  return (D.days[s] ||= { dot: null, mood: null, main: [], light: [], note: '', mlog: '', times: {}, showTime: false, cards: [] });
}
const peekDay = s => D.days[s] || null;

function newWeek(mon) {
  const prevKey = Object.keys(D.weeks).filter(k => k < mon && D.weeks[k].habits?.length).sort().pop();
  const p = prevKey && D.weeks[prevKey];
  const open = i => !['done', 'cancelled', 'migrated'].includes(i.s);
  return {
    serious: [], light: [], track: [],
    habits: (p ? p.habits.map(h => h.name) : DEFAULT_HABITS).map(name => ({ id: uid(), name, marks: Array(7).fill('') })),
    scores: (p ? p.scores.map(h => h.name) : DEFAULT_SCORES).map(name => ({ id: uid(), name, vals: Array(7).fill('') })),
    sleep: { bed: Array(7).fill(''), wake: Array(7).fill(''), wt: Array(7).fill('') },
    lists: p
      ? p.lists.map(l => ({ id: uid(), title: l.title, items: l.items.filter(open).map(i => ({ ...i, id: uid() })) }))
      : DEFAULT_LISTS.map(title => ({ id: uid(), title, items: [] })),
    thoughts: '',
  };
}
// 只是翻看某一周时不写入 D；第一次编辑时才把模板落盘
const weekTpl = {};
const peekWeek = mon => D.weeks[mon] || (weekTpl[mon] ||= newWeek(mon));
function week(mon) {
  if (!D.weeks[mon]) { D.weeks[mon] = weekTpl[mon] || newWeek(mon); delete weekTpl[mon]; }
  return D.weeks[mon];
}

// 列表引用：day|日期|main/light · wk|周一|serious/light/track · wl|周一|列表id · col|id · mg|年月
function getList(ref) {
  const [k, a, b] = ref.split('|');
  if (k === 'day') return day(a)[b];
  if (k === 'wk') return week(a)[b];
  if (k === 'wl') return week(a).lists.find(l => l.id === b)?.items;
  if (k === 'col') return D.cols.find(c => c.id === a)?.items;
  if (k === 'mg') return (D.months[a] ||= { goals: [] }).goals;
}
function peekList(ref) {
  const [k, a, b] = ref.split('|');
  if (k === 'day') return peekDay(a)?.[b] || [];
  if (k === 'wk') return peekWeek(a)[b];
  if (k === 'wl') return peekWeek(a).lists.find(l => l.id === b)?.items || [];
  if (k === 'col') return D.cols.find(c => c.id === a)?.items || [];
  if (k === 'mg') return D.months[a]?.goals || [];
  return [];
}
function itemOf(el) {
  const ul = el.closest('ul.blist'), li = el.closest('li.bi');
  if (!ul || !li || !li.dataset.id) return null;
  return getList(ul.dataset.ref)?.find(i => i.id === li.dataset.id) || null;
}

/* ---------- change tracking ---------- */
let saveT = null;
function touch(rerender = false) {
  D.updatedAt = Date.now();
  F.dirty = true;
  clearTimeout(saveT);
  saveT = setTimeout(() => lsSet(LS_DOC, serialize()), 250);
  scheduleFileWrite();
  updateStatus();
  if (rerender) render();
}

/* ---------- bullets ---------- */
function symHTML(it) {
  if (it.t === 'note') return '–';
  if (it.t === 'event') return `<i class="ev ${it.s === 'done' ? 'done' : ''}"></i>`;
  if (it.s === 'migrated') return '&gt;';
  if (D.settings.sym === 'dot') return { open: '•', started: '/', done: '×', cancelled: '•' }[it.s] || '•';
  return `<i class="bx bx-${it.s || 'open'}"></i>`;
}
function cycleItem(it) {
  if (it.t === 'note') return;
  if (it.t === 'event') { it.s = it.s === 'done' ? 'open' : (it.s === 'open' || !it.s) ? 'done' : 'open'; return; }
  it.s = { open: 'started', started: 'done' }[it.s] || 'open';
}
function parseNew(v) {
  const it = { id: uid(), t: 'task', s: 'open', x: v };
  let m;
  if ((m = v.match(/^[oO○]\s+([\s\S]*)$/))) { it.t = 'event'; it.x = m[1]; }
  else if ((m = v.match(/^[-–]\s+([\s\S]*)$/))) { it.t = 'note'; it.x = m[1]; }
  if ((m = it.x.match(/^[!！*★]\s*([\s\S]*)$/))) { it.p = true; it.x = m[1]; }
  return it;
}
const NEW_PH = '写点什么… (o 开头=事件 · - 开头=备注 · ! 开头=重要)';
function listHTML(ref, items, o = {}) {
  const two = o.mode === 'two';
  const rows = items.map(it => {
    const s = it.s || 'open';
    const lead = two ? '' : `<span class="sym" data-act="cycle" title="点击切换状态">${symHTML(it)}</span>`;
    const tail = two
      ? `<span class="cell" data-act="st" title="已开始">${it.st ? '/' : ''}</span><span class="cell" data-act="c2" title="X 完成 / &gt; 移到下周">${s === 'done' ? 'X' : s === 'migrated' ? '&gt;' : ''}</span>`
      : '';
    return `<li class="bi t-${it.t} s-${s}${it.p ? ' pri' : ''}" data-id="${it.id}">${lead}${it.p ? '<span class="star">★</span>' : ''}<textarea class="tx auto" rows="1">${esc(it.x)}</textarea><button class="more" data-act="menu" aria-label="更多操作">⋯</button>${tail}</li>`;
  }).join('');
  const newRow = `<li class="bi new"><span class="sym ghost">+</span><textarea class="tx nw auto" rows="1" data-ref="${ref}" placeholder="${esc(o.ph ?? NEW_PH)}"></textarea>${two ? '<span class="cell"></span><span class="cell"></span>' : ''}</li>`;
  const head = two ? '<div class="two-h"><span>/</span><span>X</span></div>' : '';
  return `${head}<ul class="blist${two ? ' two' : ''}${o.compact ? ' compact' : ''}" data-ref="${ref}">${rows}${newRow}</ul>`;
}

function migrateTarget(ref) {
  const [k, a, b] = ref.split('|');
  if (k === 'day') return { ref: `day|${addDays(a, 1)}|${b}`, label: '明天' };
  if (k === 'wk') return { ref: `wk|${addDays(a, 7)}|${b}`, label: '下周' };
  return null;
}
function migrate(ref, it, quiet) {
  const tg = migrateTarget(ref);
  if (!tg) return;
  getList(tg.ref).push({ ...it, id: uid(), s: 'open', st: false });
  it.s = 'migrated';
  if (!quiet) { touch(true); toast(`已迁移到${tg.label}`); }
}
function migrateAll(refs) {
  let n = 0;
  for (const ref of refs) {
    for (const it of [...peekList(ref)]) {
      if (it.t === 'task' && (it.s === 'open' || it.s === 'started' || !it.s)) { migrate(ref, it, true); n++; }
    }
  }
  if (n) { touch(true); toast(`已迁移 ${n} 项未完成任务`); } else toast('没有需要迁移的任务');
}

/* ---------- views ---------- */
const TABS = [
  ['month', '月', 'month', 'var(--red)'],
  ['week', '周', 'week', 'var(--blue)'],
  ['day', '日', 'day', 'var(--ink-2)'],
  ['habits', '打卡', 'habits', 'var(--orange)'],
  ['cols', '跟踪', 'collections', 'var(--green)'],
  ['pixels', '心情', 'pixels', 'var(--purple)'],
  ['index', '索引', 'index', 'var(--yellow)'],
];

const VIEWS = {
  month() {
    const key = UI.date.slice(0, 7), y = +key.slice(0, 4), m = +key.slice(5, 7), n = dim(y, m), t = today();
    let cells = '<span></span>'.repeat(wdIdx(`${key}-01`));
    let log = '';
    for (let d = 1; d <= n; d++) {
      const s = `${key}-${pad(d)}`, o = peekDay(s), dot = o?.dot || '', i = wdIdx(s);
      const has = o && (o.main?.length || o.light?.length) ? ' has' : '';
      cells += `<button class="cal-d ${dot}${s === t ? ' today' : ''}${has}" data-act="dot" data-d="${s}" title="点一下贴圆点：红 → 蓝 → 无">${d}</button>`;
      log += `<div class="log-row ${dot}${i === 0 ? ' mon' : ''}${s === t ? ' today' : ''}"><button class="log-d" data-act="goday" data-d="${s}" title="打开这一天">${d}</button><span class="log-w">${WD[i]}</span><textarea class="tx auto" rows="1" data-bind="d.${s}.mlog">${esc(o?.mlog)}</textarea></div>`;
    }
    return {
      left: `
        <header class="ph"><h1>${MONTHS[m - 1]}</h1><span class="sub">${y} · 月视图</span></header>
        <div class="cal"><div class="cal-h">${WD.map(w => `<span>${w}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>
        <p class="hint">点日期贴圆点：<span class="dotk red"></span>重要安排 <span class="dotk blue"></span>日常安排 · 再点一次撕掉</p>
        <h3 class="sec">本月目标 · goals</h3>
        ${listHTML('mg|' + key, peekList('mg|' + key), { ph: '这个月想做成的事…' })}`,
      right: `
        <header class="ph"><h2>monthly log</h2><span class="sub">每天一行，写上事情和时间 · 点日期进入日视图</span></header>
        <div class="log">${log}</div>`,
    };
  },

  week() {
    const mon = mondayOf(UI.date), W = peekWeek(mon), t = today();
    const box = (i, sm) => {
      const s = addDays(mon, i), o = peekDay(s), light = o?.light?.length || 0;
      return `<section class="wbox${sm ? ' sm' : ''}${s === t ? ' today' : ''}">
        <div class="wb-h"><button class="dotbtn ${o?.dot || ''}" data-act="dot" data-d="${s}" title="贴圆点">${+s.slice(8)}</button><button class="wb-name" data-act="goday" data-d="${s}" title="打开日视图">${WD[i]}</button></div>
        ${listHTML(`day|${s}|main`, o?.main || [], { compact: true, ph: '' })}
        ${light ? `<div class="muted small">+ ${light} 项轻松任务</div>` : ''}
      </section>`;
    };
    return {
      left: `
        <header class="ph"><h2>week ${weekNo(mon)}</h2><span class="sub">${fmtMD(mon)} – ${fmtMD(addDays(mon, 6))} · 周视图</span></header>
        <div class="wgrid">${box(0)}${box(1)}${box(2)}${box(3)}${box(4)}<div class="wpair">${box(5, 1)}${box(6, 1)}</div></div>
        <p class="hint">方框里的内容和日视图是同一份 · 点 <b>m / t / w…</b> 进入那一天</p>`,
      right: `
        <header class="ph"><h2>overview</h2><span class="sub">这周要做完、但不必绑在某一天的事</span></header>
        <div class="ov">
          <div><h4>正经事 · main</h4>${listHTML(`wk|${mon}|serious`, W.serious, { mode: 'two', ph: '任务' })}</div>
          <div><h4>轻松一点 · light</h4>${listHTML(`wk|${mon}|light`, W.light, { mode: 'two', ph: '任务' })}</div>
        </div>
        <p class="hint">第一栏 <b>/</b> = 已开始 · 第二栏 <b>X</b> = 完成，<b>&gt;</b> = 移到下周（点格子切换）</p>
        <div class="tools"><button class="btn small" data-act="migweek" data-w="${mon}">未完成 → 下周</button><button class="btn small" data-act="view" data-v="habits">本周打卡页 →</button></div>
        <h3 class="sec">保持追踪 · keep track</h3>
        ${listHTML(`wk|${mon}|track`, W.track, { ph: '不用我做，但要盯着的事…' })}`,
    };
  },

  day() {
    return { left: dayPage(UI.date), right: dayPage(addDays(UI.date, 1)), rightWide: true };
  },

  habits() {
    const mon = mondayOf(UI.date), W = peekWeek(mon), ti = mondayOf(today()) === mon ? wdIdx(today()) : -1;
    const hrows = W.habits.map((h, r) => `<tr${r === W.habits.length - 1 ? ' class="last"' : ''}>
      <td><input class="hn" value="${esc(h.name)}" data-bind="w.${mon}.habit.${h.id}" placeholder="习惯名"></td>
      ${h.marks.map((v, i) => `<td class="mk"><button class="mkb${i === ti ? ' today' : ''}" data-act="mark" data-w="${mon}" data-h="${h.id}" data-i="${i}" aria-label="${esc(h.name)} ${WD[i]}">${esc(v)}</button></td>`).join('')}
      <td class="del"><button class="xbtn" data-act="delhabit" data-w="${mon}" data-h="${h.id}" title="删除">×</button></td></tr>`).join('');
    const srows = W.scores.map(sc => `<tr>
      <td><input class="hn" value="${esc(sc.name)}" data-bind="w.${mon}.score.${sc.id}.name" placeholder="打分项"></td>
      ${sc.vals.map((v, i) => `<td class="sc"><input class="scin" inputmode="numeric" maxlength="2" value="${esc(v)}" data-bind="w.${mon}.score.${sc.id}.${i}" aria-label="${esc(sc.name)} ${WD[i]}"></td>`).join('')}
      <td class="del"><button class="xbtn" data-act="delscore" data-w="${mon}" data-h="${sc.id}" title="删除">×</button></td></tr>`).join('');
    const sleepRows = WD.map((w, i) => `<tr><td>${w}</td>
      <td><input type="time" value="${esc(W.sleep.bed[i])}" data-bind="w.${mon}.sleep.bed.${i}" aria-label="${w} 入睡"></td>
      <td><input type="time" value="${esc(W.sleep.wake[i])}" data-bind="w.${mon}.sleep.wake.${i}" aria-label="${w} 起床"></td>
      <td><input inputmode="decimal" value="${esc(W.sleep.wt[i])}" data-bind="w.${mon}.sleep.wt.${i}" placeholder="—" aria-label="${w} 体重"></td></tr>`).join('');
    const lists = W.lists.map(l => `<section class="clist">
      <div class="cl-h"><input class="cl-t" value="${esc(l.title)}" data-bind="w.${mon}.list.${l.id}" placeholder="清单名"><button class="xbtn" data-act="dellist" data-w="${mon}" data-l="${l.id}" title="删除清单">×</button></div>
      ${listHTML(`wl|${mon}|${l.id}`, l.items, { ph: '' })}</section>`).join('');
    const head = `<tr><th></th>${WD.map(w => `<th>${w}</th>`).join('')}<th></th></tr>`;
    return {
      left: `
        <header class="ph"><h2>habits</h2><span class="sub">week ${weekNo(mon)} · ${fmtMD(mon)} – ${fmtMD(addDays(mon, 6))}</span></header>
        <table class="hab"><thead>${head}</thead><tbody>${hrows}</tbody></table>
        <div class="tools"><button class="btn small" data-act="addhabit" data-w="${mon}">+ 习惯</button><span class="hint" style="margin:4px 0">点格子：X 完成 → / 做了一点 → 空</span></div>
        <h3 class="sec">打分 1–7</h3>
        <table class="hab"><thead>${head}</thead><tbody>${srows}</tbody></table>
        <div class="tools"><button class="btn small" data-act="addscore" data-w="${mon}">+ 打分项</button></div>
        <h3 class="sec">SLEEP · 睡眠 &amp; 体重</h3>
        <table class="sleep"><thead><tr><th></th><th>入睡</th><th>起床</th><th>体重</th></tr></thead><tbody>${sleepRows}</tbody></table>
        <div id="sleepChart">${sleepSVG(W)}</div>`,
      right: `
        <header class="ph"><h2>lists</h2><span class="sub">每周可以换；没做完的条目会自动带到下周</span></header>
        ${lists}
        <div class="tools"><button class="btn small" data-act="addlist" data-w="${mon}">+ 清单</button></div>
        <h3 class="sec">thoughts &amp; summary · 本周小结</h3>
        <textarea class="note auto" data-bind="w.${mon}.thoughts" placeholder="（可选）这周怎么样…">${esc(W.thoughts)}</textarea>`,
    };
  },

  cols() {
    const cur = D.cols.find(c => c.id === UI.col) || D.cols[0];
    const nav = D.cols.map(c => {
      const open = c.items.filter(i => !['done', 'cancelled', 'migrated'].includes(i.s) && i.t !== 'note').length;
      return `<button class="colbtn${c === cur ? ' on' : ''}" data-act="gocol" data-c="${c.id}"><span>${esc(c.title || '未命名')}</span><small>${open} 项进行中</small></button>`;
    }).join('');
    return {
      left: `
        <header class="ph"><h2>collections</h2><span class="sub">长期跟踪页</span></header>
        <p class="hint">有些事不是某一周必须做完的，而是要连着跟几周（等回复的邮件、要跟进的事…），单独拎出来放这里，贴个绿标签方便找。</p>
        <div class="colnav">${nav || '<div class="empty">还没有跟踪页</div>'}</div>
        <div class="tools"><button class="btn small" data-act="addcol">+ 新建跟踪页</button></div>`,
      right: cur ? `
        <header class="ph"><input class="coltitle" value="${esc(cur.title)}" data-bind="col.${cur.id}" placeholder="标题，比如 open emails"><button class="xbtn" data-act="delcol" data-c="${cur.id}" title="删除这一页">×</button></header>
        ${listHTML('col|' + cur.id, cur.items, { ph: '要跟进的事' })}
        <p class="hint">方框：空 = 未开始 · 半格 = 进行中 / 等回复 · 满格 = 搞定</p>`
        : `<div class="empty">点左边「新建跟踪页」开始</div>`,
    };
  },

  pixels() {
    const y = +UI.date.slice(0, 4), t = today();
    const counts = Object.fromEntries(MOODS.map(m => [m, 0]));
    let rows = '';
    for (let d = 1; d <= 31; d++) {
      rows += `<tr><th>${d}</th>`;
      for (let m = 1; m <= 12; m++) {
        if (d > dim(y, m)) { rows += '<td></td>'; continue; }
        const s = `${y}-${pad(m)}-${pad(d)}`, md = D.days[s]?.mood;
        if (md) counts[md]++;
        rows += `<td><button class="px${md ? ' m-' + md : ''}${s === t ? ' today' : ''}" data-act="pix" data-d="${s}" aria-label="${s}"></button></td>`;
      }
      rows += '</tr>';
    }
    const max = Math.max(1, ...Object.values(counts));
    const legend = MOODS.map(m => `<div class="mleg"><span class="sw m-${m}"></span><input value="${esc(D.moodLabels[m])}" data-bind="mood.${m}" aria-label="颜色含义">
      <span class="cnt"><span class="bar m-${m}" style="width:${Math.round(counts[m] / max * 70)}px"></span>${counts[m]}</span></div>`).join('');
    return {
      left: `
        <header class="ph"><h2>year in pixels</h2><span class="sub">${y} · 每天一格心情</span></header>
        <table class="pix"><thead><tr><th></th>${'JFMAMJJASOND'.split('').map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`,
      right: `
        <header class="ph"><h2>legend</h2><span class="sub">五种颜色的含义可以自己改</span></header>
        <div class="mlegend">${legend}</div>
        <p class="hint">点左边的格子选颜色；日视图顶部也能直接设当天心情。</p>`,
    };
  },

  index() {
    const cards = [];
    for (const [d, o] of Object.entries(D.days)) for (const c of o.cards || []) if (c.tag) cards.push({ d, c });
    cards.sort((a, b) => b.d.localeCompare(a.d));
    const cardList = cards.map(({ d, c }) => `<button class="res" data-act="goday" data-d="${d}"><span class="where">${d}</span><span class="what"><span class="tagsq"></span>${esc(c.title || c.body.slice(0, 40) || '（空卡片）')}</span></button>`).join('');
    const sym = D.settings.sym;
    const k = (s, t) => `<tr><td>${s}</td><td>${t}</td></tr>`;
    const box = c => `<span class="sym"><i class="bx bx-${c}"></i></span>`;
    return {
      left: `
        <header class="ph"><h2>index</h2><span class="sub">搜索整本手帐</span></header>
        <input id="q" class="search" type="search" placeholder="搜点什么…" value="${esc(UI.q)}" autocomplete="off">
        <div class="results" id="results"></div>
        <h3 class="sec">黄色标签 · 卡片</h3>
        <div class="results">${cardList || '<div class="empty">日视图里「+ 卡片」并贴黄标签的内容（菜谱、清单…）会出现在这里</div>'}</div>`,
      right: `
        <header class="ph"><h2>key</h2><span class="sub">符号说明 · 设置</span></header>
        <div class="row" style="margin-bottom:10px"><span class="small muted">任务符号</span>
          <span class="seg"><button class="${sym === 'box' ? 'on' : ''}" data-act="setsym" data-s="box">方框 ☐</button><button class="${sym === 'dot' ? 'on' : ''}" data-act="setsym" data-s="dot">圆点 •</button></span></div>
        <table class="keytable">
          ${sym === 'box'
            ? k(box('open'), '任务 task') + k(box('started'), '进行中 started') + k(box('done'), '完成 done')
            : k('<span class="sym">•</span>', '任务 task') + k('<span class="sym">/</span>', '进行中 started') + k('<span class="sym">×</span>', '完成 done')}
          ${k('<span class="sym">&gt;</span>', '迁移 migrated（⋯ 菜单 → 迁移到明天 / 下周）')}
          ${k('<span class="sym"><i class="ev"></i></span>', '事件 event（输入时用 o 开头）')}
          ${k('<span class="sym">–</span>', '备注 note（输入时用 - 开头）')}
          ${k('<span class="star" style="line-height:1">★</span>', '重要（输入时用 ! 开头）')}
          ${k('<s class="muted">abc</s>', '取消 cancelled')}
          ${k('<span class="dotk red" style="margin:0"></span>', '红圆点：这天有重要安排')}
          ${k('<span class="dotk blue" style="margin:0"></span>', '蓝圆点：这天有日常安排')}
        </table>
        <p class="hint">点符号切换状态；每行右侧 ⋯ 可以改类型、标重要、迁移、取消、删除。回车新增一行，空行按退格删除。</p>
        <h3 class="sec">数据</h3>
        <p class="small muted" style="margin:0 0 8px">${Object.keys(D.days).length} 天 · ${Object.keys(D.weeks).length} 周 · ${D.cols.length} 个跟踪页 · ${F.handle ? '已关联文件 ' + esc(F.handle.name) : '未关联文件'}</p>
        <div class="row"><button class="btn small" data-act="download">下载一份备份 .json</button><button class="btn small danger" data-act="wipe">清空浏览器里的数据</button></div>`,
    };
  },
};

function dayPage(s) {
  const o = peekDay(s) || {}, i = wdIdx(s);
  const timeline = o.showTime ? `<div class="tl">${Array.from({ length: 18 }, (_, k) => k + 6).map(h => {
    const hk = pad(h % 24);
    return `<div class="tl-row"><span class="tl-h">${h % 24}</span><textarea class="tx auto" rows="1" data-bind="d.${s}.times.${hk}">${esc(o.times?.[hk])}</textarea></div>`;
  }).join('')}</div>` : '';
  const cards = (o.cards || []).map(c => `<div class="card${c.tag ? ' tagged' : ''}">
    <div class="card-h"><input class="card-t" value="${esc(c.title)}" data-bind="card.${s}.${c.id}.title" placeholder="卡片标题（比如：菜谱）">
    <button class="tagbtn${c.tag ? ' on' : ''}" data-act="tagcard" data-d="${s}" data-c="${c.id}" title="黄色标签：会出现在索引里"></button>
    <button class="xbtn" data-act="delcard" data-d="${s}" data-c="${c.id}" title="删除卡片">×</button></div>
    <textarea class="card-b auto" rows="2" data-bind="card.${s}.${c.id}.body" placeholder="内容…">${esc(c.body)}</textarea></div>`).join('');
  return `
    <header class="ph day-h"><h2>${s.slice(5, 7)}/${s.slice(8)}/${s.slice(0, 4)}</h2><span class="hand wd">${WD_FULL[i]}</span>
      <button class="dotbtn big ${o.dot || ''}" data-act="dot" data-d="${s}" title="贴圆点：红 → 蓝 → 无"></button></header>
    <div class="moodrow">心情 ${MOODS.map(m => `<button class="mood m-${m}${o.mood === m ? ' on' : ''}" data-act="mood" data-d="${s}" data-m="${m}" title="${esc(D.moodLabels[m])}"></button>`).join('')}</div>
    <h3 class="sec">重要 · main</h3>
    ${listHTML(`day|${s}|main`, o.main || [])}
    <h3 class="sec">轻松 · light</h3>
    ${listHTML(`day|${s}|light`, o.light || [], { ph: '轻松一点的事…' })}
    <div class="tools">
      <button class="btn small" data-act="migday" data-d="${s}">未完成 → 明天</button>
      <button class="btn small" data-act="timeline" data-d="${s}">${o.showTime ? '收起' : '展开'}时间轴</button>
      <button class="btn small" data-act="addcard" data-d="${s}">+ 卡片</button>
    </div>
    ${timeline}${cards}
    <h3 class="sec">随手记 · notes</h3>
    <textarea class="note auto" data-bind="d.${s}.note" placeholder="今天的想法、小日记…">${esc(o.note)}</textarea>`;
}

// 睡眠：每天一根从入睡到起床的斜线条（像手帐里画的阴影条）；体重单独画在下面一条红色折线
function sleepSVG(W) {
  const toH = v => { if (!v) return null; const [h, m] = v.split(':').map(Number); return isNaN(h) ? null : h + (m || 0) / 60; };
  // 以「前一天傍晚 → 第二天中午」为一个睡眠窗口：凌晨的入睡时间、早上的起床时间都 +24
  const bed = W.sleep.bed.map(v => { const x = toH(v); return x == null ? null : x < 15 ? x + 24 : x; });
  const wake = W.sleep.wake.map((v, i) => { const x = toH(v); if (x == null) return null; const w = x + 24; return bed[i] != null && w <= bed[i] ? w + 24 : w; });
  const wt = W.sleep.wt.map(v => { const x = parseFloat(v); return isNaN(x) ? null : x; });
  const tv = [...bed, ...wake].filter(v => v != null), wv = wt.filter(v => v != null);
  if (!tv.length && !wv.length) return '<p class="hint">填入睡、起床时间或体重后，这里会画出睡眠条和体重线。</p>';
  const Wd = 320, L = 38, R = 30, iw = Wd - L - R, slot = iw / 7, x = i => L + (i + 0.5) * slot;
  const SH = tv.length ? 150 : 0, WH = wv.length ? 72 : 0, gap = SH && WH ? 16 : 0, B = 18, H = 8 + SH + gap + WH + B;
  let out = `<svg viewBox="0 0 ${Wd} ${H}" class="chart" role="img" aria-label="睡眠时间与体重">
    <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" class="hatch"/></pattern></defs>`;
  WD.forEach((w, i) => { out += `<text x="${x(i)}" y="${H - 4}" class="ax" text-anchor="middle">${w}</text>`; });
  if (SH) {
    const T = 8, ih = SH - 14; // 底部留 14 给时长标签
    const lo = Math.floor(Math.min(...tv)), span = Math.max(Math.ceil(Math.max(...tv)) - lo, 2), y = v => T + (v - lo) / span * ih;
    const step = span > 10 ? 3 : span > 5 ? 2 : 1;
    for (let t = lo; t <= lo + span; t += step) {
      out += `<line x1="${L}" x2="${Wd - R}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${L - 5}" y="${y(t) + 3.5}" class="ax" text-anchor="end">${t % 24}:00</text>`;
    }
    const bw = slot * 0.5;
    bed.forEach((b, i) => {
      const w = wake[i];
      if (b != null && w != null) {
        const hrs = w - b;
        out += `<rect x="${x(i) - bw / 2}" y="${y(b)}" width="${bw}" height="${y(w) - y(b)}" rx="1.5" class="bar"><title>${WD[i]} 睡了 ${hrs.toFixed(1)} 小时</title></rect>`;
        out += `<text x="${x(i)}" y="${y(w) + 11}" class="dur" text-anchor="middle">${+hrs.toFixed(1)}h</text>`;
      } else if (b != null || w != null) {
        out += `<circle cx="${x(i)}" cy="${y(b ?? w)}" r="3" class="pt solo"/>`;
      }
    });
  }
  if (WH) {
    const T = 8 + SH + gap, lo = Math.min(...wv), hi = Math.max(...wv), pad = Math.max((hi - lo) * 0.15, 0.3);
    const y = v => T + 16 + (hi + pad - v) / (hi - lo + 2 * pad) * (WH - 22);
    out += `<line x1="${L}" x2="${Wd - R}" y1="${T}" y2="${T}" class="gl"/><text x="${L - 5}" y="${T + 11}" class="band" text-anchor="end">体重</text>`;
    let d = '', pen = false;
    wt.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; });
    out += `<path d="${d}" class="ln wt"/>`;
    wt.forEach((v, i) => { if (v != null) out += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6" class="pt wt"/><text x="${x(i).toFixed(1)}" y="${(y(v) - 6).toFixed(1)}" class="ax wt" text-anchor="middle">${v}</text>`; });
  }
  return out + '</svg><div class="legend"><span><i class="lk sl"></i>入睡 → 起床</span><span><i class="lk"></i>体重</span></div>';
}

/* ---------- search ---------- */
function search(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const R = [], hit = s => s && String(s).toLowerCase().includes(q);
  for (const [d, o] of Object.entries(D.days)) {
    for (const it of [...(o.main || []), ...(o.light || [])]) if (hit(it.x)) R.push({ act: 'goday', d, where: d, t: it.x });
    if (hit(o.mlog)) R.push({ act: 'goday', d, where: d + ' 月记', t: o.mlog });
    if (hit(o.note)) R.push({ act: 'goday', d, where: d + ' 随手记', t: o.note });
    for (const c of o.cards || []) if (hit(c.title) || hit(c.body)) R.push({ act: 'goday', d, where: d + ' 卡片', t: hit(c.title) ? c.title : c.body });
    for (const v of Object.values(o.times || {})) if (hit(v)) R.push({ act: 'goday', d, where: d + ' 时间轴', t: v });
  }
  for (const [mon, w] of Object.entries(D.weeks)) {
    const where = `week ${weekNo(mon)} · ${mon.slice(0, 4)}`;
    for (const it of [...w.serious, ...w.light, ...w.track]) if (hit(it.x)) R.push({ act: 'goweek', d: mon, where, t: it.x });
    for (const l of w.lists) for (const it of l.items) if (hit(it.x)) R.push({ act: 'gohabits', d: mon, where: `${where} ${l.title}`, t: it.x });
    if (hit(w.thoughts)) R.push({ act: 'gohabits', d: mon, where, t: w.thoughts });
  }
  for (const c of D.cols) for (const it of c.items) if (hit(it.x)) R.push({ act: 'gocol', c: c.id, where: c.title || '跟踪页', t: it.x });
  return R.slice(0, 120);
}
function drawResults() {
  const box = $('#results');
  if (!box) return;
  const q = UI.q.trim();
  if (!q) { box.innerHTML = ''; return; }
  const R = search(q);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const snip = t => { const s = String(t).replace(/\s+/g, ' '); const i = s.toLowerCase().indexOf(q.toLowerCase()); return s.slice(Math.max(0, i - 20), i + 80); };
  box.innerHTML = R.length
    ? R.map(r => `<button class="res" data-act="${r.act}" ${r.d ? `data-d="${r.d}"` : ''} ${r.c ? `data-c="${r.c}"` : ''}><span class="where">${esc(r.where)}</span><span class="what">${esc(snip(r.t)).replace(re, m => `<mark>${m}</mark>`)}</span></button>`).join('')
    : '<div class="empty">没找到</div>';
}

/* ---------- render ---------- */
const pL = $('#pL'), pR = $('#pR');
// 重新渲染前记住正在编辑的输入框，渲染后把光标放回去
function focusKey() {
  const a = document.activeElement;
  if (!a || !a.matches?.('input, textarea')) return null;
  let sel = null;
  if (a.dataset.bind) sel = `[data-bind="${CSS.escape(a.dataset.bind)}"]`;
  else if (a.classList.contains('nw')) sel = `textarea.nw[data-ref="${CSS.escape(a.dataset.ref)}"]`;
  else if (a.classList.contains('tx')) { const li = a.closest('li.bi'); if (li) sel = `li.bi[data-id="${li.dataset.id}"] textarea.tx`; }
  else if (a.id === 'q') sel = '#q';
  return sel && { sel, s: a.selectionStart, e: a.selectionEnd };
}
function restoreFocus(k) {
  const el = k && $(k.sel);
  if (!el) return;
  el.focus({ preventScroll: true });
  try { el.setSelectionRange(k.s, k.e); } catch { /* type=time 等不支持 */ }
}
function render() {
  const fk = focusKey();
  const v = VIEWS[UI.view] ? UI.view : (UI.view = 'week');
  const r = VIEWS[v]();
  pL.innerHTML = r.left;
  pR.innerHTML = r.right;
  pR.classList.toggle('only-wide', !!r.rightWide);
  $('#tabs').innerHTML = TABS.map(([k, cn, en, c]) => `<button class="tab${k === v ? ' on' : ''}" style="--c:${c}" data-act="view" data-v="${k}"><b>${cn}</b><small>${en}</small></button>`).join('');
  const lbl = navLabel();
  $('#navbar').innerHTML = lbl == null ? '' : `<button class="arrow" data-act="nav" data-dir="-1" aria-label="上一页">‹</button><span class="lbl">${lbl}</span><button class="arrow" data-act="nav" data-dir="1" aria-label="下一页">›</button><button class="btn small" data-act="nav" data-dir="0">今天</button>`;
  $$('textarea.auto').forEach(autosize);
  if (v === 'index') drawResults();
  restoreFocus(fk);
  saveUI();
}
// 鼠标按下期间不重绘，避免把正要点击的按钮替换掉
let ptrDown = false, needRender = false;
document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
document.addEventListener('pointerup', () => setTimeout(() => { ptrDown = false; if (needRender) { needRender = false; render(); } }), true);
function softRender() { if (ptrDown) needRender = true; else render(); }
// 纸页宽度变化（窗口缩放、手写字体加载完）时重新计算文本框高度
let lastW = 0;
new ResizeObserver(([e]) => {
  const w = Math.round(e.contentRect.width);
  if (w !== lastW) { lastW = w; $$('textarea.auto').forEach(autosize); }
}).observe($('#spread'));
document.fonts?.ready.then(() => $$('textarea.auto').forEach(autosize));
function navLabel() {
  const s = UI.date, mon = mondayOf(s);
  switch (UI.view) {
    case 'month': return `${MONTHS[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
    case 'week': case 'habits': return `week ${weekNo(mon)} · ${fmtMD(mon)}–${fmtMD(addDays(mon, 6))}`;
    case 'day': return `${fmtMD(s)} 周${WD_CN[wdIdx(s)]}`;
    case 'pixels': return s.slice(0, 4);
    default: return null;
  }
}
function nav(dir) {
  if (dir === 0) UI.date = today();
  else if (UI.view === 'month') { const d = pd(UI.date); d.setDate(1); d.setMonth(d.getMonth() + dir); UI.date = ds(d); }
  else if (UI.view === 'week' || UI.view === 'habits') UI.date = addDays(UI.date, 7 * dir);
  else if (UI.view === 'pixels') UI.date = `${+UI.date.slice(0, 4) + dir}-01-01`;
  else UI.date = addDays(UI.date, dir);
  render();
}
function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function focusNew(ref) {
  const t = $(`textarea.nw[data-ref="${CSS.escape(ref)}"]`);
  if (t) t.focus();
}
function go(view, date) { UI.view = view; if (date) UI.date = date; render(); window.scrollTo(0, 0); }

/* ---------- actions ---------- */
const findCard = a => day(a.dataset.d).cards.find(c => c.id === a.dataset.c);
const ACT = {
  view: a => go(a.dataset.v),
  nav: a => nav(+a.dataset.dir),
  goday: a => go('day', a.dataset.d),
  goweek: a => go('week', a.dataset.d),
  gohabits: a => go('habits', a.dataset.d),
  gocol: a => { UI.col = a.dataset.c; go('cols'); },
  dot: a => { const o = day(a.dataset.d); o.dot = o.dot === 'red' ? 'blue' : o.dot === 'blue' ? null : 'red'; touch(true); },
  mood: a => { const o = day(a.dataset.d); o.mood = o.mood === a.dataset.m ? null : a.dataset.m; touch(true); },
  pix: a => {
    MENU = { kind: 'pix', d: a.dataset.d };
    showMenu(a, `<div class="mtitle">${a.dataset.d}</div>${MOODS.map(m => `<button data-mact="${m}"><span class="sw m-${m}"></span>${esc(D.moodLabels[m])}</button>`).join('')}<hr><button data-mact="clear">清除</button>`);
  },
  cycle: a => { const it = itemOf(a); if (it) { cycleItem(it); touch(true); } },
  st: a => { const it = itemOf(a); if (it) { it.st = !it.st; touch(true); } },
  c2: a => { const it = itemOf(a); if (it) { it.s = it.s === 'done' ? 'migrated' : it.s === 'migrated' ? 'open' : 'done'; touch(true); } },
  menu: a => openItemMenu(a),
  migday: a => migrateAll(['main', 'light'].map(b => `day|${a.dataset.d}|${b}`)),
  migweek: a => migrateAll(['serious', 'light'].map(b => `wk|${a.dataset.w}|${b}`)),
  timeline: a => { const o = day(a.dataset.d); o.showTime = !o.showTime; touch(true); },
  addcard: a => {
    const c = { id: uid(), title: '', body: '', tag: true };
    day(a.dataset.d).cards.push(c); touch(true);
    $(`[data-bind="card.${a.dataset.d}.${c.id}.title"]`)?.focus();
  },
  tagcard: a => { const c = findCard(a); if (c) { c.tag = !c.tag; touch(true); } },
  delcard: a => {
    const o = day(a.dataset.d), c = findCard(a);
    if (!c || ((c.title || c.body) && !confirm('删除这张卡片？'))) return;
    o.cards = o.cards.filter(x => x !== c); touch(true);
  },
  mark: a => {
    const h = week(a.dataset.w).habits.find(x => x.id === a.dataset.h), i = +a.dataset.i;
    if (h) { h.marks[i] = { '': 'X', X: '/', '/': '' }[h.marks[i] || ''] ?? ''; touch(true); }
  },
  addhabit: a => {
    const h = { id: uid(), name: '', marks: Array(7).fill('') };
    week(a.dataset.w).habits.push(h); touch(true);
    $(`[data-bind="w.${a.dataset.w}.habit.${h.id}"]`)?.focus();
  },
  delhabit: a => { const w = week(a.dataset.w); w.habits = w.habits.filter(x => x.id !== a.dataset.h); touch(true); },
  addscore: a => {
    const sc = { id: uid(), name: '', vals: Array(7).fill('') };
    week(a.dataset.w).scores.push(sc); touch(true);
    $(`[data-bind="w.${a.dataset.w}.score.${sc.id}.name"]`)?.focus();
  },
  delscore: a => { const w = week(a.dataset.w); w.scores = w.scores.filter(x => x.id !== a.dataset.h); touch(true); },
  addlist: a => {
    const l = { id: uid(), title: '', items: [] };
    week(a.dataset.w).lists.push(l); touch(true);
    $(`[data-bind="w.${a.dataset.w}.list.${l.id}"]`)?.focus();
  },
  dellist: a => {
    const w = week(a.dataset.w), l = w.lists.find(x => x.id === a.dataset.l);
    if (!l || (l.items.length && !confirm(`删除清单「${l.title || '未命名'}」？`))) return;
    w.lists = w.lists.filter(x => x !== l); touch(true);
  },
  addcol: () => {
    const c = { id: uid(), title: D.cols.length ? '' : 'open emails 待回复', items: [] };
    D.cols.push(c); UI.col = c.id; touch(true);
    $('.coltitle')?.focus();
  },
  delcol: a => {
    const c = D.cols.find(x => x.id === a.dataset.c);
    if (!c || !confirm(`删除跟踪页「${c.title || '未命名'}」？`)) return;
    D.cols = D.cols.filter(x => x !== c); UI.col = null; touch(true);
  },
  setsym: a => { D.settings.sym = a.dataset.s; touch(true); },
  download: () => downloadDoc(),
  wipe: () => {
    if (!confirm('清空浏览器里暂存的全部内容？\n（已经保存到文件里的不受影响）')) return;
    D = blankDoc(); F.dirty = false; lsSet(LS_DOC, serialize()); render(); updateStatus();
  },
  hidebanner: () => { UI.hideBanner = true; saveUI(); updateStatus(); },
};

/* ---------- item menu / popover ---------- */
let MENU = null;
const menuEl = $('#menu');
function showMenu(anchor, html) {
  menuEl.innerHTML = html;
  menuEl.hidden = false;
  const r = anchor.getBoundingClientRect(), mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
  menuEl.style.left = Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8)) + 'px';
  menuEl.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
}
function closeMenu() { menuEl.hidden = true; MENU = null; }
function openItemMenu(a) {
  const it = itemOf(a), ref = a.closest('ul.blist').dataset.ref;
  if (!it) return;
  MENU = { kind: 'item', ref, id: it.id };
  const [k, , b] = ref.split('|');
  const tg = migrateTarget(ref);
  let move = '';
  if (k === 'day') move = b === 'main' ? '<button data-mact="move:light">↓ 移到「轻松」</button>' : '<button data-mact="move:main">↑ 移到「重要」</button>';
  if (k === 'wk' && b !== 'track') move = b === 'serious' ? '<button data-mact="move:light">→ 移到「轻松」栏</button>' : '<button data-mact="move:serious">← 移到「正经事」栏</button>';
  const ty = (t, label) => `<button data-mact="type:${t}" class="${it.t === t ? 'on' : ''}">${label}</button>`;
  showMenu(a, `
    <div class="mrow">${ty('task', '☐ 任务')}${ty('event', '○ 事件')}${ty('note', '– 备注')}</div><hr>
    <button data-mact="pri">★ ${it.p ? '取消重要' : '标为重要'}</button>
    ${tg && it.t === 'task' ? `<button data-mact="migrate">&gt; 迁移到${tg.label}</button>` : ''}
    ${move}
    <button data-mact="cancel">${it.s === 'cancelled' ? '恢复' : '划掉（取消）'}</button><hr>
    <button data-mact="del" class="danger">删除</button>`);
}
menuEl.addEventListener('click', e => {
  const b = e.target.closest('[data-mact]');
  if (!b || !MENU) return;
  const M = MENU, k = b.dataset.mact;
  closeMenu();
  if (M.kind === 'pix') { day(M.d).mood = k === 'clear' ? null : k; touch(true); return; }
  const arr = getList(M.ref), i = arr.findIndex(x => x.id === M.id);
  if (i < 0) return;
  const it = arr[i];
  if (k.startsWith('type:')) { it.t = k.slice(5); if (it.t !== 'task' && (it.s === 'started' || it.s === 'migrated')) it.s = 'open'; }
  else if (k === 'pri') it.p = !it.p;
  else if (k === 'cancel') it.s = it.s === 'cancelled' ? 'open' : 'cancelled';
  else if (k === 'migrate') return migrate(M.ref, it);
  else if (k.startsWith('move:')) { arr.splice(i, 1); const [kk, a] = M.ref.split('|'); getList(`${kk}|${a}|${k.slice(5)}`).push(it); }
  else if (k === 'del') arr.splice(i, 1);
  touch(true);
});

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  if (e.target.closest('#menu')) return;
  closeMenu();
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const f = ACT[a.dataset.act];
  if (f) { e.preventDefault(); f(a, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenu();
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDoc(false); return; }
  const t = e.target;
  if (!t.classList?.contains('tx') || e.isComposing || e.keyCode === 229) return;
  const ul = t.closest('ul.blist');
  if (!ul) return;
  const ref = ul.dataset.ref;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (t.classList.contains('nw')) {
      const v = t.value.trim();
      if (!v) return;
      getList(ref).push(parseNew(v));
      t.value = '';
      touch(true);
    }
    focusNew(ref);
  } else if (e.key === 'Backspace' && !t.value && !t.classList.contains('nw')) {
    e.preventDefault();
    const arr = getList(ref), id = t.closest('li.bi').dataset.id;
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr.splice(i, 1);
    touch(true);
    focusNew(ref);
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('textarea.auto')) autosize(t);
  if (t.id === 'q') { UI.q = t.value; saveUI(); drawResults(); return; }
  if (t.classList.contains('tx') && !t.dataset.bind) {
    if (t.classList.contains('nw')) return;
    const it = itemOf(t);
    if (it) { it.x = t.value; touch(); }
    return;
  }
  if (t.dataset.bind) bindSet(t.dataset.bind, t.value);
});
// 新输入框里写了字但没按回车就离开：也记下来
document.addEventListener('focusout', e => {
  const t = e.target;
  if (!t.classList?.contains('nw')) return;
  const v = t.value.trim();
  if (!v) return;
  getList(t.dataset.ref).push(parseNew(v));
  t.value = '';
  touch();
  softRender();
});
window.addEventListener('scroll', () => { if (!menuEl.hidden) closeMenu(); }, { passive: true });

function bindSet(path, v) {
  const p = path.split('.');
  if (p[0] === 'd') { const o = day(p[1]); if (p[2] === 'times') o.times[p[3]] = v; else o[p[2]] = v; }
  else if (p[0] === 'card') { const c = day(p[1]).cards.find(x => x.id === p[2]); if (c) c[p[3]] = v; }
  else if (p[0] === 'col') { const c = D.cols.find(x => x.id === p[1]); if (c) c.title = v; }
  else if (p[0] === 'mood') D.moodLabels[p[1]] = v;
  else if (p[0] === 'w') {
    const w = week(p[1]);
    if (p[2] === 'thoughts') w.thoughts = v;
    else if (p[2] === 'habit') { const h = w.habits.find(x => x.id === p[3]); if (h) h.name = v; }
    else if (p[2] === 'list') { const l = w.lists.find(x => x.id === p[3]); if (l) l.title = v; }
    else if (p[2] === 'score') { const s = w.scores.find(x => x.id === p[3]); if (s) { if (p[4] === 'name') s.name = v; else s.vals[+p[4]] = v; } }
    else if (p[2] === 'sleep') { w.sleep[p[3]][+p[4]] = v; const c = $('#sleepChart'); if (c) c.innerHTML = sleepSVG(w); }
  }
  touch();
}

/* ---------- toast ---------- */
let toastT = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* =========================================================
   文件：网页负责编辑和显示，内容存在你自己选的 .json 文件里
   Chrome / Edge：关联一次文件后，之后的修改自动写入该文件
   Safari / Firefox：「保存」= 下载 .json，「打开」= 选择 .json
   ========================================================= */
const FS = 'showSaveFilePicker' in window;
const F = { handle: null, dirty: false, lastSaved: null, needPerm: false, pending: null, fallbackName: null };
const FILE_TYPES = [{ description: 'Mini Bujo 手帐', accept: { 'application/json': ['.json'] } }];

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('mini-bujo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
  catch { return null; }
}
async function idbSet(k, v) {
  try { const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
  catch { /* 不支持就算了 */ }
}

let fileT = null;
function scheduleFileWrite() {
  if (!F.handle) return;
  clearTimeout(fileT);
  fileT = setTimeout(writeFile, 1200);
}
async function writeFile() {
  clearTimeout(fileT); fileT = null;
  if (!F.handle) return false;
  try {
    if ((await F.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') { F.needPerm = true; updateStatus(); return false; }
    const w = await F.handle.createWritable();
    await w.write(serialize());
    await w.close();
    F.dirty = false; F.needPerm = false; F.lastSaved = Date.now();
    updateStatus();
    return true;
  } catch (err) {
    console.warn('写入文件失败', err);
    F.needPerm = true; updateStatus();
    return false;
  }
}
function downloadDoc() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }));
  a.download = F.fallbackName || `my-bujo-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  if (!F.handle) { F.dirty = false; F.lastSaved = Date.now(); updateStatus(); }
}
async function saveDoc(as) {
  if (!FS) { downloadDoc(); toast('已下载 .json 文件'); return; }
  if (!F.handle || as) {
    try { F.handle = await showSaveFilePicker({ suggestedName: F.handle?.name || 'my-bujo.json', types: FILE_TYPES }); }
    catch { return; }
    idbSet('handle', F.handle);
    F.pending = null;
  } else if ((await F.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await F.handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
  }
  if (await writeFile()) toast(`已保存到 ${F.handle.name}`);
}
async function openDoc() {
  if (F.dirty && !confirm('当前有还没存进文件的改动，打开别的文件会替换掉它们。继续？')) return;
  if (!FS || !('showOpenFilePicker' in window)) { $('#fileIn').click(); return; }
  let h;
  try { [h] = await showOpenFilePicker({ types: FILE_TYPES, multiple: false }); } catch { return; }
  const doc = parseDoc(await (await h.getFile()).text());
  if (!doc) { toast('这不是 mini bujo 的数据文件'); return; }
  try { await h.requestPermission({ mode: 'readwrite' }); } catch { /* 之后点保存时再要权限 */ }
  D = doc; F.handle = h; F.pending = null; F.dirty = false; F.lastSaved = Date.now();
  idbSet('handle', h);
  lsSet(LS_DOC, serialize());
  render(); updateStatus(); toast(`已打开 ${h.name}`);
}
$('#fileIn').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const doc = parseDoc(await f.text());
  if (!doc) { toast('这不是 mini bujo 的数据文件'); return; }
  D = doc; F.fallbackName = f.name; F.dirty = false; F.lastSaved = Date.now();
  lsSet(LS_DOC, serialize());
  render(); updateStatus(); toast(`已打开 ${f.name}`);
});
// 关联过的文件：重新授权后，比较文件和浏览器暂存哪个更新
async function reconnect(h, ask) {
  const perm = ask ? await h.requestPermission({ mode: 'readwrite' }) : await h.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted') return false;
  F.handle = h; F.pending = null;
  let doc = null;
  try { doc = parseDoc(await (await h.getFile()).text()); } catch { /* 文件被移动或删掉了 */ }
  if (doc && (doc.updatedAt || 0) > (D.updatedAt || 0)) {
    D = doc; F.dirty = false; F.lastSaved = Date.now(); lsSet(LS_DOC, serialize()); render();
    toast(`已从 ${h.name} 载入`);
  } else if (!doc || (doc.updatedAt || 0) < (D.updatedAt || 0)) {
    await writeFile();
  } else { F.dirty = false; F.lastSaved = Date.now(); }
  updateStatus();
  return true;
}

$('#bOpen').addEventListener('click', openDoc);
$('#bSave').addEventListener('click', () => saveDoc(false));
$('#bSaveAs').addEventListener('click', () => saveDoc(true));
$('#bReconnect').addEventListener('click', () => F.pending && reconnect(F.pending, true));
if (!FS) $('#bSaveAs').hidden = true;

window.addEventListener('beforeunload', e => {
  if (fileT) { e.preventDefault(); e.returnValue = ''; }
});

function updateStatus() {
  const st = $('#fstat'), rc = $('#bReconnect'), bn = $('#banner');
  let html;
  if (F.handle) {
    html = F.needPerm
      ? `📄 ${esc(F.handle.name)} · <span class="warn">需要授权写入，点「保存」</span>`
      : F.dirty ? `📄 ${esc(F.handle.name)} · 保存中…` : `📄 ${esc(F.handle.name)} · <span class="ok">已保存</span> ${F.lastSaved ? hhmm(F.lastSaved) : ''}`;
  } else if (!FS && F.lastSaved) {
    html = F.dirty ? '<span class="warn">有改动还没下载</span>' : `已下载 ${hhmm(F.lastSaved)}`;
  } else {
    html = D.updatedAt ? '<span class="warn">未关联文件</span> · 暂存在浏览器' : '暂存在浏览器';
  }
  st.innerHTML = html;
  rc.hidden = !F.pending || !!F.handle;
  if (F.pending) rc.textContent = `🔗 继续用 ${F.pending.name}`;
  $('#bSave').textContent = F.handle || !FS ? '保存' : '保存到文件…';

  const showBanner = !F.handle && !F.pending && !UI.hideBanner;
  bn.hidden = !showBanner;
  if (showBanner) {
    bn.innerHTML = `<p>${FS
      ? '内容会实时暂存在这个浏览器里。点 <b>「保存到文件…」</b>选个位置存成一个 <b>.json</b> 文件，之后的修改会<b>自动写进这个文件</b>；换电脑或换浏览器时，用「打开」载入它就行。'
      : '内容会实时暂存在这个浏览器里。点 <b>「保存」</b>会下载一个 <b>.json</b> 文件，自己放好；下次或在别的设备上，用「打开」载入它。（用 Chrome / Edge 可以直接关联文件自动保存）'}</p>
      <button class="xbtn" data-act="hidebanner" title="不再提示">×</button>`;
  }
}

/* ---------- boot ---------- */
render();
updateStatus();
if (FS) {
  idbGet('handle').then(async h => {
    if (!h) return;
    F.pending = h;
    try { if (!(await reconnect(h, false))) updateStatus(); } catch { updateStatus(); }
  });
}
