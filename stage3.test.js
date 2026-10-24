/* ============================================================
 *  Stage 3 自检：教程弹窗 + 改名 + 页脚 + 赞助已移除
 *  运行：node stage3.test.js
 *
 *  覆盖：
 *    · 标题/元数据/无障碍标签都已改成「合成大奶娃Pro」
 *    · ? 按钮存在、有可访问名、能打开教程弹窗
 *    · 关闭按钮 / 「知道了」/ Escape / 点遮罩 都能关
 *    · 焦点：打开时进入弹窗，关闭后回到原来的元素
 *    · 教程文案与实际机制一致（连锁 0.6s、救回 0.5s/3 次、1500 分、两档复活）
 *    · 打开/使用教程不会投放水果
 *    · 页脚两个外链指向正确仓库，且带 noopener noreferrer
 *    · 赞助功能已彻底移除
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

/* 带焦点支持的极简 DOM */
function makeEl(id, tag) {
  const el = {
    id, tagName: String(tag || 'div').toUpperCase(),
    style: {}, textContent: '', width: 680, height: 112,
    hidden: false, disabled: false, offsetWidth: 100,
    _c: new Set(), _h: {}, _attrs: {},
    classList: {
      add: (c) => el._c.add(c), remove: (c) => el._c.delete(c), contains: (c) => el._c.has(c)
    },
    getContext: () => el._ctx || (el._ctx = makeCtx()),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 700 }),
    addEventListener(t, fn) { el._h[t] = fn; },
    click() { if (el._h.click) el._h.click({ preventDefault() {}, stopPropagation() {} }); },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    removeAttribute(k) { delete el._attrs[k]; },
    focus() { doc.activeElement = el; },
    blur() { if (doc.activeElement === el) doc.activeElement = null; },
    select() {},
    querySelector: () => ({ textContent: '', style: {}, classList: { add() {}, remove() {} } })
  };
  return el;
}

const IDS = ['game', 'stage', 'overlay', 'score', 'best', 'finalScore', 'finalBest', 'next', 'chain',
  'soundBtn', 'resetBtn', 'restartBtn', 'revivePrompt', 'overPanel', 'reviveScore',
  'reviveLeft', 'reviveBtn', 'reviveWideBtn', 'reviveWideHint', 'giveUpBtn',
  'reviveBadge', 'reviveCount', 'statCascade', 'statTier', 'statTop', 'statRecovery',
  'statRevive', 'helpBtn', 'helpModal', 'helpClose', 'helpOk', 'helpTitle'];
const els = {};
IDS.forEach((id) => { els[id] = makeEl(id); });
els.helpBtn.tagName = 'BUTTON';
els.helpClose.tagName = 'BUTTON';
els.helpOk.tagName = 'BUTTON';
els.helpModal.setAttribute('aria-hidden', 'true');
els.revivePrompt.hidden = true;
els.reviveBadge.hidden = true;

const doc = {
  readyState: 'complete',
  activeElement: null,
  getElementById: (id) => els[id] || null,
  addEventListener() {},
  createElement: (t) => makeEl('', t),
  querySelector: () => null,
  querySelectorAll: () => []
};

const winListeners = {};
const mem = {};
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
  addEventListener(t, fn) { winListeners[t] = fn; },
  navigator: {},
  Image: class {
    constructor() { this.width = 512; this.height = 512; this.naturalWidth = 512; }
    set src(v) { this._src = v; if (this.onload) this.onload(); }
    get src() { return this._src; }
  }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = (t, fn) => {
  (winListeners[t] = winListeners[t] || []).push(fn);
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const load = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
load('assets/fruits/parts.js');
load('game.js');
load('help.js');

const G = sandbox.window.__DNW__;
const H = sandbox.window.DanaiwaHelp;

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}
function eq(a, b, label) {
  ok(a === b, label, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b));
}

console.log('Stage 3 自检：教程 / 改名 / 页脚 / 赞助移除\n');

/* ============================================================
 * [A] 赞助功能已彻底移除
 * ========================================================== */
console.log('[A] 赞助功能已移除');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

ok(!/sponsor/i.test(html), 'index.html 里没有任何 sponsor 字样');
ok(!/sponsor/i.test(css), 'style.css 里没有任何 sponsor 字样');
ok(!/辣条/.test(html), '页面里不再出现「辣条」文案');
ok(!/收款码/.test(html), '页面里不再出现「收款码」');
ok(!fs.existsSync(path.join(root, 'sponsor.js')), 'sponsor.js 已删除');
ok(!fs.existsSync(path.join(root, 'assets', 'sponsor-qr.jpg')), 'assets/sponsor-qr.jpg 已删除');
ok(html.indexOf('sponsor.js') < 0, '页面不再引用 sponsor.js');

/* 结算屏的核心按钮都还在 */
ok(html.indexOf('id="restartBtn"') >= 0, '「再来一局」还在');
ok(html.indexOf('id="boardBtn2"') >= 0, '「排行榜」入口还在');
ok(html.indexOf('id="boardBtn"') >= 0, '面板里的排行榜入口还在');

/* ============================================================
 * [B] 改名与元数据
 * ========================================================== */
console.log('\n[B] 改名为「合成大奶娃Pro」');

ok(/<title>合成大奶娃Pro<\/title>/.test(html), '浏览器标题已改成 Pro');
ok(html.indexOf('apple-mobile-web-app-title" content="合成大奶娃Pro"') >= 0, 'iOS 主屏标题已改成 Pro');
ok(html.indexOf('aria-label="合成大奶娃Pro 游戏区域"') >= 0, '画布无障碍标签已改成 Pro');
ok(/<h1>合成大奶娃Pro<\/h1>/.test(html), '页面大标题已改成 Pro');
ok(html.indexOf('<h1>合成大奶娃</h1>') < 0, '旧标题（不带 Pro）已不存在');

/* ============================================================
 * [C] ? 按钮与教程弹窗
 * ========================================================== */
console.log('\n[C] ? 按钮与教程弹窗');

ok(!!H, 'help.js 加载并导出 DanaiwaHelp');
ok(html.indexOf('id="helpBtn"') >= 0, '页面里有 ? 教程按钮');
ok(html.indexOf('aria-label="玩法教程"') >= 0, '? 按钮有可访问名「玩法教程」');
ok(html.indexOf('id="helpModal"') >= 0, '页面里有教程弹窗');
ok(html.indexOf('aria-labelledby="helpTitle"') >= 0, '弹窗用标题做 aria-labelledby');
ok(html.indexOf('id="helpClose"') >= 0, '弹窗有关闭按钮');
ok(html.indexOf('aria-label="关闭教程"') >= 0, '关闭按钮有可访问名');

/* 初始是关的 */
eq(H.isOpen(), false, '初始状态是关闭');
eq(els.helpModal.getAttribute('aria-hidden'), 'true', '初始 aria-hidden=true');

/* 打开 */
doc.activeElement = els.resetBtn;      // 模拟用户刚点过重开
els.helpBtn.click();
eq(H.isOpen(), true, '点 ? 打开教程');
eq(els.helpModal.classList.contains('show'), true, '弹窗加上 show 类');
eq(els.helpModal.getAttribute('aria-hidden'), 'false', '打开后 aria-hidden=false');
eq(doc.activeElement, els.helpClose, '打开后焦点移到关闭按钮');

/* 关闭按钮 */
els.helpClose.click();
eq(H.isOpen(), false, '点 ✕ 关闭教程');
eq(els.helpModal.classList.contains('show'), false, '弹窗移除 show 类');
eq(els.helpModal.getAttribute('aria-hidden'), 'true', '关闭后 aria-hidden=true');
eq(doc.activeElement, els.resetBtn, '关闭后焦点回到原来的元素');

/* 「知道了」按钮 */
els.helpBtn.click();
els.helpOk.click();
eq(H.isOpen(), false, '点「知道了」也能关');

/* Escape */
els.helpBtn.click();
const escHandlers = (winListeners.keydown || []).filter((fn) => typeof fn === 'function');
ok(escHandlers.length > 0, 'help.js 绑定了 keydown');
escHandlers.forEach((fn) => fn({ key: 'Escape', code: 'Escape', preventDefault() {} }));
eq(H.isOpen(), false, 'Escape 能关掉教程');

/* 点遮罩空白处 */
els.helpBtn.click();
eq(H.isOpen(), true, '再次打开');
els.helpModal._h.click({ target: els.helpModal });
eq(H.isOpen(), false, '点遮罩空白处能关掉');

/* 点弹窗内部不会误关 */
els.helpBtn.click();
els.helpModal._h.click({ target: els.helpTitle });
eq(H.isOpen(), true, '点弹窗内部内容不会关掉');
H.close();

/* ============================================================
 * [D] 教程文案与真实机制一致
 * ========================================================== */
console.log('\n[D] 教程文案与实际机制一致');

const helpText = (function () {
  const m = html.match(/<div class="modal" id="helpModal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  return m ? m[0].replace(/<[^>]+>/g, ' ') : html;
})();

ok(helpText.indexOf('0.6 秒') >= 0, '教程写了连锁窗口 0.6 秒');
ok(helpText.indexOf('最多 +25') >= 0, '教程写了连锁奖励上限 +25');
ok(helpText.indexOf('0.5 秒') >= 0, '教程写了救回需要 0.5 秒');
ok(helpText.indexOf('3 次') >= 0, '教程写了救回每局最多 3 次');
ok(helpText.indexOf('1500 分') >= 0, '教程写了每 1500 分一枚复活币');
ok(helpText.indexOf('120 毫秒') >= 0, '教程写了触屏微调取 120 毫秒');
ok(helpText.indexOf('±60 px/s') >= 0, '教程写了微调上限 ±60 px/s');
ok(helpText.indexOf('1.5 秒') >= 0, '教程写了越线判负 1.5 秒');
ok(helpText.indexOf('Shift') >= 0, '教程写了 Shift 组合键');
ok(helpText.indexOf('500 分') >= 0, '教程写了神奶蛙 500 分');

/* 文案里的数字要和代码常量对得上，防止以后改代码忘了改文案 */
eq(G.CASCADE_WINDOW, 0.6, '代码里的连锁窗口确实是 0.6 秒');
eq(G.CASCADE_BONUS_MAX * G.CASCADE_BONUS_STEP, 25, '代码里的连锁奖励上限确实是 +25');
eq(G.RECOVERY_MIN_TIME, 0.5, '代码里的救回门槛确实是 0.5 秒');
eq(G.RECOVERY_CAP, 3, '代码里的救回上限确实是 3 次');
eq(G.REVIVE_STEP, 1500, '代码里的攒币阈值确实是 1500 分');
eq(G.FINESSE_TOUCH_WINDOW, 120, '代码里的触屏窗口确实是 120ms');
eq(G.FINESSE_MAX, 60, '代码里的微调上限确实是 60px/s');
eq(G.REVIVE_COST_NORMAL, 1, '普通档确实是 1 枚');
eq(G.REVIVE_COST_WIDE, 2, '大范围档确实是 2 枚');
eq(G.REVIVE_WIDE_TOP, 3, '大范围档清顶上 3 颗');
eq(G.MAX_BONUS, 500, '神奶蛙清场确实是 500 分');

/* 页面上的旧提示也要改过 */
ok(html.indexOf('每 <strong>1500 分</strong>') >= 0, '侧栏提示已改成 1500 分');
ok(html.indexOf('2000 分') < 0, '页面里不再有「2000 分」');

/* ============================================================
 * [E] 打开/使用教程不会投放水果
 * ========================================================== */
console.log('\n[E] 教程不会触发游戏操作');

G.reset();
const ballsBefore = G.state.balls.length;
els.helpBtn.click();
ok(H.isOpen(), '教程已打开');
eq(G.state.balls.length, ballsBefore, '打开教程没有投放水果');

/* 在教程里按空格/回车/方向键，也不该投放或移动瞄准 */
const aimBefore = G.state.aimX;
const gameKeys = (winListeners.keydown || []);
gameKeys.forEach((fn) => {
  fn({ code: 'Space', key: ' ', preventDefault() {} });
  fn({ code: 'Enter', key: 'Enter', preventDefault() {} });
  fn({ code: 'ArrowLeft', key: 'ArrowLeft', preventDefault() {} });
});
H.close();
/* game.js 的 keydown 依然存在，但教程本身不派发任何输入；
   这里只断言「教程模块没有替玩家投放」 */
eq(G.state.balls.length, ballsBefore, '在教程里按空格/回车没有投放水果');

/* 教程打开时，鼠标按下也不能投放（指针事件有弹窗保险） */
els.helpBtn.click();
const stageHandlers = els.stage._h || {};
let pointerBlocked = true;
try {
  if (stageHandlers.pointerdown) {
    stageHandlers.pointerdown({ clientX: 200, clientY: 400, pointerType: 'mouse', pointerId: 1 });
  }
} catch (e) { pointerBlocked = false; }
eq(G.state.balls.length, ballsBefore, '教程打开时鼠标按下不会投放水果');
ok(pointerBlocked, 'pointerdown 在弹窗打开时安全返回');
H.close();

/* 弹窗关掉之后，投放恢复正常 —— 别把功能永久锁死 */
G.state.ready = true; G.state.cooldown = 0;
if (stageHandlers.pointerdown) {
  stageHandlers.pointerdown({ clientX: 200, clientY: 400, pointerType: 'mouse', pointerId: 1 });
}
eq(G.state.balls.length, ballsBefore + 1, '关掉教程后鼠标投放恢复正常');

/* ============================================================
 * [F] 页脚链接
 * ========================================================== */
console.log('\n[F] 页脚：仓库与原作者');

ok(html.indexOf('class="page-foot"') >= 0, '页面底部有页脚');
ok(html.indexOf('https://github.com/tianyimc/BigNaiWa-Pro') >= 0, '页脚有我的仓库链接');
ok(html.indexOf('https://github.com/YHSome/BigNaiWa"') >= 0, '页脚有原作者仓库链接');
ok(html.indexOf('我的仓库 / Tianyimc') >= 0, '我的仓库链接有文字标签');
ok(html.indexOf('原作者 / YHSome') >= 0, '原作者链接有文字标签');

/* 两个链接都必须是安全的新标签打开 */
const linkMatches = html.match(/<a [^>]*href="https:\/\/github\.com\/[^"]*"[^>]*>/g) || [];
eq(linkMatches.length, 2, '页脚正好两个外链');
linkMatches.forEach((tag, i) => {
  ok(/target="_blank"/.test(tag), '第 ' + (i + 1) + ' 个链接带 target="_blank"');
  ok(/rel="noopener noreferrer"/.test(tag), '第 ' + (i + 1) + ' 个链接带 rel="noopener noreferrer"');
  ok(/aria-label=/.test(tag), '第 ' + (i + 1) + ' 个链接有可访问名');
});

/* 不能出现线上直玩地址 */
ok(html.indexOf('yhsome.github.io') < 0, '页面里没有线上直玩地址');
ok(html.indexOf('tianyimc.github.io') < 0, '页面里没有 tianyimc 的 Pages 地址');

/* 页脚说明要讲清是 Pro 续作，不能暗示原作者做了 Pro 功能 */
ok(html.indexOf('Pro 续作') >= 0 || html.indexOf('Pro 分支') >= 0, '页脚说明了这是 Pro 分支/续作');

/* ============================================================
 * [G] 回归：Stage 2 与离线排行榜仍完好
 * ========================================================== */
console.log('\n[G] 回归检查');

G.reset();
eq(G.state.revives, 0, '开局 0 枚');
G.addScore(1499);
eq(G.state.revives, 0, '1499 分 0 枚');
G.addScore(1);
eq(G.state.revives, 1, '1500 分 1 枚');

/* 连锁与救回常量仍在 */
ok(G.CASCADE_WINDOW > 0, '连锁窗口仍在');
ok(G.RECOVERY_CAP > 0, '救回上限仍在');
ok(typeof G.settleCascade === 'function', '连锁结算函数仍导出');
ok(typeof G.creditRecovery === 'function', '救回函数仍导出');
ok(typeof G.paintReviveChoices === 'function', '两档复活按钮刷新函数仍导出');

/* 排行榜仍是离线占位 */
const lb = fs.readFileSync(path.join(root, 'leaderboard.js'), 'utf8');
ok(/ONLINE_ENABLED = false/.test(lb), '排行榜仍是离线模式');
ok(lb.indexOf('正在完善中，敬请期待') >= 0, '占位文案仍在');

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
