const lab = document.querySelector('#lab');
const moneyEl = document.querySelector('#money'), waveEl = document.querySelector('#wave');
const healthEl = document.querySelector('#health'), message = document.querySelector('#message');
const startBtn = document.querySelector('#startBtn'), powerBtn = document.querySelector('#powerBtn');
const upgradeBtn = document.querySelector('#upgradeBtn'), salvageBtn = document.querySelector('#salvageBtn');
const soundBtn = document.querySelector('#soundBtn'), forecastEl = document.querySelector('#forecast');

const towerDefs = {
  rum: { cost: 50, upgrade: 45, hp: 130, rate: 720, damage: 20, range: 185, name: '朗姆', effect: 'slow', shot: 'rum', image: 'assets/rum.png' },
  vodka: { cost: 70, upgrade: 55, hp: 175, rate: 1050, damage: 32, range: 240, name: '伏特加', effect: 'freeze', shot: 'vodka', image: 'assets/vodka.png' },
  wine: { cost: 90, upgrade: 65, hp: 150, rate: 820, damage: 11, range: 125, name: '红酒', effect: 'splash', shot: 'wine', image: 'assets/wine.png' },
  gel: { cost: 110, upgrade: 70, hp: 245, rate: 1600, damage: 14, range: 150, name: '电泳槽', effect: 'push', image: 'assets/electrophoresis.png' }
};
const enemyDefs = {
  carrot: { hp: 88, speed: 13, attack: 10, hitRate: 1050, reward: 17, src: 'assets/carrot.png', label: '根茎冲锋者' },
  shred: { hp: 42, speed: 27, attack: 4, hitRate: 470, reward: 10, src: 'assets/shreds.png', label: '碎丝集群' },
  juice: { hp: 190, speed: 9, attack: 7, hitRate: 900, reward: 32, src: 'assets/juice.png', label: '加班胡萝卜汁' },
  book: { hp: 430, speed: 7, attack: 16, hitRate: 1080, reward: 72, src: 'assets/biochem.png', label: '生物化学精英' },
  carrotwine: { hp: 980, speed: 5, attack: 23, hitRate: 1000, reward: 180, src: 'assets/carrot-wine.png', label: '胡萝卜酒首领' }
};

let money = 150, health = 100, wave = 1, selected = 'rum', paused = false, ended = false;
let waveRunning = false, intermission = false, planned = [], spawnElapsed = 0, last = performance.now();
let towers = [], enemies = [], bullets = [], emergencyCharges = 2, selectedTower = null, laneAlerts = [];
let kills = 0, towersLost = 0, refunds = 0, carrotwineState = 'not-spawned', lastChaseMode = '', lastMotionProfile = '', chaseTimer = null, chaseAnimations = [];
let soundEnabled = true, audioContext = null;

const say = text => message.textContent = text;
const pos = (c, r) => ({ x: (c + .5) * 20, y: (r + .5) * 20 });
function initAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function tone(from, duration = .07, type = 'sine', volume = .025, to = from) { if (!soundEnabled || !audioContext) return; const osc = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime; osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration); osc.connect(gain).connect(audioContext.destination); osc.start(now); osc.stop(now + duration); }
function noise(duration = .08, volume = .02, filterFreq = 1200, filterType = 'lowpass') { if (!soundEnabled || !audioContext) return; const frames = Math.max(1, Math.floor(audioContext.sampleRate * duration)), buffer = audioContext.createBuffer(1, frames, audioContext.sampleRate), data = buffer.getChannelData(0), source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain(), now = audioContext.currentTime; for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames); source.buffer = buffer; filter.type = filterType; filter.frequency.value = filterFreq; gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration); source.connect(filter).connect(gain).connect(audioContext.destination); source.start(now); }
function materialSound(kind) { if (!soundEnabled || !audioContext) return; if (kind === 'rum') { tone(145, .14, 'triangle', .025, 82); noise(.13, .028, 550); } if (kind === 'vodka') { tone(1720, .045, 'sine', .028, 1080); tone(1280, .055, 'sine', .018, 780); } if (kind === 'wine') { tone(205, .16, 'sine', .028, 105); noise(.09, .012, 430); } if (kind === 'gel') { tone(95, .09, 'square', .02, 620); noise(.045, .012, 2300, 'highpass'); } if (kind === 'carrot') noise(.09, .035, 1250); if (kind === 'shred') noise(.045, .02, 2600, 'highpass'); if (kind === 'juice') { tone(105, .16, 'sine', .018, 67); noise(.11, .016, 340); } if (kind === 'book') { noise(.16, .03, 820); tone(72, .13, 'triangle', .02, 52); } if (kind === 'carrotwine') { tone(92, .22, 'triangle', .04, 58); noise(.18, .026, 480); } }
function previewText() { const plan = makePlan(), count = type => plan.filter(entry => entry.type === type).length, hpBoost = Math.round((wave - 1) * 15); return `下夜预报：根茎 ${count('carrot')} · 碎丝 ${count('shred')}${count('juice') ? ` · 加班汁 ${count('juice')}` : ''}${count('book') ? ' · 教材精英 ×1' : ''}${count('carrotwine') ? ' · 胡萝卜酒首领 ×1' : ''}<br>夜间强度：生命 +${hpBoost}% · 攻击 +${(wave - 1) * 10}% · 速度 +${Math.round((wave - 1) * 3.5)}%`; }

function updateUI() {
  moneyEl.textContent = money;
  waveEl.textContent = `${wave} / 6`;
  healthEl.textContent = `${Math.max(0, health)}%`;
  powerBtn.textContent = `MCH 急救 ×${emergencyCharges}`;
  powerBtn.disabled = !emergencyCharges || !waveRunning;
  const upgradeCost = selectedTower && selectedTower.level < 3 ? selectedTower.def.upgrade * selectedTower.level : 0;
  upgradeBtn.textContent = selectedTower ? (selectedTower.level < 3 ? `升级 ${upgradeCost} proof` : '已满级') : '升级所选';
  upgradeBtn.disabled = !selectedTower || selectedTower.level >= 3 || money < upgradeCost;
  const refund = selectedTower ? Math.floor(selectedTower.invested * selectedTower.hp / selectedTower.maxHp) : 0;
  salvageBtn.textContent = selectedTower ? `回收 ${refund} proof` : '回收所选';
  salvageBtn.disabled = !selectedTower;
  startBtn.textContent = waveRunning ? `第 ${wave} 夜进行中` : (wave > 1 ? `开始第 ${wave} 夜` : '开始第 1 夜');
  startBtn.disabled = waveRunning || intermission || ended;
  document.querySelector('#missionText').textContent = wave === 6 ? '最后一夜：胡萝卜酒正在摇晃瓶身。' : `撑过第 ${wave} 夜的入侵。`;
  forecastEl.innerHTML = waveRunning ? '本夜正在进行，留意受损防线。' : previewText();
}

function buildGrid() {
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const tile = document.createElement('button');
    tile.className = 'tile'; tile.style.left = `calc(${c * 20}% + 4px)`; tile.style.top = `calc(${r * 20}% + 4px)`;
    tile.addEventListener('click', () => placeOrUpgrade(c, r));
    tile.addEventListener('contextmenu', e => { e.preventDefault(); salvage(c, r); });
    lab.append(tile);
  }
  for (let row = 0; row < 5; row++) { const alert = document.createElement('span'); alert.className = 'lane-alert'; alert.style.top = `calc(${row * 20}% + 6px)`; lab.append(alert); laneAlerts.push(alert); }
}

function updateLaneAlerts() { laneAlerts.forEach((alert, row) => { const count = enemies.filter(enemy => enemy.row === row).length; alert.classList.toggle('hot', count > 0); alert.textContent = count ? `第 ${row + 1} 行 ×${count}` : ''; }); }

function placeOrUpgrade(c, r) {
  initAudio();
  if (ended || paused) return;
  const existing = towers.find(t => t.c === c && t.r === r);
  if (existing) return selectTower(existing);
  const def = towerDefs[selected];
  if (money < def.cost) return say(`库存不足：${def.name}需要 ${def.cost} proof。`);
  money -= def.cost;
  const p = pos(c, r), el = document.createElement('div');
  el.className = 'tower'; el.style.left = `${p.x}%`; el.style.top = `${p.y}%`;
  el.innerHTML = `<span class="tower-hp"><i></i></span><img class="tower-photo" src="${def.image}" alt="${def.name}"><span class="tower-name">${def.name} Lv.1</span>`;
  lab.append(el); const tower = { c, r, x: p.x, y: p.y, def, el, level: 1, hp: def.hp, maxHp: def.hp, invested: def.cost, lastShot: 0 };
  towers.push(tower); selectTower(tower); tone(240, .09, 'triangle', .04, 410); say(`${def.name}部署完成，拥有 ${def.hp} 点耐久。`); updateUI();
}

function selectTower(tower) {
  if (selectedTower) selectedTower.el.classList.remove('selected');
  selectedTower = tower; tower.el.classList.add('selected');
  say(`${tower.def.name} Lv.${tower.level}：耐久 ${Math.ceil(tower.hp)}/${tower.maxHp}。可升级或按血量比例回收。`); updateUI();
}

function upgrade(tower = selectedTower) {
  if (tower.level >= 3) return say('这台装置已到最高浓度。');
  const cost = tower.def.upgrade * tower.level;
  if (money < cost) return say(`升级需要 ${cost} proof。`);
  money -= cost; tower.level++; tower.invested += cost; tower.maxHp += Math.round(tower.def.hp * .3); tower.hp = Math.min(tower.maxHp, tower.hp + Math.round(tower.def.hp * .3)); tower.el.dataset.level = tower.level;
  tower.el.querySelector('.tower-name').textContent = `${tower.def.name} Lv.${tower.level}`;
  tone(410, .15, 'sine', .05, 720); say(`${tower.def.name}升至 Lv.${tower.level}：射程与酒精浓度提高。`); updateUI();
}

function salvage(c, r) {
  const tower = typeof c === 'object' ? c : towers.find(t => t.c === c && t.r === r); if (!tower) return;
  const index = towers.indexOf(tower), refund = Math.floor(tower.invested * tower.hp / tower.maxHp);
  money += refund; refunds += refund; tower.el.remove(); towers.splice(index, 1); if (selectedTower === tower) selectedTower = null;
  tone(390, .13, 'triangle', .04, 180); say(`装置已回收，耐久 ${Math.ceil(tower.hp)}/${tower.maxHp}，返还 ${refund} proof。`); updateUI();
}

function makePlan() {
  const count = 7 + wave * 3, entries = [];
  for (let i = 0; i < count; i++) {
    let type = i % 3 === 0 ? 'shred' : 'carrot';
    if (wave >= 3 && i % 6 === 0) type = 'juice';
    entries.push({ type, at: i * Math.max(360, 870 - wave * 62) });
  }
  if (wave >= 4) entries.push({ type: 'book', at: count * 470 + 320 });
  if (wave === 6) entries.push({ type: 'carrotwine', at: count * 470 + 1600 });
  return entries;
}

function launchWave() {
  if (waveRunning || ended) return;
  planned = makePlan(); spawnElapsed = 0; waveRunning = true; tone(220, .23, 'sawtooth', .045, 480); say(`第 ${wave} 夜开始。${wave === 6 ? '警告：胡萝卜酒首领即将进入培养皿。' : wave >= 4 ? '警告：生物化学精英正在靠近。' : '守住 MCH。'}`); updateUI();
}

function spawn(type) {
  const def = enemyDefs[type], row = Math.floor(Math.random() * 5), el = document.createElement('div');
  el.className = `enemy ${type}`; el.innerHTML = `<img src="${def.src}" alt="${def.label}"><span class="hp"><i></i></span>`;
  const night = 1 + (wave - 1) * .15, hp = Math.round(def.hp * night), attack = Math.round(def.attack * (1 + (wave - 1) * .1)), speed = def.speed * (1 + (wave - 1) * .035);
  lab.append(el); if (type === 'carrotwine') carrotwineState = 'alive'; enemies.push({ ...def, type, row, x: 106, hp, maxHp: hp, speed, attack, reward: Math.round(def.reward * (1 + (wave - 1) * .08)), slow: 0, freeze: 0, marinated: 0, rage: false, summon: 3300, aura: 760, lastHit: 0, el }); updateLaneAlerts();
}

function nearestTarget(tower) {
  const range = tower.def.range * (1 + (tower.level - 1) * .12);
  return enemies.filter(e => Math.hypot(e.x - tower.x, (e.row + .5) * 20 - tower.y) <= range).sort((a, b) => a.x - b.x)[0];
}

function blockingTower(enemy) {
  return towers.filter(tower => tower.r === enemy.row && tower.x < enemy.x + 5).sort((a, b) => b.x - a.x)[0];
}

function hitTower(enemy, tower) {
  enemy.lastHit = performance.now(); tower.hp -= enemy.attack; materialSound(enemy.type);
  tower.el.querySelector('.tower-hp i').style.width = `${Math.max(0, tower.hp / tower.maxHp * 100)}%`;
  if (selectedTower === tower) updateUI();
  if (tower.hp > 0) return;
  tower.el.remove(); towers.splice(towers.indexOf(tower), 1); towersLost++; if (selectedTower === tower) selectedTower = null;
  tone(110, .32, 'sawtooth', .07, 42); say(`${tower.def.name}被${enemy.label}拆掉了！防线出现缺口。`); updateUI();
}

function fire(tower, target) {
  tower.lastShot = performance.now(); const scale = 1 + (tower.level - 1) * .42;
  materialSound(tower.def.effect === 'freeze' ? 'vodka' : tower.def.effect === 'splash' ? 'wine' : tower.def.effect === 'push' ? 'gel' : 'rum');
  if (tower.def.effect === 'push') {
    target.el.classList.add('knocked'); target.el.style.transition = 'left .4s cubic-bezier(.14,.82,.25,1), filter .15s'; target.x = Math.min(108, target.x + 10 + tower.level * 3); setTimeout(() => { if (target.el) { target.el.classList.remove('knocked'); target.el.style.transition = 'filter .15s'; } }, 420); damage(target, tower.def.damage * scale);
    const pulse = document.createElement('i'); pulse.className = 'pulse'; pulse.style.left = `${tower.x}%`; pulse.style.top = `${tower.y}%`; lab.append(pulse); setTimeout(() => pulse.remove(), 520); return;
  }
  const bullet = document.createElement('i'); bullet.className = `bullet ${tower.def.shot}`; bullet.style.left = `${tower.x}%`; bullet.style.top = `${tower.y}%`; lab.append(bullet);
  bullets.push({ x: tower.x, y: tower.y, target, damage: tower.def.damage * scale, effect: tower.def.effect, level: tower.level, el: bullet });
}

function destroyEnemy(enemy) {
  money += enemy.reward; kills++; if (enemy.type === 'carrotwine') carrotwineState = 'dead'; enemies.splice(enemies.indexOf(enemy), 1); enemy.el.classList.add('dying'); materialSound(enemy.type); setTimeout(() => enemy.el.remove(), 390); updateLaneAlerts(); updateUI();
}

function damage(enemy, value, source = '') {
  if (!enemies.includes(enemy)) return;
  if (enemy.type === 'carrot' && source !== 'freeze' && source !== 'combo') value *= .62;
  if (enemy.type === 'shred' && source === 'splash') value *= 1.75;
  if (enemy.type === 'book') value *= .82;
  enemy.hp -= value;
  if (enemy.hp > 0) return;
  destroyEnemy(enemy);
  if (Math.random() < .25) say('异常体被分解，回收了一点酒精库存。');
}

function emergency() {
  if (!emergencyCharges || !waveRunning) return;
  emergencyCharges--; tone(800, .32, 'sine', .07, 130); enemies.forEach(enemy => { enemy.freeze = 1800; damage(enemy, enemy.type === 'shred' ? 44 : 20); });
  say('MCH 紧急叫停：所有异常体被冻结 1.8 秒。'); updateUI();
}

function update(dt) {
  if (!waveRunning) return;
  spawnElapsed += dt; while (planned.length && spawnElapsed >= planned[0].at) spawn(planned.shift().type);
  towers.forEach(tower => { const target = nearestTarget(tower), rate = tower.def.rate / (1 + (tower.level - 1) * .14); if (target && performance.now() - tower.lastShot >= rate) fire(tower, target); });
  bullets.slice().forEach(bullet => {
    if (!enemies.includes(bullet.target)) return removeBullet(bullet);
    const targetY = (bullet.target.row + .5) * 20, dx = bullet.target.x - bullet.x, dy = targetY - bullet.y, distance = Math.hypot(dx, dy), step = dt * .095;
    if (distance <= step + 1) {
      damage(bullet.target, bullet.damage, bullet.effect);
      if (enemies.includes(bullet.target) && bullet.effect === 'slow') { bullet.target.slow = 1500 + bullet.level * 300; bullet.target.marinated = 2500 + bullet.level * 300; }
      if (enemies.includes(bullet.target) && bullet.effect === 'freeze') {
        bullet.target.freeze = 520 + bullet.level * 260;
        if (bullet.target.marinated > 0) {
          damage(bullet.target, 24 + bullet.level * 11, 'combo');
          enemies.filter(e => Math.hypot(e.x - bullet.target.x, (e.row - bullet.target.row) * 20) < 16).forEach(e => damage(e, 10 + bullet.level * 4, 'combo'));
          materialSound('vodka'); materialSound('rum'); say('冰镇朗姆爆裂！附近异常体受到连锁伤害。');
        }
      }
      if (bullet.effect === 'splash') enemies.filter(e => Math.hypot(e.x - bullet.target.x, (e.row - bullet.target.row) * 20) < 19).forEach(e => damage(e, 5 + bullet.level * 3, 'splash'));
      removeBullet(bullet);
    } else { bullet.x += dx / distance * step; bullet.y += dy / distance * step; bullet.el.style.left = `${bullet.x}%`; bullet.el.style.top = `${bullet.y}%`; }
  });
  enemies.slice().forEach(enemy => {
    enemy.aura -= dt;
    if (enemy.type === 'juice' && enemy.aura <= 0) { enemy.aura = 760; materialSound('juice'); enemies.filter(e => e !== enemy && Math.hypot(e.x - enemy.x, (e.row - enemy.row) * 20) < 26).forEach(e => e.hp = Math.min(e.maxHp, e.hp + 8)); }
    if (enemy.type === 'carrotwine') { enemy.summon -= dt; if (enemy.summon <= 0) { enemy.summon = 3300; materialSound('carrotwine'); say('胡萝卜酒首领晃了晃瓶子，召唤了胡萝卜增援！'); spawn('carrot'); spawn('shred'); if (Math.random() > .45) spawn('juice'); } }
    const speed = enemy.freeze > 0 ? 0 : enemy.speed * (enemy.slow > 0 ? .44 : 1); enemy.freeze = Math.max(0, enemy.freeze - dt); enemy.slow = Math.max(0, enemy.slow - dt); enemy.marinated = Math.max(0, enemy.marinated - dt);
    const blocker = blockingTower(enemy), closeToBlocker = blocker && enemy.x - blocker.x < 7;
    if (closeToBlocker) { if (!enemy.freeze && performance.now() - enemy.lastHit >= enemy.hitRate) hitTower(enemy, blocker); }
    else enemy.x -= speed * dt * .001;
    enemy.el.style.left = `${enemy.x}%`; enemy.el.style.top = `${(enemy.row + .5) * 20}%`; enemy.el.querySelector('.hp i').style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
    enemy.el.style.filter = enemy.freeze ? 'hue-rotate(145deg) saturate(.5)' : enemy.slow ? 'sepia(.55)' : '';
    if (enemy.x < 3) breach(enemy);
  });
  updateLaneAlerts();
  if (!planned.length && !enemies.length) completeWave();
}

function removeBullet(bullet) { bullet.el.remove(); bullets.splice(bullets.indexOf(bullet), 1); }
function breach(enemy) { health -= enemy.type === 'carrotwine' ? 35 : enemy.type === 'book' ? 21 : enemy.type === 'juice' ? 15 : enemy.type === 'carrot' ? 9 : 5; if (enemy.type === 'carrotwine') carrotwineState = 'breached'; enemy.el.remove(); enemies.splice(enemies.indexOf(enemy), 1); updateLaneAlerts(); say('MCH 被撞到了！调整阵线。'); updateUI(); if (health <= 0) finish(false); }
function completeWave() { waveRunning = false; if (wave === 6) return finish(true); intermission = true; money += 30 + wave * 8; say(`第 ${wave} 夜结束，实验室补给 +${30 + wave * 8} proof。`); wave++; updateUI(); setTimeout(() => { intermission = false; updateUI(); }, 750); }
function chaseFrames(mode, boss) {
  const base = boss ? 138 : 116, end = boss ? -34 : -52;
  const lift = 7 + Math.random() * 8, tilt = 3 + Math.random() * 4;
  const transform = (x, y = 0, rotation = 0, scale = 1) => `translate(${x}vw,${y}px) rotate(${rotation}deg) scale(${scale})${boss ? '' : ' scaleX(-1)'}`;
  const frame = (offset, x, y, rotation, scale, easing) => ({ offset, transform: transform(x, y, rotation, scale), easing });
  const free = (offset, x, y, rotation, scale, facing, easing) => ({ offset, transform:`translate(${x}vw,${y}vh) rotate(${rotation}deg) scale(${scale}) scaleX(${facing})`, easing });

  if (mode === 'leftRight') return boss ? [
    free(0,-68,0,-tilt,.96,1,'cubic-bezier(.68,0,.9,.25)'), free(.22,-46,-.8,tilt,1.04,1,'cubic-bezier(.1,.9,.2,1)'),
    free(.4,-4,.6,-tilt,1,1,'cubic-bezier(.72,0,.9,.24)'), free(.55,4,-.4,tilt,1.03,1,'cubic-bezier(.08,.9,.2,1)'),
    free(.78,72,.7,-tilt*.6,1,1,'ease-in-out'), free(1,128,0,0,1,1,'linear')
  ] : [
    free(0,-44,0,2,1,1,'cubic-bezier(.1,.9,.2,1)'), free(.18,-7,-1, -tilt,1.04,1,'cubic-bezier(.65,0,.9,.25)'),
    free(.31,2,.6,tilt,.96,1,'cubic-bezier(.08,.92,.18,1)'), free(.52,52,-1.2,-tilt,1.05,1,'cubic-bezier(.68,0,.9,.24)'),
    free(.72,67,.5,tilt*.7,.98,1,'cubic-bezier(.1,.9,.2,1)'), free(1,122,0,0,1,1,'linear')
  ];

  if (mode === 'vertical') return boss ? [
    free(0,46,-138,tilt,.95,1,'cubic-bezier(.7,0,.9,.25)'), free(.23,43,-91,-tilt,1.05,1,'cubic-bezier(.08,.9,.18,1)'),
    free(.39,47,-65,tilt,.98,1,'cubic-bezier(.72,0,.9,.24)'), free(.58,42,-16,-tilt,1.04,1,'cubic-bezier(.09,.9,.2,1)'),
    free(.78,47,34,tilt*.7,1,1,'ease-in-out'), free(1,44,112,0,1,1,'linear')
  ] : [
    free(0,42,-108,-2,1,1,'cubic-bezier(.1,.9,.2,1)'), free(.18,38,-66,tilt,1.05,1,'cubic-bezier(.68,0,.9,.25)'),
    free(.3,44,-51,-tilt,.95,1,'cubic-bezier(.08,.92,.18,1)'), free(.49,37,-3,tilt,1.06,1,'cubic-bezier(.7,0,.9,.23)'),
    free(.64,45,12,-tilt,.97,1,'cubic-bezier(.08,.9,.18,1)'), free(.83,39,61,3,1.03,1,'ease-out'), free(1,42,108,0,1,1,'linear')
  ];

  if (mode === 'chaos') return boss ? [
    free(0,148,-18,tilt,.94,-1,'cubic-bezier(.66,0,.9,.28)'), free(.17,112,-47,-tilt,1.05,-1,'cubic-bezier(.08,.9,.18,1)'),
    free(.34,58,-18,tilt,1,-1,'cubic-bezier(.7,0,.9,.24)'), free(.48,76,31,-tilt,1.05,1,'cubic-bezier(.1,.9,.2,1)'),
    free(.66,19,43,tilt,.97,-1,'cubic-bezier(.68,0,.88,.25)'), free(.82,-3,-27,-tilt,1.04,-1,'ease-in-out'), free(1,-48,18,0,1,-1,'linear')
  ] : [
    free(0,118,-11,-2,1,-1,'cubic-bezier(.1,.9,.2,1)'), free(.15,79,-42,tilt,1.05,-1,'cubic-bezier(.7,0,.9,.24)'),
    free(.29,28,-12,-tilt,.96,-1,'cubic-bezier(.08,.92,.18,1)'), free(.42,53,36,tilt,1.06,1,'cubic-bezier(.68,0,.88,.24)'),
    free(.61,-2,39,-tilt,.96,-1,'cubic-bezier(.08,.9,.18,1)'), free(.78,-21,-31,tilt,1.04,-1,'ease-out'), free(1,-63,14,0,1,-1,'linear')
  ];

  if (mode === 'smooth') return boss ? [
    frame(0, base, 2, tilt, .98, 'ease-in-out'), frame(.28, 92, -lift*.35, -tilt, 1.02, 'ease-in-out'),
    frame(.55, 47, 3, tilt*.6, .99, 'ease-in-out'), frame(.8, 3, -lift*.25, -tilt*.5, 1.01, 'ease-in-out'), frame(1, end, 0, 0, 1, 'linear')
  ] : [
    frame(0, base, 0, -2, 1, 'ease-in-out'), frame(.24, 77, -lift*.45, 3, 1.02, 'ease-in-out'),
    frame(.5, 34, 2, -3, .99, 'ease-in-out'), frame(.76, -8, -lift*.35, 2, 1.01, 'ease-in-out'), frame(1, end, 0, 0, 1, 'linear')
  ];

  if (mode === 'zigzag') return boss ? [
    frame(0, base, 0, tilt, .97, 'cubic-bezier(.6,0,.9,.3)'), frame(.17, 123, lift, -tilt, 1.03, 'cubic-bezier(.12,.85,.2,1)'),
    frame(.36, 88, -lift, tilt, .98, 'cubic-bezier(.7,0,.88,.25)'), frame(.49, 80, lift*.7, -tilt, 1.04, 'cubic-bezier(.1,.9,.2,1)'),
    frame(.72, 25, -lift*.75, tilt*.7, .99, 'ease-in-out'), frame(1, end, 0, -2, 1, 'linear')
  ] : [
    frame(0, base, 0, -2, 1, 'cubic-bezier(.12,.88,.2,1)'), frame(.18, 82, -lift, tilt, 1.04, 'cubic-bezier(.65,0,.88,.28)'),
    frame(.29, 75, lift*.7, -tilt, .96, 'cubic-bezier(.1,.9,.2,1)'), frame(.5, 30, -lift*.85, tilt, 1.04, 'cubic-bezier(.6,0,.85,.25)'),
    frame(.66, 19, lift*.65, -tilt, .98, 'cubic-bezier(.12,.88,.22,1)'), frame(.86, -26, -lift*.5, 3, 1.02, 'ease-out'), frame(1, end, 0, 0, 1, 'linear')
  ];

  if (mode === 'stomp') return boss ? [
    frame(0, base, 0, tilt, .94, 'cubic-bezier(.72,0,.92,.22)'), frame(.23, 119, lift*.45, -tilt, 1.06, 'cubic-bezier(.08,.9,.18,1)'),
    frame(.31, 91, -lift*.6, tilt, .98, 'cubic-bezier(.75,0,.9,.2)'), frame(.47, 84, 5, -tilt, 1.05, 'cubic-bezier(.08,.9,.2,1)'),
    frame(.64, 36, -lift*.55, tilt, .98, 'cubic-bezier(.7,0,.88,.25)'), frame(.82, 12, 4, -tilt*.7, 1.03, 'ease-out'), frame(1, end, 0, 0, 1, 'linear')
  ] : [
    frame(0, base, 0, -2, 1, 'cubic-bezier(.08,.9,.18,1)'), frame(.17, 69, -lift*.75, tilt, 1.05, 'cubic-bezier(.75,0,.92,.24)'),
    frame(.29, 64, 7, -tilt*1.2, .93, 'cubic-bezier(.06,.92,.17,1)'), frame(.48, 15, -lift, tilt, 1.06, 'cubic-bezier(.74,0,.9,.23)'),
    frame(.62, 9, 5, -tilt, .95, 'cubic-bezier(.07,.9,.18,1)'), frame(.83, -40, -lift*.5, 3, 1.03, 'ease-out'), frame(1, end, 0, 0, 1, 'linear')
  ];

  return boss ? [
    frame(0, base, 0, tilt, .96, 'cubic-bezier(.65,0,.9,.27)'), frame(.18, 125, lift*.35, -tilt, 1.03, 'cubic-bezier(.1,.9,.2,1)'),
    frame(.34, 88, -lift*.55, tilt, .99, 'cubic-bezier(.72,0,.9,.23)'), frame(.45, 82, 4, -tilt, 1.04, 'cubic-bezier(.08,.9,.2,1)'),
    frame(.68, 27, -lift*.45, tilt*.7, .99, 'ease-in-out'), frame(1, end, 0, 0, 1, 'linear')
  ] : [
    frame(0, base, 0, -2, 1, 'cubic-bezier(.1,.9,.2,1)'), frame(.14, 86, -lift*.55, tilt, 1.04, 'cubic-bezier(.68,0,.9,.25)'),
    frame(.26, 76, 5, -tilt, .96, 'cubic-bezier(.08,.92,.18,1)'), frame(.43, 35, -lift*.7, tilt, 1.05, 'cubic-bezier(.7,0,.9,.24)'),
    frame(.54, 39, 7, -tilt*1.15, .94, 'cubic-bezier(.06,.92,.17,1)'), frame(.74, -10, -lift*.45, 3, 1.03, 'ease-out'), frame(1, end, 0, 0, 1, 'linear')
  ];
}
function motionSettings(profile, frames) {
  const clean = frames.map(({ easing, ...keyframe }) => keyframe);
  if (profile === 'accelerate') return { frames:clean, easing:'cubic-bezier(.58,.02,1,.34)', min:3300, max:4700 };
  if (profile === 'decelerate') return { frames:clean, easing:'cubic-bezier(.04,.72,.17,1)', min:3500, max:5000 };
  if (profile === 'fast') return { frames:clean, easing:'linear', min:2550, max:3450 };
  if (profile === 'smooth') return { frames:clean, easing:'ease-in-out', min:3300, max:4500 };
  return { frames, easing:'linear', min:3000, max:4500 };
}

function startChaseLoop(initial = false) {
  clearTimeout(chaseTimer); chaseAnimations.forEach(animation => animation.cancel());
  const mch = document.querySelector('.chase-mch'), boss = document.querySelector('.chase-boss'), defeat = document.querySelector('#wineDefeat');
  const pathModes = ['natural','zigzag','leftRight','vertical','chaos'];
  const motionProfiles = ['burst','accelerate','decelerate','fast','smooth'];
  const pathChoices = pathModes.filter(mode => mode !== lastChaseMode), motionChoices = motionProfiles.filter(profile => profile !== lastMotionProfile);
  const mode = pathChoices[Math.floor(Math.random() * pathChoices.length)], profile = motionChoices[Math.floor(Math.random() * motionChoices.length)];
  lastChaseMode = mode; lastMotionProfile = profile; defeat.dataset.chase = mode; defeat.dataset.motion = profile;
  const mchMotion = motionSettings(profile, chaseFrames(mode, false)), bossMotion = motionSettings(profile, chaseFrames(mode, true));
  const mchDuration = mchMotion.min + Math.random() * (mchMotion.max - mchMotion.min), bossDuration = mchDuration * (1.28 + Math.random() * .06);
  const run = () => {
    chaseAnimations = [
      mch.animate(mchMotion.frames, { duration:mchDuration, easing:mchMotion.easing, fill:'forwards' }),
      boss.animate(bossMotion.frames, { duration:bossDuration, easing:bossMotion.easing, fill:'forwards' })
    ];
    chaseAnimations[1].finished.then(() => { chaseTimer = setTimeout(() => startChaseLoop(), 45 + Math.random() * 55); }).catch(() => {});
  };
  chaseTimer = setTimeout(run, initial ? 3420 : 0);
}
function showWineDefeat() { document.body.classList.add('wine-shock'); materialSound('carrotwine'); tone(48, .65, 'sawtooth', .1, 22); noise(.42, .085, 760); setTimeout(() => { tone(92, .42, 'triangle', .075, 36); noise(.22, .05, 2450, 'highpass'); }, 170); const defeat = document.querySelector('#wineDefeat'); defeat.dataset.bossState = carrotwineState; defeat.classList.remove('hidden'); startChaseLoop(true); }
function finish(win) { ended = true; waveRunning = false; document.body.classList.add('orientation-dismissed'); tone(win ? 330 : 170, win ? .45 : .5, win ? 'triangle' : 'sawtooth', .07, win ? 660 : 55); updateUI(); if (!win && wave === 6) return showWineDefeat(); document.querySelector('#overlay').classList.remove('hidden'); document.querySelector('#resultKicker').textContent = win ? '实验完成' : '培养皿失控'; document.querySelector('#resultTitle').textContent = win ? 'MCH 暂时安全' : 'MCH 被胡萝卜包围'; document.querySelector('#resultText').innerHTML = `${win ? '六夜异常入侵已被酒精实验室化解。MCH 获得一晚不吃胡萝卜的权利。' : '防线未能守住。试试升级朗姆控制敌人，用冰桶伏特加冻结关键目标。'}<br><br>本局战报：处理异常体 ${kills} · 损毁装置 ${towersLost} · 回收库存 ${refunds} proof。`; }

document.querySelectorAll('.tower-card').forEach(card => card.addEventListener('click', () => { selected = card.dataset.tower; document.querySelectorAll('.tower-card').forEach(c => c.classList.toggle('selected', c === card)); say(`已选择${towerDefs[selected].name}。点击空格部署，点击已有装置升级。`); }));
startBtn.addEventListener('click', () => { initAudio(); launchWave(); }); powerBtn.addEventListener('click', () => { initAudio(); emergency(); });
upgradeBtn.addEventListener('click', () => upgrade()); salvageBtn.addEventListener('click', () => salvage(selectedTower));
soundBtn.addEventListener('click', () => { initAudio(); soundEnabled = !soundEnabled; soundBtn.textContent = `声音：${soundEnabled ? '开' : '关'}`; if (soundEnabled) tone(440, .1, 'sine', .04, 620); });
document.querySelector('#pauseBtn').addEventListener('click', event => { paused = !paused; event.target.textContent = paused ? '继续' : '暂停'; say(paused ? '实验时间冻结。' : '实验继续。'); });
document.querySelector('#restart').addEventListener('click', () => location.reload());
document.querySelector('#wineRestart').addEventListener('click', () => location.reload());
document.querySelector('#wineChaseRestart').addEventListener('click', () => location.reload());
document.querySelector('#orientationContinue').addEventListener('click', () => document.body.classList.add('orientation-dismissed'));
function loop(now) { const dt = Math.min(50, now - last); last = now; if (!paused && !ended) update(dt); requestAnimationFrame(loop); }
buildGrid(); updateUI(); requestAnimationFrame(loop);
