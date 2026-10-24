/* ============================================================
 *  Stage 2 玩法自检：连锁 / 统计 / 图鉴 / 救回 / 微调 / 复活二选一
 *  运行：node stage2.test.js
 *
 *  覆盖：
 *    · 连锁：600ms 窗口、投放打断、不相干合成另起一条、顶级清场结束连锁
 *    · 连锁奖励：min(len-1,5)×5，且绝不给复活币
 *    · 局内统计：最高连锁 / 最高等级 / 顶级清场 / 救回 / 用掉的复活币，重开清零
 *    · 图鉴：持久化、坏数据容错、10 级通过 9+9 解锁、跨局保留
 *    · 危险线救回：0.49/0.50 边界、掉回线下、被合成掉、不重复记、三次上限
 *    · 复活二选一：0/1/2 枚余额、清顶上 1 颗 vs 3 颗、重叠条件只清一次
 * ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = __dirname;

function makeCtx() {
  const g = { addColorStop() {} };
  return {
    setTransform() {}, save() {}, restore() {}, scale() {}, rotate() {}, translate() {},
    clearRect() {}, fillRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc() {}, ellipse() {}, clip() {}, stroke() {}, fill() {}, setLineDash() {},
    drawImage() {}, createLinearGradient: () => g, createRadialGradient: () => g,
    measureText: () => ({ width: 10 }), fillText() {}, strokeText() {},
    globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
    font: '', textAlign: '', textBaseline: '', lineCap: ''
  };
}

function makeEl(id) {
  const el = {
    id, style: {}, textContent: '', width: 680, height: 112,
    hidden: false, disabled: false, offsetWidth: 100, _c: new Set(), _h: {},
    classList: {
      add: (c) => el._c.add(c), remove: (c) => el._c.delete(c), contains: (c) => el._c.has(c)
    },
    getContext: () => el._ctx || (el._ctx = makeCtx()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 700 }),
    addEventListener(t, fn) { el._h[t] = fn; },
    click() { if (el._h.click) el._h.click({ preventDefault() {} }); },
    removeAttribute() {},
    querySelector: () => ({ textContent: '', style: {}, classList: { add() {}, remove() {} } }),
    setAttribute() {}, focus() {}, select() {}, blur() {}
  };
  return el;
}

const IDS = ['game', 'stage', 'overlay', 'score', 'best', 'finalScore', 'finalBest', 'next', 'chain',
  'soundBtn', 'resetBtn', 'restartBtn', 'revivePrompt', 'overPanel', 'reviveScore',
  'reviveLeft', 'reviveBtn', 'reviveWideBtn', 'reviveWideHint', 'giveUpBtn',
  'reviveBadge', 'reviveCount',
  'statCascade', 'statTier', 'statTop', 'statRecovery', 'statRevive'];
const els = {};
IDS.forEach((id) => { els[id] = makeEl(id); });
els.revivePrompt.hidden = true;
els.overPanel.hidden = false;
els.reviveBadge.hidden = true;
els.reviveWideHint.hidden = true;

const winListeners = {};
const mem = {};
const sandbox = {
  console, Math, Date, JSON, Object, Array, Number, String, Boolean, Error, isNaN,
  parseFloat, parseInt, Set, isFinite,
  performance: { now: () => Date.now() },
  requestAnimationFrame() { return 1; },
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: {
    readyState: 'complete',
    getElementById: (id) => els[id] || null,
    addEventListener() {}, createElement: () => makeEl('tmp'),
    querySelector: () => null, querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  },
  addEventListener(t, fn) { winListeners[t] = fn; },
  navigator: {},
  Image: class {
    constructor() { this.width = 512; this.height = 512; this.naturalWidth = 512; }
    set src(v) { this._src = v; if (this.onload) this.onload(); }
    get src() { return this._src; }
  }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = (t, fn) => { winListeners[t] = fn; };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
load('assets/fruits/parts.js');
load('game.js');

const G = sandbox.window.__DNW__;
let gameOverCalls = 0;
sandbox.window.DanaiwaBoard = { onGameOver() { gameOverCalls++; } };

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}
function eq(a, b, label) {
  ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b));
}

/* 造一颗「已经落好」的球，用来直接喂给合成/救回逻辑 */
const mkBall = (x, y, tier) => {
  const b = G.makeBall(x, y, tier, 0, 0);
  b.landed = true; b.px = b.x; b.py = b.y;
  return b;
};

/* 直接触发一次「合成 a+b」：把两颗同级球贴在一起，跑物理让它自然合掉 */
function forceMerge(x, y, tier) {
  const a = mkBall(x, y, tier);
  const b = mkBall(x, y + G.FRUITS[tier].r * 2 - 0.4, tier);
  G.state.balls.push(a, b);
  let merged = false;
  for (let i = 0; i < 40 && !merged; i++) {
    G.stepPhysics(1 / 60);
    if (a.dead && b.dead) merged = true;
  }
  return merged ? a : null;
}

console.log('Stage 2 玩法自检\n');

/* ============================================================
 * [A] 连锁检测
 * ========================================================== */
console.log('[A] 连锁检测');

G.reset();
eq(G.state.cascadeLen, 0, '开局没有进行中的连锁');

/* A1：一次孤立合成 → 连锁长度 1，没有连锁奖励 */
const before = G.state.score;
const a1 = forceMerge(210, 600, 0);
ok(a1 !== null, '两颗葡萄成功合成');
eq(G.state.cascadeLen, 1, '孤立合成 → 连锁长度 1');
eq(G.state.stats.maxCascade, 1, '最高连锁记为 1');

/* A2：等超过 600ms，连锁自动结算；长度 1 不给连锁奖励（分数只来自合成本身） */
const scoreAfterMerge = G.state.score;
G.state.clock += 0.61;
G.update(1 / 60);
eq(G.state.cascadeLen, 0, '超过 600ms → 连锁自动结束');
eq(G.state.score, scoreAfterMerge, '长度 1 的连锁结束时不再额外加分');

/* A3：600ms 内接上 → 长度 2 */
G.reset();
const s0 = G.state.score;
/* 手工模拟：产出 nb1，然后让它被合成，产出 nb2 */
const nb1 = mkBall(210, 600, 1);
G.state.balls.push(nb1);
G.noteCascadeMerge(nb1);
eq(G.state.cascadeLen, 1, '第一次合成 → 长度 1');

G.state.clock += 0.3;              // 窗口内
nb1.dead = true;                   // 它被合成掉了
const nb2 = mkBall(210, 590, 2);
G.state.balls.push(nb2);
G.noteCascadeMerge(nb2);
eq(G.state.cascadeLen, 2, '600ms 内接上 → 长度 2');
eq(G.state.stats.maxCascade, 2, '最高连锁更新为 2');

/* A4：超过窗口再接 → 不接上，重新从 1 开始 */
G.state.clock += 0.7;              // 超出窗口
nb2.dead = true;
const nb3 = mkBall(210, 580, 3);
G.state.balls.push(nb3);
G.noteCascadeMerge(nb3);
eq(G.state.cascadeLen, 1, '超出窗口 → 另起一条，长度回到 1');

/* A5：投放打断连锁 */
G.state.clock += 0.1;
nb3.dead = true;
const nb4 = mkBall(210, 570, 4);
G.state.balls.push(nb4);
G.noteCascadeMerge(nb4);
eq(G.state.cascadeLen, 2, '窗口内接上 → 长度 2');
G.state.ready = true; G.state.cooldown = 0;
G.tryDrop();
eq(G.state.cascadeLen, 0, '玩家投放 → 连锁立即结算归零');

/* A6：顶级清场结束连锁、不计数 */
G.reset();
const t1 = mkBall(210, 600, 5);
G.state.balls.push(t1);
G.noteCascadeMerge(t1);
eq(G.state.cascadeLen, 1, '先开一条连锁');
G.state.balls.length = 0;
/* 摆两只神奶蛙，让它们合掉 */
const wa = mkBall(210, 500, G.FRUITS.length - 1);
const wb = mkBall(210, 500 - (G.FRUITS[G.FRUITS.length - 1].r * 2 + 0.6), G.FRUITS.length - 1);
G.state.balls.push(wa, wb);
let cleared = false;
for (let i = 0; i < 60 && !cleared; i++) {
  G.stepPhysics(1 / 60);
  if (G.state.balls.length === 0) cleared = true;
}
ok(cleared, '两只神奶蛙一起消失');
eq(G.state.cascadeLen, 0, '顶级清场 → 连锁结束');
eq(G.state.stats.topClears, 1, '顶级清场统计 +1');
ok(G.state.stats.maxCascade <= 1, '顶级清场不计入连锁长度');

/* ============================================================
 * [B] 连锁奖励：min(len-1,5)×5，且不给复活币
 * ========================================================== */
console.log('\n[B] 连锁奖励');

G.reset();
const scoreBefore = G.state.score;
const revBefore = G.state.revives;
const givenBefore = G.state.reviveGiven;

/* 造一条长度 4 的连锁，然后让它结算 */
let prev = mkBall(210, 600, 1);
G.state.balls.push(prev);
G.noteCascadeMerge(prev);
for (let i = 0; i < 3; i++) {
  G.state.clock += 0.2;
  prev.dead = true;
  const nx = mkBall(210, 600 - i * 10, 2 + i);
  G.state.balls.push(nx);
  G.noteCascadeMerge(nx);
  prev = nx;
}
eq(G.state.cascadeLen, 4, '构造出长度 4 的连锁');
G.settleCascade();
const gained = G.state.score - scoreBefore;
eq(gained, (4 - 1) * G.CASCADE_BONUS_STEP, '长度 4 → 奖励 (4-1)×5 = 15 分');
eq(G.state.revives, revBefore, '连锁奖励不给复活币');
eq(G.state.reviveGiven, givenBefore, '连锁奖励不推进攒币进度');

/* 长度 1 无奖励 */
G.reset();
const s1 = G.state.score;
const solo = mkBall(210, 600, 1);
G.state.balls.push(solo);
G.noteCascadeMerge(solo);
G.settleCascade();
eq(G.state.score, s1, '长度 1 没有连锁奖励');

/* 上限：长度 10 也只给 +25 */
G.reset();
const s2 = G.state.score;
let p2 = mkBall(210, 600, 1);
G.state.balls.push(p2);
G.noteCascadeMerge(p2);
for (let i = 0; i < 9; i++) {
  G.state.clock += 0.1;
  p2.dead = true;
  const nx = mkBall(210, 600, Math.min(2 + i, G.FRUITS.length - 1));
  G.state.balls.push(nx);
  G.noteCascadeMerge(nx);
  p2 = nx;
}
eq(G.state.cascadeLen, 10, '构造出长度 10 的连锁');
G.settleCascade();
eq(G.state.score - s2, G.CASCADE_BONUS_MAX * G.CASCADE_BONUS_STEP, '长度 10 → 奖励封顶 +25');
eq(G.state.stats.maxCascade, 10, '统计里保留真实值 10（不封顶）');

/* ============================================================
 * [C] 局内统计
 * ========================================================== */
console.log('\n[C] 局内统计');

G.reset();
eq(G.state.stats.maxCascade, 0, '重开后最高连锁归零');
eq(G.state.stats.maxTier, 0, '重开后最高等级归零');
eq(G.state.stats.topClears, 0, '重开后顶级清场归零');
eq(G.state.stats.recoveries, 0, '重开后救回归零');
eq(G.state.stats.revivesUsed, 0, '重开后用掉复活币归零');

/* 最高等级：投放的起始等级也算 */
G.state.pending = 3;
G.state.ready = true; G.state.cooldown = 0;
G.tryDrop();
eq(G.state.stats.maxTier, 3, '投放 3 级 → 最高等级记 3');

/* 合成更高等级会刷新 */
G.reset();
const hi = forceMerge(210, 600, 4);
ok(hi !== null, '5 级合成成功');
eq(G.state.stats.maxTier, 5, '合出 5 级 → 最高等级记 5');

/* 结算面板会把这些值刷上去 */
G.state.stats.maxCascade = 3;
G.state.stats.maxTier = 7;
G.state.stats.topClears = 2;
G.state.stats.recoveries = 1;
G.state.stats.revivesUsed = 2;
G.paintStats();
eq(els.statCascade.textContent, '×3', '面板显示最高连锁 ×3');
eq(els.statTier.textContent, G.FRUITS[7].name, '面板显示最高等级名字');
eq(els.statTop.textContent, '2', '面板显示顶级清场 2');
eq(els.statRecovery.textContent, '1', '面板显示救回 1');
eq(els.statRevive.textContent, '2', '面板显示用掉复活币 2');

/* ============================================================
 * [D] 合成图鉴
 * ========================================================== */
console.log('\n[D] 合成图鉴');

/* 清掉本地记录，从零开始（reloadDiscovery 让内存态也重读） */
delete mem[G.DISCOVERY_KEY];
G.reloadDiscovery();
G.reset();

ok(G.isDiscovered(0) === true, '0 级（葡萄）天然可见');
ok(G.isDiscovered(1) === false, '1 级初始未解锁');

/* 合出 1 级 → 解锁 */
const d1 = forceMerge(210, 600, 0);
ok(d1 !== null, '葡萄合成成功');
ok(G.isDiscovered(1) === true, '合出 1 级 → 已解锁');
const stored = JSON.parse(mem[G.DISCOVERY_KEY] || '[]');
ok(stored.indexOf(1) >= 0, '解锁结果写进了 localStorage：' + JSON.stringify(stored));

/* 重复解锁不重复写 */
const lenBefore = JSON.parse(mem[G.DISCOVERY_KEY]).length;
G.unlockTier(1);
eq(JSON.parse(mem[G.DISCOVERY_KEY]).length, lenBefore, '重复解锁不会重复记录');

/* 跨局保留：reset 后仍然解锁 */
G.reset();
ok(G.isDiscovered(1) === true, '重开一局后图鉴仍然保留');

/* 10 级通过 9+9 解锁 */
ok(G.isDiscovered(G.FRUITS.length - 1) === false, '最高级初始未解锁');
const topTier = G.FRUITS.length - 1;
const tm = forceMerge(210, 500, topTier - 1);
ok(tm !== null, '两只 9 级合成成功');
ok(G.isDiscovered(topTier) === true, '9+9 合出 10 级 → 最高级已解锁');

/* 坏数据容错 */
mem[G.DISCOVERY_KEY] = 'not json at all';
ok(Array.isArray(G.loadDiscovery()) && G.loadDiscovery().length === 0, 'JSON 坏掉 → 当作空图鉴');
mem[G.DISCOVERY_KEY] = JSON.stringify([1, 1, 2, 99, -3, 1.5, 'x', null]);
const cleaned = G.loadDiscovery();
ok(cleaned.indexOf(1) >= 0 && cleaned.indexOf(2) >= 0, '合法项保留');
ok(cleaned.indexOf(99) < 0, '越界的 99 被丢掉');
ok(cleaned.indexOf(-3) < 0, '负数被丢掉');
ok(cleaned.indexOf(1.5) < 0, '小数被丢掉');
eq(cleaned.filter((v) => v === 1).length, 1, '重复项去重');

/* localStorage 不可用也不崩 */
const realLS = sandbox.localStorage;
sandbox.localStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); }
};
ok(Array.isArray(G.loadDiscovery()), 'localStorage 抛异常 → 返回空数组而不是崩');
let unlockOk = true;
try { G.unlockTier(5); } catch (e) { unlockOk = false; }
ok(unlockOk, 'localStorage 不可用时解锁不抛异常');
sandbox.localStorage = realLS;

/* 图鉴不影响分数与复活进度 */
G.reset();
delete mem[G.DISCOVERY_KEY];
G.reloadDiscovery();
const sc = G.state.score;
const rv = G.state.revives;
forceMerge(210, 600, 0);
ok(G.state.score > sc, '合成照常加分');
eq(G.state.revives, rv, '图鉴本身不发复活币');

/* ============================================================
 * [E] 危险线救回
 * ========================================================== */
console.log('\n[E] 危险线救回');

function dangerBall(y, r) {
  const b = { x: 210, y, r: r || 30, dead: false, landed: true, overTime: 0,
              vx: 0, vy: 0, tier: 0, dangerPeak: 0, recoveryDone: false };
  return b;
}

/* E1：线上方 0.49 秒 → 掉回线下不算救回 */
G.reset();
let db = dangerBall(120);                 // top = 90 < 142
G.state.balls = [db];
for (let i = 0; i < 49; i++) G.checkGameOver(0.01);   // 0.49 秒
ok(db.dangerPeak >= 0.48 && db.dangerPeak <= 0.5, '线上方累计约 0.49 秒：' + db.dangerPeak.toFixed(2));
db.y = 600;                               // 掉回线下
G.checkGameOver(0.01);
eq(G.state.stats.recoveries, 0, '0.49 秒 → 不算救回');

/* E2：线上方 0.50 秒 → 掉回线下算救回 */
G.reset();
db = dangerBall(120);
G.state.balls = [db];
for (let i = 0; i < 50; i++) G.checkGameOver(0.01);   // 0.50 秒
ok(db.dangerPeak >= 0.5, '线上方累计 0.50 秒：' + db.dangerPeak.toFixed(2));
const beforeRec = G.state.score;
db.y = 600;
G.checkGameOver(0.01);
eq(G.state.stats.recoveries, 1, '0.50 秒 → 记一次救回');
eq(G.state.score - beforeRec, G.RECOVERY_BONUS, '救回加 ' + G.RECOVERY_BONUS + ' 分');

/* E3：同一颗不重复记 */
db.y = 120;
G.checkGameOver(0.01);
db.y = 600;
G.checkGameOver(0.01);
eq(G.state.stats.recoveries, 1, '同一颗不会被重复记救回');

/* E4：被合成掉也算救回 */
G.reset();
db = dangerBall(120);
G.state.balls = [db];
for (let i = 0; i < 50; i++) G.checkGameOver(0.01);
eq(G.state.stats.recoveries, 0, '还在线上方时还没记');
G.creditRecovery(db);
eq(G.state.stats.recoveries, 1, '被合成掉 → 记一次救回');

/* E5：三次上限 */
G.reset();
for (let i = 0; i < 5; i++) {
  const b = dangerBall(120);
  G.state.balls = [b];
  for (let k = 0; k < 50; k++) G.checkGameOver(0.01);
  b.y = 600;
  G.checkGameOver(0.01);
}
eq(G.state.stats.recoveries, G.RECOVERY_CAP, '每局最多记 ' + G.RECOVERY_CAP + ' 次救回');

/* E6：救回奖励不给复活币 */
G.reset();
const rvBefore2 = G.state.revives;
const givenBefore2 = G.state.reviveGiven;
const b6 = dangerBall(120);
G.state.balls = [b6];
for (let i = 0; i < 50; i++) G.checkGameOver(0.01);
b6.y = 600;
G.checkGameOver(0.01);
eq(G.state.revives, rvBefore2, '救回奖励不给复活币');
eq(G.state.reviveGiven, givenBefore2, '救回奖励不推进攒币进度');

/* E7：只是飞过线上方（速度够快）不计时 */
G.reset();
const fast = dangerBall(120);
fast.vx = 400;                            // 速度超过 REST_SPEED
G.state.balls = [fast];
for (let i = 0; i < 50; i++) G.checkGameOver(0.01);
ok(fast.dangerPeak < G.RECOVERY_MIN_TIME, '高速飞过不累计危险时间：' + fast.dangerPeak.toFixed(2));

/* ============================================================
 * [F] 复活二选一
 * ========================================================== */
console.log('\n[F] 复活二选一');

/* 造一个「已经越线判负」的棋盘：5 颗球，3 颗在线上方 */
function makeOverBoard(revives) {
  G.reset();
  G.state.revives = revives;
  G.state.reviveGiven = Math.floor(revives);
  const balls = [
    { x: 210, y: 90,  r: 30 },   // 最上
    { x: 210, y: 150, r: 30 },   // 次上（top=120 仍在线 142 上方）
    { x: 210, y: 210, r: 30 },   // 第三（top=180 在下方）
    { x: 210, y: 500, r: 30 },
    { x: 210, y: 620, r: 30 }
  ].map((o) => {
    const b = dangerBall(o.y, o.r);
    b.overTime = 1.4;
    return b;
  });
  G.state.balls = balls;
  G.state.over = true;
  return balls;
}

/* F1：0 枚 → 两档都不能点 */
makeOverBoard(0);
G.askRevive();
eq(els.reviveBtn.disabled, true, '0 枚：普通档禁用');
eq(els.reviveWideBtn.disabled, true, '0 枚：大范围档禁用');
eq(G.revive('normal'), false, '0 枚：revive(normal) 返回 false');
eq(G.revive('wide'), false, '0 枚：revive(wide) 返回 false');

/* F2：1 枚 → 普通档可点，大范围禁用并说明差几枚 */
makeOverBoard(1);
G.askRevive();
eq(els.reviveBtn.disabled, false, '1 枚：普通档可点');
eq(els.reviveWideBtn.disabled, true, '1 枚：大范围档禁用');
eq(els.reviveWideHint.hidden, false, '1 枚：显示「还差几枚」提示');
ok(els.reviveWideHint.textContent.indexOf('还差 1 枚') >= 0,
   '1 枚：提示还差 1 枚 → ' + els.reviveWideHint.textContent);
eq(G.revive('wide'), false, '1 枚：大范围档返回 false（余额不足）');

/* 普通档：清掉最顶上 1 颗 + 所有越线的 */
makeOverBoard(1);
const nb = G.state.balls.length;
ok(G.revive('normal') === true, '1 枚：普通档成功');
eq(G.state.revives, 0, '普通档扣 1 枚');
eq(G.state.stats.revivesUsed, 1, '用掉次数 +1');
ok(G.state.balls.every((b) => b.y - b.r >= 148), '普通档后没有水果还在线上方');
ok(G.state.balls.length < nb, '普通档清掉了水果：' + nb + ' → ' + G.state.balls.length);

/* F3：2 枚 → 两档都可点；大范围清得更多 */
makeOverBoard(2);
G.askRevive();
eq(els.reviveBtn.disabled, false, '2 枚：普通档可点');
eq(els.reviveWideBtn.disabled, false, '2 枚：大范围档可点');
eq(els.reviveWideHint.hidden, true, '2 枚：不显示「还差几枚」');

/* 先看普通档会清掉几颗 */
makeOverBoard(2);
const normalRemain = (function () {
  G.revive('normal');
  return G.state.balls.length;
})();

/* 再用大范围档，应该清得更多 */
makeOverBoard(2);
ok(G.revive('wide') === true, '2 枚：大范围档成功');
eq(G.state.revives, 0, '大范围档扣 2 枚');
eq(G.state.stats.revivesUsed, 1, '大范围档也只记一次使用');
ok(G.state.balls.every((b) => b.y - b.r >= 148), '大范围档后没有水果还在线上方');
ok(G.state.balls.length <= normalRemain,
   '大范围档清得不少于普通档：' + normalRemain + ' vs ' + G.state.balls.length);

/* F4：两个条件重叠时，同一颗只清一次
   摆 5 颗：前两颗在线 142 上方（top=60、120），第三颗 top=170 在线下。
   大范围档 = 「最顶上 3 颗」∪「所有越线的」= {60,120,170} ∪ {60,120} = 3 颗。
   如果实现把重叠的算两次，就会少清或多清；这里断言并集恰好 3 颗。 */
G.reset();
G.state.revives = 2;
const overlapBalls = [
  dangerBall(90, 30),    // top=60  线上方
  dangerBall(150, 30),   // top=120 线上方
  dangerBall(200, 30),   // top=170 线下
  dangerBall(400, 30),   // top=370 线下
  dangerBall(560, 30)    // top=530 线下
];
G.state.balls = overlapBalls;
G.state.over = true;
const beforeOverlap = G.state.balls.length;
G.revive('wide');
eq(beforeOverlap - G.state.balls.length, 3,
   '重叠条件取并集，共清 3 颗（不是 5 颗、也不是 2 颗）');
eq(G.state.balls.length, 2, '剩下 2 颗（y=400 与 y=560）');
ok(G.state.balls.every((b) => b.y >= 400), '留下的都是原本在线下方且不在最顶上三颗里的');

/* F5：复活后能继续玩 */
makeOverBoard(2);
G.revive('normal');
eq(G.state.over, false, '复活后解除判负');
eq(G.state.ready, true, '复活后可以继续投放');
ok(G.state.balls.every((b) => b.overTime === 0), '复活后越线计时清零');

/* F6：不是判负状态时不能复活 */
G.reset();
G.state.revives = 5;
eq(G.revive('normal'), false, '局内（没判负）调 revive 返回 false');
eq(G.revive('wide'), false, '局内调大范围 revive 也返回 false');

/* ============================================================
 * [G] 方向微调
 * ========================================================== */
console.log('\n[G] 方向微调');

G.reset();
ok(G.FINESSE_ENABLED === true, '微调功能默认开启（FINESSE_ENABLED=true）');
eq(G.FINESSE_MAX, 60, '横向冲量上限是 60 px/s');

/* 键盘：Shift+→ 加，Shift+← 减，且不改瞄准 */
const keydown = winListeners.keydown;
ok(typeof keydown === 'function', 'keydown 已绑定');
const aimBefore = G.state.aimX;
G.state.finesse = 0;
keydown({ code: 'ArrowRight', shiftKey: true, preventDefault() {} });
eq(G.state.finesse, G.FINESSE_KEY_STEP, 'Shift+→ → 冲量 +' + G.FINESSE_KEY_STEP);
eq(G.state.aimX, aimBefore, 'Shift+→ 不改瞄准位置');
keydown({ code: 'ArrowLeft', shiftKey: true, preventDefault() {} });
eq(G.state.finesse, 0, 'Shift+← 抵消回 0');

/* 夹到上限 */
for (let i = 0; i < 10; i++) keydown({ code: 'ArrowRight', shiftKey: true, preventDefault() {} });
eq(G.state.finesse, G.FINESSE_MAX, '连续按到上限后夹在 +' + G.FINESSE_MAX);
for (let i = 0; i < 20; i++) keydown({ code: 'ArrowLeft', shiftKey: true, preventDefault() {} });
eq(G.state.finesse, -G.FINESSE_MAX, '连续按到下限后夹在 -' + G.FINESSE_MAX);

/* 不带 Shift 的方向键仍然只动瞄准 */
G.state.finesse = 0;
const aimB2 = G.state.aimX;
keydown({ code: 'ArrowRight', shiftKey: false, preventDefault() {} });
eq(G.state.aimX, aimB2 + 14, '普通 → 仍然只移动瞄准 14px');
eq(G.state.finesse, 0, '普通 → 不影响冲量');

/* 冲量会带到投放的水果上 */
G.reset();
G.state.finesse = 40;
G.state.ready = true; G.state.cooldown = 0;
G.tryDrop();
const dropped = G.state.balls[G.state.balls.length - 1];
eq(dropped.vx, 40, '投放时把冲量写进 vx');
ok(Math.abs(dropped.vy - 130) < 1, '下落速度仍然是 130（没被冲量影响）');

/* 冲量不影响瞄准位置 */
const aimB3 = G.state.aimX;
G.state.finesse = -60;
G.state.ready = true; G.state.cooldown = 0;
G.tryDrop();
eq(G.state.aimX, aimB3, '冲量不会反过来改瞄准位置');

/* 慢速拖动不给冲量 */
G.reset();
ok(G.finesseFromTrack() === 0, '轨迹为空 → 0');

/* ============================================================
 * [H] 回归：核心玩法没被改坏
 * ========================================================== */
console.log('\n[H] 回归检查');

G.reset();
eq(G.state.revives, 0, '开局 0 枚复活币');
G.addScore(1500);
eq(G.state.revives, 1, '普通加分的攒币逻辑不变（1500 分 → 1 枚）');
G.addScore(1500);
eq(G.state.revives, 2, '3000 分 → 2 枚');

/* 普通合成仍然攒币 */
G.reset();
G.addScore(1499);
forceMerge(210, 600, 0);          // 合出 1 级 → +1 分
eq(G.state.revives, 1, '普通合成跨过 1500 分 → 照常发币');

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
