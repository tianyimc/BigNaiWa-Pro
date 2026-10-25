/* ============================================================
 *  Stage 4 第二阶段自检：道具库存 + 磁铁 + 风扇 + 泡泡护盾
 *  运行：node stage4-phase2.test.js
 *
 *  覆盖 PLAN Stage 4 第二阶段要求的确定性断言：
 *    · 四种道具的强制抽签结果、均匀抽样契约、不重抽
 *    · 满额/不可用 → 恰好一次 +100，无递归里程碑、无二次奖励
 *    · 每种道具的上限边界（下/等于/超过）、护盾一次性、
 *      新局重置、复活保留、隐藏发放补满全部道具
 *    · 锤子回归：资格、取消、恰好一次消耗、奖励隔离、连锁移除
 *    · 磁铁：选择目标、无邻居失败不扣、局部目标重算、力/时长上限、
 *      目标被移除、不叠加、不瞬移、不直接给奖励
 *    · 风扇：左右交替、作用于存活水果、气流期间新水果、力/时长/速度上限、
 *      不叠加、清理、不直接给奖励
 *    · 护盾：手动/自动、一次性、0.5 秒触发边界、自动触发早于判负、
 *      多颗不同 overTime、精确五秒、保留不足 0.5 秒余量、
 *      护盾期间进入危险区、长帧/后台到期、复活保留、重置清理
 *    · HUD/状态一致、输入隔离
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
    id, style: {}, textContent: '', value: '', width: 680, height: 112,
    hidden: false, disabled: false, offsetWidth: 100, _c: new Set(), _h: {}, _attrs: {},
    classList: {
      add: (c) => el._c.add(c), remove: (c) => el._c.delete(c),
      contains: (c) => el._c.has(c),
      toggle: (c, on) => { if (on) el._c.add(c); else el._c.delete(c); }
    },
    getContext: () => el._ctx || (el._ctx = makeCtx()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 700 }),
    addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); },
    fire(t, ev) { (el._h[t] || []).forEach((fn) => fn(ev || { preventDefault() {}, stopPropagation() {}, target: el })); },
    click() { el.fire('click', { preventDefault() {}, stopPropagation() {}, target: el }); },
    submit() { el.fire('submit', { preventDefault() {}, stopPropagation() {}, target: el }); },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    removeAttribute(k) { delete el._attrs[k]; },
    focus() { doc.activeElement = el; }, blur() {}, select() {},
    querySelector: () => ({ textContent: '', style: {}, classList: { add() {}, remove() {} } })
  };
  return el;
}

const BASE_IDS = ['game', 'stage', 'overlay', 'score', 'best', 'finalScore', 'finalBest', 'next', 'chain',
  'soundBtn', 'resetBtn', 'restartBtn', 'revivePrompt', 'overPanel', 'reviveScore',
  'reviveLeft', 'reviveBtn', 'reviveWideBtn', 'reviveWideHint', 'giveUpBtn',
  'reviveBadge', 'reviveCount', 'statCascade', 'statTier', 'statTop', 'statRecovery',
  'statRevive', 'helpBtn', 'helpModal', 'helpClose', 'helpOk', 'helpTitle',
  'gameTitle', 'taintNote', 'secretModal', 'secretInput', 'secretForm',
  'secretMsg', 'secretClose', 'secretCancel', 'hammerHint', 'shieldTimer',
  'cnt-hammer', 'cnt-magnet', 'cnt-fan', 'cnt-shield',
  'btn-hammer', 'btn-magnet', 'btn-fan', 'btn-shield',
  'itemMenuBtn', 'itemMenu'];
const els = {};
BASE_IDS.forEach((id) => { els[id] = makeEl(id); });
els.revivePrompt.hidden = true;
els.reviveBadge.hidden = true;
els.hammerHint.hidden = true;
els.shieldTimer.hidden = true;
els.secretModal.setAttribute('aria-hidden', 'true');

const winListeners = {};
const mem = {};
let NOW = 100000;          /* 可控单调时钟（护盾用） */
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
  performance: { now: () => NOW },
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

/* 造一只已落定的水果 */
function mkBall(x, y, tier, opts) {
  const b = G.makeBall(x, y, tier, 0, 0);
  b.landed = true; b.px = b.x; b.py = b.y;
  b.contacts = (opts && opts.contacts !== undefined) ? opts.contacts : 1;
  if (opts && opts.vx !== undefined) b.vx = opts.vx;
  if (opts && opts.vy !== undefined) b.vy = opts.vy;
  G.state.balls.push(b);
  return b;
}

/* 让某个档位合格：直接写入 3 次双连 */
function qualifyBand(index) {
  while (G.state.bandCombos.length <= index) {
    G.state.bandCombos.push({ double: 0, triple: 0, closed: false });
  }
  G.state.bandCombos[index].double = 3;
}

console.log('Stage 4 第二阶段自检：库存 + 磁铁 + 风扇 + 护盾\n');

/* ============================================================
 * [A] 随机抽签与库存模型
 * ========================================================== */
console.log('[A] 随机抽签与库存');

G.reset();
eq(JSON.stringify(G.state.inventory), JSON.stringify({ hammer: 0, magnet: 0, fan: 0, shield: 0 }),
   '开局四种道具都是 0');
eq(G.ITEM_MAX.hammer, 2, '锤子上限 2');
eq(G.ITEM_MAX.magnet, 2, '磁铁上限 2');
eq(G.ITEM_MAX.fan, 2, '风扇上限 2');
eq(G.ITEM_MAX.shield, 1, '护盾上限 1');
eq(G.ITEM_TYPES.length, 4, '一共四种道具');

/* 四种强制抽签结果 */
const draws = [
  [0.0, 'hammer'], [0.3, 'magnet'], [0.6, 'fan'], [0.9, 'shield']
];
draws.forEach(([r, want]) => {
  G.reset();
  G.setItemRandom(() => r);
  eq(G.drawItemType(), want, '随机值 ' + r + ' → 抽到 ' + want);
});

/* 均匀契约：4 个等分区间的边界 */
G.setItemRandom(() => 0.2499);
eq(G.drawItemType(), 'hammer', '0.2499 → hammer');
G.setItemRandom(() => 0.25);
eq(G.drawItemType(), 'magnet', '0.25 → magnet');
G.setItemRandom(() => 0.75);
eq(G.drawItemType(), 'shield', '0.75 → shield');
G.setItemRandom(() => 0.999999);
eq(G.drawItemType(), 'shield', '接近 1 → 仍是 shield（不越界）');
G.setItemRandom(() => 1);
eq(G.drawItemType(), 'shield', '恰好 1 也不会越界');
G.setItemRandom(() => -1);
eq(G.drawItemType(), 'hammer', '负数归到第一个');

/* 不重抽：抽到满额道具时不会改抽别的 */
G.reset();
G.state.inventory.hammer = 2;              // 锤子已满
G.setItemRandom(() => 0);                  // 恒抽 hammer
const scoreBefore = G.state.score;
qualifyBand(0);
G.addScore(500);
eq(G.state.inventory.hammer, 2, '锤子满时不会被塞到 3');
eq(G.state.score, scoreBefore + 500 + G.VOUCHER_OVERFLOW_SCORE,
   '满额 → 恰好一次 +100 补偿');

/* 补偿不递归：不产生新的待结算节点 */
eq(G.state.pendingMilestones.length, 0, '补偿不留下新的待结算节点');
eq(G.state.voucherProgress, 500, '补偿不推进券进度');

/* ============================================================
 * [B] 上限边界
 * ========================================================== */
console.log('\n[B] 上限边界');

G.reset();
G.state.inventory.magnet = 1;
ok(G.canHoldItem('magnet'), '磁铁 1/2 → 还能拿');
eq(G.addItem('magnet'), true, '磁铁加到 2');
eq(G.canHoldItem('magnet'), false, '磁铁 2/2 → 拿不了');
eq(G.addItem('magnet'), false, '再加拿不了，返回 false');
eq(G.state.inventory.magnet, 2, '磁铁仍是 2');

G.reset();
G.state.inventory.fan = 0;
eq(G.addItem('fan'), true, '风扇从 0 加到 1');
eq(G.addItem('fan'), true, '风扇从 1 加到 2');
eq(G.addItem('fan'), false, '风扇 2 之后拿不了');

/* 护盾特殊：持有 1 个即满 */
G.reset();
eq(G.canHoldItem('shield'), true, '护盾 0 → 可拿');
eq(G.addItem('shield'), true, '拿到护盾');
eq(G.canHoldItem('shield'), false, '护盾 1/1 → 拿不了');
eq(G.addItem('shield'), false, '再加拿不了');

/* 护盾用掉后本局不再给 */
G.state.inventory.shield = 1;
G.activateShield('manual');
eq(G.state.shieldUsedThisRun, true, '护盾用掉 → 标记本局已用');
eq(G.canHoldItem('shield'), false, '用掉后本局不能再拿护盾');
G.state.inventory.shield = 0;
eq(G.canHoldItem('shield'), false, '即使库存归零也不能再拿');

/* ============================================================
 * [C] 新局重置与复活保留
 * ========================================================== */
console.log('\n[C] 重置与复活');

G.reset();
G.state.inventory.hammer = 2;
G.state.inventory.magnet = 1;
G.state.inventory.fan = 2;
G.state.inventory.shield = 1;
G.state.shieldUsedThisRun = true;
G.state.magnet = { active: true, target: null, until: 0 };
G.state.fan = { active: true, dir: -1, until: 0 };
G.state.shield = { active: true, until: 0 };

G.reset();
eq(JSON.stringify(G.state.inventory), JSON.stringify({ hammer: 0, magnet: 0, fan: 0, shield: 0 }),
   '新局清空所有库存');
eq(G.state.shieldUsedThisRun, false, '新局清除护盾已用标记');
eq(G.state.magnet, null, '新局清掉磁铁效果');
eq(G.state.fan, null, '新局清掉风扇效果');
eq(G.state.shield, null, '新局清掉护盾效果');
eq(G.state.magnetMode, false, '新局清掉磁铁瞄准态');

/* 复活保留库存 */
G.reset();
G.state.inventory.hammer = 1;
G.state.inventory.shield = 1;
G.state.shieldUsedThisRun = true;
G.state.balls = [{ x: 200, y: 100, r: 30, dead: false, landed: true, overTime: 1.4,
                   vx: 0, vy: 0, tier: 0, dangerPeak: 0, recoveryDone: false }];
G.state.over = true;
G.revive('normal');
eq(G.state.inventory.hammer, 1, '复活后锤子库存保留');
eq(G.state.inventory.shield, 1, '复活后护盾库存保留');
eq(G.state.shieldUsedThisRun, true, '复活后护盾已用标记保留');

/* ============================================================
 * [D] 隐藏发放补满全部道具
 *     （owner 指令：从「只补锤子」改为「全都补上」）
 * ========================================================== */
console.log('\n[D] 隐藏发放补满全部道具');

G.reset();
G.state.inventory.hammer = 0;
G.state.inventory.magnet = 0;
G.state.inventory.fan = 0;
G.state.inventory.shield = 0;
G.state.revives = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.inventory.hammer, 2, '隐藏发放把锤子补到 2');
eq(G.state.inventory.magnet, 2, '隐藏发放把磁铁补到 2');
eq(G.state.inventory.fan, 2, '隐藏发放把风扇补到 2');
eq(G.state.inventory.shield, 1, '隐藏发放把护盾补到 1');
eq(G.state.revives, 2, '隐藏发放仍然 +2 复活币');

/* 部分持有 → 补齐到上限 */
G.reset();
G.state.inventory.hammer = 1;
G.state.inventory.magnet = 1;
G.state.inventory.fan = 0;
G.state.inventory.shield = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.inventory.hammer, 2, '锤子 1 → 补到 2');
eq(G.state.inventory.magnet, 2, '磁铁 1 → 补到 2');
eq(G.state.inventory.fan, 2, '风扇 0 → 补到 2');
eq(G.state.inventory.shield, 1, '护盾 0 → 补到 1');

/* 护盾是一次性的：本局已用掉时不再补，避免破坏一次性规则 */
G.reset();
G.state.shieldUsedThisRun = true;
G.state.inventory.shield = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.inventory.shield, 0, '护盾本局已用 → 不再补');
eq(G.state.inventory.hammer, 2, '其它道具照常补满');
eq(G.state.inventory.magnet, 2, '磁铁照常补满');
eq(G.state.inventory.fan, 2, '风扇照常补满');

/* 已有 1 个锤子时也补到 2 */
G.reset();
G.state.inventory.hammer = 1;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.inventory.hammer, 2, '1 个锤子 → 补到 2');

/* 已有 2 个锤子时不超上限 */
G.reset();
G.state.inventory.hammer = 2;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.inventory.hammer, 2, '2 个锤子 → 仍然是 2');

/* ============================================================
 * [E] 锤子回归
 * ========================================================== */
console.log('\n[E] 锤子回归');

G.reset();
G.state.inventory.hammer = 1;
const rest = mkBall(200, 500, 3, { contacts: 1 });
ok(G.isHammerTarget(rest), '静止有接触 → 可砸');
const moving = mkBall(200, 400, 3, { contacts: 1, vx: 200 });
ok(!G.isHammerTarget(moving), '在飞 → 不可砸');

/* 取消不消耗 */
G.setHammerMode(true);
G.setHammerMode(false);
eq(G.state.inventory.hammer, 1, '取消不消耗锤子');

/* 点空白不消耗 */
G.setHammerMode(true);
G.hammerClickAt(10, 10);
eq(G.state.inventory.hammer, 1, '点空白不消耗');
eq(G.state.hammerMode, true, '点空白不退出');

/* 成功砸：恰好消耗 1 个 */
G.hammerClickAt(200, 500);
eq(G.state.inventory.hammer, 0, '成功砸掉 → 消耗 1 个');
eq(G.state.hammerMode, false, '成功后退出模式');

/* 没有锤子时进不去 */
eq(G.setHammerMode(true), false, '0 个锤子 → 进不去');

/* ============================================================
 * [F] 磁铁
 * ========================================================== */
console.log('\n[F] 磁铁');

G.reset();
G.state.inventory.magnet = 1;
const sel = mkBall(200, 500, 4, { contacts: 1 });

/* 附近没有别的水果 → 失败且不扣 */
G.setMagnetMode(true);
eq(G.magnetSelect(sel), false, '附近没有别的水果 → 失败');
eq(G.state.inventory.magnet, 1, '失败不消耗磁铁');
eq(G.state.magnetMode, true, '失败不退出瞄准态');

/* 有邻居 → 成功 */
const near = mkBall(260, 500, 3, { contacts: 1 });
eq(G.magnetSelect(sel), true, '有邻居 → 成功启动');
eq(G.state.inventory.magnet, 0, '成功消耗 1 个磁铁');
eq(G.state.magnetMode, false, '成功后退出瞄准态');
ok(G.state.magnet && G.state.magnet.active, '磁铁效果处于激活状态');

/* 目标计算：应该是邻居的质心 */
const t = G.magnetLocalTarget(sel);
ok(t && Math.abs(t.x - near.x) < 1, '局部目标是邻居的位置');

/* 不叠加：效果进行中再启动应被拒绝且不消耗 */
G.state.inventory.magnet = 1;
G.setMagnetMode(true);
eq(G.magnetSelect(near), false, '效果进行中 → 拒绝');
eq(G.state.inventory.magnet, 1, '拒绝时不消耗');

/* 力有上限：跑若干步，速度不会超过上限 */
G.state.magnet = { active: true, target: sel, until: G.state.clock + 10, tx: near.x, ty: near.y };
for (let i = 0; i < 120; i++) G.applyMagnetForce(1 / 60);
ok(Math.hypot(sel.vx, sel.vy) <= G.MAGNET_MAX_SPEED + 1,
   '吸附速度不超过上限，实际 ' + Math.hypot(sel.vx, sel.vy).toFixed(1));

/* 目标被移除 → 效果干净结束 */
G.removeBall(sel, 'hammer');
G.applyMagnetForce(1 / 60);
eq(G.state.magnet, null, '目标被移除 → 磁铁效果结束');

/* 不直接给奖励 */
G.reset();
G.state.inventory.magnet = 2;
const m1 = mkBall(200, 500, 4, { contacts: 1 });
const m2 = mkBall(250, 500, 3, { contacts: 1 });
const sc = G.state.score, pr = G.state.voucherProgress, rv = G.state.revives;
G.setMagnetMode(true);
G.magnetSelect(m1);
eq(G.state.score, sc, '磁铁不直接加分');
eq(G.state.voucherProgress, pr, '磁铁不推进券进度');
eq(G.state.revives, rv, '磁铁不发复活币');

/* 与锤子互斥 */
G.reset();
G.state.inventory.hammer = 1;
G.state.inventory.magnet = 1;
G.setHammerMode(true);
G.setMagnetMode(true);
eq(G.state.hammerMode, false, '开磁铁会关掉锤子瞄准态');

/* ============================================================
 * [G] 风扇
 * ========================================================== */
console.log('\n[G] 风扇');

G.reset();
G.state.inventory.fan = 2;
eq(G.state.fanNextDir, -1, '初始下次方向是左');

const f1 = mkBall(200, 500, 3, { contacts: 1 });
eq(G.useFan(), true, '第一次使用风扇成功');
eq(G.state.inventory.fan, 1, '消耗 1 个风扇');
eq(G.state.fan.dir, -1, '第一次吹向左');
eq(G.state.fanNextDir, 1, '下次方向变成右');

/* 不叠加 */
eq(G.useFan(), false, '气流进行中 → 拒绝');
eq(G.state.inventory.fan, 1, '拒绝不消耗');

/* 力作用于所有存活水果，且有速度上限 */
for (let i = 0; i < 60; i++) G.applyFanForce(1 / 60);
ok(f1.vx < 0, '水果被吹向左边，vx=' + f1.vx.toFixed(1));
ok(Math.abs(f1.vx) <= G.FAN_MAX_ADDED_VX + 1,
   '水平速度不超过上限，实际 ' + Math.abs(f1.vx).toFixed(1));

/* 气流期间新水果也会受影响 */
const f2 = mkBall(300, 400, 2, { contacts: 1 });
G.applyFanForce(1 / 60);
ok(f2.vx < 0, '气流期间新出现的水果同样被吹');

/* 到期后自动结束 */
G.state.fan.until = G.state.clock;      // 立刻到期
G.applyFanForce(1 / 60);
eq(G.state.fan, null, '到期后效果清空');

/* 第二次吹向右 */
G.state.inventory.fan = 1;
eq(G.useFan(), true, '第二次使用成功');
eq(G.state.fan.dir, 1, '第二次吹向右');

/* 不直接给奖励 */
G.reset();
G.state.inventory.fan = 1;
const fb = mkBall(200, 500, 3, { contacts: 1 });
const sc2 = G.state.score, pr2 = G.state.voucherProgress, rv2 = G.state.revives;
G.useFan();
eq(G.state.score, sc2, '风扇不直接加分');
eq(G.state.voucherProgress, pr2, '风扇不推进券进度');
eq(G.state.revives, rv2, '风扇不发复活币');

/* ============================================================
 * [H] 护盾：手动激活与一次性
 * ========================================================== */
console.log('\n[H] 护盾手动激活');

G.reset();
G.state.inventory.shield = 1;
eq(G.shieldActive(), false, '初始未激活');
eq(G.activateShield('manual'), true, '手动激活成功');
eq(G.shieldActive(), true, '护盾处于激活状态');
eq(G.state.inventory.shield, 0, '消耗掉护盾');
eq(G.state.shieldUsedThisRun, true, '标记本局已用');

/* 不能重复激活 */
eq(G.activateShield('manual'), false, '不能重复激活');
eq(G.activateShield('auto'), false, '自动也不能再触发');

/* 到期后清空 */
NOW += G.SHIELD_DURATION * 1000 + 10;
G.updateShield();
eq(G.shieldActive(), false, '到期后护盾失效');
eq(G.state.shield, null, '到期后效果清空');

/* ============================================================
 * [I] 护盾：暂停危险计时
 * ========================================================== */
console.log('\n[I] 护盾暂停危险计时');

G.reset();
G.state.inventory.shield = 1;
const dang = mkBall(200, 120, 3, { contacts: 1 });   // top=90 < 142，在线上方
dang.overTime = 1.0;                                  // 还剩 0.5 秒

G.activateShield('manual');
const paused = dang.overTime;
for (let i = 0; i < 60; i++) G.checkGameOver(0.01);
eq(dang.overTime, paused, '护盾期间 overTime 完全不动（既不增也不减）');
eq(G.state.over, false, '护盾期间不会判负');

/* 护盾到期后，水果带着原来的 overTime 继续倒数 */
NOW += G.SHIELD_DURATION * 1000 + 10;
G.updateShield();
eq(dang.overTime, paused, '到期时不会重置 overTime');
for (let i = 0; i < 60 && !G.state.over; i++) G.checkGameOver(0.01);
eq(G.state.over, true, '到期后继续倒数并最终判负');

/* 不足 0.5 秒的余量被保留 */
G.reset();
G.state.inventory.shield = 1;
const dang2 = mkBall(200, 120, 3, { contacts: 1 });
dang2.overTime = 1.3;                                 // 只剩 0.2 秒
G.activateShield('manual');
NOW += G.SHIELD_DURATION * 1000 + 10;
G.updateShield();
eq(dang2.overTime, 1.3, '0.2 秒余量在护盾到期后仍然保留');
G.checkGameOver(0.01);
eq(dang2.overTime > 1.3, true, '到期后立刻恢复累加');
G.checkGameOver(0.3);
eq(G.state.over, true, '0.2 秒余量耗尽后判负');

/* ============================================================
 * [J] 护盾：自动触发
 * ========================================================== */
console.log('\n[J] 护盾自动触发');

/* 剩余 0.6 秒：不触发 */
G.reset();
G.state.inventory.shield = 1;
const a1 = mkBall(200, 120, 3, { contacts: 1 });
a1.overTime = 0.9;                                    // 剩 0.6
eq(G.maybeAutoShield(), false, '剩余 0.6 秒 → 不自动触发');
eq(G.state.shieldUsedThisRun, false, '未触发时不标记已用');

/* 剩余正好 0.5 秒：触发 */
G.reset();
G.state.inventory.shield = 1;
const a2 = mkBall(200, 120, 3, { contacts: 1 });
a2.overTime = 1.0;                                    // 剩 0.5
eq(G.maybeAutoShield(), true, '剩余正好 0.5 秒 → 自动触发');
eq(G.state.shieldUsedThisRun, true, '触发后标记已用');

/* 多颗不同 overTime：按最紧迫的那颗判断 */
G.reset();
G.state.inventory.shield = 1;
const b1 = mkBall(150, 120, 3, { contacts: 1 });
const b2 = mkBall(250, 120, 3, { contacts: 1 });
b1.overTime = 0.2;                                    // 剩 1.3，不紧迫
b2.overTime = 1.2;                                    // 剩 0.3，紧迫
eq(G.maybeAutoShield(), true, '多颗中有一颗紧迫 → 触发');

/* 自动触发早于判负：update 里先 maybeAutoShield 再 checkGameOver */
G.reset();
G.state.inventory.shield = 1;
const c1 = mkBall(200, 120, 3, { contacts: 1 });
c1.overTime = 1.2;                                    // 剩 0.3，再走几步就超
G.update(1 / 60);
eq(G.state.over, false, '自动触发后没有立即判负');
eq(G.shieldActive(), true, '护盾已自动开启');

/* 没有护盾时不触发 */
G.reset();
eq(G.maybeAutoShield(), false, '没有护盾 → 不触发');

/* 已经用过护盾时不再触发 */
G.reset();
G.state.shieldUsedThisRun = true;
G.state.inventory.shield = 1;
const d1 = mkBall(200, 120, 3, { contacts: 1 });
d1.overTime = 1.2;
eq(G.maybeAutoShield(), false, '本局已用过护盾 → 不再触发');

/* 终局后不触发 */
G.reset();
G.state.inventory.shield = 1;
G.state.over = true;
eq(G.maybeAutoShield(), false, '终局后不自动触发');
eq(G.activateShield('auto'), false, '终局后也不能手动激活');

/* 护盾期间新进入危险区的水果不累积 */
G.reset();
G.state.inventory.shield = 1;
G.activateShield('manual');
const e1 = mkBall(200, 120, 3, { contacts: 1 });
e1.overTime = 0;
for (let i = 0; i < 60; i++) G.checkGameOver(0.01);
eq(e1.overTime, 0, '护盾期间新进入危险区的水果不累积计时');

/* ============================================================
 * [K] HUD 状态一致
 * ========================================================== */
console.log('\n[K] HUD 状态');

G.reset();
G.paintInventory(false);
eq(els['cnt-hammer'].textContent, '0/2', '锤子计数 0/2');
eq(els['cnt-magnet'].textContent, '0/2', '磁铁计数 0/2');
eq(els['cnt-fan'].textContent, '0/2', '风扇计数 0/2');
eq(els['cnt-shield'].textContent, '0/1', '护盾计数 0/1');
eq(els['btn-hammer'].disabled, true, '0 个锤子 → 按钮禁用');

G.state.inventory.hammer = 1;
G.state.inventory.shield = 1;
G.paintInventory(false);
eq(els['cnt-hammer'].textContent, '1/2', '锤子计数 1/2');
eq(els['btn-hammer'].disabled, false, '有锤子 → 按钮可用');
eq(els['btn-shield'].disabled, false, '有护盾 → 按钮可用');

/* 护盾用掉后按钮禁用 */
G.state.shieldUsedThisRun = true;
G.state.inventory.shield = 0;
G.paintInventory(false);
eq(els['btn-shield'].disabled, true, '护盾用掉后按钮禁用');

/* 护盾倒计时 */
G.reset();
G.state.inventory.shield = 1;
G.activateShield('manual');
G.paintShieldTimer();
eq(els.shieldTimer.hidden, false, '护盾激活时显示倒计时');
ok(els.shieldTimer.textContent.indexOf('护盾') >= 0, '倒计时文案包含「护盾」');

NOW += G.SHIELD_DURATION * 1000 + 10;
G.updateShield();
G.paintShieldTimer();
eq(els.shieldTimer.hidden, true, '护盾结束后隐藏倒计时');

/* ============================================================
 * [L] 输入隔离
 * ========================================================== */
console.log('\n[L] 输入隔离');

/* 磁铁瞄准态下按键不投放 */
G.reset();
G.state.inventory.magnet = 1;
G.setMagnetMode(true);
const before = G.state.balls.length;
['Space', 'Enter', 'ArrowDown', 'ArrowLeft'].forEach((code) => {
  (winListeners.keydown || []).forEach((fn) => fn({ code, key: code, preventDefault() {} }));
});
eq(G.state.balls.length, before, '磁铁态下按键不投放');

/* Esc 退出 */
(winListeners.keydown || []).forEach((fn) => fn({ code: 'Escape', key: 'Escape', preventDefault() {} }));
eq(G.state.magnetMode, false, 'Esc 退出磁铁态');

/* 退出后投放恢复 */
G.state.ready = true; G.state.cooldown = 0;
(winListeners.keydown || []).forEach((fn) => fn({ code: 'Space', key: ' ', preventDefault() {} }));
eq(G.state.balls.length, before + 1, '退出后空格投放恢复');

/* ============================================================
 * [M] 道具菜单
 * ========================================================== */
console.log('\n[M] 道具菜单');

G.reset();
G.setItemMenu(false);
eq(G.itemMenuOpen(), false, '初始菜单关闭');
G.setItemMenu(true);
eq(G.itemMenuOpen(), true, '打开菜单');
G.setItemMenu(false);
eq(G.itemMenuOpen(), false, '关闭菜单');
G.toggleItemMenu();
eq(G.itemMenuOpen(), true, 'toggle 打开');
G.toggleItemMenu();
eq(G.itemMenuOpen(), false, 'toggle 关闭');

/* 用掉一个道具后菜单自动收起 */
G.reset();
G.state.inventory.fan = 1;
G.setItemMenu(true);
G.useFan();
G.closeMenuAfterUse();
eq(G.itemMenuOpen(), false, '用掉道具后菜单收起');

/* 菜单里的计数与库存一致 */
G.reset();
G.state.inventory.hammer = 2;
G.state.inventory.magnet = 1;
G.state.inventory.fan = 0;
G.state.inventory.shield = 1;
G.paintInventory(false);
eq(els['cnt-hammer'].textContent, '2/2', '菜单显示锤子 2/2');
eq(els['cnt-magnet'].textContent, '1/2', '菜单显示磁铁 1/2');
eq(els['cnt-fan'].textContent, '0/2', '菜单显示风扇 0/2');
eq(els['cnt-shield'].textContent, '1/1', '菜单显示护盾 1/1');
eq(els['btn-fan'].disabled, true, '0 个风扇 → 菜单项禁用');
eq(els['btn-hammer'].disabled, false, '有锤子 → 菜单项可用');

/* ============================================================
 * [N] 按钮布局一致性
 *
 * 「道具」按钮外面包了一层 .item-menu-wrap（用于定位悬浮菜单）。
 * 如果这层容器没撑满网格单元，按钮右侧就会留出一条空隙，
 * 看起来像「道具」和「音效」之间有莫名其妙的间距。
 * ========================================================== */
console.log('\n[N] 按钮布局');

const cssText = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
ok(/\.item-menu-wrap\s*\{[^}]*display:\s*flex/.test(cssText),
   '.item-menu-wrap 用 flex 让内部按钮撑满');
ok(/\.item-menu-wrap\s*>\s*\.btn\s*\{[^}]*width:\s*100%/.test(cssText),
   '.item-menu-wrap 内的按钮宽度 100%');
ok(/\.item-menu-wrap\s*\{[^}]*min-width:\s*0/.test(cssText),
   '.item-menu-wrap 允许收缩（min-width: 0）');

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
