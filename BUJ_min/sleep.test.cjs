const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// 直接运行应用的数据层和绘图函数；不启动页面或读写真实浏览器存储。
const source = fs.readFileSync(`${__dirname}/app.js`, 'utf8');
function app() {
  const context = vm.createContext({ localStorage: { getItem: () => null } });
  vm.runInContext(source.slice(0, source.indexOf('/* ---------- change tracking ---------- */')), context);
  vm.runInContext(source.slice(source.indexOf('function sleepSVG('), source.indexOf('/* ---------- search ---------- */')), context);
  return expression => JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
}

test('旧文件导入补齐心率，保留睡眠与体重，导出后仍可读', () => {
  const run = app();
  const result = run(`(() => {
    D = parseDoc(JSON.stringify({ weeks: { '2026-11-09': {
      sleep: { bed: ['23:30'], wake: ['07:20'], wt: ['52.4'] }
    } } }));
    return parseDoc(serialize()).weeks['2026-11-09'].sleep;
  })()`);
  assert.deepEqual(result.rhr, Array(7).fill(''));
  assert.equal(result.wt[0], '52.4');
  assert.equal(result.bed[0], '23:30');
  assert.equal(result.wake[0], '07:20');
});

test('心率 JSON 往返、补齐和截断；新周不沿用测量值', () => {
  const run = app();
  const result = run(`(() => {
    D = parseDoc(JSON.stringify({ weeks: { '2026-11-09': {
      sleep: { rhr: ['62', '', '58'] }
    } } }));
    return { saved: parseDoc(serialize()).weeks['2026-11-09'].sleep.rhr,
      next: newWeek('2026-11-16').sleep.rhr,
      long: normalizeSleep({ rhr: Array(9).fill('60') }).rhr,
      invalid: normalizeSleep({ rhr: 60 }).rhr };
  })()`);
  assert.deepEqual(result.saved, ['62', '', '58', '', '', '', '']);
  assert.deepEqual(result.next, Array(7).fill(''));
  assert.deepEqual(result.long, Array(7).fill('60'));
  assert.deepEqual(result.invalid, Array(7).fill(''));
});

test('仅记录静息心率即可画图，缺测日断开，非法数值不作图', () => {
  const run = app();
  assert.deepEqual(run(`restingHeartRateModel(['62', '', '58', '0', '-1', '60.5', 'NaN']).values`),
    [62, null, 58, null, null, null, null]);
  const svg = run(`sleepSVG({ sleep: normalizeSleep({ rhr: ['62', '', '58', '61'] }) })`);
  assert.match(svg, /静息心率 · bpm/);
  assert.doesNotMatch(svg, /class="hint"|class="ln wt"|NaN|Infinity/);
  assert.equal((svg.match(/class="pt rhr"/g) || []).length, 3);
  const path = svg.match(/<path d="([^"]*)" class="ln rhr"/)[1];
  assert.equal((path.match(/M/g) || []).length, 2);
  assert.equal((path.match(/L/g) || []).length, 1);
  assert.equal(run(`restingHeartRateSVG(['', '0', '-1'])`), '');
});

test('单个读数、全周相同读数和跨度较大时，刻度都有余量且覆盖数据', () => {
  const run = app();
  for (const values of [['60'], Array(7).fill('60'), ['1', '999']]) {
    const m = run(`restingHeartRateModel(${JSON.stringify(values)})`);
    assert.ok(m.upper > m.lower);
    for (const value of m.values.filter(v => v != null)) {
      assert.ok(value >= m.lower && value <= m.upper);
    }
    assert.doesNotMatch(run(`restingHeartRateSVG(${JSON.stringify(values)})`), /NaN|Infinity/);
  }
});

test('睡眠条、体重线与心率图可同时显示', () => {
  const run = app();
  const svg = run(`sleepSVG({ sleep: normalizeSleep({ bed: ['23:30'], wake: ['07:20'], wt: ['52.4'], rhr: ['62'] }) })`);
  assert.match(svg, /class="bar"/);
  assert.match(svg, /class="pt wt"/);
  assert.match(svg, /class="pt rhr"/);
});

test('显示设置回落到默认值、字号倍数递增，且不写入导出的手帐 JSON', () => {
  const run = app();
  const res = run(`(() => {
    const def = normalizeAppearance(null);
    const partial = normalizeAppearance({ paperForm: 'grid', font: 'serif', textSize: 'extraLarge', palette: 'mint' });
    const bogus = normalizeAppearance({ paperForm: 'nope', font: '', textSize: 'huge', palette: 'bogus' });
    UI.appearance = partial;
    const exported = JSON.parse(serialize());
    return {
      def, partial, bogus,
      scales: TEXT_SIZES.map(x => x[2]),
      forms: PAPER_FORMS.map(x => x[0]),
      palettes: PAPER_PALETTES.map(x => x[0]),
      swatches: PAPER_PALETTES.map(x => x[2]),
      hasAppearInDoc: 'appearance' in exported,
      wd: WD,
    };
  })()`);
  assert.deepEqual(res.def, { paperForm: 'dots', font: 'handwriting', textSize: 'standard', palette: 'classic' });
  assert.deepEqual(res.partial, { paperForm: 'grid', font: 'serif', textSize: 'extraLarge', palette: 'mint' });
  assert.deepEqual(res.bogus, res.def);
  assert.deepEqual(res.scales, [0.88, 1, 1.14, 1.28]);
  assert.deepEqual(res.forms, ['dots', 'lines', 'grid', 'blank']);
  assert.deepEqual(res.palettes, ['classic', 'cream', 'mint', 'sky', 'rose']);
  assert.equal(new Set(res.swatches).size, res.swatches.length);
  assert.equal(res.hasAppearInDoc, false);
  assert.deepEqual(res.wd, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});

test('显示设置弹窗交互：切换即时写入根节点与 localStorage，恢复默认并关闭正常', () => {
  const store = {};
  const mkEl = () => ({ hidden: true, innerHTML: '', textContent: '', dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {} });
  const els = Object.fromEntries(['#pL', '#pR', '#tabs', '#navbar', '#menu', '#appearModal', '#toast', '#fstat', '#bReconnect', '#banner', '#bAppear', '#bOpen', '#bSave', '#bSaveAs', '#fileIn', '#spread'].map(k => [k, mkEl()]));
  const docEl = { dataset: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v; } } };
  const ctx = vm.createContext({
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    document: { documentElement: docEl, activeElement: null, querySelector: s => els[s] || null, querySelectorAll: () => [], addEventListener() {}, fonts: { ready: Promise.resolve() } },
    window: { addEventListener() {}, scrollTo() {} },
    ResizeObserver: class { observe() {} },
    CSS: { escape: s => s },
    setTimeout, clearTimeout,
  });
  vm.runInContext(source, ctx);
  assert.equal(docEl.dataset.paper, 'dots');
  assert.equal(docEl.style.props['--ts'], '1');

  vm.runInContext('openAppearModal()', ctx);
  assert.equal(els['#appearModal'].hidden, false);
  assert.match(els['#appearModal'].innerHTML, /笔记本形态/);

  vm.runInContext('ACT.appear({ dataset: { k: "palette", v: "rose" } }); ACT.appear({ dataset: { k: "paperForm", v: "lines" } }); ACT.appear({ dataset: { k: "textSize", v: "extraLarge" } });', ctx);
  assert.equal(docEl.dataset.palette, 'rose');
  assert.equal(docEl.dataset.paper, 'lines');
  assert.equal(docEl.style.props['--ts'], '1.28');
  assert.equal(JSON.parse(store['mini-bujo.ui']).appearance.palette, 'rose');

  vm.runInContext('ACT.resetappear(); ACT.closeappear();', ctx);
  assert.equal(docEl.dataset.palette, 'classic');
  assert.equal(docEl.dataset.paper, 'dots');
  assert.equal(docEl.style.props['--ts'], '1');
  assert.equal(els['#appearModal'].hidden, true);
});
