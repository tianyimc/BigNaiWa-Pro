/* ============================================================
 *  合成大奶蛙 · Suika Game
 *  纯原生 HTML + CSS + JavaScript，无任何依赖。
 *
 *  物理：PBD（位置约束求解）—— 3 个子步 × 6 次迭代，
 *        静止堆叠稳定，不抖动。
 *  玩法：相同水果接触即合成高一级水果；顶到警戒线超时判负。
 * ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
   *  常量
   * ------------------------------------------------------- */

  const W = 420;             // 逻辑宽度
  const H = 700;             // 逻辑高度
  const WALL = 10;           // 左右墙厚
  const DROP_Y = 74;         // 待投放水果的高度
  const DANGER_Y = 142;      // 警戒线

  const GRAVITY   = 2600;    // px/s²
  const SUBSTEPS  = 3;       // 每帧物理子步
  const ITER      = 6;       // 每个子步的约束迭代次数
  const DROP_MS   = 360;     // 两次投放的最小间隔
  const OVER_LIMIT = 1.5;    // 越线持续多少秒判负
  const REST_SPEED = 140;    // 线上方且速度低于它才算“卡住”（被弹飞路过的不算）
  const REST_SPEED2 = REST_SPEED * REST_SPEED;

  const MAX_TIER  = 10;      // 最大那只（神奶蛙）的索引
  const MAX_BONUS = 500;     // 两只神奶蛙相撞的奖励分
                             // （原来是 100 —— 合出全游戏最难的东西只给 100 分，太寒酸；
                             //  而且它同时清掉两块最大的水果、相当于救一条命，值这个价）
  const MAX_MERGE_GIVES_REVIVE = true;  // 两只神奶蛙一起炸掉时，额外送一枚复活币
  const FREEZE_MS = 130;     // 清场时的定格，让这一下有重量
  const REVIVE_STEP = 1500;  // 每累计多少分，发一枚复活币
  const MERGE_PAD = 0.8;     // 合成判定的接触容差（px）

  /* —— 连锁（cascade）——
     规则：普通合成会产出一颗新水果；只有当「这一颗新水果」在 CASCADE_WINDOW 秒内
     又被另一次合成吃掉，且两次合成之间玩家没有投放过，才算一次连续连锁。
     第一次合成 = 连锁长度 1；之后每接上一次 +1；不相干的合成重新从 1 开始。 */
  const CASCADE_WINDOW = 0.6;      // 秒：新水果必须在这段时间内再次被合成
  const CASCADE_BONUS_STEP = 5;    // 每多一级连锁奖励的分
  const CASCADE_BONUS_MAX = 5;     // 奖励最多按 5 级算（即 +25）
  const CASCADE_TEXT_MAX = 5;      // 飘字最多显示 ×5+，统计里保留真实值

  /* —— 危险线救回 ——
     同一颗水果在警戒线上方累计满 RECOVERY_MIN_TIME 秒后才「够格」算救回；
     之后它掉回线下、或被合成掉，就记一次救回（每颗只记一次，每局最多 RECOVERY_CAP 次）。 */
  const RECOVERY_MIN_TIME = 0.5;   // 秒
  const RECOVERY_BONUS = 30;       // 每次救回的分
  const RECOVERY_CAP = 3;          // 每局最多记几次

  /* —— 投放方向微调（可选手感增强）——
     瞄准仍然只由 aimX 决定；这里只是松手时额外给一点横向速度，
     上限刻意压得很小，不足以替代瞄准。 */
  const FINESSE_ENABLED = true;    // 想关掉整个功能就改 false
  const FINESSE_MAX = 60;          // 横向冲量上限（px/s）
  const FINESSE_KEY_STEP = 20;     // 键盘每按一次加减多少
  const FINESSE_TOUCH_WINDOW = 120; // ms：用拖动最后这段时间的横向速度

  /* —— Stage 4：道具券 + 锤子 ——
     道具券按「每 500 分一个档位」结算：某个档位累计到 3 次双连或 2 次三连，
     该档位的里程碑就发一张券。券最多 2 张，满了就改发 +100 分（不推进券进度）。 */
  const VOUCHER_STEP = 500;        // 每个档位多少分
  const VOUCHER_MAX = 2;           // 券的持有上限
  const VOUCHER_OVERFLOW_SCORE = 100; // 满额时改为加多少分
  const COMBO_DOUBLE_NEED = 3;     // 一个档位里要几次双连
  const COMBO_TRIPLE_NEED = 2;     // 或要几次三连
  const HAMMER_REST_SPEED = 55;    // 锤子只能砸「基本停住」的水果（px/s）
  const HAMMER_REST_SPEED2 = HAMMER_REST_SPEED * HAMMER_REST_SPEED;

  /* —— Stage 4 追加：隐藏口令（owner 指定的后门）——
     注意：这是公开仓库的前端代码，口令必然可被看到，**不是**安全认证，
     只当作一个隐蔽的便捷入口。 */
  const SECRET_PASS = 'hhh';
  const SECRET_CLICKS = 7;          // 需要连点几次标题
  const SECRET_WINDOW = 2000;       // 连点窗口（毫秒）
  const SECRET_HAMMERS = 2;         // 隐藏发放：只把锤子补到 2，不动其它道具
  const SECRET_REVIVES = 2;         // 额外送几枚复活币

  /* —— Stage 4 第二阶段：四种道具的独立库存 ——
     每种道具单独计数，里程碑随机抽一种。上限集中在这张表里。
     shield 特殊：每局最多持有 1 个，且用掉后本局不再补。 */
  const ITEM_TYPES = ['hammer', 'magnet', 'fan', 'shield'];
  const ITEM_MAX = { hammer: 2, magnet: 2, fan: 2, shield: 1 };
  const ITEM_LABEL = { hammer: '锤子', magnet: '磁铁', fan: '风扇', shield: '泡泡护盾' };

  /* —— 磁铁参数（PLAN 建议的起始值，可在实测后调整）—— */
  const MAGNET_RADIUS = 200;        // 找「局部密集区」的搜索半径（px）
  const MAGNET_DURATION = 1.25;     // 吸附持续秒数
  const MAGNET_ACCEL = 250;         // 最大吸引加速度（px/s²）
  const MAGNET_MAX_SPEED = 420;     // 吸附造成的速度上限（防失控）

  /* —— 小风扇参数 —— */
  const FAN_DURATION = 0.8;         // 气流持续秒数
  const FAN_ACCEL = 600;            // 水平加速度（px/s²）
  const FAN_MAX_ADDED_VX = 180;     // 水平速度贡献上限（px/s）

  /* —— 泡泡护盾参数 —— */
  const SHIELD_DURATION = 5;        // 护盾持续「真实秒数」
  const SHIELD_AUTO_WINDOW = 0.5;   // 剩余危险时间 ≤ 这个值就自动触发（秒）

  /* —— Q 弹手感 —— */
  const RESTITUTION      = 0.38;  // 球与球之间的弹性
  const WALL_RESTITUTION = 0.45;  // 撞墙 / 撞地面的弹性
  const REST_THRESHOLD   = 55;    // 撞击速度低于此值不反弹（保证堆叠稳、不抖）
  const FRICTION         = 0.955; // 接触时的切向摩擦（每个子步）
  const SQUASH_DECAY     = 9;     // 挤压回弹速度
  const SQUASH_MAX       = 0.30;  // 最大挤压变形

  /* 水果链：索引越大越大
     file : assets/fruits/ 下的贴图（由 tools/normalize_assets.py 统一生成）
     c1/c2: 贴图缺失时的程序化水果配色
     pc1/pc2: 粒子/汁水的颜色（取自贴图主体平均色） */
  const ASSET_FILL = 0.92;   // 贴图里主体占画布长边的比例，与生成脚本保持一致

  const FRUITS = [
    { name: '葡萄',   r: 17,  c1: '#c084f5', c2: '#7a3fb0', line: 'rgba(74,26,120,.35)',
      file: 'assets/fruits/01-grape.webp',     pc1: '#e9c466', pc2: '#b8903a' },
    { name: '樱桃',   r: 23,  c1: '#ff8a99', c2: '#c62346', line: 'rgba(120,10,40,.35)',
      file: 'assets/fruits/02-cherry.webp',    pc1: '#ffe684', pc2: '#d8b44f' },
    { name: '橘子',   r: 31,  c1: '#ffc06a', c2: '#e0741a', line: 'rgba(140,62,0,.32)',
      file: 'assets/fruits/03-orange.webp',    pc1: '#fdd865', pc2: '#cfa63f' },
    { name: '柠檬',   r: 39,  c1: '#fff285', c2: '#e0b000', line: 'rgba(140,110,0,.32)',
      file: 'assets/fruits/04-lemon.webp',     pc1: '#f6cd63', pc2: '#c9a040' },
    { name: '猕猴桃', r: 48,  c1: '#b9e05a', c2: '#5d8c1c', line: 'rgba(60,90,10,.32)',
      file: 'assets/fruits/05-kiwi.webp',      pc1: '#c4a559', pc2: '#94793c' },
    { name: '番茄',   r: 58,  c1: '#ff8a66', c2: '#c62f28', line: 'rgba(120,20,10,.32)',
      file: 'assets/fruits/06-tomato.webp',    pc1: '#fbd75a', pc2: '#cba63c' },
    { name: '桃子',   r: 69,  c1: '#ffd0d0', c2: '#ea7f93', line: 'rgba(160,60,80,.3)',
      file: 'assets/fruits/07-peach.webp',     pc1: '#f7c45a', pc2: '#c99a3e' },
    { name: '菠萝',   r: 81,  c1: '#ffe07a', c2: '#c88a12', line: 'rgba(130,80,0,.32)',
      file: 'assets/fruits/08-pineapple.webp', pc1: '#ffd37b', pc2: '#d1a252' },
    { name: '椰子',   r: 94,  c1: '#f0e2c6', c2: '#9b7b4f', line: 'rgba(90,64,32,.35)',
      file: 'assets/fruits/09-coconut.webp',   pc1: '#ffd771', pc2: '#d3a94e' },
    { name: '半奶蛙', r: 108, c1: '#ff9d78', c2: '#c23a2c', line: 'rgba(120,24,16,.32)',
      file: 'assets/fruits/10-halfmelon.webp', pc1: '#ccab68', pc2: '#9c8047' },
    { name: '神奶蛙', r: 124, c1: '#7ce878', c2: '#1c8a33', line: 'rgba(12,70,24,.4)',
      file: 'assets/fruits/11-watermelon.webp', pc1: '#eece9b', pc2: '#c0a271' }
  ];

  /* 合成出 tier 的得分（三角数） */
  const MERGE_SCORE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

  /* 新水果的掉落权重（越小越常见） */
  const SPAWN_TIERS = [0, 1, 2, 3, 4];
  const SPAWN_WEIGHTS = [0.28, 0.24, 0.20, 0.16, 0.12];

  const BEST_KEY = 'danaiwa.best.v1';
  const MUTE_KEY = 'danaiwa.mute.v1';
  const DISCOVERY_KEY = 'danaiwa.discovery.v1';   // 图鉴：已解锁过的等级

  /* ---------------------------------------------------------
   *  DOM
   * ------------------------------------------------------- */

  const canvas    = document.getElementById('game');
  const ctx       = canvas.getContext('2d');
  const stage     = document.getElementById('stage');
  const scoreEl   = document.getElementById('score');
  const bestEl    = document.getElementById('best');
  const finalScoreEl = document.getElementById('finalScore');
  const finalBestEl  = document.getElementById('finalBest');
  const nextCanvas = document.getElementById('next');
  const nextCtx    = nextCanvas.getContext('2d');
  const chainCanvas = document.getElementById('chain');
  const chainCtx    = chainCanvas.getContext('2d');
  const soundBtn   = document.getElementById('soundBtn');
  const resetBtn   = document.getElementById('resetBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlayEl     = document.getElementById('overlay');
  const revivePromptEl = document.getElementById('revivePrompt');
  const overPanelEl    = document.getElementById('overPanel');
  const reviveScoreEl  = document.getElementById('reviveScore');
  const reviveLeftEl   = document.getElementById('reviveLeft');
  const reviveBtn      = document.getElementById('reviveBtn');
  const giveUpBtn      = document.getElementById('giveUpBtn');
  const reviveBadge    = document.getElementById('reviveBadge');
  const reviveCountEl  = document.getElementById('reviveCount');

  /* ---------------------------------------------------------
   *  工具
   * ------------------------------------------------------- */

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const rand  = (a, b) => a + Math.random() * (b - a);

  /* 「下一个」是否允许和当前这颗相同。
     允许的话有约 22% 概率两边显示同一张图，看起来像“下一个显示的是当前这个”，
     所以默认避开；想恢复成完全随机就把它改成 false */
  const AVOID_REPEAT = true;

  function rollSpawnTier() {
    let r = Math.random(), acc = 0;
    for (let i = 0; i < SPAWN_TIERS.length; i++) {
      acc += SPAWN_WEIGHTS[i];
      if (r <= acc) return SPAWN_TIERS[i];
    }
    return SPAWN_TIERS[0];
  }

  function pickSpawnTier(avoid) {
    if (!AVOID_REPEAT || avoid === undefined) return rollSpawnTier();
    for (let i = 0; i < 6; i++) {
      const t = rollSpawnTier();
      if (t !== avoid) return t;
    }
    return rollSpawnTier();     // 兜底：万一连撞 6 次就认了
  }

  /* ---------------------------------------------------------
   *  音效（WebAudio，无外部资源）
   * ------------------------------------------------------- */

  const Sound = {
    ctx: null,
    muted: localStorage.getItem(MUTE_KEY) === '1',

    ensure() {
      if (this.ctx) return this.ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
      return this.ctx;
    },

    tone(freq, freq2, dur, vol, type) {
      if (this.muted) return;
      const c = this.ensure();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (freq2 && freq2 !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    merge(tier) {
      const base = 240 * Math.pow(1.1225, tier * 2);
      this.tone(base, base * 1.7, 0.2, 0.16, 'sine');
      this.tone(base * 2, base * 3, 0.12, 0.06, 'triangle');
    },

    drop()   { this.tone(180, 120, 0.08, 0.05, 'sine'); },
    over()   { this.tone(420, 90, 0.7, 0.16, 'sawtooth'); },
    bonus()  { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.22, 0.12, 'triangle'), i * 90)); }
  };

  /* 手机上的轻微震动反馈（跟着静音开关走；不支持的浏览器自动忽略） */
  function haptic(ms) {
    if (Sound.muted) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { /* 忽略 */ }
    }
  }

  /* ---------------------------------------------------------
   *  画布尺寸
   * ------------------------------------------------------- */

  const view = { scale: 1, dpr: 1 };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.max(1, Math.round(rect.width  * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    view.dpr = dpr;
    view.scale = (rect.width * dpr) / W;
  }

  /* ---------------------------------------------------------
   *  游戏状态
   * ------------------------------------------------------- */

  const state = {
    balls: [],
    particles: [],
    floats: [],
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    pending: 0,
    next: 0,
    ready: true,
    cooldown: 0,
    aimX: W / 2,
    over: false,
    flash: 0,
    revives: 0,        // 本局还剩几枚复活币（重开清零）
    reviveGiven: 0,    // 本局已经发放过几次（用来判断跨过新的 1500 分）
    freeze: 0,         // 命中定格剩余秒数

    /* —— 连锁状态（每局重置）——
       cascadeLen  当前这条连锁的长度（0 = 没有进行中的连锁）
       cascadeId   每开一条新连锁就 +1，用来认「是不是同一颗新水果」
       cascadeBall 上一次合成产出的那颗新水果（下一环必须是它被吃掉）
       cascadeTime 产出它的时刻（秒，游戏内时钟）
       cascadeX/Y  连锁结束时要显示飘字的位置 */
    cascadeLen: 0,
    cascadeId: 0,
    cascadeBall: null,
    cascadeTime: 0,
    cascadeX: 0,
    cascadeY: 0,
    cascadeStartBand: 0,   // 这条连锁开链时所在的券档位

    /* —— 道具库存（每局重置；复活不重置）——
       每种道具独立计数，上限见 ITEM_MAX。
       shieldUsedThisRun 泡泡护盾本局是否已用掉（用掉后本局不再补） */
    inventory: { hammer: 0, magnet: 0, fan: 0, shield: 0 },
    shieldUsedThisRun: false,

    /* —— 道具效果（每局重置）——
       magnet   { active, target, until, ... } 磁铁吸附
       fan      { active, dir, until }          风扇气流（dir: -1 左 / +1 右）
       fanNextDir 下一次风扇的方向（左右交替）
       shield   { active, until }               护盾（until 用单调时钟的真实时间） */
    magnet: null,
    fan: null,
    fanNextDir: -1,
    shield: null,

    /* —— 道具券（每局重置；复活不重置）——
       vouchers        旧的共享券计数（已由 inventory 取代，仅保留兼容）
       voucherProgress 券进度分：单调递增，只有「实质得分」才推进它。
                       满额时的 +100 不加进来，避免靠溢出奖励刷券。
       voucherMilestone 已经结算到第几个 500 分节点（0 表示还没结算过）
       bandCombos      每个档位的连击记录 { double, triple }
       pendingMilestones 等待结算的里程碑节点（升序），连锁未结束时会先攒着 */
    vouchers: 0,
    voucherProgress: 0,
    voucherMilestone: 0,
    bandCombos: [],
    pendingMilestones: [],

    /* —— 锤子 ——
       hammerMode 是否处于「选目标」状态
       hammerHover 当前鼠标/手指悬停命中的可砸水果（用于高亮） */
    hammerMode: false,
    hammerHover: null,
    magnetMode: false,

    /* —— 隐藏口令与「本局成绩作废」——
       runTainted    本局是否用过隐藏口令（用过则整局不计入历史最高分与排行榜）
       bestBaseline  本局开始时的历史最高分，用于回滚本局推高的部分
       secretClicks  连点标题的计数
       secretLastAt  上一次点击标题的时刻（performance.now） */
    runTainted: false,
    bestBaseline: 0,
    secretClicks: 0,
    secretLastAt: 0,

    /* —— 局内统计（每局重置，只由玩法事件驱动）—— */
    stats: {
      maxCascade: 0,     // 最高连锁长度
      maxTier: 0,        // 合到过的最高等级（含投放的起始等级）
      topClears: 0,      // 两只神奶蛙一起炸掉的次数
      recoveries: 0,     // 危险线救回次数
      revivesUsed: 0     // 用掉复活币的次数
    },

    /* —— 投放方向微调 —— */
    finesse: 0,        // 当前横向冲量（px/s），-60..60
    clock: 0           // 游戏内累计秒数（连锁窗口用它，不用真实时间，测试可控）
  };

  /* ---------------------------------------------------------
   *  碰撞形状（按图片轮廓生成，不是圆形）
   *  assets/fruits/parts.js 由 tools/build_parts.py 从贴图的 alpha 轮廓算出：
   *  parts = [[ox, oy, s], ...] 单位是「以 r 为 1」，rb = 碰撞包围圆半径。
   *  没有数据时退化成单个半径 r 的圆，和老版本行为一致。
   * ------------------------------------------------------- */

  const SHAPES = (typeof window !== 'undefined' && window.SUIKA_PARTS) || [];
  const UNIT_SHAPE = { rb: 1, parts: [[0, 0, 1]] };

  function shapeOf(tier) {
    const s = SHAPES[tier];
    if (s && s.parts && s.parts.length) return s;
    return UNIT_SHAPE;
  }

  /* 把局部小圆换算到世界坐标（跟着刚体一起旋转平移） */
  function syncParts(b) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    const parts = b.parts, r = b.r;
    const wx = b.wx, wy = b.wy, ws = b.ws;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const ox = p[0] * r, oy = p[1] * r;
      wx[i] = b.x + ox * c - oy * s;
      wy[i] = b.y + ox * s + oy * c;
      ws[i] = p[2] * r;
    }
  }

  function makeBall(x, y, tier, vx, vy) {
    const r = FRUITS[tier].r;
    const m = r * r;
    const sh = shapeOf(tier);
    const n = sh.parts.length;
    const ball = {
      x, y, vx: vx || 0, vy: vy || 0,
      px: x, py: y,
      r, tier, angle: 0,
      mass: m, invMass: 1 / m,
      bornAt: performance.now(),
      overTime: 0,
      landed: false,
      dead: false,
      contacts: 0,
      pvx: 0, pvy: 0,          // 本子步求解前的速度（用于弹性冲量）
      sq: 0, sqA: 0,           // 挤压变形量 / 变形轴角度
      parts: sh.parts,
      rb: sh.rb * r,           // 包围圆半径（粗筛用）
      wx: new Float32Array(n), // 世界坐标下的子圆
      wy: new Float32Array(n),
      ws: new Float32Array(n)
    };
    syncParts(ball);
    return ball;
  }

  /* ---------------------------------------------------------
   *  物理
   * ------------------------------------------------------- */

  function stepPhysics(dt) {
    const balls = state.balls;
    const merges = [];
    const contacts = [];      // 本子步的接触列表，用于弹性冲量

    /* --- 道具力（在积分之前施加，作为加速度融入现有物理）--- */
    applyMagnetForce(dt);
    applyFanForce(dt);

    /* --- 积分 --- */
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      b.px = b.x;
      b.py = b.y;
      b.vy += GRAVITY * dt;
      b.pvx = b.vx;           // 求解前速度：弹性冲量用它来算，避免被约束“吃掉”
      b.pvy = b.vy;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.contacts = 0;
      syncParts(b);
    }

    /* --- 约束求解 --- */
    for (let it = 0; it < ITER; it++) {

      /* 墙 & 地面：每个子圆各自贴墙，推力累加到刚体中心上（一次到位） */
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.dead) continue;
        let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;
        const n = b.parts.length;
        for (let k = 0; k < n; k++) {
          const x = b.wx[k], y = b.wy[k], rr = b.ws[k];
          const l = WALL - (x - rr);
          if (l > pushL) pushL = l;
          const rgt = (x + rr) - (W - WALL);
          if (rgt > pushR) pushR = rgt;
          const dn = (y + rr) - (H - WALL);
          if (dn > pushFloor) pushFloor = dn;
          const up = -(y - rr);
          if (up > pushCeil) pushCeil = up;
        }
        if (pushL || pushR || pushFloor || pushCeil) {
          b.x += pushL - pushR;
          b.y += pushCeil - pushFloor;
          b.contacts++;
          if (it === 0) {
            if (pushL)     contacts.push({ ball: b, nx: 1,  ny: 0 });
            if (pushR)     contacts.push({ ball: b, nx: -1, ny: 0 });
            if (pushFloor) contacts.push({ ball: b, nx: 0,  ny: -1 });
            if (pushCeil)  contacts.push({ ball: b, nx: 0,  ny: 1 });
          }
          syncParts(b);
        }
      }

      /* 球球：子圆两两求交，取“最接近/最深”的那一对做修正 */
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.dead) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.dead || a.dead) continue;

          /* 包围圆粗筛 */
          const cdx = b.x - a.x, cdy = b.y - a.y;
          const rbSum = a.rb + b.rb;
          if (cdx * cdx + cdy * cdy >= rbSum * rbSum) continue;

          const pa = a.parts.length, pb = b.parts.length;
          const brb = b.rb, arb = a.rb;
          let minGap = 1e9, bnx = 0, bny = 0;

          for (let m = 0; m < pa; m++) {
            const ax = a.wx[m], ay = a.wy[m], ar = a.ws[m];
            /* 小圆离对方中心太远就整组跳过 */
            const ddx = b.x - ax, ddy = b.y - ay;
            const far = brb + ar;
            if (ddx * ddx + ddy * ddy >= far * far) continue;

            for (let k = 0; k < pb; k++) {
              const bx = b.wx[k], by = b.wy[k], br = b.ws[k];
              const dx = bx - ax, dy = by - ay;
              const sum = ar + br;
              const d2 = dx * dx + dy * dy;
              if (d2 >= sum * sum) continue;
              const d = Math.sqrt(d2);
              const gap = d - sum;
              if (gap < minGap) {
                minGap = gap;
                if (d < 1e-4) { bnx = 1; bny = 0; }
                else { bnx = dx / d; bny = dy / d; }
              }
            }
          }

          if (minGap > MERGE_PAD || minGap === 1e9) continue;

          if (a.tier === b.tier && it === 0) {
            a.dead = true;  a.removedBy = 'merge';
            b.dead = true;  b.removedBy = 'merge';
            merges.push([a, b]);
            continue;
          }

          if (minGap >= 0) continue;            // 只是挨着，不用推开
          if (it === 0) contacts.push({ a: a, b: b, nx: bnx, ny: bny });
          const corr = Math.min(-minGap - 0.05, 4) * 0.9;
          if (corr <= 0) continue;
          const invSum = a.invMass + b.invMass;
          const wa = a.invMass / invSum;
          const wb = b.invMass / invSum;

          a.x -= bnx * corr * wa;  a.y -= bny * corr * wa;
          b.x += bnx * corr * wb;  b.y += bny * corr * wb;

          a.contacts++;
          b.contacts++;
          syncParts(a);
          syncParts(b);
        }
      }
    }

    /* --- 收尾墙约束：球球分离可能把水果顶出墙外，最后再夹一次 --- */
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.dead) continue;
      let pushL = 0, pushR = 0, pushFloor = 0, pushCeil = 0;
      for (let k = 0; k < b.parts.length; k++) {
        const x = b.wx[k], y = b.wy[k], rr = b.ws[k];
        const l = WALL - (x - rr);         if (l > pushL) pushL = l;
        const rgt = (x + rr) - (W - WALL); if (rgt > pushR) pushR = rgt;
        const dn = (y + rr) - (H - WALL);  if (dn > pushFloor) pushFloor = dn;
        const up = -(y - rr);              if (up > pushCeil) pushCeil = up;
      }
      if (pushL || pushR || pushFloor || pushCeil) {
        b.x += pushL - pushR;
        b.y += pushCeil - pushFloor;
        b.contacts++;
        syncParts(b);
      }
    }

    /* --- 由位置差反推速度（PBD）+ 摩擦 + 滚动 --- */
    const invDt = 1 / dt;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.dead) continue;

      const dx = b.x - b.px;
      const dy = b.y - b.py;

      let vx = dx * invDt;
      let vy = dy * invDt;

      if (b.contacts > 0) vx *= FRICTION;   // 接触时的切向摩擦
      if (b.sq > 0) b.sq = Math.max(0, b.sq - b.sq * SQUASH_DECAY * dt);

      b.vx = vx;
      b.vy = vy;
      b.angle += dx / b.r * 0.85;           // 视觉滚动

      if (!b.landed) {
        if (b.contacts > 0 || performance.now() - b.bornAt > 900) b.landed = true;
      }
    }

    /* --- 弹性冲量 ---
       位置约束已经把法向速度吃掉了一部分，这里直接把法向相对速度“改写”成
       e × 碰撞前速度，这样回弹量只由 e 决定，不受子步/迭代次数影响。
       撞击速度低于阈值时完全不弹，保证堆叠静止时不抖。 */
    for (let k = 0; k < contacts.length; k++) {
      const ct = contacts[k];

      if (ct.ball) {
        /* 撞墙 / 撞地面 */
        const b = ct.ball;
        if (b.dead) continue;
        const vnPre = b.pvx * ct.nx + b.pvy * ct.ny;      // <0 表示还在往墙里钻
        if (vnPre < -REST_THRESHOLD) {
          const vnPost = b.vx * ct.nx + b.vy * ct.ny;
          const target = -WALL_RESTITUTION * vnPre;       // 期望的分离速度
          const j = target - vnPost;
          if (j > 0) {
            b.vx += j * ct.nx;
            b.vy += j * ct.ny;
            squash(b, ct.nx, ct.ny, -vnPre);
          }
        }
      } else {
        /* 球与球 */
        const a = ct.a, b = ct.b;
        if (a.dead || b.dead) continue;
        const nx = ct.nx, ny = ct.ny;                     // a → b
        const vnPre = (a.pvx - b.pvx) * nx + (a.pvy - b.pvy) * ny;   // >0 表示相互靠近
        if (vnPre > REST_THRESHOLD) {
          const vnPost = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          const target = -RESTITUTION * vnPre;
          const j = (vnPost - target) / (a.invMass + b.invMass);
          if (j > 0) {
            a.vx -= j * a.invMass * nx;  a.vy -= j * a.invMass * ny;
            b.vx += j * b.invMass * nx;  b.vy += j * b.invMass * ny;
            squash(a, -nx, -ny, vnPre);
            squash(b, nx, ny, vnPre);
          }
        }
      }
    }

    /* --- 处理合成 --- */
    if (merges.length) processMerges(merges);
  }

  /* 撞击挤压：沿撞击法线压扁、垂直方向拉伸，做出果冻感 */
  function squash(b, nx, ny, speed) {
    const k = Math.min(SQUASH_MAX, speed / 1500);
    if (k <= b.sq) return;
    b.sq = k;
    b.sqA = Math.atan2(ny, nx);
  }

  function processMerges(merges) {
    for (let k = 0; k < merges.length; k++) {
      const a = merges[k][0];
      const b = merges[k][1];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const tier = a.tier;

      /* 被合成掉的这两颗，如果之前在警戒线上方攒够过 0.5 秒，
         那它们现在「被合走了」也算一次救回（同一颗只记一次）。 */
      creditRecovery(a);
      creditRecovery(b);

      if (tier >= MAX_TIER) {
        /* 两只神奶蛙 → 一起炸掉，拿一大笔奖励分（外加一枚复活币）。
           注意：它同时清掉了两块最大的水果，是后期唯一的泄压阀，不能取消。
           分数的飘字不用 addScore 那个普通的，下面单独给了「大字 +500」。
           它不产出新水果，所以会结束当前连锁，也不计入连锁长度。 */
        addScore(MAX_BONUS);
        burst(mx, my, MAX_TIER, 90, 560);
        burst(mx, my, MAX_TIER - 2, 42, 340);
        Sound.bonus();
        haptic(70);
        state.flash = 1.4;                    // 比普通合成更亮的全屏闪
        state.freeze = FREEZE_MS / 1000;      // 定格一下，让这一下有重量
        state.floats.push({ x: mx, y: my - 74, text: '两个神奶蛙 💥', life: 1.6 });
        state.floats.push({ x: mx, y: my - 16, text: '+' + MAX_BONUS, life: 2.2, big: true });
        if (MAX_MERGE_GIVES_REVIVE) {
          state.revives++;
          paintRevives(true);
        }
        state.stats.topClears++;              // 顶级清场统计
        settleCascade();                      // 不产水果 → 连锁到此为止
      } else {
        const nt = tier + 1;
        const nb = makeBall(mx, my, nt, (a.vx + b.vx) * 0.5, (a.vy + b.vy) * 0.5 - 60);
        /* 贴着墙合成时，新水果更大，先夹回场地内，避免瞬间穿墙 */
        nb.x = clamp(nb.x, WALL + nb.r, W - WALL - nb.r);
        nb.y = Math.min(nb.y, H - WALL - nb.r);
        nb.px = nb.x;
        nb.py = nb.y;
        nb.landed = true;
        nb.popAt = performance.now();
        state.balls.push(nb);

        /* 起始档位必须在加分之前取：这条连锁归属哪个 500 分档位，
           看的是「本次合成得分入账前」的券进度。 */
        const startBand = bandOf(state.voucherProgress);

        addScore(MERGE_SCORE[nt], mx, my, '+' + MERGE_SCORE[nt]);
        burst(mx, my, nt, 8 + nt * 2, 140 + nt * 22);
        Sound.merge(nt);
        haptic(6 + nt);
        if (nt === MAX_TIER) state.flash = 1;

        noteTier(nt);        // 最高等级统计（含投放起始等级）
        noteCascadeMerge(nb, startBand); // 连锁判定
        unlockTier(nt);       // 图鉴：首次合出就解锁
      }
    }

    /* 移除被合成的球 */
    const alive = [];
    for (let i = 0; i < state.balls.length; i++) {
      if (!state.balls[i].dead) alive.push(state.balls[i]);
    }
    state.balls = alive;
  }

  /* ---------------------------------------------------------
   *  特效 & 计分
   * ------------------------------------------------------- */

  function burst(x, y, tier, n, speed) {
    const f = FRUITS[Math.min(tier, MAX_TIER)];
    const c1 = f.pc1 || f.c1;
    const c2 = f.pc2 || f.c2;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.25, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 70,
        r: rand(2, 5.5),
        life: 1,
        decay: rand(1.3, 2.4),
        color: Math.random() < 0.5 ? c1 : c2
      });
    }
    if (state.particles.length > 420) state.particles.splice(0, state.particles.length - 420);
  }

  /* 复活币胶囊：有币才显示，跨过 1500 分时弹一下。
     注意 0 枚时也要把文字刷成 ×0 —— 否则下次显示出来的是上一次的旧数字。 */
  function paintRevives(pop) {
    if (!reviveBadge) return;
    if (reviveCountEl) reviveCountEl.textContent = '×' + state.revives;
    if (state.revives > 0) {
      reviveBadge.hidden = false;
      if (pop) {
        reviveBadge.classList.remove('pop');
        void reviveBadge.offsetWidth;
        reviveBadge.classList.add('pop');
      }
    } else {
      reviveBadge.hidden = true;
      reviveBadge.classList.remove('pop');
    }
  }

  /* 道具券计数与锤子按钮状态 */
  /* 刷新四种道具的计数与按钮状态。
     popType 给定时，只让那一种的计数弹一下。 */
  function paintInventory(pop, popType) {
    for (let i = 0; i < ITEM_TYPES.length; i++) {
      const type = ITEM_TYPES[i];
      const cntEl = document.getElementById('cnt-' + type);
      if (cntEl) {
        cntEl.textContent = itemCount(type) + '/' + itemMax(type);
        if (pop && popType === type) {
          cntEl.classList.remove('pop');
          void cntEl.offsetWidth;
          cntEl.classList.add('pop');
        }
      }
      const btn = document.getElementById('btn-' + type);
      if (btn) {
        /* 护盾用掉后本局不再可用 */
        const usable = type === 'shield'
          ? (itemCount('shield') > 0 && !state.shieldUsedThisRun)
          : itemCount(type) > 0;
        btn.disabled = !usable || state.over;
        const armed = (type === 'hammer' && state.hammerMode)
                   || (type === 'magnet' && state.magnetMode)
                   || (type === 'shield' && state.shield && state.shield.active);
        btn.setAttribute('aria-pressed', String(!!armed));
        btn.classList.toggle('is-armed', !!armed);
      }
    }
    /* 护盾的剩余时间单独显示 */
    paintShieldTimer();
  }

  /* —— 道具菜单：一个入口按钮 + 悬浮面板 —— */

  function itemMenuOpen() {
    const m = document.getElementById('itemMenu');
    return !!(m && !m.hidden);
  }

  function setItemMenu(open) {
    const m = document.getElementById('itemMenu');
    const b = document.getElementById('itemMenuBtn');
    if (!m || !b) return;

    if (open) {
      /* 顺序很关键：先显示（否则量不到尺寸）→ 立刻按按钮位置摆好 →
         再让 paintInventory 刷新内容。中间任何一步都不能让菜单停在默认坐标。 */
      m.hidden = false;
      paintInventory(false);
      positionItemMenu();
    } else {
      m.hidden = true;
    }
    b.setAttribute('aria-expanded', String(!!open));
    b.classList.toggle('is-armed', !!open);
  }

  /* 把菜单摆在按钮旁边：优先向上弹（不挡棋盘），
     上方空间不够就向下弹；左右夹在视口内。 */
  /* 把菜单移到 body 末尾：彻底避开 .panel / .stage 的 overflow 裁切。
     只在第一次需要时移动，之后固定在那里。 */
  function ensureMenuAtBody() {
    const m = document.getElementById('itemMenu');
    if (!m || m.parentElement === document.body) return;
    document.body.appendChild(m);
    m.classList.add('is-floating');
  }

  function positionItemMenu() {
    ensureMenuAtBody();
    const m = document.getElementById('itemMenu');
    const b = document.getElementById('itemMenuBtn');
    if (!m || !b || m.hidden) return;

    const br = b.getBoundingClientRect();
    const mw = m.offsetWidth || 150;
    const mh = m.offsetHeight || 180;
    const vw = window.innerWidth || W;
    const vh = window.innerHeight || H;
    const GAP = 8;

    /* 菜单挂在 body 下、用 fixed 定位 → 直接用视口坐标 */

    /* 上下：优先向上。但如果按钮上方空间不足（典型情况：窄屏顶部信息条
       贴着屏幕顶，向上弹会跑到棋盘里被裁掉），就改成向下。 */
    let absTop = br.top - mh - GAP;
    if (absTop < GAP) absTop = br.bottom + GAP;
    if (absTop + mh > vh - GAP) absTop = Math.max(GAP, vh - mh - GAP);

    /* 左右：右对齐按钮，再夹进视口 */
    let absLeft = br.right - mw;
    if (absLeft < GAP) absLeft = GAP;
    if (absLeft + mw > vw - GAP) absLeft = Math.max(GAP, vw - mw - GAP);

    m.style.top = Math.round(absTop) + 'px';
    m.style.left = Math.round(absLeft) + 'px';
    m.style.right = 'auto';
    m.style.bottom = 'auto';
  }

  function toggleItemMenu() {
    setItemMenu(!itemMenuOpen());
  }

  /* 兼容旧名字：老代码/测试仍可能调用 paintVouchers */
  function paintVouchers(pop) { paintInventory(pop, 'hammer'); }

  /* 护盾激活时显示剩余秒数 */
  function paintShieldTimer() {
    const el = document.getElementById('shieldTimer');
    if (!el) return;
    if (state.shield && state.shield.active) {
      const left = Math.max(0, (state.shield.until - nowMs()) / 1000);
      el.hidden = false;
      el.textContent = '🫧 护盾 ' + left.toFixed(1) + 's';
    } else {
      el.hidden = true;
    }
  }

  /* 单调时钟（毫秒）：护盾按真实时间计时，用 performance.now() */
  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  /* 锤子模式下的提示条 */
  function paintHammerHint() {
    const hint = document.getElementById('hammerHint');
    if (!hint) return;
    if (state.hammerMode) {
      hint.hidden = false;
      hint.textContent = '选择一只静止的奶蛙，Esc 取消';
    } else if (state.magnetMode) {
      hint.hidden = false;
      hint.textContent = '选择一只水果，向附近的水果堆靠拢，Esc 取消';
    } else {
      hint.hidden = true;
    }
  }

  /* 每累计 REVIVE_STEP 分，发一枚复活币 */
  function grantRevives() {
    let got = 0;
    while (state.reviveGiven < Math.floor(state.score / REVIVE_STEP)) {
      state.reviveGiven++;
      state.revives++;
      got++;
    }
    if (!got) return;
    paintRevives(true);
    state.floats.push({ x: W / 2, y: 210, text: '+1 复活币', life: 1.4, big: true });
    Sound.merge(6);
  }

  /* ---------------------------------------------------------
   *  道具券：进度分、档位连击账本、里程碑结算
   *
   *  规则要点（与 PLAN Stage 4 一致）：
   *   · voucherProgress 单调递增，只有实质得分推进它；满额 +100 不推进。
   *   · 每 500 分一个档位。一个档位里攒够 3 次双连或 2 次三连，该档位里程碑就合格。
   *   · 连锁要结束时才知道长度，所以「跨过里程碑」时如果还有连锁在进行，
   *     先把它排进 pendingMilestones，等连锁结算完再逐个结算。
   *   · 每个节点只结算一次，结算后该档位记录丢弃，绝不回头补发。
   * ------------------------------------------------------- */

  /* 某分数落在第几个档位（0 起） */
  function bandOf(score) {
    return Math.floor(score / VOUCHER_STEP);
  }

  function ensureBand(i) {
    /* 防御：下标必须是 >= 0 的整数，否则退回当前进度所在的档位。
       外部（含自检脚本）可能不带 startBand 调用，不能让这里返回 undefined。 */
    let idx = Number(i);
    if (!isFinite(idx) || idx < 0) idx = bandOf(state.voucherProgress);
    idx = Math.floor(idx);
    while (state.bandCombos.length <= idx) {
      state.bandCombos.push({ double: 0, triple: 0, closed: false });
    }
    return state.bandCombos[idx];
  }

  /* 一条连锁结算时调用：把它记到「起始档位」上。
     长度 1 不算连击；长度 2 记一次双连；长度 3+ 只记一次三连（不再记双连）。 */
  function noteComboEvent(len, startBand) {
    if (len < 2) return;
    const band = ensureBand(startBand);
    if (band.closed) return;              // 该档位已经结算过，不再计入
    if (len === 2) band.double++;
    else band.triple++;
  }

  /* 推进券进度分，并把新跨过的里程碑节点排队。
     只有「实质得分」才调用这里；满额 +100 不走这条路径。 */
  function advanceVoucherProgress(n) {
    if (n <= 0) return;
    state.voucherProgress += n;
    const reached = bandOf(state.voucherProgress);
    /* 跨过的节点：从已结算的 voucherMilestone 之后，到 reached 为止 */
    for (let m = state.voucherMilestone + 1; m <= reached; m++) {
      if (state.pendingMilestones.indexOf(m) < 0) state.pendingMilestones.push(m);
    }
    state.pendingMilestones.sort((a, b) => a - b);
    trySettleMilestones();
  }

  /* 尝试结算排队的里程碑。
     如果还有连锁在进行，就先等 —— 因为这条连锁最终可能正好落在这些档位上，
     必须等它结算并归位后才能判定档位是否合格。 */
  function trySettleMilestones() {
    if (state.cascadeLen > 0) return;     // 等连锁结束
    while (state.pendingMilestones.length) {
      const m = state.pendingMilestones.shift();
      settleMilestone(m);
    }
  }

  /* 结算一个里程碑节点：只看「到该节点为止那个档位」的记录，结算后关闭该档位 */
  function settleMilestone(m) {
    if (m <= state.voucherMilestone) return;   // 已经结算过，绝不重复
    state.voucherMilestone = m;

    const bandIndex = m - 1;                   // 第 m 个节点对应第 m-1 个档位
    const band = ensureBand(bandIndex);
    if (band.closed) return;                   // 理论上不会发生，防御一下
    band.closed = true;

    const qualified = band.double >= COMBO_DOUBLE_NEED
                   || band.triple >= COMBO_TRIPLE_NEED;
    if (!qualified) return;                    // 没合格，静默关闭

    /* 合格：先抽签（在检查库存之前抽，且绝不重抽/替换），再决定发放还是补偿 */
    awardRandomItem();
  }

  /* ---------------------------------------------------------
   *  道具库存：四类独立计数
   * ------------------------------------------------------- */

  function itemCount(type) {
    return state.inventory[type] || 0;
  }

  function itemMax(type) {
    return ITEM_MAX[type] || 0;
  }

  /* 该道具此刻还能不能再拿一个 */
  function canHoldItem(type) {
    if (type === 'shield') {
      /* 护盾：本局用过就永远不再给；已经拿着一个也算满 */
      if (state.shieldUsedThisRun) return false;
      return itemCount('shield') < 1;
    }
    return itemCount(type) < itemMax(type);
  }

  /* 加一个道具。返回 true 表示真的加上了。 */
  function addItem(type) {
    if (!canHoldItem(type)) return false;
    state.inventory[type] = itemCount(type) + 1;
    paintInventory(true, type);
    return true;
  }

  /* 消耗一个道具。返回 true 表示扣成功。 */
  function consumeItem(type) {
    if (itemCount(type) <= 0) return false;
    state.inventory[type] = itemCount(type) - 1;
    paintInventory(true, type);
    return true;
  }

  /* 道具被用掉后收起菜单，让玩家回到棋盘 */
  function closeMenuAfterUse() {
    setItemMenu(false);
  }

  /* 随机抽签用的可注入随机源：测试里可以替换它来强制每种结果 */
  let itemRandom = Math.random;

  /* 设置随机源（仅测试/调试用） */
  function setItemRandom(fn) {
    itemRandom = (typeof fn === 'function') ? fn : Math.random;
  }

  /* 均匀抽一种道具。抽签发生在检查库存之前，绝不重抽。 */
  function drawItemType() {
    let r = Number(itemRandom());
    if (!isFinite(r)) r = 0;
    if (r < 0) r = 0;
    if (r >= 1) r = 0.999999;
    const idx = Math.floor(r * ITEM_TYPES.length);
    return ITEM_TYPES[idx];
  }

  /* 里程碑合格时调用：抽一种道具，能装就装，装不下就 +100 分补偿 */
  function awardRandomItem() {
    const type = drawItemType();
    if (addItem(type)) {
      state.floats.push({
        x: W / 2, y: 250,
        text: '+1 ' + ITEM_LABEL[type], life: 1.4, chain: true
      });
      Sound.merge(7);
      return type;
    }
    /* 装不下（已达上限 / 护盾本局已用）：发 +100 分补偿。
       补偿不推进券进度、不产生连击、不递归结算。 */
    payoutOverflow();
    return null;
  }

  /* ---------------------------------------------------------
   *  隐藏口令：连点标题 → 输入口令 → 补满券 + 送 2 枚复活币
   *  一旦成功使用，**整局**都不计入历史最高分与排行榜。
   * ------------------------------------------------------- */

  /* 本局是否已作废（不计入历史记录） */
  function isRunTainted() { return state.runTainted === true; }

  /* 标记本局作废，并把被本局推高的历史最高分回滚到开局时的基线。
     只回滚「本局推高的部分」：如果基线本来就更高，state.best 保持基线不变。 */
  function taintRun() {
    if (state.runTainted) return;
    state.runTainted = true;
    /* 回滚：只有当当前 best 高于基线（说明是本局推上去的）时才恢复 */
    if (state.best > state.bestBaseline) {
      state.best = state.bestBaseline;
      try { localStorage.setItem(BEST_KEY, String(state.best)); } catch (e) { /* 忽略 */ }
      if (bestEl) bestEl.textContent = state.best;
    }
    paintRunTainted();
  }

  /* 结算面板上的「本局不计入记录」提示 */
  function paintRunTainted() {
    const note = document.getElementById('taintNote');
    if (!note) return;
    note.hidden = !state.runTainted;
  }

  /* 校验口令并发放。返回 true 表示成功。
     条件：口令正确、本局已开局、尚未终局判负。 */
  function applySecretGrant(pass) {
    if (String(pass || '').trim() !== SECRET_PASS) return false;
    if (state.over) return false;                 // 已终局，拒绝

    /* 原子操作：先作废本局，再补资源 */
    taintRun();

    /* 隐藏发放只补锤子，不碰其它道具库存 */
    state.inventory.hammer = SECRET_HAMMERS;
    state.revives += SECRET_REVIVES;              // 送 2 枚复活币
    paintVouchers(true);
    paintRevives(true);

    /* 用中等字号（chain 档）而不是 40px 大字：两条 40px 叠在棋盘中央
       会盖住大半个屏幕，尤其判负时还会压住结算面板。 */
    state.floats.push({ x: W / 2, y: 200, text: '已补满道具券', life: 1.1, chain: true });
    state.floats.push({ x: W / 2, y: 248, text: '+2 复活币', life: 1.1, chain: true });
    Sound.bonus();
    return true;
  }

  /* 连点标题：窗口内累计到阈值就开弹窗 */
  function registerTitleClick() {
    const now = performance.now();
    if (now - state.secretLastAt > SECRET_WINDOW) state.secretClicks = 0;
    state.secretLastAt = now;
    state.secretClicks++;
    if (state.secretClicks >= SECRET_CLICKS) {
      state.secretClicks = 0;
      openSecretDialog();
    }
  }

  /* ---------------------------------------------------------
   *  隐藏口令弹窗：打开 / 提交 / 取消 / 焦点管理
   * ------------------------------------------------------- */

  let secretLastFocus = null;

  function secretEls() {
    return {
      modal: document.getElementById('secretModal'),
      input: document.getElementById('secretInput'),
      form: document.getElementById('secretForm'),
      msg: document.getElementById('secretMsg'),
      close: document.getElementById('secretClose'),
      cancel: document.getElementById('secretCancel')
    };
  }

  function openSecretDialog() {
    const e = secretEls();
    if (!e.modal || e.modal.classList.contains('show')) return;
    secretLastFocus = document.activeElement || null;
    if (e.msg) e.msg.textContent = '';
    if (e.input) e.input.value = '';
    e.modal.classList.add('show');
    e.modal.setAttribute('aria-hidden', 'false');
    /* 移动端要主动聚焦，键盘才会弹出来 */
    if (e.input) {
      try { e.input.focus(); } catch (err) { /* 忽略 */ }
    }
  }

  function closeSecretDialog() {
    const e = secretEls();
    if (!e.modal || !e.modal.classList.contains('show')) return;
    e.modal.classList.remove('show');
    e.modal.setAttribute('aria-hidden', 'true');
    if (e.input) e.input.value = '';
    if (e.msg) e.msg.textContent = '';
    if (secretLastFocus && secretLastFocus.focus) {
      try { secretLastFocus.focus(); } catch (err) { /* 忽略 */ }
    }
    secretLastFocus = null;
  }

  function secretDialogOpen() {
    const e = secretEls();
    return !!(e.modal && e.modal.classList.contains('show'));
  }

  /* 提交口令。成功才关窗；失败只给一句中性提示，不改任何游戏状态。 */
  function submitSecret() {
    const e = secretEls();
    const val = e.input ? e.input.value : '';
    if (applySecretGrant(val)) {
      closeSecretDialog();
      return true;
    }
    if (e.msg) e.msg.textContent = '口令不对，再试试';
    if (e.input) {
      try { e.input.select(); } catch (err) { /* 忽略 */ }
    }
    return false;
  }

  function bindSecretDialog() {
    const e = secretEls();
    if (!e.modal) return;

    /* 标题连点：鼠标、触屏、键盘（Enter/Space）都算一次，且不会重复计数 */
    const title = document.getElementById('gameTitle');
    if (title) {
      title.addEventListener('click', (ev) => {
        ev.preventDefault();
        registerTitleClick();
      });
      /* 键盘激活标题（若有 tabindex）时也计入，但避免和 click 重复 */
      title.addEventListener('keydown', (ev) => {
        if (ev.code === 'Enter' || ev.code === 'Space') {
          ev.preventDefault();
          registerTitleClick();
        }
      });
    }

    if (e.form) {
      e.form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        submitSecret();
      });
    }
    if (e.close) e.close.addEventListener('click', closeSecretDialog);
    if (e.cancel) e.cancel.addEventListener('click', closeSecretDialog);

    /* 点遮罩空白处关闭 */
    e.modal.addEventListener('click', (ev) => {
      if (ev.target === e.modal) closeSecretDialog();
    });

    /* 点弹窗内部不要穿透到棋盘 */
    e.modal.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    e.modal.addEventListener('pointerup', (ev) => ev.stopPropagation());
  }

  /* 满额奖励：只改可见分数与最高分，不动 voucherProgress，也不递归结算 */
  function payoutOverflow() {
    state.score += VOUCHER_OVERFLOW_SCORE;
    updateBestIfEligible();
    scoreEl.textContent = state.score;
    bump(scoreEl);
    state.floats.push({
      x: W / 2, y: 250,
      text: '道具券已满 +' + VOUCHER_OVERFLOW_SCORE, life: 1.4, big: true
    });
    Sound.bonus();
  }

  function addScore(n, x, y, text) {
    state.score += n;
    updateBestIfEligible();
    scoreEl.textContent = state.score;
    bump(scoreEl);
    if (x !== undefined) {
      state.floats.push({ x, y, text: text || ('+' + n), life: 1 });
    }
    grantRevives();
    advanceVoucherProgress(n);   // 实质得分 → 推进券进度
  }

  /* 历史最高分的唯一写入口。
     本局一旦用过隐藏口令（runTainted），就不再写 state.best / localStorage / DOM，
     只让实时分数与结算面板继续正常变化。 */
  function updateBestIfEligible() {
    if (state.runTainted) return;             // 本局成绩作废，不碰历史最高分
    if (state.score <= state.best) return;
    state.best = state.score;
    try { localStorage.setItem(BEST_KEY, String(state.best)); } catch (e) { /* 忽略 */ }
    if (bestEl) bestEl.textContent = state.best;
  }

  /* 只加分数，不走「每 1500 分发复活币」那条路。
     连锁奖励和危险线救回都用它 —— 这两笔钱不该加速攒币。 */
  function addBonusScore(n, x, y, text) {
    state.score += n;
    updateBestIfEligible();
    scoreEl.textContent = state.score;
    bump(scoreEl);
    if (x !== undefined) {
      state.floats.push({ x, y, text: text || ('+' + n), life: 1.2 });
    }
    /* 刻意不调用 grantRevives() —— 但这笔分仍然算「实质得分」，
       要推进券进度（PLAN Stage 4 要求连锁奖励与救回奖励都计入券进度）。 */
    advanceVoucherProgress(n);
  }

  /* ---------------------------------------------------------
   *  连锁（cascade）与局内统计
   *
   *  判定规则（与 PLAN 一致）：
   *   · 普通合成产出新水果 → 若当前没有进行中的连锁，开一条长度 1 的新连锁；
   *     若正在连锁，则这条合成必须「吃掉的是上一条连锁刚产出的那颗水果」才算接上。
   *   · 接上的条件：新水果在 CASCADE_WINDOW 秒内被合成，且期间玩家没投放过。
   *   · 最高级（两只神奶蛙）不产出水果，所以它会**结束**当前连锁，也不计入连锁长度，
   *     但仍然累加「顶级清场」统计。
   *   · 玩家一旦投放，当前连锁立即结算。
   * ------------------------------------------------------- */

  /* 把一条进行中的连锁结算掉：更新最高纪录、飘字、发奖励 */
  function settleCascade() {
    const len = state.cascadeLen;
    if (len <= 0) return;
    const startBand = state.cascadeStartBand;   // 这条连锁开链时所在的档位
    state.cascadeLen = 0;
    state.cascadeBall = null;

    /* 先把连击记到起始档位，再放行里程碑结算 ——
       顺序很重要：档位记录必须在本节点结算之前就位。 */
    noteComboEvent(len, startBand);

    if (len > state.stats.maxCascade) state.stats.maxCascade = len;
    if (len < 2) { trySettleMilestones(); return; }   // 长度 1 没有连锁奖励

    /* 奖励 = min(len-1, 5) × 5，最多 +25；走不攒币的加分通道 */
    const steps = Math.min(len - 1, CASCADE_BONUS_MAX);
    const bonus = steps * CASCADE_BONUS_STEP;
    const text = '×' + Math.min(len, CASCADE_TEXT_MAX) + (len > CASCADE_TEXT_MAX ? '+' : '');
    /* 连续连锁时飘字会叠在一起，给一点轻微错位，读起来不糊成一团 */
    const jitter = (Math.random() - 0.5) * 26;
    state.floats.push({
      x: state.cascadeX + jitter, y: state.cascadeY - 46,
      text: text + ' 连锁', life: 1.5, chain: true
    });
    if (bonus > 0) {
      addBonusScore(bonus, state.cascadeX + jitter, state.cascadeY - 6, '+' + bonus);
    }
    Sound.bonus();
    haptic(30);

    /* 连锁已彻底结束，此时才允许结算排队的里程碑 */
    trySettleMilestones();
  }

  /* 一次普通合成产出了 nb（新水果）。判断它是接上连锁还是另起一条。
     startBand 是「本次合成得分入账之前」voucherProgress 所在的档位，
     由 processMerges 在调用 addScore 之前捕获并传进来。 */
  function noteCascadeMerge(nb, startBand) {
    const now = state.clock;
    /* 上一条连锁产出的那颗水果，是不是刚好被这次合成吃掉了？
       注意必须看 removedBy === 'merge'：光看 dead 会把「被锤子砸掉」
       也当成连锁接上，那就错了。 */
    const continues = state.cascadeLen > 0
      && state.cascadeBall !== null
      && state.cascadeBall.dead === true
      && state.cascadeBall.removedBy === 'merge'
      && (now - state.cascadeTime) <= CASCADE_WINDOW;

    if (continues) {
      state.cascadeLen++;
    } else {
      /* 接不上：先把上一条结算掉，再开一条新的。
         新链的起始档位要在「本次合成得分入账之前」取，所以调用方
         （processMerges）会先把 startBand 存进 state.cascadeStartBand。 */
      settleCascade();
      state.cascadeLen = 1;
      /* 没传 startBand 时（例如外部直接调用），退回当前进度所在的档位 */
      state.cascadeStartBand = (typeof startBand === 'number' && isFinite(startBand))
        ? startBand
        : bandOf(state.voucherProgress);
    }

    state.cascadeBall = nb;
    state.cascadeTime = now;
    state.cascadeX = nb.x;
    state.cascadeY = nb.y;

    if (state.cascadeLen > state.stats.maxCascade) {
      state.stats.maxCascade = state.cascadeLen;
    }
  }

  /* 投放会打断连锁 */
  function breakCascade() {
    if (state.cascadeLen > 0) settleCascade();
  }

  /* 记录「合到过这一级」：投放的起始等级也算 */
  function noteTier(tier) {
    if (tier > state.stats.maxTier) state.stats.maxTier = tier;
  }

  /* ---------------------------------------------------------
   *  合成图鉴（本地持久化，纯外观）
   * ------------------------------------------------------- */

  let discovered = loadDiscovery();

  /* 重新从本地读一遍图鉴。
     正常游玩用不到（内存里的就是最新的），但两个场景需要：
      · 另一个标签页改了图鉴；
      · 自检脚本要在一套干净的存储上重跑断言。 */
  function reloadDiscovery() {
    discovered = loadDiscovery();
    drawChain();
    return discovered;
  }

  function loadDiscovery() {
    const empty = [];
    try {
      const raw = localStorage.getItem(DISCOVERY_KEY);
      if (!raw) return empty;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return empty;
      const out = [];
      for (let i = 0; i < arr.length; i++) {
        const t = Number(arr[i]);
        /* 只收 0..MAX_TIER 的整数，去重，坏数据直接忽略 */
        if (isFinite(t) && t >= 0 && t <= MAX_TIER && Math.floor(t) === t && out.indexOf(t) < 0) {
          out.push(t);
        }
      }
      return out;
    } catch (e) {
      return empty;      // localStorage 不可用 / JSON 坏了：当作空图鉴，不影响玩
    }
  }

  function saveDiscovery() {
    try {
      localStorage.setItem(DISCOVERY_KEY, JSON.stringify(discovered));
    } catch (e) { /* 存不了就算了，不影响本局 */ }
  }

  /* 某个等级是否已解锁（初始投放的 0 级视为天然可见） */
  function isDiscovered(tier) {
    if (tier <= 0) return true;
    return discovered.indexOf(tier) >= 0;
  }

  /* 合出一个等级时解锁它。返回 true 表示这是首次解锁。 */
  function unlockTier(tier) {
    if (tier < 0 || tier > MAX_TIER) return false;
    if (discovered.indexOf(tier) >= 0) return false;
    discovered.push(tier);
    saveDiscovery();
    drawChain();          // 立刻重画合成表，剪影变实体
    return true;
  }


  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  /* ---------------------------------------------------------
   *  投放 & 控制
   * ------------------------------------------------------- */

  function aimLimit(tier) {
    const r = FRUITS[tier].r * shapeOf(tier).rb;   // 用碰撞外形而不是圆形
    return [WALL + r + 0.5, W - WALL - r - 0.5];
  }

  function moveAim(x) {
    const [lo, hi] = aimLimit(state.pending);
    state.aimX = clamp(x, lo, hi);
  }

  function tryDrop() {
    if (state.over || !state.ready) return;
    const tier = state.pending;
    const [lo, hi] = aimLimit(tier);
    const x = clamp(state.aimX, lo, hi);

    /* 投放会打断连锁：先把上一条结算掉，再让新水果下去 */
    breakCascade();

    /* 横向冲量：只在这一刻生效，不影响 aimX，也不会推动已经落下的水果 */
    const ix = FINESSE_ENABLED ? clamp(state.finesse, -FINESSE_MAX, FINESSE_MAX) : 0;
    const ball = makeBall(x, DROP_Y, tier, ix, 130);
    state.balls.push(ball);

    noteTier(tier);            // 投放的起始等级也算进「最高等级」

    state.ready = false;
    state.cooldown = DROP_MS / 1000;
    state.pending = state.next;
    state.next = pickSpawnTier(state.pending);   // 和当前这颗不一样
    Sound.drop();
    drawNext();
    if (state.balls.length > 90) state.balls = state.balls.filter(b => !b.dead);
  }

  /* ---------------------------------------------------------
   *  Stage 4：锤子（消耗一张道具券，砸掉一只静止的奶蛙）
   *
   *  资格：还在 state.balls 里、未 dead、landed、上一步物理有接触（contacts > 0）、
   *        且当前速度 <= 55 px/s。接触条件用来排除「刚落地还在弹」的水果 ——
   *        它们的 landed 一直是 true，但并没有真的停住。
   *  命中：按旋转后的子圆判定（与碰撞体一致），重叠时取渲染顺序最上面那只。
   * ------------------------------------------------------- */

  /* 某只水果此刻能不能被砸 */
  function isHammerTarget(b) {
    if (!b || b.dead) return false;
    if (state.balls.indexOf(b) < 0) return false;
    if (!b.landed) return false;
    if (!(b.contacts > 0)) return false;
    const v2 = b.vx * b.vx + b.vy * b.vy;
    return v2 <= HAMMER_REST_SPEED2;
  }

  /* 世界坐标 → 逻辑坐标 */
  function pointerToPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height)
    };
  }

  /* 点 (px,py) 是否落在某只水果的某个子圆内（子圆已跟着刚体旋转） */
  function hitsFruit(b, px, py) {
    if (!b || b.dead) return false;
    /* 先用包围圆粗筛 */
    const dx0 = px - b.x, dy0 = py - b.y;
    if (dx0 * dx0 + dy0 * dy0 > b.rb * b.rb) return false;
    for (let k = 0; k < b.parts.length; k++) {
      const dx = px - b.wx[k], dy = py - b.wy[k];
      const r = b.ws[k];
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  /* 找出点击点命中的、可被砸的水果。
     渲染顺序是「半径从小到大」，所以反过来遍历就是「从上往下」。 */
  function pickHammerTarget(px, py) {
    const sorted = state.balls.slice().sort((a, b) => a.r - b.r);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const b = sorted[i];
      if (hitsFruit(b, px, py) && isHammerTarget(b)) return b;
    }
    return null;
  }

  /* 点到了水果，但那只不符合条件（在飞 / 在弹 / 刚被移走） */
  function pickAnyFruitAt(px, py) {
    const sorted = state.balls.slice().sort((a, b) => a.r - b.r);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const b = sorted[i];
      if (hitsFruit(b, px, py)) return b;
    }
    return null;
  }

  /* 原子移除：标记 dead + 立刻从 state.balls 移除，并记下移除原因。
     cascade 判定要求「被合成吃掉」，所以这里必须是 'hammer'，
     否则砸掉连锁刚产出的那颗会被误判成连锁接上了。 */
  function removeBall(b, cause) {
    if (!b || b.dead) return false;
    const idx = state.balls.indexOf(b);
    if (idx < 0) return false;
    b.dead = true;
    b.removedBy = cause;
    state.balls.splice(idx, 1);
    /* 清掉可能残留的引用与计时，避免危险线/救回逻辑再碰到它 */
    b.overTime = 0;
    b.dangerPeak = 0;
    b.contacts = 0;
    if (state.cascadeBall === b) {
      /* 连锁刚产出的那颗被砸了：不构成「被合成吃掉」，连锁到此为止 */
      state.cascadeBall = null;
      if (state.cascadeLen > 0) settleCascade();
    }
    if (state.hammerHover === b) state.hammerHover = null;
    return true;
  }

  /* 进入/退出锤子瞄准模式 */
  function setHammerMode(on) {
    if (on) {
      if (state.over || itemCount('hammer') <= 0) return false;
      state.hammerMode = true;
      state.hammerHover = null;
      Sound.ensure();
    } else {
      state.hammerMode = false;
      state.hammerHover = null;
    }
    paintVouchers(false);
    paintHammerHint();
    return true;
  }

  function toggleHammerMode() {
    if (state.hammerMode) { setHammerMode(false); return true; }
    return setHammerMode(true);
  }

  /* 在锤子模式下处理一次点击：成功则消耗一张券并退出模式 */
  function hammerClickAt(px, py) {
    if (!state.hammerMode) return false;
    if (state.over) { setHammerMode(false); return false; }

    const target = pickHammerTarget(px, py);
    if (!target) {
      const any = pickAnyFruitAt(px, py);
      state.floats.push({
        x: px, y: py,
        text: any ? '这只还在动，砸不了' : '点一只静止的奶蛙',
        life: 1.1
      });
      return false;      // 不消耗、不退出
    }
    if (itemCount('hammer') <= 0) { setHammerMode(false); return false; }

    /* 二次校验：物理一直在跑，点到这一刻再确认一次 */
    if (!isHammerTarget(target)) {
      state.floats.push({ x: px, y: py, text: '这只还在动，砸不了', life: 1.1 });
      return false;
    }

    const tx = target.x, ty = target.y, tt = target.tier;
    if (!removeBall(target, 'hammer')) return false;   // 已被移走：不消耗

    consumeItem('hammer');
    burst(tx, ty, tt, 12 + tt * 2, 180 + tt * 20);
    Sound.merge(Math.min(tt + 2, MAX_TIER));
    haptic(20);
    state.floats.push({ x: tx, y: ty - 20, text: '砸掉一只', life: 1.0 });
    setHammerMode(false);          // 用完自动退出
    return true;
  }

  /* ---------------------------------------------------------
   *  Stage 4 第二阶段：磁铁 / 风扇 / 泡泡护盾
   * ------------------------------------------------------- */

  /* —— 磁铁 —— */

  /* 找出「局部密集区」：在选中水果周围 MAGNET_RADIUS 内、
     除它以外的存活水果的质心。返回 null 表示附近没有别的水果。 */
  function magnetLocalTarget(sel) {
    let sx = 0, sy = 0, n = 0;
    const r2 = MAGNET_RADIUS * MAGNET_RADIUS;
    for (let i = 0; i < state.balls.length; i++) {
      const b = state.balls[i];
      if (b.dead || b === sel) continue;
      const dx = b.x - sel.x, dy = b.y - sel.y;
      if (dx * dx + dy * dy > r2) continue;
      sx += b.x; sy += b.y; n++;
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n, count: n };
  }

  /* 在磁铁瞄准态里选中一只水果并启动吸附 */
  function magnetSelect(b) {
    if (!state.magnetMode) return false;
    if (state.over) { setMagnetMode(false); return false; }
    if (!b || b.dead || state.balls.indexOf(b) < 0) return false;
    if (itemCount('magnet') <= 0) return false;
    /* 同一时间只允许一个吸附效果 */
    if (state.magnet && state.magnet.active) return false;

    const t = magnetLocalTarget(b);
    if (!t) {
      state.floats.push({ x: b.x, y: b.y - b.r - 14, text: '附近没有别的水果', life: 1.2 });
      return false;      // 不消耗、不退出
    }

    if (!consumeItem('magnet')) return false;
    state.magnet = {
      active: true, target: b, until: state.clock + MAGNET_DURATION,
      tx: t.x, ty: t.y
    };
    state.floats.push({ x: b.x, y: b.y - b.r - 14, text: '磁铁吸附', life: 1.0 });
    Sound.merge(5);
    haptic(12);
    setMagnetMode(false);
    return true;
  }

  /* 每个物理子步调用：给被吸附的水果一个指向密集区的有限加速度 */
  function applyMagnetForce(dt) {
    const m = state.magnet;
    if (!m || !m.active) return;
    const b = m.target;
    if (!b || b.dead || state.balls.indexOf(b) < 0) {
      m.active = false; state.magnet = null; return;   // 目标没了，效果结束
    }
    if (state.clock >= m.until) {
      m.active = false; state.magnet = null; return;
    }
    /* 目标随附近水果移动而更新 */
    const t = magnetLocalTarget(b);
    if (t) { m.tx = t.x; m.ty = t.y; }

    let dx = m.tx - b.x, dy = m.ty - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    dx /= d; dy /= d;
    /* 距离越近加速度越小，避免贴脸时抖 */
    const falloff = Math.min(1, d / MAGNET_RADIUS);
    let ax = dx * MAGNET_ACCEL * falloff;
    let ay = dy * MAGNET_ACCEL * falloff;
    b.vx += ax * dt;
    b.vy += ay * dt;
    /* 速度上限：防止失控 */
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAGNET_MAX_SPEED) {
      const k = MAGNET_MAX_SPEED / sp;
      b.vx *= k; b.vy *= k;
    }
  }

  /* —— 小风扇 —— */

  /* 用一次风扇：对当前所有存活水果施加水平气流 */
  function useFan() {
    if (state.over) return false;
    if (itemCount('fan') <= 0) return false;
    if (state.fan && state.fan.active) return false;   // 不叠加
    if (!consumeItem('fan')) return false;

    const dir = state.fanNextDir;              // -1 左 / +1 右
    state.fanNextDir = -dir;                   // 下次反向
    state.fan = { active: true, dir: dir, until: state.clock + FAN_DURATION };
    state.floats.push({
      x: W / 2, y: 120,
      text: dir < 0 ? '风扇 ←' : '风扇 →', life: 1.0, chain: true
    });
    Sound.merge(4);
    haptic(10);
    paintInventory(true, 'fan');
    return true;
  }

  /* 每个物理子步调用：给所有存活水果加水平加速度（有速度贡献上限） */
  function applyFanForce(dt) {
    const f = state.fan;
    if (!f || !f.active) return;
    if (state.clock >= f.until) { f.active = false; state.fan = null; return; }
    const ax = f.dir * FAN_ACCEL;
    for (let i = 0; i < state.balls.length; i++) {
      const b = state.balls[i];
      if (b.dead) continue;
      b.vx += ax * dt;
      /* 单次气流造成的水平速度贡献不超过上限 */
      const added = f.dir * b.vx;      // 同向为正
      if (added > FAN_MAX_ADDED_VX) {
        b.vx = f.dir * FAN_MAX_ADDED_VX;
      }
    }
  }

  /* —— 泡泡护盾 —— */

  /* 护盾是否处于激活中（按真实时间判断） */
  function shieldActive() {
    return !!(state.shield && state.shield.active);
  }

  /* 统一的护盾激活入口：手动和自动都走这里。
     source: 'manual' | 'auto'。返回 true 表示真的激活了。 */
  function activateShield(source) {
    if (state.over) return false;
    if (state.shieldUsedThisRun) return false;
    if (itemCount('shield') <= 0) return false;
    if (shieldActive()) return false;

    /* 扣掉库存并标记本局已用 */
    consumeItem('shield');
    state.shieldUsedThisRun = true;
    state.shield = {
      active: true,
      until: nowMs() + SHIELD_DURATION * 1000,   // 真实时间（单调时钟）
      source: source || 'manual'
    };
    paintInventory(false);
    paintShieldTimer();
    state.floats.push({
      x: W / 2, y: 170,
      text: source === 'auto' ? '危险！泡泡护盾已自动触发' : '泡泡护盾启动',
      life: 1.5, chain: true
    });
    Sound.bonus();
    haptic(30);
    return true;
  }

  /* 每个 update 开头调用：处理护盾到期（必须在危险检查之前） */
  function updateShield() {
    const sh = state.shield;
    if (!sh || !sh.active) return;
    if (nowMs() >= sh.until) {
      /* 到期：清掉护盾，但**不给**任何水果重置 overTime ——
         每颗水果带着它原本的 overTime 继续倒数。 */
      sh.active = false;
      state.shield = null;
      paintShieldTimer();
      paintInventory(false);
    }
  }

  /* 危险检查前的自动触发：找出最紧迫的那颗水果，剩余 ≤ 0.5 秒就自动开盾 */
  function maybeAutoShield() {
    if (state.over) return false;
    if (state.shieldUsedThisRun) return false;
    if (itemCount('shield') <= 0) return false;
    if (shieldActive()) return false;

    let minRemain = Infinity;
    for (let i = 0; i < state.balls.length; i++) {
      const b = state.balls[i];
      if (b.dead || !b.landed) continue;
      if (b.y - b.r >= DANGER_Y) continue;              // 不在线上方
      const v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 >= REST_SPEED2) continue;                  // 还在飞，不计时
      const remain = Math.max(0, OVER_LIMIT - b.overTime);
      if (remain < minRemain) minRemain = remain;
    }
    if (minRemain <= SHIELD_AUTO_WINDOW) return activateShield('auto');
    return false;
  }

  /* 磁铁瞄准态开关 */
  function setMagnetMode(on) {
    if (on) {
      if (state.over || itemCount('magnet') <= 0) return false;
      if (state.hammerMode) setHammerMode(false);   // 与锤子互斥
      state.magnetMode = true;
    } else {
      state.magnetMode = false;
    }
    paintInventory(false);
    paintHammerHint();
    return true;
  }

  /* ---------------------------------------------------------
   *  判负 + 危险线救回
   * ------------------------------------------------------- */

  /* 记一次「救回」：这颗水果在警戒线上方累计够 0.5 秒，然后掉回线下或被合成掉。
     每颗只记一次；每局最多 RECOVERY_CAP 次；奖励走不攒币的加分通道。 */
  function creditRecovery(b) {
    if (!b || b.recoveryDone) return false;
    if ((b.dangerPeak || 0) < RECOVERY_MIN_TIME) return false;   // 只是路过，不算
    if (state.stats.recoveries >= RECOVERY_CAP) return false;    // 到上限了
    b.recoveryDone = true;
    state.stats.recoveries++;
    addBonusScore(RECOVERY_BONUS, b.x, b.y - b.r - 12, '救回 +' + RECOVERY_BONUS);
    Sound.merge(4);
    haptic(12);
    return true;
  }

  function checkGameOver(dt) {
    /* 护盾激活期间：危险计时**完全暂停** —— 既不加也不减，
       每颗水果保留自己的 overTime 与 dangerPeak。
       物理、碰撞、合成照常；线上方的危险视觉也照常显示。 */
    if (shieldActive()) {
      let anyDanger = false;
      for (let i = 0; i < state.balls.length; i++) {
        const b = state.balls[i];
        if (b.dead || !b.landed) continue;
        if (b.y - b.r < DANGER_Y) anyDanger = true;
      }
      state.danger = anyDanger;
      return;
    }

    let danger = false;
    for (let i = 0; i < state.balls.length; i++) {
      const b = state.balls[i];
      if (b.dead || !b.landed) continue;
      const top = b.y - b.r;

      if (top < DANGER_Y) {
        danger = true;                     // 只要线上方有东西，虚线就闪红
        /* 只有「卡在线上方且基本停住」才计时：
           被弹起来、正在飞过线的不算，免得误判 */
        if (b.vx * b.vx + b.vy * b.vy < REST_SPEED2) {
          b.overTime += dt;
          /* 记住这颗在线上方攒到过的最大时长：救回判定看的是这个值，
             而不是「掉回线下那一刻还剩多少」 */
          if (b.overTime > (b.dangerPeak || 0)) b.dangerPeak = b.overTime;
          if (b.overTime > OVER_LIMIT) { gameOver(); return; }
        } else {
          b.overTime = Math.max(0, b.overTime - dt * 2);
        }
      } else {
        /* 回到线下方 → 按 2 倍速倒扣，所以长时间待在线上方才会攒起来 */
        const wasAbove = b.overTime > 0;
        b.overTime = Math.max(0, b.overTime - dt * 2);
        if (wasAbove) {
          danger = true;
          /* 攒够过 0.5 秒才算是「化险为夷」 */
          if ((b.dangerPeak || 0) >= RECOVERY_MIN_TIME) creditRecovery(b);
        }
      }
    }
    state.danger = danger;
  }

  /* 结算面板上的五项局内统计（两列紧凑排版） */
  function paintStats() {
    const s = state.stats;
    setText('statCascade', '×' + Math.max(1, s.maxCascade));
    setText('statTier', s.maxTier >= 0 ? FRUITS[s.maxTier].name : '—');
    setText('statTop', s.topClears);
    setText('statRecovery', s.recoveries);
    setText('statRevive', s.revivesUsed);
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  }

  /* 正式结算：弹结算窗 + 把成绩交给排行榜 */
  function settle() {
    if (revivePromptEl) revivePromptEl.hidden = true;
    if (overPanelEl) overPanelEl.hidden = false;
    paintStats();                    // 先把这一局的统计刷上去
    paintRunTainted();               // 本局若用过隐藏口令，这里说明不计入记录
    if (overlayEl) overlayEl.classList.add('show');
    /* 交给排行榜模块（没加载也不影响）。
       本局一旦用过隐藏口令，就整局不上榜 —— 即使以后重新开启在线排行榜，
       这条门控依然有效。 */
    if (!state.runTainted && window.DanaiwaBoard && window.DanaiwaBoard.onGameOver) {
      window.DanaiwaBoard.onGameOver(state.score);
    }
  }

  /* 越线那一屏：有复活币就先问一句，并把两档按钮按余额摆好 */
  function askRevive() {
    if (reviveScoreEl) reviveScoreEl.textContent = state.score;
    if (reviveLeftEl) reviveLeftEl.textContent = '还剩 ' + state.revives + ' 枚';
    paintReviveChoices();
    if (revivePromptEl) revivePromptEl.hidden = false;
    if (overPanelEl) overPanelEl.hidden = true;
    if (overlayEl) overlayEl.classList.add('show');
  }

  /* 两档复活的按钮状态：
     · 普通档（1 枚）：余额够就能点
     · 大范围档（2 枚）：余额不足时禁用，并说明还差几枚 */
  function paintReviveChoices() {
    const normalBtn = document.getElementById('reviveBtn');
    const wideBtn = document.getElementById('reviveWideBtn');
    const canNormal = state.revives >= REVIVE_COST_NORMAL;
    const canWide = state.revives >= REVIVE_COST_WIDE;

    if (normalBtn) {
      normalBtn.disabled = !canNormal;
      normalBtn.textContent = '🪙 用 ' + REVIVE_COST_NORMAL + ' 枚 · 清顶上 1 颗';
    }
    if (wideBtn) {
      wideBtn.disabled = !canWide;
      wideBtn.textContent = '🪙 用 ' + REVIVE_COST_WIDE + ' 枚 · 清顶上 3 颗';
      if (!canWide) {
        const need = REVIVE_COST_WIDE - state.revives;
        wideBtn.title = '还差 ' + need + ' 枚复活币（每 ' + REVIVE_STEP + ' 分攒一枚）';
      } else {
        wideBtn.removeAttribute('title');
      }
    }
    /* 余额不足 2 枚时给一句人话解释 */
    const wideHint = document.getElementById('reviveWideHint');
    if (wideHint) {
      if (canWide) {
        wideHint.hidden = true;
      } else {
        wideHint.hidden = false;
        wideHint.textContent = '大范围救援要 ' + REVIVE_COST_WIDE + ' 枚，还差 '
          + (REVIVE_COST_WIDE - state.revives) + ' 枚';
      }
    }
  }

  function gameOver() {
    state.over = true;
    /* 判负时先退出所有瞄准态，再走原有的结束/复活流程 */
    if (state.hammerMode) setHammerMode(false);
    if (state.magnetMode) setMagnetMode(false);
    finalScoreEl.textContent = state.score;
    finalBestEl.textContent = state.best;
    Sound.over();
    if (state.revives > 0) { askRevive(); return; }
    settle();
  }

  /* 复活：两档。
     普通档（1 枚）：清掉最顶上那颗 + 所有还压在警戒线以上的水果。
     大范围档（2 枚）：清掉最顶上三颗 + 所有还压在警戒线以上的水果。
     两种都用「按上边缘从高到低排序后取前 N 颗」+「其余越线的一并清掉」实现，
     同一颗水果即使同时满足两个条件也只清一次。返回 false 表示当前不能复活。 */
  const REVIVE_COST_NORMAL = 1;
  const REVIVE_COST_WIDE = 2;
  const REVIVE_WIDE_TOP = 3;

  /* 按「上边缘」从高到低排好的存活水果下标 */
  function topFirstOrder() {
    const idx = [];
    for (let i = 0; i < state.balls.length; i++) {
      if (!state.balls[i].dead) idx.push(i);
    }
    idx.sort((i, j) => (state.balls[i].y - state.balls[i].r) - (state.balls[j].y - state.balls[j].r));
    return idx;
  }

  /* 执行一次清场：清掉最上面 topN 颗，再把仍越线的全部清掉。
     用 Set 去重，保证同一颗只清一次。 */
  function clearForRevive(topN) {
    const order = topFirstOrder();
    const kill = new Set();

    for (let k = 0; k < order.length && k < topN; k++) kill.add(state.balls[order[k]]);

    for (let i = 0; i < state.balls.length; i++) {
      const b = state.balls[i];
      if (b.dead) continue;
      if (b.y - b.r < DANGER_Y + 6) kill.add(b);
    }

    if (kill.size) state.balls = state.balls.filter((b) => !b.dead && !kill.has(b));
    return kill.size;
  }

  /* mode: 'normal'（默认，1 枚）| 'wide'（2 枚） */
  function revive(mode) {
    const wide = mode === 'wide';
    const cost = wide ? REVIVE_COST_WIDE : REVIVE_COST_NORMAL;

    if (!state.over) return false;
    if (state.revives < cost) return false;

    clearForRevive(wide ? REVIVE_WIDE_TOP : 1);

    /* 越线计时清零，给玩家一个反应窗口 */
    for (let i = 0; i < state.balls.length; i++) {
      state.balls[i].overTime = 0;
      state.balls[i].dangerPeak = 0;   // 救回之后重新计
    }

    state.revives -= cost;
    state.stats.revivesUsed++;         // 用掉一次记一次，不按清掉的水果数算
    state.over = false;
    state.danger = false;
    state.ready = true;
    state.cooldown = 0;
    state.flash = 0.6;               // 闪一下，让玩家知道救回来了
    if (revivePromptEl) revivePromptEl.hidden = true;
    if (overlayEl) overlayEl.classList.remove('show');
    paintRevives(false);
    Sound.ensure();
    return true;
  }

  function reset() {
    state.balls.length = 0;
    state.particles.length = 0;
    state.floats.length = 0;
    state.score = 0;
    state.over = false;
    state.ready = true;
    state.cooldown = 0;
    state.flash = 0;
    state.danger = false;
    state.aimX = W / 2;
    state.revives = 0;        // 复活币只在本局有效，重开清零
    state.reviveGiven = 0;
    state.freeze = 0;

    /* 连锁状态清零 */
    state.cascadeLen = 0;
    state.cascadeBall = null;
    state.cascadeTime = 0;
    state.cascadeX = 0;
    state.cascadeY = 0;
    state.clock = 0;

    /* 道具库存与效果清零（复活不清，重开才清） */
    state.inventory = { hammer: 0, magnet: 0, fan: 0, shield: 0 };
    state.shieldUsedThisRun = false;
    state.magnet = null;
    state.fan = null;
    state.fanNextDir = -1;
    state.shield = null;
    state.magnetMode = false;

    /* 旧的共享券计数（已被 inventory 取代，保留字段以免老测试崩溃） */
    state.vouchers = 0;
    state.voucherProgress = 0;
    state.voucherMilestone = 0;
    state.bandCombos = [];
    state.pendingMilestones = [];
    state.cascadeStartBand = 0;

    /* 锤子退出瞄准态 */
    state.hammerMode = false;
    state.hammerHover = null;

    /* 新的一局：清除「成绩作废」标记，并记录历史最高分基线，
       用于本局若使用隐藏口令时把被推高的部分回滚掉。 */
    state.runTainted = false;
    state.bestBaseline = state.best;
    state.secretClicks = 0;
    state.secretLastAt = 0;
    paintRunTainted();

    /* 局内统计清零 */
    state.stats.maxCascade = 0;
    state.stats.maxTier = 0;
    state.stats.topClears = 0;
    state.stats.recoveries = 0;
    state.stats.revivesUsed = 0;

    state.finesse = 0;

    state.pending = pickSpawnTier();
    state.next = pickSpawnTier(state.pending);
    if (overlayEl) overlayEl.classList.remove('show');
    if (revivePromptEl) revivePromptEl.hidden = true;
    if (overPanelEl) overPanelEl.hidden = false;
    paintRevives(false);
    scoreEl.textContent = '0';
    bestEl.textContent = state.best;
    drawNext();
    drawChain();              // 图鉴剪影跟着重画
    paintStats();
    paintInventory(false);
    Sound.ensure();
  }

  /* ---------------------------------------------------------
   *  绘制
   * ------------------------------------------------------- */

  function drawFruit(c, x, y, r, tier, angle, scale, squashShape) {
    const f = FRUITS[tier];
    const s = scale === undefined ? 1 : scale;

    c.save();
    c.translate(x, y);
    /* 撞击挤压：沿法线压扁、垂直拉伸（世界坐标，先于水果自身旋转） */
    if (squashShape && squashShape.k > 0.004) {
      c.rotate(squashShape.a);
      c.scale(1 - squashShape.k, 1 + squashShape.k * 0.85);
      c.rotate(-squashShape.a);
    }
    if (s !== 1) c.scale(s, s);
    c.rotate(angle || 0);

    /* —— 贴图模式：主体直接画 PNG，画布边长按 ASSET_FILL 换算，保证视觉大小 = 物理直径 —— */
    if (f.img) {
      const box = (r * 2) / ASSET_FILL;
      c.drawImage(f.img, -box / 2, -box / 2, box, box);
      c.restore();
      return;
    }

    /* —— 兜底一：贴图还没到位时，先画一张极模糊的同形状缩略图 ——
       观感是「图正在慢慢变清晰」，而不是「图挂了」看到一堆卡通脸。
       这张缩略图是内联的 data URL（assets/fruits/blur.js，约 8KB），不走网络。 */
    if (blurImg && blurCfg && blurCfg.cols > 0) {
      const idx = tier < blurCfg.cols ? tier : blurCfg.cols - 1;
      const box = (r * 2) / ASSET_FILL;
      const cell = blurCfg.cell;
      c.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in c) c.imageSmoothingQuality = 'high';
      c.drawImage(blurImg, idx * cell, 0, cell, cell, -box / 2, -box / 2, box, box);
      c.restore();
      return;
    }

    /* —— 兜底二：连缩略图都没有（blur.js 被拦了）才画程序化的圆形水果 —— */
    /* 主体 */
    const g = c.createRadialGradient(-r * 0.34, -r * 0.40, r * 0.12, 0, 0, r * 1.12);
    g.addColorStop(0, f.c1);
    g.addColorStop(1, f.c2);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();

    /* 半奶蛙 / 神奶蛙 的纹理 */
    if (tier === MAX_TIER) {
      c.save();
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.clip();
      c.strokeStyle = 'rgba(10,60,20,.30)';
      c.lineWidth = r * 0.13;
      for (let k = -2; k <= 2; k++) {
        c.beginPath();
        c.ellipse(k * r * 0.42, 0, r * 0.16, r * 1.05, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    } else if (tier === MAX_TIER - 1) {
      c.save();
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.clip();
      c.strokeStyle = 'rgba(20,110,45,.85)';
      c.lineWidth = r * 0.16;
      c.beginPath();
      c.arc(0, 0, r * 0.93, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    /* 描边 */
    c.lineWidth = Math.max(1.4, r * 0.055);
    c.strokeStyle = f.line;
    c.beginPath();
    c.arc(0, 0, r - c.lineWidth * 0.5, 0, Math.PI * 2);
    c.stroke();

    /* 高光 */
    c.beginPath();
    c.ellipse(-r * 0.34, -r * 0.40, r * 0.30, r * 0.19, -0.7, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.fill();

    /* 表情 */
    if (r >= 20) {
      const eyeR = r * 0.135;
      const eyeX = r * 0.33;
      const eyeY = -r * 0.06;

      c.fillStyle = 'rgba(46,32,24,.88)';
      c.beginPath(); c.arc(-eyeX, eyeY, eyeR, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc( eyeX, eyeY, eyeR, 0, Math.PI * 2); c.fill();

      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.arc(-eyeX - eyeR * 0.3, eyeY - eyeR * 0.35, eyeR * 0.34, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc( eyeX - eyeR * 0.3, eyeY - eyeR * 0.35, eyeR * 0.34, 0, Math.PI * 2); c.fill();

      c.beginPath();
      c.arc(0, r * 0.08, r * 0.20, 0.18 * Math.PI, 0.82 * Math.PI);
      c.lineWidth = Math.max(1.2, r * 0.055);
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(46,32,24,.72)';
      c.stroke();

      c.fillStyle = 'rgba(255,120,120,.30)';
      c.beginPath(); c.ellipse(-r * 0.56, r * 0.16, r * 0.16, r * 0.11, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse( r * 0.56, r * 0.16, r * 0.16, r * 0.11, 0, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = 'rgba(46,32,24,.85)';
      c.beginPath(); c.arc(-r * 0.3, -r * 0.06, r * 0.13, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc( r * 0.3, -r * 0.06, r * 0.13, 0, Math.PI * 2); c.fill();
    }

    c.restore();
  }

  function drawBoard() {
    /* 背景 */
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fffaf0');
    bg.addColorStop(0.55, '#fff2dc');
    bg.addColorStop(1, '#ffe7c6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* 顶部投放区高光 */
    const top = ctx.createLinearGradient(0, 0, 0, 190);
    top.addColorStop(0, 'rgba(255,255,255,.85)');
    top.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 190);

    /* 内壁阴影 */
    ctx.save();
    ctx.strokeStyle = 'rgba(196,150,100,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WALL, 0);
    ctx.lineTo(WALL, H - WALL);
    ctx.lineTo(W - WALL, H - WALL);
    ctx.lineTo(W - WALL, 0);
    ctx.stroke();
    ctx.restore();

    /* 警戒线 */
    const danger = state.danger;
    ctx.save();
    ctx.setLineDash([9, 9]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = danger
      ? 'rgba(255,72,72,' + (0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 140))) + ')'
      : 'rgba(226,152,120,.42)';
    ctx.beginPath();
    ctx.moveTo(WALL, DANGER_Y);
    ctx.lineTo(W - WALL, DANGER_Y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBalls() {
    const now = performance.now();
    const balls = state.balls;
    const sorted = balls.slice().sort((a, b) => a.r - b.r);

    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      if (b.dead) continue;

      /* 地面投影 */
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#7a4a1e';
      ctx.beginPath();
      ctx.ellipse(b.x, H - WALL - 1, b.r * 0.86, Math.max(3, b.r * 0.17), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      let scale = 1;
      if (b.popAt) {
        const t = (now - b.popAt) / 220;
        if (t < 1) scale = 1 + 0.28 * (1 - t);
        else b.popAt = 0;
      }
      const shape = b.sq > 0.004 ? { a: b.sqA, k: b.sq } : null;
      drawFruit(ctx, b.x, b.y, b.r, b.tier, b.angle, scale, shape);

      /* 锤子瞄准态：把可砸的目标描一圈，告诉玩家点哪儿有效 */
      if (state.hammerMode && isHammerTarget(b)) {
        const hot = state.hammerHover === b;
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 1.06, 0, Math.PI * 2);
        ctx.lineWidth = hot ? 3.4 : 2;
        ctx.strokeStyle = hot ? 'rgba(240,80,40,.95)' : 'rgba(240,120,60,.5)';
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawAim() {
    if (state.over) return;
    const tier = state.pending;
    const r = FRUITS[tier].r;
    const [lo, hi] = aimLimit(tier);
    const x = clamp(state.aimX, lo, hi);
    const bob = Math.sin(performance.now() / 320) * 2.5;
    const ready = state.ready;

    /* 只有能投的时候才画落点辅助线 */
    if (ready) {
      ctx.save();
      ctx.setLineDash([5, 8]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(200,140,90,.45)';
      ctx.beginPath();
      ctx.moveTo(x, DROP_Y + r + 4);
      ctx.lineTo(x, H - WALL);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = FRUITS[tier].c1;
      ctx.beginPath();
      ctx.arc(x, DROP_Y + bob, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* 冷却中也要画：淡一点表示“下一颗就是它、但还不能投”。
       不然这段时间棋盘上只剩右上角的“下一个”，很容易被当成当前这颗 */
    ctx.save();
    if (!ready) ctx.globalAlpha = 0.4;
    drawFruit(ctx, x, DROP_Y + bob, r, tier, 0, 1);
    ctx.restore();

    /* 方向微调指示：只在有冲量时出现，一个小箭头 + 强度条，别抢瞄准的视觉重点 */
    drawFinesseCue(x, DROP_Y + bob, r);
  }

  /* 松手会往哪边偏：一个小箭头，越长表示冲量越大 */
  function drawFinesseCue(x, y, r) {
    const f = FINESSE_ENABLED ? state.finesse : 0;
    if (!f || Math.abs(f) < 1) return;

    const dir = f > 0 ? 1 : -1;
    const k = Math.min(1, Math.abs(f) / FINESSE_MAX);   // 0..1
    const len = r * (0.5 + k * 0.9);
    const cy = y + r + 12;

    ctx.save();
    ctx.globalAlpha = 0.35 + k * 0.4;
    ctx.strokeStyle = '#f4623a';
    ctx.fillStyle = '#f4623a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - dir * r * 0.25, cy);
    ctx.lineTo(x + dir * len, cy);
    ctx.stroke();

    /* 箭头 */
    const tipX = x + dir * len;
    ctx.beginPath();
    ctx.moveTo(tipX, cy);
    ctx.lineTo(tipX - dir * 6, cy - 4);
    ctx.lineTo(tipX - dir * 6, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEffects(dt) {
    /* 粒子 */
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.vy += 1400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.99;
      p.life -= p.decay * dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 飘分 */
    ctx.textAlign = 'center';
    for (let i = state.floats.length - 1; i >= 0; i--) {
      const f = state.floats[i];
      const big = !!f.big;
      const chain = !!f.chain;          // 连锁飘字：介于普通与大字之间的中间档
      f.y -= (big ? 24 : chain ? 32 : 46) * dt;
      f.life -= dt * (big ? 0.55 : chain ? 0.8 : 1.05);
      if (f.life <= 0) { state.floats.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, f.life * 1.4);
      ctx.font = big
        ? '900 40px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
        : chain
          ? '800 26px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
          : '700 20px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
      ctx.lineWidth = big ? 9 : chain ? 6 : 4;
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = big ? '#e8342f' : chain ? '#f04a12' : '#f4623a';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    /* 顶棚下一颗预览 */
    drawTopPreview();
  }

  function drawTopPreview() {
    /* 棋盘右上角永远显示「下一个」——当前那颗在准星位置上画着，别搞混 */
    const tier = state.next;
    const r = 15;
    const x = W - WALL - 30;
    const y = 32;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(150,110,80,.85)';
    ctx.fillText('下一个', x - r - 10, y);
    ctx.restore();

    drawFruit(ctx, x, y, r, tier, 0, 1);
  }

  /* 面板中的“下一个” */
  function drawNext() {
    const w = nextCanvas.width;
    const h = nextCanvas.height;
    nextCtx.setTransform(1, 0, 0, 1, 0, 0);
    nextCtx.clearRect(0, 0, w, h);
    const tier = state.next;
    const r = FRUITS[tier].r;
    const k = (Math.min(w, h) * 0.42) / r;
    drawFruit(nextCtx, w / 2, h / 2, r * k, tier, 0, 1);
  }

  /* 面板中的“合成表”。
     没解锁过的等级画成剪影（纯色轮廓），解锁过的画正常贴图。 */
  function drawChain() {
    const cw = chainCanvas.width;
    const ch = chainCanvas.height;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.clearRect(0, 0, cw, ch);

    const slot = cw / FRUITS.length;
    const r = slot * 0.36;
    const cy = ch * 0.5;

    for (let i = 0; i < FRUITS.length; i++) {
      const x = slot * (i + 0.5);
      if (isDiscovered(i)) {
        drawFruit(chainCtx, x, cy, r, i, 0, 1);
      } else {
        drawSilhouette(chainCtx, x, cy, r);
      }
      if (i < FRUITS.length - 1) {
        chainCtx.save();
        chainCtx.globalAlpha = 0.45;
        chainCtx.fillStyle = '#b08a68';
        chainCtx.font = '600 ' + Math.round(ch * 0.2) + 'px system-ui, sans-serif';
        chainCtx.textAlign = 'center';
        chainCtx.textBaseline = 'middle';
        chainCtx.fillText('›', x + slot * 0.5, cy);
        chainCtx.restore();
      }
    }
  }

  /* 未解锁等级的剪影：一个淡淡的圆 + 问号，不泄露具体是什么水果 */
  function drawSilhouette(c, x, y, r) {
    c.save();
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(150, 116, 84, .16)';
    c.fill();
    c.lineWidth = Math.max(1, r * 0.1);
    c.strokeStyle = 'rgba(150, 116, 84, .34)';
    c.stroke();
    c.globalAlpha = 0.55;
    c.fillStyle = '#9c7c5c';
    c.font = '700 ' + Math.round(r * 1.05) + 'px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', x, y + r * 0.06);
    c.restore();
  }

  /* ---------------------------------------------------------
   *  主循环
   * ------------------------------------------------------- */

  let last = performance.now();
  let acc = 0;
  const FIXED = 1 / 60;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;      // 切后台回来不要瞬移
    acc += dt;

    let guard = 0;
    while (acc >= FIXED && guard < 5) {
      update(FIXED);
      acc -= FIXED;
      guard++;
    }
    if (guard >= 5) acc = 0;

    render(dt);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    /* 清场命中定格：世界停一下，但画面照常重绘 */
    if (state.freeze > 0) { state.freeze = Math.max(0, state.freeze - dt); return; }

    if (state.over) return;          // 结束后冻结棋盘（粒子特效仍在 render 里继续）

    state.clock += dt;               // 游戏内时钟（连锁窗口用它，测试可控）

    /* 连锁窗口超时：到点就把这条连锁结算掉 */
    if (state.cascadeLen > 0 && (state.clock - state.cascadeTime) > CASCADE_WINDOW) {
      settleCascade();
    }

    if (!state.ready) {
      state.cooldown -= dt;
      if (state.cooldown <= 0) state.ready = true;
    }

    /* 物理：子步细分，保证小水果不被穿透 */
    const sub = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) stepPhysics(sub);

    /* 护盾：先处理到期（用真实时间），再判断要不要自动触发，
       最后才做危险检查 —— 顺序很关键，保证自动触发一定早于判负。 */
    updateShield();
    maybeAutoShield();
    checkGameOver(dt);
    paintShieldTimer();
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.2);
  }

  function render(dt) {
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawBoard();
    drawBalls();
    drawAim();
    /* 定格期间把特效的 dt 也压成 0，让它跟世界一起停住 */
    drawEffects(state.freeze > 0 ? 0 : dt);

    if (state.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.flash * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------
   *  输入
   * ------------------------------------------------------- */

  function pointerToX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }

  /* 触屏是「拖动瞄准、松手投放」——手指不会挡住落点，也方便微调；
     鼠标保持「移动瞄准、按下即投」的桌面手感。

     方向微调：触屏用拖动最后 FINESSE_TOUCH_WINDOW 毫秒的横向速度，
     换算成一点点横向冲量；鼠标/键盘用 Shift+← / Shift+→ 单独调节。
     瞄准位置永远只由 aimX 决定，冲量不会反过来改瞄准。 */
  let touchAiming = false;

  /* 记录拖动轨迹，只保留最后 120ms 用得上的一小段 */
  const touchTrack = [];        // [{ t, x }]

  function trackTouch(x) {
    const now = performance.now();
    touchTrack.push({ t: now, x });
    /* 丢掉过老的采样 */
    while (touchTrack.length && now - touchTrack[0].t > FINESSE_TOUCH_WINDOW) {
      touchTrack.shift();
    }
  }

  /* 由拖动轨迹算出横向速度（px/s），并夹到 ±FINESSE_MAX */
  function finesseFromTrack() {
    if (!FINESSE_ENABLED) return 0;
    if (touchTrack.length < 2) return 0;
    const first = touchTrack[0];
    const last = touchTrack[touchTrack.length - 1];
    const dtMs = last.t - first.t;
    if (dtMs < 16) return 0;                  // 太短，说明没在甩，别乱加
    const vx = ((last.x - first.x) / dtMs) * 1000;
    if (!isFinite(vx)) return 0;
    if (Math.abs(vx) < 120) return 0;         // 慢慢挪不算甩动
    return clamp(vx, -FINESSE_MAX, FINESSE_MAX);
  }

  stage.addEventListener('pointermove', (e) => {
    if (state.over || isModalOpen()) return;

    /* 锤子瞄准态：只更新高亮，绝不移动准星、也不投放 */
    if (state.hammerMode) {
      const pt = pointerToPoint(e.clientX, e.clientY);
      state.hammerHover = pickHammerTarget(pt.x, pt.y);
      return;
    }

    /* 磁铁瞄准态：同样不移动准星 */
    if (state.magnetMode) return;

    if (e.pointerType === 'touch' && !touchAiming) return;
    moveAim(pointerToX(e.clientX));
    if (e.pointerType === 'touch') trackTouch(pointerToX(e.clientX));
  });

  stage.addEventListener('pointerdown', (e) => {
    if (state.over || isModalOpen()) return;
    Sound.ensure();

    /* 锤子瞄准态：这一下点击用于选目标，不移动准星、不投放 */
    if (state.hammerMode) {
      const pt = pointerToPoint(e.clientX, e.clientY);
      hammerClickAt(pt.x, pt.y);
      e.preventDefault();
      return;
    }

    /* 磁铁瞄准态：点一只水果开始吸附；点空白不消耗也不退出 */
    if (state.magnetMode) {
      const pt = pointerToPoint(e.clientX, e.clientY);
      const picked = pickAnyFruitAt(pt.x, pt.y);
      if (picked) magnetSelect(picked);
      e.preventDefault();
      return;
    }

    moveAim(pointerToX(e.clientX));
    if (e.pointerType === 'touch') {
      touchAiming = true;
      touchTrack.length = 0;
      trackTouch(pointerToX(e.clientX));
      /* 手指滑出棋盘也能收到 pointerup */
      if (stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      }
    } else {
      tryDrop();
    }
  });

  stage.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    if (!touchAiming) return;
    touchAiming = false;
    if (state.over) return;
    if (state.hammerMode) return;      // 锤子态下松手不投放
    if (state.magnetMode) return;      // 磁铁态下松手也不投放
    moveAim(pointerToX(e.clientX));
    trackTouch(pointerToX(e.clientX));
    state.finesse = finesseFromTrack();       // 松手这一下才把冲量算进去
    tryDrop();
    state.finesse = 0;
    touchTrack.length = 0;
  });

  stage.addEventListener('pointercancel', () => {
    touchAiming = false;
    touchTrack.length = 0;
    state.finesse = 0;
  });

  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  /* 在输入框里打字时不要抢按键 */
  function isTyping(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || t.isContentEditable === true;
  }

  /* 有弹窗打开时，游戏按键一律让路。
     教程弹窗里按空格/回车/方向键绝不能投放水果（PLAN Stage 3 的硬要求）；
     排行榜、赞助这类弹窗同理 —— 开着弹窗还在背后掉水果是明显的 bug。 */
  function isModalOpen() {
    const ids = ['helpModal', 'boardModal', 'sponsorModal', 'secretModal'];
    for (let i = 0; i < ids.length; i++) {
      const m = document.getElementById(ids[i]);
      if (m && m.classList && m.classList.contains('show')) return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    /* 口令弹窗优先：Esc 关闭；Enter 交给表单；其余按键留在输入框里，
       绝不透到棋盘（这一步必须在 isTyping 之前，否则输入框里按空格会漏下去）。 */
    if (secretDialogOpen()) {
      if (e.code === 'Escape' || e.key === 'Escape') {
        closeSecretDialog();
        e.preventDefault();
        return;
      }
      return;      // 其它按键全部交给弹窗自己处理
    }

    if (isTyping(e)) return;
    if (isModalOpen()) return;

    /* 磁铁瞄准态：Esc 取消；其余按键不投放 */
    if (state.magnetMode) {
      if (e.code === 'Escape' || e.key === 'Escape') {
        setMagnetMode(false);
        e.preventDefault();
        return;
      }
      e.preventDefault();
      return;
    }

    /* 锤子瞄准态：Esc 取消；空格/回车/方向键一律不投放 */
    if (state.hammerMode) {
      if (e.code === 'Escape' || e.key === 'Escape') {
        setHammerMode(false);
        e.preventDefault();
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
        e.preventDefault();            // 吃掉，不投放
        return;
      }
      /* 其余按键（方向键微调、R 重开）也一并不放行，避免误操作 */
      e.preventDefault();
      return;
    }

    /* Esc 收起道具菜单（放在瞄准态之后：瞄准态的 Esc 优先处理） */
    if (itemMenuOpen() && (e.code === 'Escape' || e.key === 'Escape')) {
      setItemMenu(false);
      e.preventDefault();
      return;
    }

    /* Shift + ←/→：只调方向微调，不动瞄准位置 */
    if (FINESSE_ENABLED && e.shiftKey && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      const dir = e.code === 'ArrowLeft' ? -1 : 1;
      state.finesse = clamp(state.finesse + dir * FINESSE_KEY_STEP, -FINESSE_MAX, FINESSE_MAX);
      e.preventDefault();
      return;
    }

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      state.aimX = clamp(state.aimX - 14, WALL, W);
      e.preventDefault();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      state.aimX = clamp(state.aimX + 14, WALL, W);
      e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
      /* 空格/回车只在局内投放；结束后不再用它们重开（免得手快连着开新局） */
      if (!state.over) { tryDrop(); e.preventDefault(); }
    } else if (e.code === 'KeyR') {
      reset();
      e.preventDefault();
    }
  });

  /* 音效按钮里是 <span class="ico"> + <span class="lbl">，只改这两块文字 */
  function paintSoundBtn() {
    const ico = soundBtn.querySelector('.ico');
    const lbl = soundBtn.querySelector('.lbl');
    if (ico) ico.textContent = Sound.muted ? '🔇' : '🔊';
    if (lbl) lbl.textContent = Sound.muted ? '音效关' : '音效开';
    soundBtn.setAttribute('aria-pressed', String(!Sound.muted));
  }

  soundBtn.addEventListener('click', () => {
    Sound.muted = !Sound.muted;
    localStorage.setItem(MUTE_KEY, Sound.muted ? '1' : '0');
    paintSoundBtn();
    if (!Sound.muted) Sound.merge(1);
  });

  resetBtn.addEventListener('click', reset);
  restartBtn.addEventListener('click', reset);

  /* ---------------------------------------------------------
   *  素材加载
   * ------------------------------------------------------- */

  /* 贴图加载。三点很重要：
       1) 弱网下「一次没拉到」很常见，**不重试**的话玩家会一直看到兜底的程序化水果
          （一堆卡通脸），观感就是"图挂了"，所以失败要退避重试；
       2) 必须等 decode() 完成再拿去 drawImage，否则浏览器会画出还没解码完的半成品；
       3) 全部失败也不影响玩，只是回退成程序化水果。 */
  const SPRITE_RETRY = 3;      // 每个素材最多试几次

  let blurImg = null;          // 极模糊占位图（内联 data URL，秒到）
  const blurCfg = window.FRUIT_BLUR || null;

  function loadBlur() {
    if (!blurCfg || !blurCfg.src) return;
    const im = new Image();
    im.onload = () => { blurImg = im; };
    im.src = blurCfg.src;
  }

  function loadSprites() {
    let left = 0;

    function fetchOne(f, attempt) {
      const img = new Image();
      img.onload = () => {
        const ready = () => {
          f.img = img;
          if (--left === 0) refreshPreviews();
        };
        if (img.decode) img.decode().then(ready, ready);
        else ready();
      };
      img.onerror = () => {
        if (attempt < SPRITE_RETRY) {
          /* 退避 + 抖动，避免一批图同时重试又同时失败 */
          const wait = 600 * Math.pow(2.4, attempt - 1) + Math.random() * 300;
          setTimeout(() => fetchOne(f, attempt + 1), wait);
          return;
        }
        left--;
        if (window.console) console.warn('[danaiwa] 素材载入失败，已回退为程序化水果：' + f.file);
        if (left === 0) refreshPreviews();
      };
      /* 重试时换一个带参地址，绕开浏览器对上次失败结果的缓存 */
      img.src = attempt > 1 ? (f.file + '?retry=' + attempt) : f.file;
    }

    for (let i = 0; i < FRUITS.length; i++) {
      const f = FRUITS[i];
      if (!f.file) continue;
      left++;
      fetchOne(f, 1);
    }
    return left;
  }

  function refreshPreviews() {
    drawNext();
    drawChain();
  }

  /* ---------------------------------------------------------
   *  启动
   * ------------------------------------------------------- */

  function boot() {
    resizeCanvas();
    if (window.ResizeObserver) {
      new ResizeObserver(resizeCanvas).observe(stage);
    }
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

    paintSoundBtn();

    /* 越线那一屏的三个按钮 */
    if (reviveBtn) reviveBtn.addEventListener('click', () => revive('normal'));
    const reviveWideBtn = document.getElementById('reviveWideBtn');
    if (reviveWideBtn) reviveWideBtn.addEventListener('click', () => revive('wide'));
    if (giveUpBtn) giveUpBtn.addEventListener('click', settle);

    /* 道具菜单入口 */
    const menuBtn = document.getElementById('itemMenuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItemMenu();
      });
    }
    /* 点面板外面收起菜单（不拦截棋盘本身的操作） */
    document.addEventListener('click', (e) => {
      if (!itemMenuOpen()) return;
      const wrap = document.querySelector('.item-menu-wrap');
      if (wrap && wrap.contains(e.target)) return;
      setItemMenu(false);
    });

    /* 四个道具按钮 */
    const hammerBtn = document.getElementById('btn-hammer');
    if (hammerBtn) {
      hammerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleHammerMode();
        closeMenuAfterUse();
      });
    }
    const magnetBtn = document.getElementById('btn-magnet');
    if (magnetBtn) {
      magnetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.magnetMode) setMagnetMode(false);
        else setMagnetMode(true);
        closeMenuAfterUse();
      });
    }
    const fanBtn = document.getElementById('btn-fan');
    if (fanBtn) {
      fanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        useFan();
        closeMenuAfterUse();
      });
    }
    const shieldBtn = document.getElementById('btn-shield');
    if (shieldBtn) {
      shieldBtn.addEventListener('click', (e) => {
        e.preventDefault();
        activateShield('manual');
        closeMenuAfterUse();
      });
    }
    paintInventory(false);
    paintHammerHint();
    bindSecretDialog();
    paintRunTainted();

    drawChain();
    reset();
    loadBlur();             // 占位图是内联的，几乎立刻可用
    loadSprites();          // 贴图异步到位，到了会自动重画预览
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 调试句柄（控制台可用）：__DNW__.state / .reset() / .drop() / .FRUITS / .render()
     Stage 2 新增：settleCascade / noteCascadeMerge / creditRecovery / unlockTier /
     isDiscovered / paintStats / clearForRevive / finesseFromTrack 等，供自检脚本直接调。 */
  window.__DNW__ = { state, reset, revive, settle, gameOver, tryDrop, stepPhysics, update, FRUITS,
                     render, resizeCanvas, shapeOf, makeBall, paintRevives, addScore, addBonusScore,
                     settleCascade, noteCascadeMerge, breakCascade, noteTier, creditRecovery,
                     checkGameOver, askRevive,
                     /* Stage 4 */
                     isHammerTarget, hitsFruit, pickHammerTarget, pickAnyFruitAt,
                     removeBall, setHammerMode, toggleHammerMode, hammerClickAt,
                     paintVouchers, paintHammerHint, bandOf, noteComboEvent,
                     advanceVoucherProgress, trySettleMilestones, settleMilestone,
                     VOUCHER_STEP, VOUCHER_MAX, VOUCHER_OVERFLOW_SCORE,
                     COMBO_DOUBLE_NEED, COMBO_TRIPLE_NEED, HAMMER_REST_SPEED,
                     /* Stage 4 追加：隐藏口令 */
                     isRunTainted, taintRun, applySecretGrant, registerTitleClick,
                     openSecretDialog, closeSecretDialog, secretDialogOpen,
                     submitSecret, paintRunTainted, updateBestIfEligible,
                     SECRET_PASS, SECRET_CLICKS, SECRET_WINDOW,
                     SECRET_HAMMERS, SECRET_REVIVES,
                     /* Stage 4 第二阶段：道具库存与三种新道具 */
                     ITEM_TYPES, ITEM_MAX, ITEM_LABEL,
                     itemCount, itemMax, canHoldItem, addItem, consumeItem, paintInventory,
                     drawItemType, awardRandomItem, setItemRandom,
                     magnetSelect, magnetLocalTarget, setMagnetMode, applyMagnetForce,
                     useFan, applyFanForce,
                     activateShield, updateShield, maybeAutoShield, shieldActive,
                     paintShieldTimer, nowMs,
                     itemMenuOpen, setItemMenu, toggleItemMenu, closeMenuAfterUse,
                     positionItemMenu,
                     MAGNET_RADIUS, MAGNET_DURATION, MAGNET_ACCEL, MAGNET_MAX_SPEED,
                     FAN_DURATION, FAN_ACCEL, FAN_MAX_ADDED_VX,
                     SHIELD_DURATION, SHIELD_AUTO_WINDOW,
                     unlockTier, isDiscovered, loadDiscovery, saveDiscovery, reloadDiscovery,
                     paintStats,
                     paintReviveChoices, clearForRevive, topFirstOrder, drawChain, drawSilhouette,
                     finesseFromTrack,
                     MAX_BONUS, REVIVE_STEP,
                     CASCADE_WINDOW, CASCADE_BONUS_STEP, CASCADE_BONUS_MAX, CASCADE_TEXT_MAX,
                     RECOVERY_MIN_TIME, RECOVERY_BONUS, RECOVERY_CAP,
                     FINESSE_ENABLED, FINESSE_MAX, FINESSE_KEY_STEP, FINESSE_TOUCH_WINDOW,
                     REVIVE_COST_NORMAL, REVIVE_COST_WIDE, REVIVE_WIDE_TOP,
                     DISCOVERY_KEY,
                     blurReady: () => !!blurImg };
})();
