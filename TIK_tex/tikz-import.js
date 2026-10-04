/* A deliberately bounded TikZ reader. Every statement it cannot model is kept
   verbatim, so a visual edit never silently removes source code. */
(function (root) {
  'use strict';

  const BASE = {
    stroke: '#000000', fill: 'none', lineWidth: 0.6, dash: 'solid',
    strokeOpacity: 1, fillOpacity: 1, rounded: 0,
    arrowStart: false, arrowEnd: false, tip: 'to',
    fontSize: 'normalsize', textColor: '#000000', math: true,
    anchor: 'center', nodeShape: 'none', innerSep: 3
  };
  const COLORS = {
    black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#00FF00',
    blue: '#0000FF', cyan: '#00FFFF', magenta: '#FF00FF', yellow: '#FFFF00',
    gray: '#808080', grey: '#808080', lightgray: '#BFBFBF', darkgray: '#404040',
    orange: '#FF8000', brown: '#BF8040', lime: '#BFFF00', olive: '#808000',
    pink: '#FFBFBF', purple: '#BF0040', teal: '#008080', violet: '#800080'
  };
  const WIDTHS = { 'ultra thin': .1, 'very thin': .2, thin: .4, semithick: .6,
    thick: .8, 'very thick': 1.2, 'ultra thick': 1.6 };
  const DASHES = new Set(['solid', 'dashed', 'densely dashed', 'loosely dashed',
    'dotted', 'densely dotted', 'dash dot', 'dash dot dot']);
  const SIZES = new Set(['tiny', 'scriptsize', 'footnotesize', 'small', 'normalsize',
    'large', 'Large', 'LARGE', 'huge', 'Huge']);
  const ANCHORS = new Set(['center', 'north', 'south', 'east', 'west', 'north east',
    'north west', 'south east', 'south west']);
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  const id = () => Math.random().toString(36).slice(2, 9);

  function stripComments(text) {
    return text.split(/\r?\n/).map(line => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) return line.slice(0, i);
      }
      return line;
    }).join('\n');
  }
  function splitTop(text, delimiter) {
    const out = []; let start = 0, braces = 0, brackets = 0, parens = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\\' && i + 1 < text.length) { i++; continue; }
      if (c === '{') braces++; else if (c === '}') braces--;
      else if (c === '[') brackets++; else if (c === ']') brackets--;
      else if (c === '(') parens++; else if (c === ')') parens--;
      if (c === delimiter && !braces && !brackets && !parens) {
        out.push(text.slice(start, i)); start = i + 1;
      }
    }
    out.push(text.slice(start));
    return out;
  }
  function balanced(text, open, close) {
    if (!text.startsWith(open)) return null;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\\' && i + 1 < text.length) { i++; continue; }
      if (text[i] === open) depth++;
      else if (text[i] === close && --depth === 0) return [text.slice(1, i), text.slice(i + 1)];
    }
    return null;
  }
  function hexMix(a, b, share) {
    const aa = a.match(/[\da-f]{2}/gi), bb = b.match(/[\da-f]{2}/gi);
    return '#' + aa.map((v, i) => Math.round(parseInt(v, 16) * share + parseInt(bb[i], 16) * (1 - share))
      .toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function color(expr, colors) {
    const parts = expr.trim().replace(/^\{(.*)\}$/, '$1').split('!');
    let c = colors[parts[0].trim()] || (/^#[\da-f]{6}$/i.test(parts[0].trim()) ? parts[0].trim().toUpperCase() : null);
    if (!c) return null;
    for (let i = 1; i < parts.length; i += 2) {
      const p = Number(parts[i]);
      const next = parts[i + 1] ? colors[parts[i + 1].trim()] : colors.white;
      if (!(p >= 0 && p <= 100) || !next) return null;
      c = hexMix(c, next, p / 100);
    }
    return c;
  }
  function length(s, unit, defaultUnit = 'cm') {
    const m = s.trim().match(new RegExp('^(' + number + ')\\s*(cm|mm|pt|in|bp|px)?$', 'i'));
    if (!m) return null;
    const v = Number(m[1]), u = (m[2] || defaultUnit).toLowerCase();
    return v * ({ cm: unit, mm: unit / 10, pt: unit / 28.4527559,
      bp: unit / 28.3464567, in: unit * 2.54, px: 1 })[u];
  }
  function point(raw, unit, prev) {
    const m = raw.match(/^\s*(\+\+?|)\s*\((.*)\)\s*$/s);
    if (!m) return null;
    const nums = splitTop(m[2], ',');
    if (nums.length !== 2) return null;
    const x = length(nums[0], unit), y = length(nums[1], unit);
    if (x === null || y === null) return null;
    return { x: x + (m[1] && prev ? prev.x : 0), y: -y + (m[1] && prev ? prev.y : 0) };
  }
  function readPoint(text, unit, prev) {
    const m = text.match(/^\s*(\+\+?|)\s*(\([^)]*\))/s);
    if (!m) return null;
    const p = point(m[1] + m[2], unit, prev);
    return p ? { p, rest: text.slice(m[0].length) } : null;
  }
  function options(raw, st, colors, node = false, command = 'draw') {
    const extra = {};
    for (const opt of splitTop(raw || '', ',')) {
      const t = opt.trim(); if (!t) continue;
      const eq = t.indexOf('='), key = (eq < 0 ? t : t.slice(0, eq)).trim();
      const val = eq < 0 ? null : t.slice(eq + 1).trim();
      if (key === 'draw') { st.stroke = val ? color(val, colors) : '#000000'; if (!st.stroke) return null; if (node) st.nodeShape = st.nodeShape === 'none' ? 'rectangle' : st.nodeShape; }
      else if (key === 'fill') {
        st.fill = val ? color(val, colors) : '#000000'; if (!st.fill) return null;
        if (node && st.nodeShape === 'none') st.nodeShape = 'rectangle';
      }
      else if (key === 'color') { const c = color(val || '', colors); if (!c) return null; st.stroke = c; st.textColor = c; }
      else if (key === 'text') { st.textColor = color(val || '', colors); if (!st.textColor) return null; }
      else if (color(key, colors)) {
        const c = color(key, colors);
        if (command === 'fill') st.fill = c;
        else if (command === 'filldraw') { st.stroke = c; st.fill = c; }
        else if (node) st.textColor = c;
        else st.stroke = c;
      }
      else if (key === 'line width') { const w = length(val || '', 28.4527559, 'pt'); if (w === null) return null; st.lineWidth = w; }
      else if (Object.hasOwn(WIDTHS, key)) st.lineWidth = WIDTHS[key];
      else if (DASHES.has(key)) st.dash = key;
      else if (key === 'draw opacity' || key === 'fill opacity' || key === 'opacity') {
        const v = Number(val); if (!(v >= 0 && v <= 1)) return null;
        if (key !== 'fill opacity') st.strokeOpacity = v;
        if (key !== 'draw opacity') st.fillOpacity = v;
      }
      else if (key === 'rounded corners') { const r = length(val || '4pt', 28.4527559, 'pt'); if (r === null) return null; st.rounded = r; }
      else if (key === 'anchor' && node) { if (!ANCHORS.has(val)) return null; st.anchor = val; }
      else if (key === 'inner sep' && node) { const n = length(val || '', 28.4527559, 'pt'); if (n === null) return null; st.innerSep = n; }
      else if (key === 'font' && node) { const f = (val || '').replace(/^\\/, ''); if (!SIZES.has(f)) return null; st.fontSize = f; }
      else if (key === 'align' && node && val === 'center') { /* multiline preview is centered */ }
      else if (node && ['rectangle', 'circle', 'ellipse'].includes(key)) st.nodeShape = key;
      else if (['->', '<-', '<->', '-', '{Latex}-', '-{Latex}', '{Latex}-{Latex}',
        '{Stealth}-', '-{Stealth}', '{Stealth}-{Stealth}'].includes(key)) {
        st.arrowStart = key.startsWith('<') || key.startsWith('{');
        st.arrowEnd = key.endsWith('>') || key.endsWith('}');
        st.tip = key.includes('Latex') ? 'Latex' : key.includes('Stealth') ? 'Stealth' : 'to';
      }
      else if (key === 'scale' && node) { extra.scale = Number(val); if (!Number.isFinite(extra.scale)) return null; }
      else return null;
    }
    return extra;
  }
  function prefix(statement) {
    const m = statement.trim().match(/^\\(draw|filldraw|fill|path|node)\b\s*/);
    if (!m) return null;
    let rest = statement.trim().slice(m[0].length), opts = '';
    if (rest.startsWith('[')) {
      const b = balanced(rest, '[', ']'); if (!b) return null;
      opts = b[0]; rest = b[1].trim();
    }
    return { cmd: m[1], opts, rest };
  }
  function parseNode(body, st, unit) {
    const at = body.match(/^at\s*/); if (!at) return null;
    const p = readPoint(body.slice(at[0].length), unit); if (!p) return null;
    const txt = balanced(p.rest.trim(), '{', '}');
    if (!txt || txt[1].trim()) return null;
    let math = '', text = '';
    for (let i = 0; i < txt[0].length; i++) {
      const c = txt[0][i], next = txt[0][i + 1];
      if (c === '$' && (i === 0 || txt[0][i - 1] !== '\\')) {
        const pair = next === '$' ? '$$' : '$';
        if (!math) math = pair;
        else if (math === pair) math = '';
        text += pair; i += pair.length - 1; continue;
      }
      if (c === '\\' && !math && (next === '(' || next === '[')) math = next;
      else if (c === '\\' && math === '(' && next === ')') math = '';
      else if (c === '\\' && math === '[' && next === ']') math = '';
      if (!math && txt[0][i] === '\\' && txt[0][i + 1] === '\\') {
        text += '\n'; i++;
      } else text += txt[0][i];
    }
    return { id: id(), type: 'node', x: p.p.x, y: p.p.y, text, style: st };
  }
  function parsePath(body, st, unit) {
    const plotBody = body.trim();
    if (plotBody.startsWith('plot')) {
      const m = plotBody.match(/^plot\s*(\[[^\]]*\])?\s*coordinates\s*/);
      if (!m || (m[1] && !/^\[\s*smooth\s*\]$/.test(m[1]))) return null;
      const b = balanced(plotBody.slice(m[0].length).trim(), '{', '}');
      if (!b || b[1].trim()) return null;
      const matches = [...b[0].matchAll(/\([^()]*\)/g)];
      if (matches.length < 2 || b[0].replace(/\([^()]*\)/g, '').trim()) return null;
      const pts = matches.map(m => point(m[0], unit));
      if (pts.some(p => !p)) return null;
      return { id: id(), type: m[1] ? 'pencil' : 'polyline', pts, style: st };
    }
    const first = readPoint(body, unit); if (!first) return null;
    const a = first.p; let rest = first.rest.trim();
    if (rest.startsWith('rectangle')) {
      const b = readPoint(rest.slice(9), unit, a); if (!b || b.rest.trim()) return null;
      return { id: id(), type: 'rect', x: Math.min(a.x, b.p.x), y: Math.min(a.y, b.p.y),
        w: Math.abs(a.x - b.p.x), h: Math.abs(a.y - b.p.y), style: st };
    }
    if (rest.startsWith('circle')) {
      rest = rest.slice(6).trim();
      let rad = null;
      if (rest.startsWith('[')) {
        const b = balanced(rest, '[', ']');
        if (b && !b[1].trim()) { const m = b[0].match(/^\s*radius\s*=\s*(.+)\s*$/); if (m) rad = length(m[1], unit); }
      } else if (rest.startsWith('(') && rest.endsWith(')')) rad = length(rest.slice(1, -1), unit);
      if (rad === null) return null;
      return { id: id(), type: 'ellipse', cx: a.x, cy: a.y, rx: Math.abs(rad), ry: Math.abs(rad), style: st };
    }
    if (rest.startsWith('ellipse')) {
      rest = rest.slice(7).trim(); let rx = null, ry = null;
      if (rest.startsWith('[')) {
        const b = balanced(rest, '[', ']'); if (!b || b[1].trim()) return null;
        for (const o of splitTop(b[0], ',')) {
          const kv = o.split('='); if (kv.length !== 2) return null;
          if (kv[0].trim() === 'x radius') rx = length(kv[1], unit);
          else if (kv[0].trim() === 'y radius') ry = length(kv[1], unit);
          else return null;
        }
      } else if (rest.startsWith('(') && rest.endsWith(')')) {
        const m = rest.slice(1, -1).split(/\s+and\s+/);
        if (m.length === 2) { rx = length(m[0], unit); ry = length(m[1], unit); }
      }
      if (rx === null || ry === null) return null;
      return { id: id(), type: 'ellipse', cx: a.x, cy: a.y, rx: Math.abs(rx), ry: Math.abs(ry), style: st };
    }
    if (rest.startsWith('.. controls')) {
      const c1 = readPoint(rest.slice(11), unit, a); if (!c1) return null;
      const and = c1.rest.match(/^\s*and\s*/); if (!and) return null;
      const c2 = readPoint(c1.rest.slice(and[0].length), unit, a); if (!c2) return null;
      const dots = c2.rest.match(/^\s*\.\.\s*/); if (!dots) return null;
      const end = readPoint(c2.rest.slice(dots[0].length), unit, a);
      if (!end || end.rest.trim()) return null;
      return { id: id(), type: 'bezier', p0: a, c1: c1.p, c2: c2.p, p1: end.p, style: st };
    }
    const pts = [a];
    while (rest.startsWith('--')) {
      rest = rest.slice(2).trim();
      if (rest.startsWith('cycle')) {
        if (rest.slice(5).trim() || pts.length < 2) return null;
        return { id: id(), type: 'polygon', pts, style: st };
      }
      const p = readPoint(rest, unit, pts.at(-1)); if (!p) return null;
      pts.push(p.p); rest = p.rest.trim();
    }
    if (rest || pts.length < 2) return null;
    return { id: id(), type: pts.length === 2 ? 'line' : 'polyline', pts, style: st };
  }
  function parseStatement(statement, unit, colors) {
    const p = prefix(statement); if (!p) return null;
    const st = { ...BASE };
    if (p.cmd === 'fill') { st.stroke = 'none'; st.fill = '#000000'; }
    if (p.cmd === 'filldraw') st.fill = '#000000';
    if (p.cmd === 'path') st.stroke = 'none';
    if (p.cmd === 'node') st.stroke = 'none';
    if (!options(p.opts, st, colors, p.cmd === 'node', p.cmd)) return null;
    if (p.cmd === 'path' && st.stroke === 'none' && st.fill === 'none') return null;
    if (p.cmd === 'node') return parseNode(p.rest, st, unit);
    return parsePath(p.rest, st, unit);
  }
  function parseFigure(code, pictureStart, pictureEnd) {
    const starts = [...code.slice(0, pictureStart).matchAll(/\\begin\s*\{figure\}\s*(?:\[([^\]]*)\])?/g)];
    const start = starts.at(-1);
    if (!start || /\\end\s*\{figure\}/.test(code.slice(start.index, pictureStart))) return null;
    const endTag = /\\end\s*\{figure\}/g;
    endTag.lastIndex = pictureEnd;
    const end = endTag.exec(code);
    if (!end) return null;
    const before = code.slice(start.index + start[0].length, pictureStart);
    const after = code.slice(pictureEnd, end.index);
    const readCommand = (part, name) => {
      const pattern = new RegExp('\\\\' + name + '\\s*(?:\\[[^\\]]*\\]\\s*)?\\{');
      const match = pattern.exec(part);
      if (!match) return null;
      const openAt = match.index + match[0].lastIndexOf('{');
      const arg = balanced(part.slice(openAt), '{', '}');
      return arg ? arg[0] : null;
    };
    const beforeCaption = readCommand(before, 'caption');
    const caption = beforeCaption ?? readCommand(after, 'caption') ?? '';
    const label = readCommand(before, 'label') ?? readCommand(after, 'label') ?? '';
    const alignment = /\\raggedright\b/.test(before) ? 'left'
      : /\\raggedleft\b/.test(before) ? 'right' : 'center';
    return { enabled: true, alignment, placement: (start[1] || 'htbp').trim(),
      captionPosition: beforeCaption !== null ? 'above' : 'below',
      captionMode: 'latex', caption, label };
  }
  function parse(source, unit = 40) {
    if (typeof source !== 'string' || !source.trim()) return { shapes: [], warnings: ['请输入 TikZ 代码。'], libraries: [], pictureOptions: [], figure: null, scale: 1, editable: 0, preserved: 0 };
    const code = stripComments(source);
    const colors = { ...COLORS }, libraries = new Set(), warnings = [];
    const definitions = [...code.matchAll(/\\definecolor\s*\{([^}]+)\}\s*\{([^}]+)\}\s*\{([^}]+)\}/g)];
    for (const m of definitions) {
      if (m[2] === 'HTML' && /^[\da-f]{6}$/i.test(m[3])) colors[m[1]] = '#' + m[3].toUpperCase();
      else warnings.push('颜色定义 ' + m[1] + ' 无法解析，相关图元会保留为原代码。');
    }
    for (const m of code.matchAll(/\\usetikzlibrary\s*\{([^}]+)\}/g))
      m[1].split(',').map(x => x.trim()).filter(Boolean).forEach(x => libraries.add(x));
    const env = code.match(/\\begin\s*\{tikzpicture\}\s*(\[[^\]]*\])?/);
    const endTag = /\\end\s*\{tikzpicture\}/g;
    endTag.lastIndex = env ? env.index + env[0].length : 0;
    const pictureEnd = env ? endTag.exec(code) : null;
    const end = pictureEnd ? pictureEnd.index : -1;
    const figure = env && pictureEnd ? parseFigure(code, env.index, pictureEnd.index + pictureEnd[0].length) : null;
    let body = code, scale = 1;
    const pictureOptions = [];
    if (env) {
      body = code.slice(env.index + env[0].length, end < 0 ? undefined : end);
      if (env[1]) {
        const opts = splitTop(env[1].slice(1, -1), ',').map(x => x.trim());
        for (const opt of opts) {
          if (opt === 'x=1cm' || opt === 'y=1cm') continue;
          if (/^scale\s*=/.test(opt) && Number.isFinite(Number(opt.split('=')[1]))) scale = Number(opt.split('=')[1]);
          else {
            pictureOptions.push(opt);
            warnings.push('画布选项「' + opt + '」会在导出时保留；画布预览暂不应用它。');
          }
        }
      }
    } else {
      body = code.replace(/\\definecolor\s*\{[^}]+\}\s*\{[^}]+\}\s*\{[^}]+\}/g, '')
        .replace(/\\usetikzlibrary\s*\{[^}]+\}/g, '');
    }
    const shapes = [];
    const keepRaw = (source, warning) => {
      shapes.push({ id: id(), type: 'raw', source, x: 0, y: 0, style: { ...BASE } });
      warnings.push(warning);
    };
    const parsePart = part => {
      const chunks = splitTop(part, ';');
      for (let i = 0; i < chunks.length; i++) {
        const src = chunks[i].trim(); if (!src) continue;
        const line = src + (i < chunks.length - 1 ? ';' : '');
        const s = parseStatement(src, unit, colors);
        if (s) shapes.push(s);
        else keepRaw(line, '保留原代码：' + line.replace(/\s+/g, ' ').slice(0, 100));
      }
    };
    const scopeTag = /\\(begin|end)\s*\{scope\}/g;
    let cursor = 0, begin;
    while ((begin = scopeTag.exec(body))) {
      if (begin[1] !== 'begin') continue;
      parsePart(body.slice(cursor, begin.index));
      let depth = 1, end = null, tag;
      while ((tag = scopeTag.exec(body))) {
        depth += tag[1] === 'begin' ? 1 : -1;
        if (!depth) { end = scopeTag.lastIndex; break; }
      }
      if (end === null) {
        keepRaw(body.slice(begin.index).trim(), '未闭合的 scope 环境已按原代码保留。');
        cursor = body.length; break;
      }
      keepRaw(body.slice(begin.index, end).trim(), 'scope 环境已按原代码保留：其中的图形没有单独预览。');
      cursor = end;
      scopeTag.lastIndex = end;
    }
    parsePart(body.slice(cursor));
    const editable = shapes.filter(s => s.type !== 'raw').length;
    return { shapes, warnings, libraries: [...libraries], pictureOptions, figure, scale, editable,
      preserved: shapes.length - editable };
  }
  root.TikzImport = { parse };
})(typeof window === 'undefined' ? globalThis : window);
