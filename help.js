/* ============================================================
 *  合成大奶蛙Pro · 玩法教程弹窗
 *
 *  职责：只负责开/关这一个弹窗，以及焦点管理。
 *  —— 不碰游戏状态，也绝不触发投放：整个弹窗在 overlay 之外，
 *     而且这里不派发任何 pointer/keydown 到 stage。
 *
 *  可访问性：
 *    · 打开时记住原来的焦点，关闭时还回去；
 *    · 打开后把焦点移到弹窗里的关闭按钮；
 *    · Escape 关闭；
 *    · 点遮罩空白处关闭（跟排行榜弹窗一致）；
 *    · 弹窗内容可滚动（小屏幕），并带 aria-hidden 状态切换。
 * ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var modal = null;
  var openBtn = null;
  var closeBtn = null;
  var okBtn = null;
  var lastFocus = null;
  var isOpen = false;

  /* 打开教程弹窗 */
  function open() {
    if (!modal || isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement || null;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    /* 焦点移到关闭按钮，键盘用户能立刻 Esc / Tab */
    if (closeBtn && closeBtn.focus) {
      try { closeBtn.focus(); } catch (e) { /* 忽略 */ }
    }
  }

  /* 关闭教程弹窗，并把焦点还回去 */
  function close() {
    if (!modal || !isOpen) return;
    isOpen = false;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) { /* 忽略 */ }
    }
    lastFocus = null;
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function bind() {
    modal = $('helpModal');
    openBtn = $('helpBtn');
    closeBtn = $('helpClose');
    okBtn = $('helpOk');

    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open();
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (okBtn) okBtn.addEventListener('click', close);

    /* 点遮罩空白处关闭（和排行榜弹窗一致） */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });

    /* Escape 关闭。
       注意：这里刻意不 stopPropagation —— game.js 的 keydown 只认
       方向键 / 空格 / 回车 / R，Escape 不在其中，不会误触发投放。 */
    window.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.code === 'Escape') {
        close();
        e.preventDefault();
      }
    });
  }

  /* 暴露给自检脚本与调试用 */
  window.DanaiwaHelp = {
    open: open,
    close: close,
    toggle: toggle,
    isOpen: function () { return isOpen; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
