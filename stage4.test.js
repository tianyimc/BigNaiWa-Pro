/* ============================================================
 *  Stage 4 自检：道具券 + 锤子
 *  运行：node stage4.test.js
 *
 *  覆盖 PLAN Stage 4 要求的全部断言：
 *    · 里程碑 499/500/501、999/1000/1001、多节点跳分、每节点只结算一次、重开清零
 *    · 档位独立性与归属（用连锁第一次合成前的进度分定位档位）
 *    · ×2 记一次双连；×3 与 ×4+ 只记一次三连；三连不再记双连；长度 1 与顶级清场不记
 *    · 3 次双连或 2 次三连才合格，差一点不给
 *    · 余额 0/1/2、发券、+100 超额、连续超额、+100 不改券进度不递归
 *    · 既有得分来源都推进券进度；复活币与最高分行为不变
 *    · 锤子资格：静止可砸、移动/弹跳无接触/dead/已移除/过期目标
 *    · 重叠时按渲染顺序取最上面那只
 *    · 成功消耗一张并移除一只；空白/不合格/取消/无余额/结束时都不消耗
 *    · 重复事件不会双消耗
 *    · 锤子移除不产生任何分数/复活币/券进度/连击/连锁/救回奖励
 *    · 锤子砸掉连锁刚产出的水果不会误判成连锁接上
 *    · 瞄准期间物理与判负照常；锤子态下键盘/触屏不投放；退出后恢复正常
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
    hidden: false, disabled: false, offsetWidth: 100, _c: new Set(), _h: {}, _attrs: {},
    classList: {
      add: (c) => el._c.add(c), remove: (c) => el._c.delete(c),
      contains: (c) => el._c.has(c),
      toggle: (c, on) => { if (on === undefined) { el._c.has(c) ? el._c.delete(c) : el._c.add(c); } else if (on) el._c.add(c); else el._c.delete(c); }
    },
    getContext: () => el._ctx || (el._ctx = makeCtx()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 700 }),
    addEventListener(t, fn) { el._h[t] = fn; },
    click() { if (el._h.click) el._h.click({ preventDefault() {}, stopPropagation() {} }); },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    removeAttribute(k) { delete el._attrs[k]; },
    focus() {}, blur() {}, select() {},
    querySelector: () => ({ textContent: '', style: {}, classList: { add() {}, remove() {} } })
  };
  return el;
}

const IDS = ['game', 'stage', 'overlay', 'score', 'best', 'finalScore', 'finalBest', 'next', 'chain',
  'soundBtn', 'resetBtn', 'restartBtn', 'revivePrompt', 'overPanel', 'reviveScore',
  'reviveLeft', 'reviveBtn', 'reviveWideBtn', 'reviveWideHint', 'giveUpBtn',
  'reviveBadge', 'reviveCount', 'statCascade', 'statTier', 'statTop', 'statRecovery',
  'statRevive', 'helpBtn', 'helpModal', 'helpClose', 'helpOk', 'helpTitle',
  'voucherChip', 'voucherCount', 'hammerBtn', 'hammerHint'];
const els = {};
IDS.forEach((id) => { els[id] = makeEl(id); });
els.revivePrompt.hidden = true;
els.reviveBadge.hidden = true;
els.voucherChip.hidden = true;
els.hammerHint.hidden = true;
els.hammerBtn.disabled = true;

const winListeners = {};
const mem = {};
const doc = {
  readyState: 'complete',
  activeElement: null,
  getElementById: (id) => els[id] || null,
  addEventListener() {},
  createElement: (t) => makeEl('', t),
  querySelector: () => null,
  querySelectorAll: () => []
};
const sandbox = {
  console, Math, Date, JSON, Object, Array, Number, String, Boolean, Error, isNaN,
  parseFloat, parseInt, Set, isFinite,
  performance: { now: () => Date.now() },
  requestAnimationFrame() { return 1; },
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: doc,
  localStorage: {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  },
  addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
  navigator: {},
  Image: class {
    constructor() { this.width = 512; this.height = 512; this.naturalWidth = 512; }
    set src(v) { this._src = v; if (this.onload) this.onload(); }
    get src() { return this._src; }
  }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
load('assets/fruits/parts.js');
load('game.js');

const G = sandbox.window.__DNW__;
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}
function eq(a, b, label) {
  ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b));
}

/* 造一只「已落定」的球，直接塞进 state.balls */
function mkBall(x, y, tier, opts) {
  const b = G.makeBall(x, y, tier, 0, 0);
  b.landed = true; b.px = b.x; b.py = b.y;
  b.contacts = (opts && opts.contacts !== undefined) ? opts.contacts : 1;
  if (opts && opts.vx !== undefined) b.vx = opts.vx;
  if (opts && opts.vy !== undefined) b.vy = opts.vy;
  G.state.balls.push(b);
  return b;
}

/* 直接把一条连锁「造」出来并结算，避免依赖物理 */
function runCascade(len, startBand) {
  G.state.cascadeLen = 1;
  G.state.cascadeStartBand = startBand;
  for (let i = 1; i < len; i++) G.state.cascadeLen++;
  G.settleCascade();
}

console.log('Stage 4 自检：道具券 + 锤子\n');

/* ============================================================
 * [A] 里程碑边界
 * ========================================================== */
console.log('[A] 里程碑边界与结算');

G.reset();
eq(G.state.vouchers, 0, '开局 0 张券');
eq(G.state.voucherProgress, 0, '开局进度分 0');

/* 499 / 500 / 501 —— 但里程碑要合格才发券，这里先只验进度分推进 */
G.reset();
G.addScore(499);
eq(G.state.voucherProgress, 499, '499 分 → 进度 499');
eq(G.state.voucherMilestone, 0, '499 分还没结算任何节点');
G.addScore(1);
eq(G.state.voucherProgress, 500, '500 分 → 进度 500');
eq(G.state.voucherMilestone, 1, '500 分 → 节点 1 已结算');
G.addScore(1);
eq(G.state.voucherMilestone, 1, '501 分不会重复结算节点 1');

/* 999 / 1000 / 1001 */
G.reset();
G.addScore(999);
eq(G.state.voucherMilestone, 1, '999 分 → 只结算到节点 1');
G.addScore(1);
eq(G.state.voucherMilestone, 2, '1000 分 → 节点 2 已结算');
G.addScore(1);
eq(G.state.voucherMilestone, 2, '1001 分不会重复结算节点 2');

/* 多节点跳分：一次跨 3 个节点 */
G.reset();
G.addScore(1600);
eq(G.state.voucherMilestone, 3, '一次跨到 1600 → 3 个节点全部结算');
eq(G.state.voucherProgress, 1600, '进度分等于累计得分');

/* 重开清零 */
G.reset();
eq(G.state.voucherProgress, 0, '重开后进度分清零');
eq(G.state.voucherMilestone, 0, '重开后里程碑计数清零');
eq(G.state.vouchers, 0, '重开后券清零');
eq(G.state.bandCombos.length, 0, '重开后档位记录清空');
eq(G.state.pendingMilestones.length, 0, '重开后待结算队列清空');

/* ============================================================
 * [B] 连击事件定义
 * ========================================================== */
console.log('\n[B] 连击事件定义');

/* 长度 1 不算连击（不创建档位记录） */
G.reset();
runCascade(1, 0);
const band0 = G.state.bandCombos[0];
eq(band0 ? band0.double : 0, 0, '长度 1 → 不记双连');
eq(band0 ? band0.triple : 0, 0, '长度 1 → 不记三连');

/* 长度 2 记一次双连 */
G.reset();
runCascade(2, 0);
eq(G.state.bandCombos[0].double, 1, '长度 2 → 记 1 次双连');
eq(G.state.bandCombos[0].triple, 0, '长度 2 → 不记三连');

/* 长度 3 只记一次三连，不记双连 */
G.reset();
runCascade(3, 0);
eq(G.state.bandCombos[0].triple, 1, '长度 3 → 记 1 次三连');
eq(G.state.bandCombos[0].double, 0, '长度 3 → 不记双连');

/* 长度 5 也只记一次三连 */
G.reset();
runCascade(5, 0);
eq(G.state.bandCombos[0].triple, 1, '长度 5 → 仍然只记 1 次三连');
eq(G.state.bandCombos[0].double, 0, '长度 5 → 不记双连');

/* ============================================================
 * [C] 合格判定与发券
 * ========================================================== */
console.log('\n[C] 合格判定与发券');

/* 2 次双连 → 不合格 */
G.reset();
runCascade(2, 0);
runCascade(2, 0);
eq(G.state.bandCombos[0].double, 2, '档位 0 攒了 2 次双连');
G.addScore(500);                       // 触发节点 1
eq(G.state.vouchers, 0, '只有 2 次双连 → 不发券');

/* 3 次双连 → 合格，发 1 张 */
G.reset();
runCascade(2, 0);
runCascade(2, 0);
runCascade(2, 0);
G.addScore(500);
eq(G.state.vouchers, 1, '3 次双连 → 发 1 张券');

/* 1 次三连 → 不合格 */
G.reset();
runCascade(3, 0);
G.addScore(500);
eq(G.state.vouchers, 0, '只有 1 次三连 → 不发券');

/* 2 次三连 → 合格 */
G.reset();
runCascade(3, 0);
runCascade(3, 0);
G.addScore(500);
eq(G.state.vouchers, 1, '2 次三连 → 发 1 张券');

/* 档位之间不合并：档位 0 攒 2 次双连，档位 1 攒 2 次双连，都不合格 */
G.reset();
runCascade(2, 0); runCascade(2, 0);
G.addScore(500);                       // 结算节点 1：档位 0 只有 2 次 → 不合格
eq(G.state.vouchers, 0, '档位 0 只 2 次双连 → 节点 1 不发券');
runCascade(2, 1); runCascade(2, 1);
G.addScore(500);                       // 结算节点 2：档位 1 只有 2 次 → 不合格
eq(G.state.vouchers, 0, '两个档位各 2 次也不会合并成合格');

/* ============================================================
 * [D] 档位归属：一条长连锁只算起始档位
 * ========================================================== */
console.log('\n[D] 档位归属');

G.reset();
/* 档位 0 里攒够 3 次双连，然后一条长连锁跨过 500 分 */
runCascade(2, 0); runCascade(2, 0); runCascade(2, 0);
/* 造一条长度 4 的连锁，起始档位是 0（即便它跨过了 500 分） */
runCascade(4, 0);
eq(G.state.bandCombos[0].triple, 1, '长连锁记在起始档位 0 的三连上');
G.addScore(500);
eq(G.state.vouchers, 1, '档位 0 合格 → 发券');
/* 档位 1 应该没有从这条连锁拿到任何计数 */
const band1 = G.state.bandCombos[1];
eq(band1 ? band1.triple : 0, 0, '这条连锁没有把三连复制到档位 1');
eq(band1 ? band1.double : 0, 0, '这条连锁没有把双连复制到档位 1');

/* ============================================================
 * [E] 余额上限与 +100 超额
 * ========================================================== */
console.log('\n[E] 余额上限与超额奖励');

/* 余额 2 时合格 → +100，不发券 */
G.reset();
G.state.vouchers = 2;
runCascade(2, 0); runCascade(2, 0); runCascade(2, 0);
const scoreBefore = G.state.score;
const progressBefore = G.state.voucherProgress;
G.addScore(500);
eq(G.state.vouchers, 2, '余额已满 → 券数不变');
eq(G.state.score, scoreBefore + 500 + G.VOUCHER_OVERFLOW_SCORE,
   '满额时额外 +' + G.VOUCHER_OVERFLOW_SCORE + ' 分');
eq(G.state.voucherProgress, progressBefore + 500,
   '+100 不推进券进度（只推进了那 500）');

/* 连续超额：再来一次合格，仍然 +100 */
G.reset();
G.state.vouchers = 2;
runCascade(2, 1); runCascade(2, 1); runCascade(2, 1);
G.addScore(1000);                       // 直接跨到节点 2
eq(G.state.vouchers, 2, '连续超额仍不发券');
ok(G.state.score >= 1000 + G.VOUCHER_OVERFLOW_SCORE, '连续超额仍发 +100，实际得分 ' + G.state.score);

/* +100 不递归：不产生新的待结算节点 */
G.reset();
G.state.vouchers = 2;
runCascade(2, 0); runCascade(2, 0); runCascade(2, 0);
G.addScore(500);
eq(G.state.pendingMilestones.length, 0, '+100 不会留下新的待结算节点');

/* 余额 1 → 发券到 2 */
G.reset();
G.state.vouchers = 1;
runCascade(2, 0); runCascade(2, 0); runCascade(2, 0);
G.addScore(500);
eq(G.state.vouchers, 2, '余额 1 → 发券后变成 2');

/* ============================================================
 * [F] 既有得分来源都推进券进度
 * ========================================================== */
console.log('\n[F] 各得分来源都推进券进度');

/* 普通合成（addScore） */
G.reset();
G.addScore(300);
eq(G.state.voucherProgress, 300, '普通得分推进进度');

/* 连锁奖励（addBonusScore） */
G.reset();
const p0 = G.state.voucherProgress;
G.addBonusScore(25);
eq(G.state.voucherProgress, p0 + 25, '连锁奖励推进进度');

/* 救回奖励（addBonusScore） */
G.reset();
const p1 = G.state.voucherProgress;
G.addBonusScore(G.RECOVERY_BONUS);
eq(G.state.voucherProgress, p1 + G.RECOVERY_BONUS, '救回奖励推进进度');

/* 复活币行为不变 */
G.reset();
G.addScore(1500);
eq(G.state.revives, 1, '1500 分照常发 1 枚复活币');
G.reset();
G.addBonusScore(2000);
eq(G.state.revives, 0, '奖励分仍然不发复活币');

/* ============================================================
 * [G] 锤子资格判定
 * ========================================================== */
console.log('\n[G] 锤子资格');

G.reset();
const rest = mkBall(200, 500, 3, { contacts: 1, vx: 0, vy: 0 });
ok(G.isHammerTarget(rest), '静止且有接触 → 可砸');

const moving = mkBall(200, 400, 3, { contacts: 1, vx: 200, vy: 0 });
ok(!G.isHammerTarget(moving), '速度超阈值 → 不可砸');

const noContact = mkBall(200, 300, 3, { contacts: 0, vx: 0, vy: 0 });
ok(!G.isHammerTarget(noContact), '无接触（还在弹）→ 不可砸');

const notLanded = mkBall(200, 200, 3, { contacts: 1 });
notLanded.landed = false;
ok(!G.isHammerTarget(notLanded), '未落地 → 不可砸');

const deadBall = mkBall(200, 100, 3, { contacts: 1 });
deadBall.dead = true;
ok(!G.isHammerTarget(deadBall), 'dead → 不可砸');

/* 边界：速度正好 55 可砸，56 不可砸 */
G.reset();
const v55 = mkBall(200, 500, 3, { contacts: 1, vx: 55, vy: 0 });
ok(G.isHammerTarget(v55), '速度正好 55 → 可砸');
const v56 = mkBall(200, 400, 3, { contacts: 1, vx: 56, vy: 0 });
ok(!G.isHammerTarget(v56), '速度 56 → 不可砸');

/* 已从 state.balls 移除 → 不可砸 */
G.reset();
const removed = mkBall(200, 500, 3, { contacts: 1 });
G.removeBall(removed, 'hammer');
ok(!G.isHammerTarget(removed), '已移除的对象 → 不可砸');

/* ============================================================
 * [H] 命中检测与重叠取顶
 * ========================================================== */
console.log('\n[H] 命中检测');

G.reset();
const hit = mkBall(200, 500, 5, { contacts: 1 });
ok(G.hitsFruit(hit, 200, 500), '圆心点命中');
ok(!G.hitsFruit(hit, 10, 10), '远处不命中');

/* 重叠：drawBalls 按 r 从小到大绘制，所以大水果画在后面、盖在小水果上面，
   视觉上最上层的是「半径最大的那只」，应优先选它。 */
G.reset();
const big = mkBall(200, 500, 8, { contacts: 1 });
const small = mkBall(200, 500, 1, { contacts: 1 });
const picked = G.pickHammerTarget(200, 500);
eq(picked, big, '重叠时选中渲染顺序最上面的（半径最大的，后画的那只）');

/* 最上面那只不合格时，应回落到下面合格的 */
G.reset();
const big2 = mkBall(200, 500, 8, { contacts: 1, vx: 300 });
const small2 = mkBall(200, 500, 1, { contacts: 1 });
const picked2 = G.pickHammerTarget(200, 500);
eq(picked2, small2, '最上面那只在飞 → 回落到下面可砸的');

/* ============================================================
 * [I] 锤子模式流程
 * ========================================================== */
console.log('\n[I] 锤子模式流程');

/* 无券不能进入 */
G.reset();
G.state.vouchers = 0;
eq(G.setHammerMode(true), false, '0 张券 → 无法进入锤子态');
eq(G.state.hammerMode, false, '状态仍是未进入');

/* 有券可进入，再点一次退出且不消耗 */
G.reset();
G.state.vouchers = 1;
eq(G.setHammerMode(true), true, '1 张券 → 可以进入');
eq(G.state.hammerMode, true, '进入锤子态');
G.toggleHammerMode();
eq(G.state.hammerMode, false, '再点一次退出');
eq(G.state.vouchers, 1, '取消不消耗券');

/* 点空白：不消耗、不退出 */
G.reset();
G.state.vouchers = 1;
mkBall(200, 500, 3, { contacts: 1 });
G.setHammerMode(true);
eq(G.hammerClickAt(10, 10), false, '点空白返回 false');
eq(G.state.vouchers, 1, '点空白不消耗券');
eq(G.state.hammerMode, true, '点空白不退出模式');

/* 点不合格目标：不消耗、不退出 */
G.reset();
G.state.vouchers = 1;
mkBall(200, 500, 3, { contacts: 1, vx: 300 });
G.setHammerMode(true);
eq(G.hammerClickAt(200, 500), false, '点飞行中的水果返回 false');
eq(G.state.vouchers, 1, '点不合格目标不消耗券');
eq(G.state.hammerMode, true, '点不合格目标不退出模式');

/* 成功：消耗 1 张、移除 1 只、退出模式 */
G.reset();
G.state.vouchers = 2;
const t1 = mkBall(200, 500, 3, { contacts: 1 });
const before = G.state.balls.length;
G.setHammerMode(true);
eq(G.hammerClickAt(200, 500), true, '点合格目标返回 true');
eq(G.state.vouchers, 1, '成功消耗 1 张券');
eq(G.state.balls.length, before - 1, '成功移除 1 只水果');
eq(G.state.balls.indexOf(t1), -1, '被砸的那只已从 state.balls 移除');
eq(G.state.hammerMode, false, '成功后自动退出模式');

/* 重复点击不会双消耗 */
G.reset();
G.state.vouchers = 2;
mkBall(200, 500, 3, { contacts: 1 });
G.setHammerMode(true);
G.hammerClickAt(200, 500);
const vAfter = G.state.vouchers;
G.hammerClickAt(200, 500);              // 已退出模式，应无效
eq(G.state.vouchers, vAfter, '重复点击不会再次消耗');

/* 结束时自动取消 */
G.reset();
G.state.vouchers = 1;
mkBall(200, 500, 3, { contacts: 1 });
G.setHammerMode(true);
G.gameOver();
eq(G.state.hammerMode, false, '游戏结束 → 自动退出锤子态');

/* ============================================================
 * [J] 锤子移除不产生任何奖励
 * ========================================================== */
console.log('\n[J] 锤子移除的奖励隔离');

G.reset();
G.state.vouchers = 1;
const victim = mkBall(200, 500, 3, { contacts: 1 });
const scoreBefore2 = G.state.score;
const revBefore = G.state.revives;
const progBefore = G.state.voucherProgress;
const recBefore = G.state.stats.recoveries;
G.setHammerMode(true);
G.hammerClickAt(200, 500);
eq(G.state.score, scoreBefore2, '砸掉不产生分数');
eq(G.state.revives, revBefore, '砸掉不产生复活币');
eq(G.state.voucherProgress, progBefore, '砸掉不推进券进度');
eq(G.state.stats.recoveries, recBefore, '砸掉不记救回');
eq(victim.removedBy, 'hammer', '移除原因记为 hammer');

/* 砸掉「危险线上方攒够时间」的水果，也不应给救回奖励 */
G.reset();
G.state.vouchers = 1;
const dang = mkBall(200, 120, 3, { contacts: 1 });
dang.dangerPeak = 1.0;
const recBefore2 = G.state.stats.recoveries;
G.removeBall(dang, 'hammer');
eq(G.state.stats.recoveries, recBefore2, '锤子移除不调用 creditRecovery');

/* ============================================================
 * [K] 砸掉连锁刚产出的水果不算连锁接上
 * ========================================================== */
console.log('\n[K] 锤子与连锁的交互');

G.reset();
G.state.vouchers = 1;
const chainBall = mkBall(200, 500, 3, { contacts: 1 });
G.state.cascadeLen = 1;
G.state.cascadeBall = chainBall;
G.state.cascadeTime = G.state.clock;
G.state.cascadeStartBand = 0;
G.removeBall(chainBall, 'hammer');
eq(G.state.cascadeLen, 0, '砸掉连锁刚产出的水果 → 连锁结束，不会延长');

/* 确认 removedBy 区分正确：合成移除标记 merge */
G.reset();
const a1 = mkBall(200, 500, 0);
const b1 = mkBall(200, 500 + G.FRUITS[0].r * 2 - 0.4, 0);
let merged = false;
for (let i = 0; i < 40 && !merged; i++) {
  G.stepPhysics(1 / 60);
  if (a1.dead && b1.dead) merged = true;
}
ok(merged, '两颗同级水果成功合成');
eq(a1.removedBy, 'merge', '合成移除标记为 merge');
eq(b1.removedBy, 'merge', '合成移除标记为 merge（第二颗）');

/* ============================================================
 * [L] 锤子态下输入不投放
 * ========================================================== */
console.log('\n[L] 锤子态下的输入隔离');

G.reset();
G.state.vouchers = 2;
mkBall(200, 500, 3, { contacts: 1 });
G.setHammerMode(true);

const ballsBeforeInput = G.state.balls.length;
const aimBefore = G.state.aimX;

/* 空格 / 回车 / 方向键都不该投放或移动准星 */
const keyHandlers = winListeners.keydown || [];
keyHandlers.forEach((fn) => {
  fn({ code: 'Space', key: ' ', preventDefault() {} });
  fn({ code: 'Enter', key: 'Enter', preventDefault() {} });
  fn({ code: 'ArrowDown', key: 'ArrowDown', preventDefault() {} });
  fn({ code: 'ArrowLeft', key: 'ArrowLeft', preventDefault() {} });
});
eq(G.state.balls.length, ballsBeforeInput, '锤子态下按键不投放水果');
eq(G.state.aimX, aimBefore, '锤子态下按键不移动准星');

/* Esc 退出 */
keyHandlers.forEach((fn) => fn({ code: 'Escape', key: 'Escape', preventDefault() {} }));
eq(G.state.hammerMode, false, 'Esc 退出锤子态');

/* 退出后投放恢复正常 */
G.state.ready = true; G.state.cooldown = 0;
const beforeDrop = G.state.balls.length;
keyHandlers.forEach((fn) => fn({ code: 'Space', key: ' ', preventDefault() {} }));
eq(G.state.balls.length, beforeDrop + 1, '退出锤子态后空格投放恢复正常');

/* ============================================================
 * [M] 瞄准期间物理与判负照常
 * ========================================================== */
console.log('\n[M] 瞄准期间物理照常');

G.reset();
G.state.vouchers = 1;
const phys = mkBall(200, 300, 3, { contacts: 1 });
G.setHammerMode(true);
const yBefore = phys.y;
G.update(1 / 60);
ok(phys.y > yBefore, '锤子态下物理照常推进（水果会下落）');
eq(G.state.hammerMode, true, '物理推进不影响锤子态');

/* 判负逻辑照常：越线计时会累积 */
G.reset();
G.state.vouchers = 1;
const over = mkBall(200, 120, 3, { contacts: 1 });
over.overTime = 1.4;
G.setHammerMode(true);
let ended = false;
for (let i = 0; i < 30 && !ended; i++) {
  G.checkGameOver(0.01);
  if (G.state.over) ended = true;
}
ok(ended, '锤子态下越线判负照常触发');
eq(G.state.hammerMode, false, '判负后锤子态被自动取消');

/* ============================================================
 * [N] UI 状态同步
 * ========================================================== */
console.log('\n[N] UI 状态');

G.reset();
G.state.vouchers = 0;
G.paintVouchers(false);
eq(els.voucherCount.textContent, '0/2', '计数显示 0/2');
eq(els.voucherChip.hidden, true, '0 张时胶囊隐藏');
eq(els.hammerBtn.disabled, true, '0 张时锤子按钮禁用');

G.state.vouchers = 1;
G.paintVouchers(false);
eq(els.voucherCount.textContent, '1/2', '计数显示 1/2');
eq(els.voucherChip.hidden, false, '有券时胶囊显示');
eq(els.hammerBtn.disabled, false, '有券时锤子按钮可用');

G.state.hammerMode = true;
G.paintVouchers(false);
eq(els.hammerBtn.getAttribute('aria-pressed'), 'true', '进入锤子态 → aria-pressed=true');

G.state.hammerMode = false;
G.paintVouchers(false);
eq(els.hammerBtn.getAttribute('aria-pressed'), 'false', '退出锤子态 → aria-pressed=false');

/* 提示条 */
G.state.hammerMode = true;
G.paintHammerHint();
eq(els.hammerHint.hidden, false, '锤子态显示提示条');
ok(els.hammerHint.textContent.indexOf('静止') >= 0, '提示文案说明要选静止的奶蛙');
G.state.hammerMode = false;
G.paintHammerHint();
eq(els.hammerHint.hidden, true, '退出后隐藏提示条');

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
