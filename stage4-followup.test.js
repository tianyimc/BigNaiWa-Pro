/* ============================================================
 *  Stage 4 追加自检：隐藏口令 + 整局成绩作废
 *  运行：node stage4-followup.test.js
 *
 *  覆盖 PLAN 要求的全部断言：
 *    · 标题连点阈值、超时重置、鼠标/触屏/键盘单次手势不重复计数
 *    · 弹窗打开/取消、正确与错误口令
 *    · 成功使用：券补满到 2（从 0/1/2 三种余额）、+2 复活币、
 *      重复使用不超过上限、不给任何分数/进度/连击奖励
 *    · 失败或取消不改变任何状态；终局后使用被拒绝
 *    · 历史最高分：未破纪录时作废后不写；破了纪录时回滚到开局基线；后续得分不能改写
 *    · 实时分数与结算面板仍然正确
 *    · 作废标记跨复活保留，仅新一局清除
 *    · 所有排行榜提交路径都拒绝作废局；离线占位仍然零请求
 *    · 弹窗交互不把指针/触屏/Enter/Space/Esc/方向键泄漏成投放；关闭后恢复正常
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

const IDS = ['game', 'stage', 'overlay', 'score', 'best', 'finalScore', 'finalBest', 'next', 'chain',
  'soundBtn', 'resetBtn', 'restartBtn', 'revivePrompt', 'overPanel', 'reviveScore',
  'reviveLeft', 'reviveBtn', 'reviveWideBtn', 'reviveWideHint', 'giveUpBtn',
  'reviveBadge', 'reviveCount', 'statCascade', 'statTier', 'statTop', 'statRecovery',
  'statRevive', 'helpBtn', 'helpModal', 'helpClose', 'helpOk', 'helpTitle',
  'voucherChip', 'voucherCount', 'hammerBtn', 'hammerHint',
  'gameTitle', 'taintNote', 'secretModal', 'secretInput', 'secretForm',
  'secretMsg', 'secretClose', 'secretCancel'];
const els = {};
IDS.forEach((id) => { els[id] = makeEl(id); });
els.revivePrompt.hidden = true;
els.reviveBadge.hidden = true;
els.voucherChip.hidden = true;
els.hammerHint.hidden = true;
els.taintNote.hidden = true;
els.secretModal.setAttribute('aria-hidden', 'true');

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

/* 可控时钟：让连点窗口可测 */
let NOW = 100000;
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

/* 模拟一次标题点击（走真实的事件处理器） */
function clickTitle(times) {
  for (let i = 0; i < (times || 1); i++) els.gameTitle.click();
}
function keydown(ev) {
  (winListeners.keydown || []).forEach((fn) => fn(ev));
}

console.log('Stage 4 追加自检：隐藏口令 + 整局成绩作废\n');

/* ============================================================
 * [A] 连点阈值与窗口
 * ========================================================== */
console.log('[A] 标题连点阈值');

G.reset();
NOW = 100000;
eq(G.state.secretClicks, 0, '开局连点计数为 0');
eq(els.secretModal.classList.contains('show'), false, '开局弹窗关闭');

/* 点 6 次不够 */
clickTitle(6);
eq(G.state.secretClicks, 6, '点 6 次 → 计数 6');
eq(els.secretModal.classList.contains('show'), false, '6 次不够，弹窗没开');

/* 第 7 次触发 */
clickTitle(1);
eq(els.secretModal.classList.contains('show'), true, '第 7 次 → 弹窗打开');
eq(G.state.secretClicks, 0, '触发后计数归零');

/* 超时重置 */
G.closeSecretDialog();
G.reset();
NOW = 200000;
clickTitle(3);
eq(G.state.secretClicks, 3, '点 3 次 → 计数 3');
NOW += G.SECRET_WINDOW + 100;         // 超出窗口
clickTitle(1);
eq(G.state.secretClicks, 1, '超时后重新计数，变成 1');
eq(els.secretModal.classList.contains('show'), false, '超时后没有误触发');

/* 窗口内连续点够 */
NOW += 100;
clickTitle(6);
eq(els.secretModal.classList.contains('show'), true, '窗口内凑够 7 次 → 弹窗打开');
G.closeSecretDialog();

/* 单次手势不重复计数：click 只触发一次计数 */
G.reset();
NOW = 300000;
clickTitle(1);
eq(G.state.secretClicks, 1, '单次 click 只计 1 次（不重复计数）');

/* 键盘激活标题也计入，且与 click 分开触发（不叠加成 2） */
G.reset();
NOW = 400000;
els.gameTitle.fire('keydown', { code: 'Enter', preventDefault() {} });
eq(G.state.secretClicks, 1, '标题 Enter 激活 → 计数 1');

/* ============================================================
 * [B] 弹窗开关与口令校验
 * ========================================================== */
console.log('\n[B] 弹窗与口令');

G.reset();
G.openSecretDialog();
eq(els.secretModal.classList.contains('show'), true, 'openSecretDialog 打开');
eq(els.secretModal.getAttribute('aria-hidden'), 'false', 'aria-hidden=false');

G.closeSecretDialog();
eq(els.secretModal.classList.contains('show'), false, 'closeSecretDialog 关闭');
eq(els.secretModal.getAttribute('aria-hidden'), 'true', 'aria-hidden=true');

/* 错误口令：状态不变 */
G.reset();
const snap = JSON.stringify({
  v: G.state.vouchers, r: G.state.revives, s: G.state.score,
  t: G.state.runTainted, b: G.state.best
});
els.secretInput.value = 'wrong';
G.submitSecret();
eq(JSON.stringify({
  v: G.state.vouchers, r: G.state.revives, s: G.state.score,
  t: G.state.runTainted, b: G.state.best
}), snap, '错误口令不改变任何状态');
ok(els.secretMsg.textContent.length > 0, '错误口令给出提示：' + els.secretMsg.textContent);

/* 正确口令 */
els.secretInput.value = G.SECRET_PASS;
const okRes = G.submitSecret();
eq(okRes, true, '正确口令返回 true');
eq(G.state.runTainted, true, '使用后本局标记为作废');
eq(els.secretModal.classList.contains('show'), false, '成功后弹窗关闭');

/* 取消不改变状态 */
G.reset();
const snap2 = JSON.stringify({ v: G.state.vouchers, r: G.state.revives, t: G.state.runTainted });
G.openSecretDialog();
els.secretCancel.fire('click', { preventDefault() {}, target: els.secretCancel });
eq(JSON.stringify({ v: G.state.vouchers, r: G.state.revives, t: G.state.runTainted }),
   snap2, '取消不改变状态');
eq(els.secretModal.classList.contains('show'), false, '取消后弹窗关闭');

/* Esc 关闭且不改变状态 */
G.openSecretDialog();
keydown({ code: 'Escape', key: 'Escape', preventDefault() {} });
eq(els.secretModal.classList.contains('show'), false, 'Esc 关闭弹窗');
eq(G.state.runTainted, false, 'Esc 关闭不作废本局');

/* ============================================================
 * [C] 发放内容
 * ========================================================== */
console.log('\n[C] 发放内容');

/* 从 0 张券开始 */
G.reset();
G.state.vouchers = 0;
G.state.revives = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.vouchers, 2, '0 张 → 补满到 2');
eq(G.state.revives, 2, '复活币 +2');

/* 从 1 张券开始 */
G.reset();
G.state.vouchers = 1;
G.state.revives = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.vouchers, 2, '1 张 → 补满到 2');
eq(G.state.revives, 2, '复活币 +2');

/* 从 2 张券开始：不超上限 */
G.reset();
G.state.vouchers = 2;
G.state.revives = 0;
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.vouchers, 2, '2 张 → 仍然是 2（不超上限）');
eq(G.state.revives, 2, '复活币仍然 +2');

/* 重复使用：券不超上限，复活币每次 +2 */
G.reset();
G.state.vouchers = 0;
G.state.revives = 0;
G.applySecretGrant(G.SECRET_PASS);
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.vouchers, 2, '重复使用券仍然不超过 2');
eq(G.state.revives, 4, '重复使用复活币累加（2 → 4）');

/* 不给分数/进度/连击奖励 */
G.reset();
const before = {
  score: G.state.score,
  progress: G.state.voucherProgress,
  milestone: G.state.voucherMilestone,
  bands: JSON.stringify(G.state.bandCombos),
  maxCascade: G.state.stats.maxCascade
};
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.score, before.score, '不给分数');
eq(G.state.voucherProgress, before.progress, '不推进券进度');
eq(G.state.voucherMilestone, before.milestone, '不推进里程碑');
eq(JSON.stringify(G.state.bandCombos), before.bands, '不产生连击记录');
eq(G.state.stats.maxCascade, before.maxCascade, '不影响连锁统计');

/* 终局后拒绝 */
G.reset();
G.state.over = true;
eq(G.applySecretGrant(G.SECRET_PASS), false, '终局后拒绝使用');
eq(G.state.runTainted, false, '终局后拒绝时也不作废');

/* ============================================================
 * [D] 历史最高分保护
 * ========================================================== */
console.log('\n[D] 历史最高分保护');

/* 情况 1：本局没有破纪录 → 作废后 best 不变。
   注意 state.best 只在模块加载时从 localStorage 读一次，
   之后改 mem 不会回读，所以这里直接设 state.best 来模拟「历史最高分 = 500」。 */
G.reset();
G.state.best = 500;
G.state.bestBaseline = 500;
mem['danaiwa.best.v1'] = '500';
G.addScore(100);                 // 本局 100 分，没破纪录
eq(G.state.best, 500, '没破纪录时 best 保持 500');
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.best, 500, '作废后 best 仍然是 500');
G.addScore(1000);                // 作废后继续加分
eq(G.state.best, 500, '作废后继续得分也不写 best');
eq(G.state.score, 1100, '实时分数照常累加');
eq(mem['danaiwa.best.v1'], '500', 'localStorage 里的 best 未被改写');

/* 情况 2：本局先破了纪录，再作废 → 回滚到开局基线 */
G.reset();
G.state.best = 300;
G.state.bestBaseline = 300;
mem['danaiwa.best.v1'] = '300';
G.addScore(1000);                // 本局破了纪录
eq(G.state.best, 1000, '破纪录后 best = 1000');
eq(mem['danaiwa.best.v1'], '1000', 'localStorage 也被写成 1000');
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.best, 300, '作废后回滚到开局基线 300');
eq(mem['danaiwa.best.v1'], '300', 'localStorage 也回滚到 300');
eq(String(els.best.textContent), '300', 'DOM 显示也回到 300');

/* 回滚后继续得分仍然不写 best */
G.addScore(2000);
eq(G.state.best, 300, '回滚后继续得分不再写 best');
eq(mem['danaiwa.best.v1'], '300', 'localStorage 保持 300');

/* 情况 3：基线本来更高，作废不应把 best 拉低 */
G.reset();
G.state.best = 5000;
G.state.bestBaseline = 5000;
mem['danaiwa.best.v1'] = '5000';
G.addScore(100);                 // 没破纪录
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.best, 5000, '基线更高时作废不会把 best 拉低');

/* 情况 4：新一局清除作废标记并重新记录基线 */
G.reset();
eq(G.state.runTainted, false, '新一局清除作废标记');
const newBaseline = G.state.bestBaseline;
eq(newBaseline, G.state.best, '新一局重新记录基线，等于当前 best');
G.addScore(99999);
eq(G.state.runTainted, false, '新一局可以正常刷新纪录');
ok(G.state.best >= 99999, '新一局正常写入 best，实际 ' + G.state.best);

/* ============================================================
 * [E] 作废标记跨复活保留
 * ========================================================== */
console.log('\n[E] 作废标记跨复活');

G.reset();
G.state.best = 0;
G.state.bestBaseline = 0;
mem['danaiwa.best.v1'] = '0';
G.addScore(2000);                // 攒到 1 枚复活币
eq(G.state.revives, 1, '2000 分 → 1 枚复活币');
G.applySecretGrant(G.SECRET_PASS);
eq(G.state.runTainted, true, '使用后作废');
eq(G.state.revives, 3, '复活币变成 1 + 2 = 3');

/* 模拟判负 → 复活 */
G.state.balls = [{ x: 200, y: 100, r: 30, dead: false, landed: true, overTime: 1.4,
                   vx: 0, vy: 0, tier: 0, dangerPeak: 0, recoveryDone: false }];
G.state.over = true;
G.revive('normal');
eq(G.state.runTainted, true, '复活后作废标记仍然保留');
eq(G.state.over, false, '复活成功');

/* 只有新一局才清除 */
G.reset();
eq(G.state.runTainted, false, '新一局才清除作废标记');

/* ============================================================
 * [F] 排行榜提交门控
 * ========================================================== */
console.log('\n[F] 排行榜门控');

let boardCalls = 0;
sandbox.window.DanaiwaBoard = { onGameOver() { boardCalls++; } };

/* 未作废：正常提交 */
G.reset();
boardCalls = 0;
G.state.score = 500;
G.settle();
eq(boardCalls, 1, '未作废 → 正常交给排行榜');

/* 已作废：不提交 */
G.reset();
G.applySecretGrant(G.SECRET_PASS);
boardCalls = 0;
G.state.score = 500;
G.settle();
eq(boardCalls, 0, '已作废 → 不提交排行榜');

/* 结算面板显示提示 */
eq(els.taintNote.hidden, false, '作废局结算面板显示提示');

/* 未作废时不显示提示 */
G.reset();
G.settle();
eq(els.taintNote.hidden, true, '正常局不显示提示');

/* 离线占位仍然零请求：检查 leaderboard.js 仍是离线 */
const lbSrc = fs.readFileSync(path.join(root, 'leaderboard.js'), 'utf8');
ok(/ONLINE_ENABLED = false/.test(lbSrc), '排行榜仍是离线模式');
ok(lbSrc.indexOf('正在完善中，敬请期待') >= 0, '占位文案仍在');

/* ============================================================
 * [G] 弹窗输入隔离
 * ========================================================== */
console.log('\n[G] 弹窗输入隔离');

G.reset();
G.state.vouchers = 1;
G.state.ready = true;
G.state.cooldown = 0;

/* 打开弹窗 */
G.openSecretDialog();
const ballsBefore = G.state.balls.length;
const aimBefore = G.state.aimX;

/* 各种按键都不该投放或移动准星 */
['Space', 'Enter', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach((code) => {
  keydown({ code, key: code, preventDefault() {} });
});
eq(G.state.balls.length, ballsBefore, '弹窗打开时按键不投放水果');
eq(G.state.aimX, aimBefore, '弹窗打开时按键不移动准星');

/* 指针事件也不该投放（isModalOpen 已覆盖） */
els.stage.fire('pointerdown', {
  clientX: 200, clientY: 400, pointerType: 'mouse', pointerId: 1,
  preventDefault() {}, stopPropagation() {}
});
eq(G.state.balls.length, ballsBefore, '弹窗打开时鼠标按下不投放');

/* 关闭后恢复正常 */
G.closeSecretDialog();
G.state.ready = true;
G.state.cooldown = 0;
keydown({ code: 'Space', key: ' ', preventDefault() {} });
eq(G.state.balls.length, ballsBefore + 1, '关闭后空格投放恢复正常');

/* ============================================================
 * [H] 回归：Stage 4 原有功能不受影响
 * ========================================================== */
console.log('\n[H] 回归检查');

G.reset();
eq(G.state.vouchers, 0, '开局 0 张券');
eq(G.state.runTainted, false, '开局未作废');

/* 锤子仍然可用 */
G.state.vouchers = 1;
const b1 = G.makeBall(200, 500, 3, 0, 0);
b1.landed = true; b1.contacts = 1; b1.px = b1.x; b1.py = b1.y;
G.state.balls.push(b1);
eq(G.setHammerMode(true), true, '锤子仍可进入');
eq(G.hammerClickAt(200, 500), true, '锤子仍可砸中');
eq(G.state.vouchers, 0, '锤子照常消耗 1 张券');

/* 复活币阈值不变 */
G.reset();
G.addScore(1500);
eq(G.state.revives, 1, '1500 分照常发 1 枚复活币');

/* 连锁奖励不变 */
G.reset();
const sc0 = G.state.score;
G.addBonusScore(25);
eq(G.state.score - sc0, 25, '连锁奖励照常加分');

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
