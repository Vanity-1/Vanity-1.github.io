/* theme-switch.js —— 主题切换器（<head> 同步加载，防 FOUC）
 * 融合版约定：特效常驻共存，主题切换只改视觉风格与特效配色，
 * 因此 swap 内调 FX.applyTheme（更新调色板），不销毁/重启特效。
 * 切换动画分派：
 *   - 常规主题对：View Transitions 圆形扩散（从点击点），不支持时直接切换
 *   - cyber↔editorial：两主题底色/文字色相近，圆形遮罩辨识度低，
 *     改用"glitch 闪烁"强化过渡：
 *       ① VTA 可用：::view-transition-new(root) 套用 glitch keyframes（切片抖动 +
 *          亮度爆闪），过渡完成瞬间再叠加覆盖层闪光，形成两段式冲击；
 *       ② 覆盖层 #vt-flash（扫描线 + 噪点 + 方向色闪光）不依赖 VTA，
 *          不支持的浏览器直接切换 + 闪光，降级不降体验。
 *     注：flash 在 VT 结束后才插入——若在 VT 期间插入会被快照冻结无法播放。
 */
(function () {
  'use strict';
  var KEY = 'blog-theme', THEMES = ['playful', 'cyber', 'editorial'];
  var GLITCH_PAIRS = { 'cyber|editorial': 1, 'editorial|cyber': 1 };

  function stored() {
    try { var t = localStorage.getItem(KEY); return THEMES.indexOf(t) > -1 ? t : null; }
    catch (e) { return null; }
  }
  function apply(theme) { document.documentElement.dataset.theme = theme; }

  /* glitch 覆盖层：每次重建元素以保证动画必然重放，结束后自移除 */
  function flashGlitch(targetTheme) {
    var old = document.getElementById('vt-flash');
    if (old) old.remove();
    var flash = document.createElement('div');
    flash.id = 'vt-flash';
    flash.className = 'run ' + (targetTheme === 'editorial' ? 'to-editorial' : 'to-cyber');
    document.body.appendChild(flash);
    var removed = false;
    function remove() { if (!removed) { removed = true; flash.remove(); } }
    flash.addEventListener('animationend', remove);
    setTimeout(remove, 700); /* 安全兜底：动画被打断时也能清理 */
  }

  var ThemeSwitch = {
    boot: function () {
      apply(stored() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'cyber' : 'playful'));
    },
    current: function () { return document.documentElement.dataset.theme; },
    set: function (theme, x, y) {
      if (THEMES.indexOf(theme) < 0 || theme === ThemeSwitch.current()) return;
      try { localStorage.setItem(KEY, theme); } catch (e) { /* 忽略隐私模式 */ }
      var from = ThemeSwitch.current();
      var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var swap = function () {
        apply(theme);
        if (window.FX) { FX.applyTheme(theme); }
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme, from: from } }));
      };
      if (GLITCH_PAIRS[from + '|' + theme] && !reduced) {
        if (document.startViewTransition) {
          document.documentElement.dataset.vtMode = 'glitch';
          var vt = document.startViewTransition(swap);
          var done = function () {
            delete document.documentElement.dataset.vtMode;
            flashGlitch(theme); /* VT 快照释放后再闪光，避免被冻结 */
          };
          /* then(done, done) 同时吞掉中止拒绝，避免快速连点时控制台报 InvalidStateError */
          if (vt && vt.finished && vt.finished.then) { vt.finished.then(done, done); }
          else { setTimeout(done, 600); }
        } else { swap(); flashGlitch(theme); }
        return;
      }
      if (document.startViewTransition && !reduced) {
        document.documentElement.style.setProperty('--vt-x', (x || innerWidth / 2) + 'px');
        document.documentElement.style.setProperty('--vt-y', (y || innerHeight / 2) + 'px');
        var vtCircle = document.startViewTransition(swap);
        /* 同上：中止拒绝静默处理 */
        if (vtCircle && vtCircle.finished && vtCircle.finished.catch) { vtCircle.finished.catch(function () {}); }
      } else { swap(); }
    }
  };
  ThemeSwitch.boot();
  window.ThemeSwitch = ThemeSwitch;
})();
