/* lab.js —— 实验室页面公共逻辑：进度条、主题按钮、滚动显现、轻量工具函数 */
(function () {
  'use strict';

  function initProgress() {
    var bar = document.getElementById('progress');
    if (!bar) return;
    function update() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, scrollY / max * 100) : 0) + '%';
    }
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  function initThemeButtons() {
    function sync() {
      var cur = ThemeSwitch.current();
      document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
        var on = b.dataset.themeBtn === cur;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.addEventListener('click', function (e) { ThemeSwitch.set(b.dataset.themeBtn, e.clientX, e.clientY); });
    });
    document.addEventListener('themechange', sync);
    sync();
  }

  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: .08 });
    els.forEach(function (el) { io.observe(el); });
  }

  function initCopyButtons() {
    document.querySelectorAll('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.dataset.copyTarget);
        if (!el) return;
        var text = el.textContent || '';
        var old = btn.textContent;
        function done() { btn.textContent = '已复制'; setTimeout(function () { btn.textContent = old; }, 1200); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else { fallback(text, done); }
      });
    });
    function fallback(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    }
  }

  window.Lab = {
    fmtMoney: function (v) { return '$' + Number(v).toFixed(3); },
    fmtPct: function (v, d) { return (Number(v) * 100).toFixed(d == null ? 1 : d) + '%'; },
    shortHash: function (h, n) { return h ? h.slice(0, n || 12) + '…' : '—'; },
    escape: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  };

  initProgress();
  if (window.ThemeSwitch) initThemeButtons();
  initReveal();
  initCopyButtons();
})();
