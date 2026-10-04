/* ============================================================
   TikZ 画板 — 可视化绘图 → TikZ 代码
   世界坐标 = SVG 用户坐标(px)；TikZ 坐标 = (wx/unit, -wy/unit)
   ============================================================ */
'use strict';

const SVGNS = 'http://www.w3.org/2000/svg';
const PT_PER_CM = 28.4527559;
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (n, d = 3) => { const f = 10 ** d; return Math.round(n * f) / f; };
const num = (n, d = 3) => { let s = rnd(n, d).toFixed(d); s = s.replace(/0+$/, '').replace(/\.$/, ''); return s === '-0' ? '0' : s; };
const $ = (s, r = document) => r.querySelector(s);
const deepCopy = o => JSON.parse(JSON.stringify(o));

/* ---------- xcolor 基础色：命中即输出干净的颜色名 ---------- */
const XCOLOR = {
  '#000000': 'black', '#FFFFFF': 'white', '#FF0000': 'red', '#00FF00': 'green',
  '#0000FF': 'blue', '#00FFFF': 'cyan', '#FF00FF': 'magenta', '#FFFF00': 'yellow',
  '#808080': 'gray', '#BFBFBF': 'lightgray', '#404040': 'darkgray', '#FF8000': 'orange',
  '#BF8040': 'brown', '#BFFF00': 'lime', '#808000': 'olive', '#FFBFBF': 'pink',
  '#BF0040': 'purple', '#008080': 'teal', '#800080': 'violet'
};
const SWATCHES = ['#000000', '#404040', '#808080', '#BFBFBF', '#FFFFFF', '#FF0000', '#FF8000',
  '#FFFF00', '#BFFF00', '#00FF00', '#008080', '#00FFFF', '#0000FF', '#800080',
  '#BF0040', '#FF00FF', '#FFBFBF', '#BF8040', '#808000'];

const DASHES = {
  solid: null, dashed: '5 4', 'densely dashed': '3.2 2.4', 'loosely dashed': '8 6',
  dotted: '0.1 3', 'densely dotted': '0.1 2', 'dash dot': '6 3 0.1 3', 'dash dot dot': '6 3 0.1 3 0.1 3'
};
const FONTSIZES = {
  tiny: 5, scriptsize: 7, footnotesize: 8, small: 9, normalsize: 10,
  large: 12, Large: 14.4, LARGE: 17.28, huge: 20.74, Huge: 24.88
};
const ANCHORS = ['center', 'north', 'south', 'east', 'west', 'north east', 'north west', 'south east', 'south west'];

const DEFAULT_STYLE = {
  stroke: '#000000', fill: 'none', lineWidth: 0.6, dash: 'solid',
  strokeOpacity: 1, fillOpacity: 1, rounded: 0,
  arrowStart: false, arrowEnd: false, tip: 'to',
  fontSize: 'normalsize', textColor: '#000000', math: true,
  anchor: 'center', nodeShape: 'none', innerSep: 3
};
const DEFAULT_FIGURE = {
  enabled: false, alignment: 'center', placement: 'htbp',
  captionPosition: 'below', captionMode: 'plain', caption: '', label: ''
};

/* ---------- 状态 ---------- */
const state = {
  shapes: [],
  sel: new Set(),
  tool: 'select',
  view: { x: 0, y: 0, z: 1 },
  unit: 40,           // 每厘米像素
  grid: { size: 20, snap: true, show: true },
  style: { ...DEFAULT_STYLE },
  includeEnvironment: false,
  includeDependencies: false,
  figure: { ...DEFAULT_FIGURE },
  scale: 1,
  importLibraries: [],
  importPictureOptions: [],
  clipboard: null,
  draft: null,        // 进行中的多点图形
  hoverId: null
};
const hist = { stack: [], i: -1 };

/* ---------- 工具定义 ---------- */
const TOOLS = [
  { id: 'select', key: 'V', name: '选择 / 移动', icon: 'M4 3l11 6.2-4.6 1.2-1.2 4.6z' },
  { id: 'pan', key: 'H', name: '平移画布', icon: 'M10 3v8M6.5 6v5M13.5 6v5M4 9c0 5 2.6 8 6 8s6-3 6-8' },
  { sep: true },
  { id: 'rect', key: 'R', name: '矩形', icon: 'M3.5 5.5h13v9h-13z' },
  { id: 'ellipse', key: 'O', name: '圆 / 椭圆', icon: 'M10 4.5c3.6 0 6.5 2.5 6.5 5.5S13.6 15.5 10 15.5 3.5 13 3.5 10 6.4 4.5 10 4.5z' },
  { id: 'line', key: 'L', name: '直线', icon: 'M4 16L16 4' },
  { id: 'arrow', key: 'A', name: '箭头', icon: 'M4 16L16 4M16 4h-5M16 4v5' },
  { id: 'polyline', key: 'P', name: '折线', icon: 'M3 15l4-8 4 5 6-8' },
  { id: 'polygon', key: 'G', name: '多边形', icon: 'M10 3.5l6.5 4.7-2.5 7.6h-8L3.5 8.2z' },
  { id: 'bezier', key: 'B', name: '贝塞尔曲线', icon: 'M3 15c0-7 14-7 14 0M3 15h0M17 15h0' },
  { id: 'pencil', key: 'D', name: '自由绘制', icon: 'M4 16l1-3.5L13 4.5l2.5 2.5-8 8z' },
  { id: 'text', key: 'T', name: '文本节点', icon: 'M4 5h12M10 5v11M7.5 16h5' }
];

/* ---------- 坐标换算 ---------- */
const pt2px = () => state.unit / PT_PER_CM;
const toTikzX = wx => wx / state.unit;
const toTikzY = wy => -wy / state.unit;
const screenToWorld = (sx, sy) => {
  const r = canvas.getBoundingClientRect();
  return { x: (sx - r.left - state.view.x) / state.view.z, y: (sy - r.top - state.view.y) / state.view.z };
};
const snap = p => {
  if (!state.grid.snap) return { x: p.x, y: p.y };
  const g = state.grid.size;
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
};

/* ---------- 图形几何 ---------- */
function bbox(s) {
  if (s.type === 'raw') return { x: 0, y: 0, w: 0, h: 0 };
  if (s.type === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.type === 'ellipse') return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  if (s.type === 'node') {
    const m = measureNode(s);
    return { x: m.x, y: m.y, w: m.w, h: m.h };
  }
  const pts = allPoints(s);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function allPoints(s) {
  if (s.type === 'bezier') return [s.p0, s.c1, s.c2, s.p1];
  if (s.pts) return s.pts;
  return [{ x: 0, y: 0 }];
}
function translate(s, dx, dy) {
  if (s.type === 'rect') { s.x += dx; s.y += dy; }
  else if (s.type === 'ellipse') { s.cx += dx; s.cy += dy; }
  else if (s.type === 'node') { s.x += dx; s.y += dy; }
  else if (s.type === 'bezier') { for (const k of ['p0', 'c1', 'c2', 'p1']) { s[k].x += dx; s[k].y += dy; } }
  else if (s.pts) s.pts.forEach(p => { p.x += dx; p.y += dy; });
}
function scaleShape(s, ox, oy, fx, fy) {
  const T = p => ({ x: ox + (p.x - ox) * fx, y: oy + (p.y - oy) * fy });
  if (s.type === 'rect') { const a = T({ x: s.x, y: s.y }), b = T({ x: s.x + s.w, y: s.y + s.h }); s.x = Math.min(a.x, b.x); s.y = Math.min(a.y, b.y); s.w = Math.abs(b.x - a.x); s.h = Math.abs(b.y - a.y); }
  else if (s.type === 'ellipse') { const c = T({ x: s.cx, y: s.cy }); s.cx = c.x; s.cy = c.y; s.rx = Math.abs(s.rx * fx); s.ry = Math.abs(s.ry * fy); }
  else if (s.type === 'node') { const c = T({ x: s.x, y: s.y }); s.x = c.x; s.y = c.y; }
  else if (s.type === 'bezier') { for (const k of ['p0', 'c1', 'c2', 'p1']) s[k] = T(s[k]); }
  else if (s.pts) s.pts = s.pts.map(T);
}
const NODE_CONTENT_CACHE = new Map();
const hasMathDelimiter = text => /(^|[^\\])\$|\\[([]/.test(text);
const looksBareMath = text => /[_^]|\\(?:d?frac|tfrac|sqrt|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|infty|partial|nabla|mathbb|mathcal|mathbf|mathrm|vec|overline|hat|bar|tilde|cdot|times|leq|geq|neq)\b|\\begin\{(?:matrix|pmatrix|bmatrix|cases|array)\}/.test(text);
function nodeContent(s) {
  const size = (FONTSIZES[s.style.fontSize] || 10) * pt2px();
  const key = JSON.stringify([s.text || '', !!s.style.math, !!s.style.captionPlain, size]);
  if (NODE_CONTENT_CACHE.has(key)) return NODE_CONTENT_CACHE.get(key);
  const root = document.createElement('div');
  root.className = 'node-content';
  root.style.fontSize = size + 'px';
  const errors = [];
  const escaped = (str, i) => {
    let n = 0;
    for (let j = i - 1; j >= 0 && str[j] === '\\'; j--) n++;
    return n % 2 === 1;
  };
  const plain = (text, parent) => {
    if (text) parent.appendChild(document.createTextNode(text));
  };
  const formula = (expr, parent, displayMode) => {
    const span = document.createElement('span');
    try {
      katex.render(expr, span, { throwOnError: true, displayMode, output: 'htmlAndMathml',
        trust: false, strict: 'ignore', maxSize: 20, maxExpand: 1000 });
    } catch (err) {
      span.className = 'math-render-error';
      span.textContent = '⚠ 公式';
      span.title = err.message;
      errors.push(err.message);
    }
    parent.appendChild(span);
  };
  const addLine = line => {
    const div = document.createElement('div');
    div.className = 'node-line';
    root.appendChild(div);
    if (!s.style.math) { div.textContent = line || '\u00a0'; return; }
    const hasDelimiter = hasMathDelimiter(line);
    if (s.style.captionPlain && !hasDelimiter) { div.textContent = line || '\u00a0'; return; }
    if (!hasDelimiter && looksBareMath(line)) {
      formula(line, div, false);
      return;
    }
    if (!hasDelimiter && /\\[A-Za-z]+/.test(line)) {
      const span = document.createElement('span');
      span.className = 'math-render-error';
      span.textContent = '⚠ 文本命令';
      span.title = '这个 LaTeX 文本命令暂不能在画布中预览';
      div.appendChild(span);
      errors.push('这个 LaTeX 文本命令暂不能在画布中预览');
      return;
    }
    let i = 0;
    while (i < line.length) {
      let at = -1, open = '', close = '', display = false;
      for (let j = i; j < line.length; j++) {
        if (line[j] === '$' && !escaped(line, j)) {
          at = j; open = line[j + 1] === '$' ? '$$' : '$';
          close = open; display = open === '$$'; break;
        }
        if (line[j] === '\\' && ['(', '['].includes(line[j + 1]) && !escaped(line, j)) {
          at = j; open = line.slice(j, j + 2);
          close = line[j + 1] === '(' ? '\\)' : '\\]';
          display = line[j + 1] === '['; break;
        }
      }
      if (at < 0) { plain(line.slice(i), div); break; }
      plain(line.slice(i, at), div);
      let end = -1;
      for (let j = at + open.length; j <= line.length - close.length; j++) {
        if (line.startsWith(close, j) && !escaped(line, j)) { end = j; break; }
      }
      if (end < 0) {
        const span = document.createElement('span');
        span.className = 'math-render-error'; span.textContent = '⚠ 公式';
        span.title = '数学公式的定界符没有闭合'; div.appendChild(span);
        errors.push('数学公式的定界符没有闭合'); break;
      }
      formula(line.slice(at + open.length, end), div, display);
      i = end + close.length;
    }
    if (!div.childNodes.length) div.textContent = '\u00a0';
  };
  (s.text || '').split('\n').forEach(addLine);
  const probe = document.createElement('div');
  probe.className = 'node-measure';
  probe.appendChild(root);
  document.body.appendChild(probe);
  const rect = root.getBoundingClientRect();
  const value = { template: root.cloneNode(true), w: Math.max(1, rect.width),
    h: Math.max(size, rect.height), error: errors.join('；') };
  probe.remove();
  if (NODE_CONTENT_CACHE.size > 200) NODE_CONTENT_CACHE.clear();
  NODE_CONTENT_CACHE.set(key, value);
  return value;
}
function measureNode(s) {
  const content = nodeContent(s);
  const sep = (s.style.innerSep || 0) * pt2px();
  const w = content.w + sep * 2, h = content.h + sep * 2;
  const a = s.style.anchor;
  let x = s.x - w / 2, y = s.y - h / 2;
  if (a.includes('west')) x = s.x;
  if (a.includes('east')) x = s.x - w;
  if (a.includes('north')) y = s.y;
  if (a.includes('south')) y = s.y - h;
  return { x, y, w, h, sep, content };
}

/* ---------- 历史 ---------- */
function snapshot() { return JSON.stringify({ shapes: state.shapes, sel: [...state.sel], scale: state.scale, importLibraries: state.importLibraries, importPictureOptions: state.importPictureOptions }); }
function pushHistory() {
  const s = snapshot();
  if (hist.stack[hist.i] === s) return;
  hist.stack = hist.stack.slice(0, hist.i + 1);
  hist.stack.push(s);
  if (hist.stack.length > 120) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  save();
  updateHistButtons();
}
function restore(s) {
  const d = JSON.parse(s);
  state.shapes = d.shapes; state.sel = new Set(d.sel);
  state.scale = d.scale || 1; state.importLibraries = d.importLibraries || [];
  state.importPictureOptions = d.importPictureOptions || [];
  render(); renderProps(); renderCode(); save();
}
function undo() { if (hist.i > 0) { hist.i--; restore(hist.stack[hist.i]); updateHistButtons(); } }
function redo() { if (hist.i < hist.stack.length - 1) { hist.i++; restore(hist.stack[hist.i]); updateHistButtons(); } }
function updateHistButtons() {
  $('#undo').disabled = hist.i <= 0;
  $('#redo').disabled = hist.i >= hist.stack.length - 1;
}

/* ---------- 本地存储 ---------- */
const KEY = 'tikz-board-v1';
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      shapes: state.shapes, unit: state.unit, grid: state.grid,
      style: state.style, includeEnvironment: state.includeEnvironment,
      includeDependencies: state.includeDependencies, figure: state.figure, scale: state.scale,
      importLibraries: state.importLibraries, importPictureOptions: state.importPictureOptions,
      view: state.view
    }));
  } catch (e) { /* 存储不可用时静默继续 */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || !Array.isArray(d.shapes)) return false;
    state.shapes = d.shapes;
    Object.assign(state.grid, d.grid || {});
    state.unit = d.unit || 40;
    state.style = { ...DEFAULT_STYLE, ...(d.style || {}) };
    state.includeEnvironment = !!d.includeEnvironment;
    state.includeDependencies = !!d.includeDependencies;
    state.figure = { ...DEFAULT_FIGURE, ...(d.figure || {}) };
    state.scale = d.scale || 1;
    state.importLibraries = Array.isArray(d.importLibraries) ? d.importLibraries : [];
    state.importPictureOptions = Array.isArray(d.importPictureOptions) ? d.importPictureOptions : [];
    if (d.view) state.view = d.view;
    return true;
  } catch (e) { return false; }
}

/* ---------- 示例图形 ---------- */
function demoShapes() {
  const S = o => ({ ...DEFAULT_STYLE, ...o });
  return [
    { id: uid(), type: 'line', pts: [{ x: -60, y: 0 }, { x: 260, y: 0 }], style: S({ stroke: '#808080', arrowEnd: true, tip: 'Latex', lineWidth: 0.5 }) },
    { id: uid(), type: 'line', pts: [{ x: 0, y: 60 }, { x: 0, y: -220 }], style: S({ stroke: '#808080', arrowEnd: true, tip: 'Latex', lineWidth: 0.5 }) },
    { id: uid(), type: 'node', x: 268, y: 0, text: 'x', style: S({ anchor: 'west', textColor: '#808080', fontSize: 'small' }) },
    { id: uid(), type: 'node', x: 0, y: -228, text: 'y', style: S({ anchor: 'south', textColor: '#808080', fontSize: 'small' }) },
    { id: uid(), type: 'rect', x: 40, y: -80, w: 120, h: 80, style: S({ stroke: '#1F5FA8', fill: '#0000FF', fillOpacity: 0.08, dash: 'dashed', rounded: 3, lineWidth: 0.8 }) },
    { id: uid(), type: 'bezier', p0: { x: 0, y: 0 }, c1: { x: 80, y: -20 }, c2: { x: 120, y: -180 }, p1: { x: 220, y: -160 }, style: S({ stroke: '#BF0040', lineWidth: 1 }) },
    { id: uid(), type: 'ellipse', cx: 160, cy: -80, rx: 6, ry: 6, style: S({ stroke: '#BF0040', fill: '#BF0040' }) },
    { id: uid(), type: 'node', x: 168, y: -88, text: '$P$', style: S({ anchor: 'south west', textColor: '#BF0040' }) }
  ];
}

/* ============================================================
   渲染
   ============================================================ */
const canvas = $('#canvas');
const nodeLayer = $('#nodeLayer');
const stage = $('#stage');
let scene, gridL, shapeL, overL;

function el(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function buildCanvas() {
  canvas.innerHTML = '';
  const defs = el('defs', {}, canvas);
  const tips = {
    to: { d: 'M0.5,0.6 L7.5,3 L0.5,5.4', fill: 'none', stroke: 'context-stroke', sw: 1 },
    Latex: { d: 'M0,0 L8,3 L0,6 Z', fill: 'context-stroke', stroke: 'none', sw: 0 },
    Stealth: { d: 'M0,0 L8,3 L0,6 L2.4,3 Z', fill: 'context-stroke', stroke: 'none', sw: 0 }
  };
  for (const [name, t] of Object.entries(tips)) {
    for (const dir of ['end', 'start']) {
      const m = el('marker', {
        id: `mk-${name}-${dir}`, viewBox: '0 0 8 6', refX: dir === 'end' ? 7.6 : 0.4, refY: 3,
        markerWidth: 8, markerHeight: 6, orient: 'auto-start-reverse', markerUnits: 'strokeWidth'
      }, defs);
      el('path', {
        d: t.d, fill: t.fill, stroke: t.stroke, 'stroke-width': t.sw,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }, m);
    }
  }
  scene = el('g', { id: 'scene' }, canvas);
  gridL = el('g', {}, scene);
  shapeL = el('g', {}, scene);
  overL = el('g', {}, scene);
}

function viewRect() {
  const r = canvas.getBoundingClientRect(), z = state.view.z;
  return { x: -state.view.x / z, y: -state.view.y / z, w: r.width / z, h: r.height / z, sw: r.width, sh: r.height };
}

function drawGrid() {
  gridL.innerHTML = '';
  const v = viewRect(), z = state.view.z, g = state.grid.size, u = state.unit;
  if (state.grid.show && g * z >= 5) {
    const minor = [], major = [];
    const x0 = Math.floor(v.x / g) * g, x1 = v.x + v.w, y0 = Math.floor(v.y / g) * g, y1 = v.y + v.h;
    for (let x = x0; x <= x1; x += g) (Math.abs(x % u) < 0.01 ? major : minor).push(`M${x} ${v.y}V${y1}`);
    for (let y = y0; y <= y1; y += g) (Math.abs(y % u) < 0.01 ? major : minor).push(`M${v.x} ${y}H${x1}`);
    el('path', { d: minor.join(''), stroke: 'var(--grid)', fill: 'none', 'stroke-width': 1 / z }, gridL);
    el('path', { d: major.join(''), stroke: 'var(--grid-major)', fill: 'none', 'stroke-width': 1 / z }, gridL);
  }
  el('path', {
    d: `M${v.x} 0H${v.x + v.w}M0 ${v.y}V${v.y + v.h}`,
    stroke: 'var(--axis)', fill: 'none', 'stroke-width': 1.2 / z
  }, gridL);
}

/* ---- 路径构造 ---- */
function roundedPoly(pts, r, closed) {
  if (!r || r <= 0 || pts.length < 3) {
    return 'M' + pts.map(p => `${rnd(p.x, 2)} ${rnd(p.y, 2)}`).join('L') + (closed ? 'Z' : '');
  }
  const n = pts.length, out = [];
  const idx = closed ? [...Array(n).keys()] : [...Array(n).keys()].slice(1, -1);
  const seg = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { ux: dx / l, uy: dy / l, l }; };
  let first = null;
  for (const i of idx) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const s1 = seg(p, a), s2 = seg(p, b);
    const d = Math.min(r, s1.l / 2, s2.l / 2);
    const A = { x: p.x + s1.ux * d, y: p.y + s1.uy * d };
    const B = { x: p.x + s2.ux * d, y: p.y + s2.uy * d };
    if (!first) first = A;
    out.push({ A, B, p });
  }
  let d = '';
  if (closed) {
    d = `M${rnd(out[0].A.x, 2)} ${rnd(out[0].A.y, 2)}`;
    for (const o of out) d += `L${rnd(o.A.x, 2)} ${rnd(o.A.y, 2)}Q${rnd(o.p.x, 2)} ${rnd(o.p.y, 2)} ${rnd(o.B.x, 2)} ${rnd(o.B.y, 2)}`;
    d += 'Z';
  } else {
    d = `M${rnd(pts[0].x, 2)} ${rnd(pts[0].y, 2)}`;
    for (const o of out) d += `L${rnd(o.A.x, 2)} ${rnd(o.A.y, 2)}Q${rnd(o.p.x, 2)} ${rnd(o.p.y, 2)} ${rnd(o.B.x, 2)} ${rnd(o.B.y, 2)}`;
    d += `L${rnd(pts[n - 1].x, 2)} ${rnd(pts[n - 1].y, 2)}`;
  }
  return d;
}
function smoothPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x} ${pts[0].y}L${pts[1].x} ${pts[1].y}`;
  let d = `M${rnd(pts[0].x, 2)} ${rnd(pts[0].y, 2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${rnd(c1.x, 2)} ${rnd(c1.y, 2)} ${rnd(c2.x, 2)} ${rnd(c2.y, 2)} ${rnd(p2.x, 2)} ${rnd(p2.y, 2)}`;
  }
  return d;
}
function pathData(s) {
  switch (s.type) {
    case 'rect': {
      const r = Math.min(s.style.rounded * pt2px(), Math.abs(s.w) / 2, Math.abs(s.h) / 2);
      const pts = [{ x: s.x, y: s.y }, { x: s.x + s.w, y: s.y }, { x: s.x + s.w, y: s.y + s.h }, { x: s.x, y: s.y + s.h }];
      return roundedPoly(pts, r, true);
    }
    case 'line': case 'polyline': case 'polygon':
      return roundedPoly(s.pts, s.style.rounded * pt2px(), s.type === 'polygon');
    case 'pencil': return smoothPath(s.pts);
    case 'bezier': return `M${s.p0.x} ${s.p0.y}C${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`;
    case 'ellipse': return null;
    default: return null;
  }
}

function strokeAttrs(st) {
  const w = st.lineWidth * pt2px();
  const a = {
    stroke: st.stroke === 'none' ? 'none' : st.stroke,
    'stroke-width': st.stroke === 'none' ? 0 : w,
    'stroke-opacity': st.strokeOpacity,
    'stroke-linecap': st.dash.includes('dot') ? 'round' : 'butt',
    'stroke-linejoin': 'round',
    fill: st.fill === 'none' ? 'none' : st.fill,
    'fill-opacity': st.fill === 'none' ? 0 : st.fillOpacity
  };
  const dash = DASHES[st.dash];
  if (dash) a['stroke-dasharray'] = dash.split(' ').map(n => rnd(parseFloat(n) * w * 1.6, 2)).join(' ');
  return a;
}

function shapeNode(s) {
  const g = el('g', { 'data-id': s.id });
  if (s.type === 'raw') return g;
  const sa = strokeAttrs(s.style);
  if (s.type === 'node') {
    const m = measureNode(s);
    if (s.style.nodeShape !== 'none') {
      const box = s.style.nodeShape === 'rectangle'
        ? el('rect', { x: m.x, y: m.y, width: m.w, height: m.h, rx: s.style.rounded * pt2px() }, g)
        : el('ellipse', {
          cx: m.x + m.w / 2, cy: m.y + m.h / 2,
          rx: (s.style.nodeShape === 'circle' ? Math.max(m.w, m.h) : m.w) / 2 * 1.08,
          ry: (s.style.nodeShape === 'circle' ? Math.max(m.w, m.h) : m.h) / 2 * 1.08
        }, g);
      for (const k in sa) box.setAttribute(k, sa[k]);
    }
    el('rect', { x: m.x, y: m.y, width: m.w, height: m.h, fill: 'transparent', stroke: 'none' }, g);
  } else if (s.type === 'ellipse') {
    const e = el('ellipse', { cx: s.cx, cy: s.cy, rx: Math.abs(s.rx), ry: Math.abs(s.ry) }, g);
    for (const k in sa) e.setAttribute(k, sa[k]);
  } else {
    const d = pathData(s);
    const p = el('path', { d }, g);
    for (const k in sa) p.setAttribute(k, sa[k]);
    if (s.style.arrowStart) p.setAttribute('marker-start', `url(#mk-${s.style.tip}-start)`);
    if (s.style.arrowEnd) p.setAttribute('marker-end', `url(#mk-${s.style.tip}-end)`);
    if (s.style.fill === 'none') {
      el('path', {
        d, fill: 'none', stroke: 'transparent',
        'stroke-width': Math.max(10 / state.view.z, s.style.lineWidth * pt2px() + 6 / state.view.z)
      }, g);
    }
  }
  return g;
}

function handle(x, y, kind, cls) {
  const r = 4.5 / state.view.z;
  const h = el(cls === 'round' ? 'circle' : 'rect', cls === 'round'
    ? { cx: x, cy: y, r }
    : { x: x - r, y: y - r, width: r * 2, height: r * 2 }, overL);
  h.setAttribute('fill', cls === 'ctrl' ? 'var(--handle-soft)' : 'var(--handle)');
  h.setAttribute('stroke', 'var(--handle)');
  h.setAttribute('stroke-width', 1.3 / state.view.z);
  h.setAttribute('data-handle', kind);
  h.setAttribute('cursor', 'pointer');
  return h;
}

function drawOverlay() {
  overL.innerHTML = '';
  const z = state.view.z;
  if (state.hoverId && !state.sel.has(state.hoverId)) {
    const s = state.shapes.find(x => x.id === state.hoverId);
    if (s) {
      const b = bbox(s), pad = 3 / z;
      el('rect', {
        x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2,
        fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1 / z, 'stroke-opacity': .55
      }, overL);
    }
  }
  const sel = [...state.sel].map(id => state.shapes.find(s => s.id === id)).filter(s => s && s.type !== 'raw');
  if (!sel.length) return;

  if (sel.length === 1) {
    const s = sel[0];
    const b = bbox(s), pad = 2 / z;
    el('rect', {
      x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2,
      fill: 'none', stroke: 'var(--handle)', 'stroke-width': 1 / z,
      'stroke-dasharray': `${4 / z} ${3 / z}`, 'stroke-opacity': .8
    }, overL);
    if (s.type === 'rect' || s.type === 'ellipse') {
      const H = [['nw', b.x, b.y], ['n', b.x + b.w / 2, b.y], ['ne', b.x + b.w, b.y],
      ['e', b.x + b.w, b.y + b.h / 2], ['se', b.x + b.w, b.y + b.h], ['s', b.x + b.w / 2, b.y + b.h],
      ['sw', b.x, b.y + b.h], ['w', b.x, b.y + b.h / 2]];
      H.forEach(([k, x, y]) => handle(x, y, 'box:' + k));
    } else if (s.type === 'bezier') {
      el('path', {
        d: `M${s.p0.x} ${s.p0.y}L${s.c1.x} ${s.c1.y}M${s.p1.x} ${s.p1.y}L${s.c2.x} ${s.c2.y}`,
        stroke: 'var(--handle)', 'stroke-width': 1 / z, 'stroke-opacity': .55, fill: 'none',
        'stroke-dasharray': `${3 / z} ${2 / z}`
      }, overL);
      handle(s.p0.x, s.p0.y, 'bez:p0', 'round');
      handle(s.p1.x, s.p1.y, 'bez:p1', 'round');
      handle(s.c1.x, s.c1.y, 'bez:c1', 'ctrl');
      handle(s.c2.x, s.c2.y, 'bez:c2', 'ctrl');
    } else if (s.type === 'node') {
      handle(s.x, s.y, 'anchor', 'round');
    } else if (s.pts) {
      s.pts.forEach((p, i) => handle(p.x, p.y, 'pt:' + i, 'round'));
    }
  } else {
    const bs = sel.map(bbox);
    const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y));
    const w = Math.max(...bs.map(b => b.x + b.w)) - x, h = Math.max(...bs.map(b => b.y + b.h)) - y;
    el('rect', {
      x, y, width: w, height: h, fill: 'none', stroke: 'var(--handle)',
      'stroke-width': 1 / z, 'stroke-dasharray': `${4 / z} ${3 / z}`
    }, overL);
    [['nw', x, y], ['ne', x + w, y], ['se', x + w, y + h], ['sw', x, y + h]]
      .forEach(([k, hx, hy]) => handle(hx, hy, 'box:' + k));
  }
}

function render() {
  scene.setAttribute('transform', `translate(${state.view.x} ${state.view.y}) scale(${state.view.z})`);
  nodeLayer.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.z})`;
  drawGrid();
  shapeL.innerHTML = '';
  nodeLayer.replaceChildren();
  const labels = document.createDocumentFragment();
  const appendShape = s => {
    if (s.type === 'raw') return;
    shapeL.appendChild(shapeNode(s));
    if (s.type === 'node') {
      const m = measureNode(s);
      const content = m.content.template.cloneNode(true);
      content.classList.add('on-canvas');
      content.style.left = `${m.x + m.sep}px`;
      content.style.top = `${m.y + m.sep}px`;
      content.style.color = s.style.textColor;
      labels.appendChild(content);
    }
  };
  state.shapes.forEach(appendShape);
  if (state.draft) appendShape(state.draft);
  nodeLayer.appendChild(labels);
  drawOverlay();
  $('#statCount').textContent = state.shapes.filter(s => s.type !== 'raw').length;
  $('#statSel').textContent = state.sel.size;
  $('#zoomLevel').textContent = Math.round(state.view.z * 100) + '%';
}

/* ============================================================
   交互
   ============================================================ */
let drag = null, spaceDown = false, hintTimer = null;

function showHint(msg) {
  const h = $('#hint');
  h.textContent = msg;
  h.classList.toggle('show', !!msg);
  clearTimeout(hintTimer);
  if (msg) hintTimer = setTimeout(() => h.classList.remove('show'), 2600);
}
function setTool(t) {
  finishDraft();
  state.tool = t;
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  stage.classList.toggle('drawing', !['select', 'pan'].includes(t));
  stage.classList.toggle('panready', t === 'pan');
  if (t === 'polyline' || t === 'polygon') showHint('依次点击添加顶点，双击或按 Enter 结束');
  else if (t === 'bezier') showHint('拖拽生成曲线，随后拖动控制点调整');
  else if (t === 'text') showHint('点击画布放置文本节点');
  else showHint('');
  renderProps();
}

function newShape(type, a, b) {
  const st = { ...state.style };
  const id = uid();
  switch (type) {
    case 'rect': return { id, type: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), style: st };
    case 'ellipse': return { id, type: 'ellipse', cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, rx: Math.abs(b.x - a.x) / 2, ry: Math.abs(b.y - a.y) / 2, style: st };
    case 'line': return { id, type: 'line', pts: [a, b], style: st };
    case 'arrow': return { id, type: 'line', pts: [a, b], style: { ...st, arrowEnd: true } };
    case 'bezier': {
      const dx = b.x - a.x, dy = b.y - a.y;
      return {
        id, type: 'bezier', p0: a, p1: b,
        c1: { x: a.x + dx / 3 + dy * 0.18, y: a.y + dy / 3 - dx * 0.18 },
        c2: { x: a.x + dx * 2 / 3 + dy * 0.18, y: a.y + dy * 2 / 3 - dx * 0.18 }, style: st
      };
    }
    case 'pencil': return { id, type: 'pencil', pts: [a], style: st };
    case 'polyline': return { id, type: 'polyline', pts: [a, b], style: st };
    case 'polygon': return { id, type: 'polygon', pts: [a, b], style: { ...st, fill: st.fill } };
    case 'text': return { id, type: 'node', x: a.x, y: a.y, text: '$x$', style: st };
  }
}

function finishDraft(commit = true) {
  const d = state.draft;
  state.draft = null;
  if (!d) return;
  if (commit) {
    if (d.pts && (d.type === 'polyline' || d.type === 'polygon')) {
      d.pts = d.pts.slice(0, -1);
      while (d.pts.length > 1) {
        const a = d.pts[d.pts.length - 1], b = d.pts[d.pts.length - 2];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.5) d.pts.pop(); else break;
      }
      if (d.pts.length < 2) { render(); return; }
    }
    state.shapes.push(d);
    state.sel = new Set([d.id]);
    pushHistory();
  }
  render(); renderProps(); renderCode();
}

function constrainLine(a, b, on) {
  if (!on) return b;
  const dx = b.x - a.x, dy = b.y - a.y;
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const len = Math.hypot(dx, dy);
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
}

canvas.addEventListener('pointerdown', e => {
  if (e.button === 1 || spaceDown || state.tool === 'pan') {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, vx: state.view.x, vy: state.view.y };
    stage.classList.add('panning');
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  const w = screenToWorld(e.clientX, e.clientY);
  const p = snap(w);
  const hTarget = e.target.closest('[data-handle]');
  const sTarget = e.target.closest('[data-id]');

  /* 多点绘制进行中 */
  if (state.draft && (state.draft.type === 'polyline' || state.draft.type === 'polygon')) {
    state.draft.pts[state.draft.pts.length - 1] = p;
    state.draft.pts.push({ ...p });
    render();
    return;
  }

  if (state.tool === 'select') {
    if (hTarget) {
      const kind = hTarget.dataset.handle;
      const sel = [...state.sel].map(id => state.shapes.find(s => s.id === id)).filter(Boolean);
      const bs = sel.map(bbox);
      const b0 = {
        x: Math.min(...bs.map(b => b.x)), y: Math.min(...bs.map(b => b.y)),
        w: Math.max(...bs.map(b => b.x + b.w)) - Math.min(...bs.map(b => b.x)),
        h: Math.max(...bs.map(b => b.y + b.h)) - Math.min(...bs.map(b => b.y))
      };
      drag = { mode: 'handle', kind, start: w, orig: deepCopy(sel), b0, moved: false };
      return;
    }
    if (sTarget) {
      const id = sTarget.dataset.id;
      if (e.shiftKey) { state.sel.has(id) ? state.sel.delete(id) : state.sel.add(id); }
      else if (!state.sel.has(id)) state.sel = new Set([id]);
      const sel = [...state.sel].map(i => state.shapes.find(s => s.id === i)).filter(Boolean);
      drag = { mode: 'move', start: w, orig: deepCopy(sel), moved: false };
      render(); renderProps(); renderCode();
      return;
    }
    if (!e.shiftKey) state.sel.clear();
    drag = { mode: 'marquee', start: w, cur: w, add: e.shiftKey ? new Set(state.sel) : new Set() };
    render(); renderProps();
    return;
  }

  /* 绘制工具 */
  if (state.tool === 'text') {
    const s = newShape('text', p);
    state.shapes.push(s);
    state.sel = new Set([s.id]);
    pushHistory(); render(); renderCode(); renderProps();
    setTool('select');
    setTimeout(() => { const t = $('#p-text'); if (t) { t.focus(); t.select(); } }, 30);
    return;
  }
  if (state.tool === 'polyline' || state.tool === 'polygon') {
    state.draft = newShape(state.tool, p, { ...p });
    render();
    return;
  }
  state.draft = newShape(state.tool, p, { ...p });
  drag = { mode: 'create', start: p };
  render();
});

canvas.addEventListener('pointermove', e => {
  const w = screenToWorld(e.clientX, e.clientY);
  $('#statCoord').textContent = `${num(toTikzX(w.x), 3)}, ${num(toTikzY(w.y), 3)}`;

  if (!drag) {
    if (state.draft && state.draft.pts && (state.draft.type === 'polyline' || state.draft.type === 'polygon')) {
      state.draft.pts[state.draft.pts.length - 1] = snap(w);
      render();
    } else if (state.tool === 'select') {
      const t = e.target.closest('[data-id]');
      const id = t ? t.dataset.id : null;
      if (id !== state.hoverId) { state.hoverId = id; drawOverlay(); }
    }
    return;
  }

  if (drag.mode === 'pan') {
    state.view.x = drag.vx + (e.clientX - drag.sx);
    state.view.y = drag.vy + (e.clientY - drag.sy);
    render(); save();
    return;
  }
  if (drag.mode === 'create') {
    const d = state.draft;
    let p = snap(w);
    if (d.type === 'pencil') {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(w.x - last.x, w.y - last.y) > 2.5 / state.view.z) d.pts.push(w);
    } else if (d.type === 'line') {
      d.pts[1] = constrainLine(d.pts[0], p, e.shiftKey);
    } else if (d.type === 'bezier') {
      const n = newShape('bezier', drag.start, p);
      d.p1 = n.p1; d.c1 = n.c1; d.c2 = n.c2;
    } else if (d.type === 'rect') {
      if (e.shiftKey) { const s = Math.max(Math.abs(p.x - drag.start.x), Math.abs(p.y - drag.start.y)); p = { x: drag.start.x + Math.sign(p.x - drag.start.x) * s, y: drag.start.y + Math.sign(p.y - drag.start.y) * s }; }
      Object.assign(d, newShape('rect', drag.start, p));
    } else if (d.type === 'ellipse') {
      if (e.shiftKey) { const s = Math.max(Math.abs(p.x - drag.start.x), Math.abs(p.y - drag.start.y)); p = { x: drag.start.x + Math.sign(p.x - drag.start.x) * s, y: drag.start.y + Math.sign(p.y - drag.start.y) * s }; }
      const n = newShape('ellipse', drag.start, p);
      d.cx = n.cx; d.cy = n.cy; d.rx = n.rx; d.ry = n.ry;
    }
    render();
    return;
  }
  if (drag.mode === 'move') {
    let dx = w.x - drag.start.x, dy = w.y - drag.start.y;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    drag.moved = true;
    drag.orig.forEach(o => {
      const s = state.shapes.find(x => x.id === o.id);
      if (!s) return;
      const c = deepCopy(o);
      translate(c, dx, dy);
      if (state.grid.snap) {
        const b = bbox(c), sb = snap({ x: b.x, y: b.y });
        translate(c, sb.x - b.x, sb.y - b.y);
      }
      Object.assign(s, c);
    });
    render(); renderProps(); renderCode();
    return;
  }
  if (drag.mode === 'handle') {
    const p = snap(w);
    drag.moved = true;
    const o = drag.orig[0];
    if (drag.kind.startsWith('pt:')) {
      const i = +drag.kind.slice(3);
      const s = state.shapes.find(x => x.id === o.id);
      s.pts[i] = e.shiftKey && s.pts.length === 2 ? constrainLine(s.pts[1 - i], p, true) : p;
    } else if (drag.kind.startsWith('bez:')) {
      const k = drag.kind.slice(4);
      const s = state.shapes.find(x => x.id === o.id);
      s[k] = p;
    } else if (drag.kind === 'anchor') {
      const s = state.shapes.find(x => x.id === o.id);
      s.x = p.x; s.y = p.y;
    } else if (drag.kind.startsWith('box:')) {
      const k = drag.kind.slice(4), b = drag.b0;
      let nw = b.w, nh = b.h;
      if (k.includes('e')) nw = p.x - b.x;
      if (k.includes('w')) nw = b.x + b.w - p.x;
      if (k.includes('s')) nh = p.y - b.y;
      if (k.includes('n')) nh = b.y + b.h - p.y;
      let fx = b.w ? nw / b.w : 1, fy = b.h ? nh / b.h : 1;
      if (k === 'n' || k === 's') fx = 1;
      if (k === 'e' || k === 'w') fy = 1;
      if (e.shiftKey && k.length === 2) {
        const r = Math.max(Math.abs(fx), Math.abs(fy));
        fx = (fx < 0 ? -1 : 1) * r; fy = (fy < 0 ? -1 : 1) * r;
      }
      const ax = k.includes('w') ? b.x + b.w : b.x, ay = k.includes('n') ? b.y + b.h : b.y;
      drag.orig.forEach(oo => {
        const s = state.shapes.find(x => x.id === oo.id);
        const c = deepCopy(oo);
        scaleShape(c, ax, ay, fx, fy);
        Object.assign(s, c);
      });
    }
    render(); renderProps(); renderCode();
    return;
  }
  if (drag.mode === 'marquee') {
    drag.cur = w;
    const x = Math.min(drag.start.x, w.x), y = Math.min(drag.start.y, w.y);
    const mw = Math.abs(w.x - drag.start.x), mh = Math.abs(w.y - drag.start.y);
    state.sel = new Set(drag.add);
    for (const s of state.shapes) {
      if (s.type === 'raw') continue;
      const b = bbox(s);
      if (b.x + b.w >= x && b.x <= x + mw && b.y + b.h >= y && b.y <= y + mh) state.sel.add(s.id);
    }
    render();
    const z = state.view.z;
    el('rect', {
      x, y, width: mw, height: mh, fill: 'var(--accent)', 'fill-opacity': .08,
      stroke: 'var(--accent)', 'stroke-width': 1 / z, 'stroke-dasharray': `${3 / z} ${2 / z}`
    }, overL);
    renderProps();
  }
});

function endDrag() {
  if (!drag) return;
  const m = drag.mode;
  stage.classList.remove('panning');
  if (m === 'create') {
    const d = state.draft;
    const b = d ? bbox(d) : null;
    const tiny = d && (d.type === 'pencil' ? d.pts.length < 2 : (b.w < 2 && b.h < 2));
    finishDraft(!tiny);
    if (!tiny && !['polyline', 'polygon'].includes(state.tool)) setTool('select');
  } else if ((m === 'move' || m === 'handle') && drag.moved) {
    pushHistory();
  } else if (m === 'marquee') {
    render(); renderProps(); renderCode();
  }
  drag = null;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', e => {
  if (state.draft) { finishDraft(true); setTool('select'); return; }
  const t = e.target.closest('[data-id]');
  if (t) {
    const s = state.shapes.find(x => x.id === t.dataset.id);
    if (s && s.type === 'node') {
      state.sel = new Set([s.id]); render(); renderProps();
      const i = $('#p-text'); if (i) { i.focus(); i.select(); }
    }
  }
});
canvas.addEventListener('pointerleave', () => { if (state.hoverId) { state.hoverId = null; drawOverlay(); } });

/* ---- 缩放与平移 ---- */
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
  else { state.view.x -= e.deltaX; state.view.y -= e.deltaY; render(); save(); }
}, { passive: false });

function zoomAt(f, cx, cy) {
  const r = canvas.getBoundingClientRect();
  const z0 = state.view.z, z = clamp(z0 * f, 0.08, 12);
  const px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top;
  state.view.x = px - (px - state.view.x) * (z / z0);
  state.view.y = py - (py - state.view.y) * (z / z0);
  state.view.z = z;
  render(); save();
}
function zoomToFit() {
  const r = canvas.getBoundingClientRect();
  let b = { x: -40, y: -160, w: 320, h: 220 };
  const visible = state.shapes.filter(s => s.type !== 'raw');
  if (visible.length) {
    const bs = visible.map(bbox);
    const x = Math.min(...bs.map(v => v.x)), y = Math.min(...bs.map(v => v.y));
    b = { x, y, w: Math.max(...bs.map(v => v.x + v.w)) - x, h: Math.max(...bs.map(v => v.y + v.h)) - y };
  }
  const pad = 60;
  const z = clamp(Math.min((r.width - pad * 2) / Math.max(b.w, 1), (r.height - pad * 2) / Math.max(b.h, 1)), 0.08, 4);
  state.view.z = z;
  state.view.x = r.width / 2 - (b.x + b.w / 2) * z;
  state.view.y = r.height / 2 - (b.y + b.h / 2) * z;
  render(); save();
}

/* ---- 编辑操作 ---- */
const selShapes = () => state.shapes.filter(s => state.sel.has(s.id));
function deleteSel() {
  if (!state.sel.size) return;
  state.shapes = state.shapes.filter(s => !state.sel.has(s.id));
  state.sel.clear();
  pushHistory(); render(); renderProps(); renderCode();
}
function duplicateSel(dx = 16, dy = 16) {
  const copies = selShapes().map(s => { const c = deepCopy(s); c.id = uid(); translate(c, dx, dy); return c; });
  if (!copies.length) return;
  state.shapes.push(...copies);
  state.sel = new Set(copies.map(c => c.id));
  pushHistory(); render(); renderProps(); renderCode();
}
function zOrder(dir) {
  const sel = selShapes();
  if (!sel.length) return;
  const rest = state.shapes.filter(s => !state.sel.has(s.id));
  if (dir === 'front') state.shapes = [...rest, ...sel];
  else if (dir === 'back') state.shapes = [...sel, ...rest];
  else {
    const arr = state.shapes.slice();
    const idxs = arr.map((s, i) => state.sel.has(s.id) ? i : -1).filter(i => i >= 0);
    if (dir === 'up') for (let k = idxs.length - 1; k >= 0; k--) { const i = idxs[k]; if (i < arr.length - 1 && !state.sel.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    else for (const i of idxs) { if (i > 0 && !state.sel.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
    state.shapes = arr;
  }
  pushHistory(); render(); renderCode();
}
function align(how) {
  const sel = selShapes();
  if (sel.length < 2) return;
  const bs = sel.map(bbox);
  const L = Math.min(...bs.map(b => b.x)), R = Math.max(...bs.map(b => b.x + b.w));
  const T = Math.min(...bs.map(b => b.y)), B = Math.max(...bs.map(b => b.y + b.h));
  sel.forEach((s, i) => {
    const b = bs[i];
    if (how === 'left') translate(s, L - b.x, 0);
    else if (how === 'right') translate(s, R - (b.x + b.w), 0);
    else if (how === 'cx') translate(s, (L + R) / 2 - (b.x + b.w / 2), 0);
    else if (how === 'top') translate(s, 0, T - b.y);
    else if (how === 'bottom') translate(s, 0, B - (b.y + b.h));
    else if (how === 'cy') translate(s, 0, (T + B) / 2 - (b.y + b.h / 2));
  });
  pushHistory(); render(); renderProps(); renderCode();
}

/* ---- 键盘 ---- */
const SHORTCUTS = [
  ['V / H', '选择 / 平移'], ['R O L A', '矩形 · 椭圆 · 直线 · 箭头'],
  ['P G B D T', '折线 · 多边形 · 曲线 · 手绘 · 文本'],
  ['空格 + 拖拽', '平移画布'], ['⌘ + 滚轮', '缩放'], ['0', '适应画面'],
  ['⌘Z / ⇧⌘Z', '撤销 / 重做'], ['⌘D', '原位复制'], ['⌘C / ⌘V', '复制 / 粘贴'],
  ['⌘A', '全选'], ['Delete', '删除'], ['方向键', '微移（⇧ 按网格步进）'],
  ['⌘] / ⌘[', '上移一层 / 下移一层'], ['S', '切换网格对齐'], ['Esc', '取消绘制或选择']
];
document.addEventListener('keydown', e => {
  if (!$('#importModal').hidden) {
    if (e.key === 'Escape') { closeImport(); e.preventDefault(); }
    return;
  }
  if (e.code === 'Space' && !spaceDown && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    spaceDown = true; stage.classList.add('panready'); e.preventDefault();
  }
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (mod) {
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (k === 'y') { e.preventDefault(); redo(); return; }
    if (k === 'a') { e.preventDefault(); state.sel = new Set(state.shapes.filter(s => s.type !== 'raw').map(s => s.id)); render(); renderProps(); return; }
    if (k === 'd') { e.preventDefault(); duplicateSel(); return; }
    if (k === 'c') { state.clipboard = deepCopy(selShapes()); showHint(`已复制 ${state.clipboard.length} 个对象`); return; }
    if (k === 'x') { state.clipboard = deepCopy(selShapes()); deleteSel(); return; }
    if (k === 'v') {
      if (!state.clipboard || !state.clipboard.length) return;
      const copies = state.clipboard.map(s => { const c = deepCopy(s); c.id = uid(); translate(c, 20, 20); return c; });
      state.shapes.push(...copies); state.sel = new Set(copies.map(c => c.id));
      pushHistory(); render(); renderProps(); renderCode(); return;
    }
    if (e.key === ']') { e.preventDefault(); zOrder(e.shiftKey ? 'front' : 'up'); return; }
    if (e.key === '[') { e.preventDefault(); zOrder(e.shiftKey ? 'back' : 'down'); return; }
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
  if (e.key === 'Escape') { if (state.draft) finishDraft(true); else { state.sel.clear(); render(); renderProps(); } return; }
  if (e.key === 'Enter') { if (state.draft) { finishDraft(true); setTool('select'); } return; }
  if (e.key.startsWith('Arrow')) {
    const step = e.shiftKey ? state.grid.size : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d && state.sel.size) { e.preventDefault(); selShapes().forEach(s => translate(s, d[0], d[1])); pushHistory(); render(); renderProps(); renderCode(); }
    return;
  }
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) { $('#help').hidden = false; return; }
  if (e.key === '+' || e.key === '=') { zoomAt(1.2); return; }
  if (e.key === '-') { zoomAt(1 / 1.2); return; }
  if (e.key === '0') { zoomToFit(); return; }
  const t = TOOLS.find(t => t.key && t.key.toLowerCase() === e.key.toLowerCase());
  if (t) { setTool(t.id); return; }
  if (e.key.toLowerCase() === 's') { state.grid.snap = !state.grid.snap; syncToggles(); save(); }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space') { spaceDown = false; stage.classList.toggle('panready', state.tool === 'pan'); }
});

/* ============================================================
   TikZ 代码生成
   ============================================================ */
const LW_NAMES = { 0.1: 'ultra thin', 0.2: 'very thin', 0.4: 'thin', 0.6: 'semithick', 0.8: 'thick', 1.2: 'very thick', 1.6: 'ultra thick' };

const TEX_ESC = {
  '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%',
  '$': '\\$', '#': '\\#', '_': '\\_', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}'
};
// 单次扫描：否则先插入的 \textbackslash{} 会被后续的花括号转义再次破坏
function escapeTeX(t) { return t.replace(/[\\{}&%$#_^~]/g, m => TEX_ESC[m]); }
function captionPlainTeX(text) {
  const source = String(text).replace(/\s*\r?\n\s*/g, ' ');
  const escaped = i => {
    let n = 0;
    for (let j = i - 1; j >= 0 && source[j] === '\\'; j--) n++;
    return n % 2 === 1;
  };
  let result = '', start = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '$' || escaped(i)) continue;
    let end = -1;
    for (let j = i + 1; j < source.length; j++) {
      if (source[j] === '$' && !escaped(j)) { end = j; break; }
    }
    if (end < 0) break;
    result += escapeTeX(source.slice(start, i)) + source.slice(i, end + 1);
    start = end + 1;
    i = end;
  }
  return result + escapeTeX(source.slice(start));
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, dmax = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
  return [a, b];
}

function genCode({ includeEnvironment = state.includeEnvironment,
  includeDependencies = state.includeDependencies, includeFigure = state.figure.enabled } = {}) {
  const defs = [], used = new Map(), libs = new Set(state.importLibraries);
  let ci = 0;
  const col = hex => {
    const H = hex.toUpperCase();
    if (XCOLOR[H]) return XCOLOR[H];
    if (used.has(H)) return used.get(H);
    const name = 'c' + (++ci);
    used.set(H, name);
    defs.push(`\\definecolor{${name}}{HTML}{${H.slice(1)}}`);
    return name;
  };
  const P = (x, y) => `(${num(toTikzX(x))},${num(toTikzY(y))})`;

  function opts(st, kind) {
    const o = [];
    const hasS = st.stroke !== 'none', hasF = st.fill !== 'none';
    if (kind === 'path' && (st.arrowStart || st.arrowEnd)) {
      if (st.tip === 'to') o.push((st.arrowStart ? '<' : '') + '-' + (st.arrowEnd ? '>' : ''));
      else { libs.add('arrows.meta'); o.push((st.arrowStart ? `{${st.tip}}` : '') + '-' + (st.arrowEnd ? `{${st.tip}}` : '')); }
    }
    if (hasS && hasF) o.push('draw=' + col(st.stroke), 'fill=' + col(st.fill));
    else if (hasS) o.push(col(st.stroke));
    else if (hasF) o.push(col(st.fill));
    if (hasS) {
      if (LW_NAMES[st.lineWidth]) { if (st.lineWidth !== 0.4) o.push(LW_NAMES[st.lineWidth]); }
      else o.push('line width=' + num(st.lineWidth, 2) + 'pt');
      if (st.dash !== 'solid') o.push(st.dash);
    }
    if (hasS && st.strokeOpacity < 1) o.push('draw opacity=' + num(st.strokeOpacity, 2));
    if (hasF && st.fillOpacity < 1) o.push('fill opacity=' + num(st.fillOpacity, 2));
    return o;
  }
  const cmd = st => st.stroke !== 'none' && st.fill !== 'none' ? '\\filldraw'
    : st.stroke !== 'none' ? '\\draw' : '\\fill';

  const lines = [];
  for (const s of state.shapes) {
    if (s.type === 'raw') {
      lines.push({ text: s.source, id: s.id, raw: true });
      continue;
    }
    const st = s.style;
    let o = opts(st, s.type === 'node' ? 'node' : 'path');
    let body = '';
    if (s.type === 'node') {
      const o2 = [];
      if (st.anchor !== 'center') o2.push('anchor=' + st.anchor);
      if (st.nodeShape !== 'none') {
        o2.push(st.nodeShape);
        if (st.stroke !== 'none') o2.push('draw=' + col(st.stroke));
        if (st.fill !== 'none') o2.push('fill=' + col(st.fill));
        if (st.rounded > 0 && st.nodeShape === 'rectangle') o2.push('rounded corners=' + num(st.rounded, 2) + 'pt');
        o2.push('inner sep=' + num(st.innerSep, 2) + 'pt');
      }
      if (st.textColor.toUpperCase() !== '#000000') o2.push('text=' + col(st.textColor));
      if (st.fontSize !== 'normalsize') o2.push('font=\\' + st.fontSize);
      const multi = (s.text || '').includes('\n');
      if (multi) o2.push('align=center');
      let txt = st.math ? (s.text || '').split('\n').map(line =>
        !hasMathDelimiter(line) && looksBareMath(line) ? '$' + line + '$' : line).join('\n')
        : escapeTeX(s.text || '');
      txt = txt.split('\n').join(' \\\\ ');
      body = `\\node${o2.length ? '[' + o2.join(', ') + ']' : ''} at ${P(s.x, s.y)} {${txt}};`;
    } else {
      if (st.rounded > 0 && ['rect', 'polyline', 'polygon'].includes(s.type)) o.push('rounded corners=' + num(st.rounded, 2) + 'pt');
      const head = `${cmd(st)}${o.length ? '[' + o.join(', ') + ']' : ''} `;
      if (s.type === 'rect') body = head + `${P(s.x, s.y + s.h)} rectangle ${P(s.x + s.w, s.y)};`;
      else if (s.type === 'ellipse') {
        const r = Math.abs(s.rx), ry = Math.abs(s.ry);
        body = head + (Math.abs(r - ry) < 0.01
          ? `${P(s.cx, s.cy)} circle [radius=${num(r / state.unit)}];`
          : `${P(s.cx, s.cy)} ellipse [x radius=${num(r / state.unit)}, y radius=${num(ry / state.unit)}];`);
      } else if (s.type === 'bezier') {
        body = head + `${P(s.p0.x, s.p0.y)} .. controls ${P(s.c1.x, s.c1.y)} and ${P(s.c2.x, s.c2.y)} .. ${P(s.p1.x, s.p1.y)};`;
      } else if (s.type === 'pencil') {
        const pts = rdp(s.pts, 1.2).map(p => P(p.x, p.y)).join(' ');
        body = head + `plot [smooth] coordinates {${pts}};`;
      } else {
        const pts = s.pts.map(p => P(p.x, p.y)).join(' -- ');
        body = head + pts + (s.type === 'polygon' ? ' -- cycle;' : ';');
      }
    }
    lines.push({ text: body, id: s.id });
  }

  const out = [];
  const usePicture = includeEnvironment || includeFigure;
  const figure = state.figure;
  const caption = String(figure.caption || '').trim();
  const label = String(figure.label || '').trim().replace(/[^A-Za-z0-9:._/-]/g, '');
  const captionLine = caption ? `\\caption{${figure.captionMode === 'latex' ? caption : captionPlainTeX(caption)}}` : '';
  const captionLines = captionLine ? [{ text: '  ' + captionLine }, ...(label ? [{ text: `  \\label{${label}}` }] : [])] : [];
  const lib = libs.size ? `\\usetikzlibrary{${[...libs].join(', ')}}` : null;
  const envOptions = ['x=1cm', 'y=1cm', ...state.importPictureOptions];
  if (state.scale !== 1) envOptions.push('scale=' + num(state.scale, 3));
  const env = `\\begin{tikzpicture}[${envOptions.join(', ')}]`;
  if (includeDependencies) {
    out.push({ text: '\\usepackage{tikz}' });
    if (includeFigure && figure.placement === 'H') out.push({ text: '\\usepackage{float}' });
    if (lib) out.push({ text: lib });
    if (defs.length) defs.forEach(d => out.push({ text: d }));
  }
  if (includeFigure) {
    const placement = /^[!htbpH]{1,6}$/.test(figure.placement) ? figure.placement : 'htbp';
    const align = { left: '\\raggedright', center: '\\centering', right: '\\raggedleft' }[figure.alignment] || '\\centering';
    out.push({ text: `\\begin{figure}[${placement}]` }, { text: '  ' + align });
    if (figure.captionPosition === 'above') out.push(...captionLines);
  }
  if (usePicture) out.push({ text: (includeFigure ? '  ' : '') + env });
  if (!lines.length) out.push({ text: (includeFigure ? '    ' : usePicture ? '  ' : '') + '% 画布为空' });
  lines.forEach(l => out.push({ text: (includeFigure ? '    ' : usePicture ? '  ' : '') + l.text,
    id: l.id, raw: l.raw }));
  if (usePicture) out.push({ text: (includeFigure ? '  ' : '') + '\\end{tikzpicture}' });
  if (includeFigure) {
    if (figure.captionPosition !== 'above') out.push(...captionLines);
    out.push({ text: '\\end{figure}' });
  }
  return out;
}

function escHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function highlight(t) {
  return escHTML(t).replace(/(%.*$)|(\\[a-zA-Z@]+)|(?<![\w#])(-?\d+(?:\.\d+)?)(?![\w])/gm,
    (m, c, cmd, n) => c ? `<span class="cmt">${c}</span>`
      : cmd ? `<span class="cmd">${cmd}</span>`
        : `<span class="num">${n}</span>`);
}
function renderCode() {
  const out = genCode();
  const pre = $('#code');
  pre.innerHTML = out.map(l =>
    `<span class="cl${l.id && state.sel.has(l.id) ? ' sel' : ''}${l.raw ? ' raw' : ''}"${l.id ? ` data-id="${l.id}"` : ''}>${highlight(l.text) || '&nbsp;'}</span>`
  ).join('');
  window.__code = out.map(l => l.text).join('\n');
  window.__fullCode = genCode({ includeEnvironment: true, includeDependencies: true })
    .map(l => l.text).join('\n');
}
$('#code').addEventListener('click', e => {
  const l = e.target.closest('.cl[data-id]');
  if (!l) return;
  state.sel = new Set([l.dataset.id]);
  render(); renderProps(); renderCode();
});
$('#code').addEventListener('mouseover', e => {
  const l = e.target.closest('.cl[data-id]');
  const id = l ? l.dataset.id : null;
  if (id !== state.hoverId) { state.hoverId = id; drawOverlay(); }
});
$('#code').addEventListener('mouseleave', () => { state.hoverId = null; drawOverlay(); });

async function copyCode() {
  const btn = $('#copyCode'), label = btn.querySelector('span');
  try {
    await navigator.clipboard.writeText(window.__code);
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = window.__code; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  const old = label.textContent;
  label.textContent = '已复制';
  btn.classList.add('on');
  setTimeout(() => { label.textContent = old; btn.classList.remove('on'); }, 1400);
}

/* ---- TikZ 导入与本地文件 ---- */
let importResult = null;
function previewImport() {
  const source = $('#importText').value;
  importResult = TikzImport.parse(source, state.unit);
  $('#importSummary').innerHTML = `<span>可视化编辑 <strong>${importResult.editable}</strong> 个图元</span>
    <span class="${importResult.preserved ? 'warn' : ''}">原样保留 <strong>${importResult.preserved}</strong> 条语句</span>`;
  const warnings = importResult.warnings;
  $('#importWarnings').innerHTML = warnings.slice(0, 12).map(w => `<div>${escHTML(w)}</div>`).join('')
    + (warnings.length > 12 ? `<div>另有 ${warnings.length - 12} 条提示</div>` : '');
  $('#importApply').disabled = !source.trim();
}
function openImport() {
  $('#importText').value = window.__fullCode || '';
  $('#importFile').value = '';
  $('#importModal').hidden = false;
  previewImport();
  $('#importText').focus();
}
function closeImport() { $('#importModal').hidden = true; }
function applyImport() {
  if (!importResult || !$('#importText').value.trim()) return;
  state.shapes = importResult.shapes;
  state.importLibraries = importResult.libraries;
  state.importPictureOptions = importResult.pictureOptions;
  state.scale = importResult.scale;
  state.figure = importResult.figure
    ? { ...DEFAULT_FIGURE, ...importResult.figure }
    : { ...state.figure, enabled: false };
  state.sel.clear();
  state.draft = null;
  pushHistory();
  syncToggles();
  zoomToFit();
  renderProps(); renderCode();
  closeImport();
  showHint(`已导入 ${importResult.editable} 个图元 · ${importResult.preserved} 条代码原样保留`);
}
function downloadCode() {
  const blob = new Blob([window.__code + '\n'], { type: 'text/x-tex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tikz-drawing.tex';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   属性面板
   ============================================================ */
const TYPE_LABEL = {
  rect: '矩形', ellipse: '椭圆', line: '直线', polyline: '折线',
  polygon: '多边形', bezier: '曲线', pencil: '手绘', node: '文本节点', raw: '保留原代码'
};
const row = (l, c) => `<div class="row"><label>${l}</label><div class="ctl">${c}</div></div>`;
const grp = (title, body, tag) =>
  `<div class="grp"><h3>${title}${tag ? ` <span class="tag">${tag}</span>` : ''}</h3>${body}</div>`;
const opt = (v, l, cur) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`;

function colorRow(label, prop, val, allowNone) {
  const isNone = val === 'none';
  const hex = isNone ? '#000000' : val;
  const chips = SWATCHES.map(c =>
    `<button class="chip${!isNone && c.toLowerCase() === String(val).toLowerCase() ? ' on' : ''}" style="background:${c}" data-set="${prop}" data-value="${c}" title="${XCOLOR[c] || c}"></button>`).join('')
    + (allowNone ? `<button class="chip none${isNone ? ' on' : ''}" data-set="${prop}" data-value="none" title="无"></button>` : '');
  return row(label, `
    <button class="swatch" style="background:${isNone ? 'var(--surface-2)' : hex}" tabindex="-1">
      <input type="color" data-prop="${prop}" data-swatch="1" value="${hex}" aria-label="${label}颜色">
    </button>
    <input type="text" class="mono" data-prop="${prop}" value="${isNone ? 'none' : hex}" aria-label="${label}色值">
  `) + `<div class="chips">${chips}</div>`;
}
function rangeRow(label, prop, val, min, max, step, suffix) {
  const show = suffix === '%' ? Math.round(val * 100) + '%' : val + (suffix || '');
  return row(label, `<input type="range" data-prop="${prop}" data-suffix="${suffix || ''}" min="${min}" max="${max}" step="${step}" value="${val}"><span class="val">${show}</span>`);
}
function selRow(label, prop, val, opts) {
  return row(label, `<select data-prop="${prop}" data-refresh="1">${opts.map(([v, l]) => opt(v, l, val)).join('')}</select>`);
}
function numRow(label, prop, val, step) {
  return row(label, `<input type="number" data-prop="${prop}" step="${step}" value="${num(val, 3)}">`);
}

function geoGroup(s) {
  const u = state.unit, b = bbox(s);
  const T = { x: v => toTikzX(v), y: v => toTikzY(v), l: v => v / u };
  if (s.type === 'rect')
    return grp('几何 · cm', `<div class="grid2">
      ${numRow('x', 'geo.x', T.x(s.x), .1)}${numRow('y', 'geo.y', T.y(s.y + s.h), .1)}
      ${numRow('宽', 'geo.w', T.l(s.w), .1)}${numRow('高', 'geo.h', T.l(s.h), .1)}</div>`);
  if (s.type === 'ellipse')
    return grp('几何 · cm', `<div class="grid2">
      ${numRow('中心 x', 'geo.x', T.x(s.cx), .1)}${numRow('中心 y', 'geo.y', T.y(s.cy), .1)}
      ${numRow('半径 x', 'geo.w', T.l(s.rx), .1)}${numRow('半径 y', 'geo.h', T.l(s.ry), .1)}</div>`);
  if (s.type === 'node')
    return grp('位置 · cm', `<div class="grid2">${numRow('x', 'geo.x', T.x(s.x), .1)}${numRow('y', 'geo.y', T.y(s.y), .1)}</div>`);
  if (s.pts && s.pts.length === 2)
    return grp('端点 · cm', `<div class="grid2">
      ${numRow('起 x', 'geo.x1', T.x(s.pts[0].x), .1)}${numRow('起 y', 'geo.y1', T.y(s.pts[0].y), .1)}
      ${numRow('终 x', 'geo.x2', T.x(s.pts[1].x), .1)}${numRow('终 y', 'geo.y2', T.y(s.pts[1].y), .1)}</div>`);
  return grp('包围盒 · cm', `<div class="grid2">
      ${numRow('x', 'geo.x', T.x(b.x), .1)}${numRow('y', 'geo.y', T.y(b.y + b.h), .1)}
      ${numRow('宽', 'geo.w', T.l(b.w), .1)}${numRow('高', 'geo.h', T.l(b.h), .1)}</div>`
    + `<div class="row"><label>顶点</label><div class="ctl"><span class="val">${allPoints(s).length} 个</span></div></div>`);
}

function strokeGroup(st) {
  const lws = [0.1, 0.2, 0.4, 0.6, 0.8, 1.2, 1.6];
  const opts = lws.map(v => [v, `${LW_NAMES[v]} · ${v}pt`]);
  if (!lws.includes(+st.lineWidth)) opts.push([st.lineWidth, `自定义 · ${st.lineWidth}pt`]);
  return grp('描边', colorRow('颜色', 'style.stroke', st.stroke, true)
    + row('线宽', `<select data-prop="style.lineWidth" data-refresh="1">${opts.map(([v, l]) => opt(v, l, st.lineWidth)).join('')}</select>
        <input type="number" data-prop="style.lineWidth" step="0.1" min="0" max="20" value="${st.lineWidth}" style="width:62px">`)
    + selRow('线型', 'style.dash', st.dash, Object.keys(DASHES).map(k => [k, k]))
    + rangeRow('不透明', 'style.strokeOpacity', st.strokeOpacity, 0, 1, 0.05, '%'));
}
function fillGroup(st) {
  return grp('填充', colorRow('颜色', 'style.fill', st.fill, true)
    + (st.fill !== 'none' ? rangeRow('不透明', 'style.fillOpacity', st.fillOpacity, 0, 1, 0.05, '%') : ''));
}
function arrowGroup(st) {
  return grp('箭头', row('端点', `<div class="seg">
      <button data-tog="style.arrowStart" class="${st.arrowStart ? 'on' : ''}">起点</button>
      <button data-tog="style.arrowEnd" class="${st.arrowEnd ? 'on' : ''}">终点</button></div>`)
    + selRow('箭头样式', 'style.tip', st.tip, [['to', 'to（默认 →）'], ['Latex', 'Latex（实心）'], ['Stealth', 'Stealth（燕尾）']])
    + (st.tip !== 'to' ? `<div class="row"><label></label><div class="ctl"><span class="val" style="text-align:left">需 arrows.meta 宏库</span></div></div>` : ''));
}
function textGroup(s) {
  const st = s.style;
  const error = measureNode(s).content.error;
  return grp('文本', row('内容', `<textarea data-prop="text" id="p-text" rows="2" spellcheck="false">${escHTML(s.text || '')}</textarea>`)
    + (error ? `<p class="math-prop-error">预览提示：${escHTML(error)}</p>` : '')
    + row('LaTeX', `<label class="mini-check"><input type="checkbox" data-prop="style.math" data-refresh="1" ${st.math ? 'checked' : ''}><span>识别 $...$ 公式，代码原样输出</span></label>`)
    + selRow('字号', 'style.fontSize', st.fontSize, Object.keys(FONTSIZES).map(k => [k, '\\' + k]))
    + selRow('锚点', 'style.anchor', st.anchor, ANCHORS.map(a => [a, a]))
    + colorRow('文字色', 'style.textColor', st.textColor, false)
    + selRow('外框', 'style.nodeShape', st.nodeShape, [['none', '无'], ['rectangle', '矩形'], ['circle', '圆形'], ['ellipse', '椭圆']])
    + (st.nodeShape !== 'none' ? numRow('内边距 pt', 'style.innerSep', st.innerSep, .5) : ''));
}
function roundGroup(st) {
  return grp('圆角', numRow('半径 pt', 'style.rounded', st.rounded, .5));
}
function alignGroup() {
  const b = (a, t, d) => `<button class="tbtn" data-act="align:${a}" title="${t}"><svg viewBox="0 0 20 20">${d}</svg></button>`;
  return grp('对齐', `<div class="actions">
    ${b('left', '左对齐', '<path d="M4 3v14M7 6.5h9M7 13.5h5"/>')}
    ${b('cx', '水平居中', '<path d="M10 3v14M5.5 6.5h9M7.5 13.5h5"/>')}
    ${b('right', '右对齐', '<path d="M16 3v14M4 6.5h9M8 13.5h5"/>')}
    ${b('top', '顶对齐', '<path d="M3 4h14M6.5 7v9M13.5 7v5"/>')}
    ${b('cy', '垂直居中', '<path d="M3 10h14M6.5 5.5v9M13.5 7.5v5"/>')}
    ${b('bottom', '底对齐', '<path d="M3 16h14M6.5 4v9M13.5 8v5"/>')}
  </div>`);
}
function canvasGroup() {
  return grp('画布', numRow('每厘米像素', 'unit', state.unit, 1)
    + numRow('网格步长', 'gridSize', state.grid.size, 1)
    + numRow('缩放 scale', 'scale', state.scale, .1)
    + `<div class="actions" style="margin-top:8px">
        <button class="tbtn" data-act="selectAll">全选</button>
        <button class="tbtn" data-act="fit">适应画面</button>
        <button class="tbtn" data-act="origin">回到原点</button>
       </div>`);
}

function renderProps() {
  const P = $('#props');
  const sel = selShapes();
  const parts = [];
  if (!sel.length) {
    parts.push(`<div class="empty"><div class="glyph">∅</div><p>未选中对象。<br>用左侧工具绘制，或点选画布上的图形。</p></div>`);
    const rawCount = state.shapes.filter(s => s.type === 'raw').length;
    if (rawCount) parts.push(grp('未预览的语句', `<p class="raw-info">${rawCount} 条语句保留在下方代码中。点击红色代码行可查看和修改原文。</p>`));
    parts.push(canvasGroup());
    const st = state.style;
    parts.push(grp('新对象默认样式', colorRow('描边', 'style.stroke', st.stroke, true)
      + colorRow('填充', 'style.fill', st.fill, true)
      + row('线宽', `<input type="number" data-prop="style.lineWidth" step="0.1" min="0" value="${st.lineWidth}">`)
      + selRow('线型', 'style.dash', st.dash, Object.keys(DASHES).map(k => [k, k]))));
  } else {
    const s = sel[0], multi = sel.length > 1;
    if (!multi && s.type === 'raw') {
      P.innerHTML = grp('保留原代码', `<p class="raw-info">这条语句未转换成图形，导出时会按原文保留。修改后可用“导入 / 编辑代码”重新尝试识别。</p>
        <textarea data-prop="raw" rows="7" spellcheck="false">${escHTML(s.source)}</textarea>
        <div class="actions" style="margin-top:8px"><button class="tbtn danger" data-act="del">删除语句</button></div>`);
      return;
    }
    const types = new Set(sel.map(x => x.type));
    parts.push(grp(multi ? `选中 ${sel.length} 个对象` : '选中',
      `<div class="actions">
        <button class="tbtn" data-act="dup" title="⌘D">复制</button>
        <button class="tbtn" data-act="front" title="⇧⌘]">置顶</button>
        <button class="tbtn" data-act="back" title="⇧⌘[">置底</button>
        <button class="tbtn danger" data-act="del" title="Delete">删除</button>
      </div>`, multi ? null : TYPE_LABEL[s.type]));
    if (multi) parts.push(alignGroup());
    if (!multi) parts.push(geoGroup(s));
    const st = s.style;
    if (s.type === 'node') parts.push(textGroup(s));
    parts.push(strokeGroup(st));
    parts.push(fillGroup(st));
    if ([...types].some(t => ['line', 'polyline', 'bezier', 'pencil'].includes(t))) parts.push(arrowGroup(st));
    if ([...types].some(t => ['rect', 'polyline', 'polygon'].includes(t)) || (s.type === 'node' && st.nodeShape === 'rectangle')) parts.push(roundGroup(st));
  }
  P.innerHTML = parts.join('');
}

/* ---- 属性应用 ---- */
function setGeo(key, v) {
  const s = selShapes()[0];
  if (!s || !isFinite(v)) return;
  const u = state.unit, X = cm => cm * u, Y = cm => -cm * u, L = cm => Math.abs(cm) * u;
  if (s.type === 'rect') {
    if (key === 'x') s.x = X(v);
    else if (key === 'y') s.y = Y(v) - s.h;
    else if (key === 'w') s.w = L(v);
    else if (key === 'h') { const bot = s.y + s.h; s.h = L(v); s.y = bot - s.h; }
  } else if (s.type === 'ellipse') {
    if (key === 'x') s.cx = X(v); else if (key === 'y') s.cy = Y(v);
    else if (key === 'w') s.rx = L(v); else if (key === 'h') s.ry = L(v);
  } else if (s.type === 'node') {
    if (key === 'x') s.x = X(v); else if (key === 'y') s.y = Y(v);
  } else if (s.pts && s.pts.length === 2 && key.length === 2) {
    const i = +key[1] - 1;
    if (key[0] === 'x') s.pts[i].x = X(v); else s.pts[i].y = Y(v);
  } else {
    const b = bbox(s);
    if (key === 'x') translate(s, X(v) - b.x, 0);
    else if (key === 'y') translate(s, 0, Y(v) - (b.y + b.h));
    else if (key === 'w' && b.w) scaleShape(s, b.x, b.y, L(v) / b.w, 1);
    else if (key === 'h' && b.h) scaleShape(s, b.x, b.y + b.h, 1, L(v) / b.h);
  }
}
function applyProp(prop, raw) {
  if (prop.startsWith('style.')) {
    const k = prop.slice(6);
    let v = raw;
    if (['lineWidth', 'strokeOpacity', 'fillOpacity', 'rounded', 'innerSep'].includes(k)) v = parseFloat(raw) || 0;
    if (typeof raw === 'string' && /^#?[0-9a-fA-F]{6}$/.test(raw.trim()) && raw.trim()[0] !== '#') v = '#' + raw.trim();
    if (['stroke', 'fill', 'textColor'].includes(k)) {
      const t = String(v).trim().toLowerCase();
      if (t === 'none') v = 'none';
      else if (/^#[0-9a-f]{6}$/.test(t)) v = t.toUpperCase();
      else return;
    }
    state.style[k] = v;
    selShapes().forEach(s => { s.style[k] = v; });
  } else if (prop === 'text') {
    selShapes().forEach(s => { if (s.type === 'node') s.text = raw; });
  } else if (prop === 'raw') {
    selShapes().forEach(s => { if (s.type === 'raw') s.source = raw; });
  } else if (prop.startsWith('geo.')) setGeo(prop.slice(4), parseFloat(raw));
  else if (prop === 'unit') { state.unit = clamp(parseFloat(raw) || 40, 4, 400); }
  else if (prop === 'gridSize') { state.grid.size = clamp(parseFloat(raw) || 20, 1, 400); }
  else if (prop === 'scale') { state.scale = parseFloat(raw) || 1; }
}

let propTimer = null;
$('#props').addEventListener('input', e => {
  const t = e.target;
  if (!('prop' in t.dataset)) return;
  const v = t.type === 'checkbox' ? t.checked : t.value;
  applyProp(t.dataset.prop, v);
  if (t.type === 'color') { t.parentElement.style.background = t.value; }
  const span = t.parentElement.querySelector('.val');
  if (span && t.type === 'range') span.textContent = t.dataset.suffix === '%' ? Math.round(t.value * 100) + '%' : t.value + (t.dataset.suffix || '');
  render(); renderCode();
  clearTimeout(propTimer);
  propTimer = setTimeout(pushHistory, 420);
});
$('#props').addEventListener('change', e => {
  const t = e.target;
  if (!('prop' in t.dataset)) return;
  clearTimeout(propTimer); pushHistory();
  if ('refresh' in t.dataset || t.type === 'color' || t.tagName === 'TEXTAREA') renderProps();
});
$('#props').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.set) { applyProp(b.dataset.set, b.dataset.value); pushHistory(); render(); renderCode(); renderProps(); return; }
  if (b.dataset.tog) {
    const k = b.dataset.tog.slice(6);
    const cur = !(selShapes()[0] || { style: state.style }).style[k];
    state.style[k] = cur;
    selShapes().forEach(s => { s.style[k] = cur; });
    pushHistory(); render(); renderCode(); renderProps(); return;
  }
  const a = b.dataset.act;
  if (!a) return;
  if (a === 'dup') duplicateSel();
  else if (a === 'del') deleteSel();
  else if (a === 'front') zOrder('front');
  else if (a === 'back') zOrder('back');
  else if (a === 'selectAll') { state.sel = new Set(state.shapes.filter(s => s.type !== 'raw').map(s => s.id)); render(); renderProps(); renderCode(); }
  else if (a === 'fit') zoomToFit();
  else if (a === 'origin') { const r = canvas.getBoundingClientRect(); state.view.x = r.width / 2; state.view.y = r.height / 2; render(); save(); }
  else if (a.startsWith('align:')) align(a.slice(6));
});

/* ============================================================
   启动
   ============================================================ */
function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = TOOLS.map(t => t.sep ? '<hr>' :
    `<button class="tool" data-tool="${t.id}" title="${t.name} (${t.key})" aria-label="${t.name}">
       <svg viewBox="0 0 20 20"><path d="${t.icon}"/></svg><span class="kbd">${t.key}</span>
     </button>`).join('');
  rail.addEventListener('click', e => {
    const b = e.target.closest('.tool');
    if (b) setTool(b.dataset.tool);
  });
}
function renderFigurePreview() {
  if ($('#figureModal').hidden) return;
  const figure = state.figure;
  const page = $('#figurePreviewPage'), art = $('#figurePreviewArt');
  page.className = 'figure-preview-page align-' + figure.alignment;
  const caption = $('#figurePreviewCaption');
  caption.className = 'figure-preview-caption' + (figure.captionPosition === 'above' ? ' above' : '')
    + (figure.caption.trim() ? '' : ' placeholder');
  caption.replaceChildren();
  if (figure.caption.trim()) {
    caption.appendChild(document.createTextNode('图注：'));
    const previewText = figure.captionMode === 'latex'
      ? figure.caption.trim().replace(/\\([&%#_{}])/g, '$1') : figure.caption.trim();
    const content = nodeContent({ text: previewText, style: {
      fontSize: 'normalsize', math: true, captionPlain: true
    } }).template.cloneNode(true);
    content.style.fontSize = '12px';
    caption.appendChild(content);
  } else caption.textContent = '图注将显示在这里';
  art.replaceChildren();
  const shapes = state.shapes.filter(s => s.type !== 'raw');
  if (!shapes.length) {
    art.textContent = '画布为空';
    return;
  }
  const boxes = shapes.map(bbox);
  const left = Math.min(...boxes.map(b => b.x));
  const top = Math.min(...boxes.map(b => b.y));
  const right = Math.max(...boxes.map(b => b.x + b.w));
  const bottom = Math.max(...boxes.map(b => b.y + b.h));
  const width = art.clientWidth || 196, height = art.clientHeight || 105;
  const scale = Math.min((width - 12) / Math.max(1, right - left),
    (height - 12) / Math.max(1, bottom - top));
  const tx = (width - (right - left) * scale) / 2 - left * scale;
  const ty = (height - (bottom - top) * scale) / 2 - top * scale;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const defs = canvas.querySelector('defs');
  if (defs) svg.appendChild(defs.cloneNode(true));
  const group = el('g', { transform: `translate(${tx} ${ty}) scale(${scale})` }, svg);
  const labelLayer = document.createElement('div');
  labelLayer.className = 'figure-preview-labels';
  labelLayer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  for (const shape of shapes) {
    group.appendChild(shapeNode(shape));
    if (shape.type === 'node') {
      const m = measureNode(shape);
      const label = m.content.template.cloneNode(true);
      label.classList.add('on-canvas');
      label.style.left = `${m.x + m.sep}px`;
      label.style.top = `${m.y + m.sep}px`;
      label.style.color = shape.style.textColor;
      labelLayer.appendChild(label);
    }
  }
  art.append(svg, labelLayer);
}
function syncFigureControls() {
  const figure = state.figure;
  $('#figureEnabled').checked = !!figure.enabled;
  $('#figureAlign').value = figure.alignment;
  const placement = $('#figurePlacement');
  placement.querySelector('option[data-custom]')?.remove();
  if (![...placement.options].some(o => o.value === figure.placement)) {
    const option = document.createElement('option');
    option.value = figure.placement;
    option.textContent = figure.placement + ' · 导入原值';
    option.dataset.custom = '1';
    placement.appendChild(option);
  }
  placement.value = figure.placement;
  $('#figureCaptionPosition').value = figure.captionPosition;
  $('#figureCaptionMode').value = figure.captionMode;
  $('#figureCaption').value = figure.caption;
  $('#figureLabel').value = figure.label;
  syncToggles();
  renderFigurePreview();
}
function openFigureModal() {
  $('#figureModal').hidden = false;
  syncFigureControls();
}
function closeFigureModal() { $('#figureModal').hidden = true; }
function syncToggles() {
  $('#snapToggle').classList.toggle('on', state.grid.snap);
  $('#gridToggle').classList.toggle('on', state.grid.show);
  $('#optPicture').checked = state.includeEnvironment || state.figure.enabled;
  $('#optPicture').disabled = !!state.figure.enabled;
  $('#optPicture').title = state.figure.enabled ? 'figure 排版需要完整的 tikzpicture 环境' : '';
  $('#optDependencies').checked = state.includeDependencies;
  $('#codeTitle').textContent = state.figure.enabled ? 'Figure 排版代码' : 'TikZ 图内代码';
  $('#figureSettingsBtn').classList.toggle('on', !!state.figure.enabled);
}
function bindChrome() {
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#zoomIn').onclick = () => zoomAt(1.2);
  $('#zoomOut').onclick = () => zoomAt(1 / 1.2);
  $('#zoomLevel').onclick = () => { state.view.z = 1; render(); save(); };
  $('#zoomFit').onclick = zoomToFit;
  $('#snapToggle').onclick = () => { state.grid.snap = !state.grid.snap; syncToggles(); save(); };
  $('#gridToggle').onclick = () => { state.grid.show = !state.grid.show; syncToggles(); render(); save(); };
  $('#copyCode').onclick = copyCode;
  $('#importCode').onclick = openImport;
  $('#editCode').onclick = openImport;
  $('#downloadCode').onclick = downloadCode;
  $('#figureSettingsBtn').onclick = openFigureModal;
  $('#figureClose').onclick = closeFigureModal;
  $('#figureModal').addEventListener('click', e => { if (e.target.id === 'figureModal') closeFigureModal(); });
  const figureFields = {
    figureEnabled: 'enabled', figureAlign: 'alignment', figurePlacement: 'placement',
    figureCaptionPosition: 'captionPosition', figureCaptionMode: 'captionMode',
    figureCaption: 'caption', figureLabel: 'label'
  };
  for (const [id, key] of Object.entries(figureFields)) {
    const field = $('#' + id);
    field.addEventListener(id === 'figureCaption' || id === 'figureLabel' ? 'input' : 'change', () => {
      if (id === 'figureLabel') field.value = field.value.replace(/[^A-Za-z0-9:._/-]/g, '');
      state.figure[key] = field.type === 'checkbox' ? field.checked : field.value;
      if (id !== 'figureEnabled') {
        state.figure.enabled = true;
        $('#figureEnabled').checked = true;
      }
      syncToggles(); renderCode(); renderFigurePreview(); save();
    });
  }
  $('#importClose').onclick = closeImport;
  $('#importCancel').onclick = closeImport;
  $('#importApply').onclick = applyImport;
  $('#importText').addEventListener('input', previewImport);
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2_000_000) { $('#importWarnings').textContent = '文件超过 2 MB，请选择较小的 TikZ 文件。'; return; }
    $('#importText').value = await file.text();
    previewImport();
  });
  $('#importModal').addEventListener('click', e => { if (e.target.id === 'importModal') closeImport(); });
  $('#optPicture').onchange = e => { state.includeEnvironment = e.target.checked; renderCode(); save(); };
  $('#optDependencies').onchange = e => { state.includeDependencies = e.target.checked; renderCode(); save(); };
  $('#loadDemo').onclick = () => {
    state.shapes = demoShapes(); state.sel.clear(); state.importLibraries = [];
    state.importPictureOptions = []; state.scale = 1;
    pushHistory(); zoomToFit(); renderProps(); renderCode();
  };
  $('#clearAll').onclick = () => {
    if (!state.shapes.length) return;
    state.shapes = []; state.sel.clear();
    pushHistory(); render(); renderProps(); renderCode();
    showHint('画布已清空 · ⌘Z 可撤销');
  };
  $('#statTip').onclick = () => { $('#help').hidden = false; };
  $('#helpClose').onclick = () => { $('#help').hidden = true; };
  $('#help').onclick = e => { if (e.target.id === 'help') $('#help').hidden = true; };
  $('#keysList').innerHTML = SHORTCUTS.map(([k, d]) => `<div><span>${d}</span><kbd>${k}</kbd></div>`).join('');
  window.addEventListener('resize', () => render());
}

function init() {
  buildCanvas();
  buildRail();
  bindChrome();
  const had = load();
  if (!had || !state.shapes.length) { state.shapes = demoShapes(); }
  syncToggles();
  setTool('select');
  hist.stack = [snapshot()]; hist.i = 0;
  updateHistButtons();
  if (!had) zoomToFit(); else render();
  renderProps(); renderCode();
  if (document.fonts) {
    const refreshFontMetrics = () => { NODE_CONTENT_CACHE.clear(); render(); };
    document.fonts.ready.then(refreshFontMetrics);
    document.fonts.addEventListener?.('loadingdone', refreshFontMetrics);
  }
  showHint('拖拽绘制 · 按 ? 查看全部快捷键');
}
init();
