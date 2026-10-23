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

  /* 站内文章/实验页跳转：GitHub Pages 在部分网络下首字节要等十几秒，
     浏览器在这段时间只留一个空白页，看起来像卡死。这里先留在原页显示进度，
     fetch 目标 HTML 预热缓存后再跳转，正常网络下无感。 */
  function initNavFeedback() {
    var pending = null, uiTimer = null, box = null;

    function ui() {
      if (box) return box;
      box = document.createElement('div');
      box.className = 'nav-pending';
      box.innerHTML =
        '<div class="nav-pending-bar" aria-hidden="true"></div>' +
        '<div class="nav-pending-toast" role="status" aria-live="polite">' +
          '<span class="nav-spinner" aria-hidden="true"></span>' +
          '<span class="nav-pending-text">正在打开…</span>' +
          '<button type="button" class="nav-pending-cancel">取消</button>' +
        '</div>';
      box.querySelector('.nav-pending-cancel').addEventListener('click', function () {
        if (pending && pending.ctrl) pending.ctrl.abort();
        reset();
      });
      document.body.appendChild(box);
      return box;
    }

    function show(text) {
      var o = ui();
      o.querySelector('.nav-pending-text').textContent = text ? '正在打开：' + text : '正在打开…';
      o.classList.add('on');
    }

    function reset() {
      pending = null;
      clearTimeout(uiTimer);
      if (box) box.classList.remove('on');
    }

    document.addEventListener('click', function (e) {
      if (pending || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (/^(mailto|tel|javascript):/i.test(href)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.hash) return;
      if (!/\.html?$/i.test(url.pathname) && url.pathname.slice(-1) !== '/') return;

      e.preventDefault();
      var self = { ctrl: window.AbortController ? new AbortController() : null };
      pending = self;
      var text = (a.textContent || '').trim();
      uiTimer = setTimeout(function () { show(text); }, 120);
      fetch(url.href, {
        credentials: 'same-origin',
        signal: self.ctrl ? self.ctrl.signal : undefined
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function () {
          if (pending !== self) return;
          location.assign(url.href);
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (pending !== self) return;
          reset();
          location.assign(url.href);
        });
    }, true);

    addEventListener('pageshow', reset);
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
  initNavFeedback();
})();
