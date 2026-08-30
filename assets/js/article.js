/* article.js —— 文章详情页逻辑：按文件名定位文章、渲染正文、进度条、主题 UI、富组件动画、上下篇导航 */
(function () {
  'use strict';
  var file = location.pathname.split('/').pop();
  var arts = window.BLOG_ARTICLES || [];
  var a = null, aIndex = -1, i;
  for (i = 0; i < arts.length; i++) {
    if (arts[i].href && arts[i].href.split('/').pop() === file) { a = arts[i]; aIndex = i; break; }
  }

  if (a) {
    document.title = a.title + ' · Code & Craft';
    var t = document.querySelector('.art-title');
    if (t) { t.dataset.text = a.title; t.textContent = a.title; }
    var d = document.getElementById('art-date'); if (d) d.textContent = a.date;
    var r = document.getElementById('art-read'); if (r) r.textContent = a.readMin + ' 分钟阅读';
    var tags = document.getElementById('art-tags');
    if (tags) tags.innerHTML = a.tags.map(function (tg) { return '<span class="tag">' + tg + '</span>'; }).join('');
    /* 页面已有硬编码正文（旧文章页）时跳过注入，避免被精简版数据覆盖 */
    var body = document.getElementById('art-body');
    if (body && !body.innerHTML.trim()) body.innerHTML = a.body;

    /* 上一篇 / 下一篇：按列表顺序生成，边界页不产生无效链接 */
    var navPrev = document.getElementById('nav-prev'), navNext = document.getElementById('nav-next');
    function fillNav(el, art, dir) {
      if (!art) { if (el) el.remove(); return; }
      el.href = './' + art.href.split('/').pop();
      el.textContent = dir === 'prev' ? '← ' + art.title : art.title + ' →';
    }
    fillNav(navPrev, aIndex > 0 ? arts[aIndex - 1] : null, 'prev');
    fillNav(navNext, aIndex < arts.length - 1 ? arts[aIndex + 1] : null, 'next');
  } else {
    var np = document.getElementById('nav-prev'), nn = document.getElementById('nav-next');
    if (np) np.remove(); if (nn) nn.remove();
  }

  /* 富组件动画：KPI 数字滚动 */
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, target = +el.getAttribute('data-count'),
            dec = el.getAttribute('data-dec') != null ? +el.getAttribute('data-dec') : null,
            dur = 1350, t0 = performance.now();
        (function tick(now) {
          var p = Math.min((now - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 3), v = target * ease;
          el.textContent = dec != null ? v.toFixed(dec) : v.toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: .5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* 富组件动画：条形图宽度 */
  document.querySelectorAll('[data-bar]').forEach(function (b) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { b.style.width = b.getAttribute('data-bar'); bio.disconnect(); }
      });
    }, { threshold: .3 });
    bio.observe(b);
  });

  /* 滚动进度条 */
  var bar = document.getElementById('progress');
  function update() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, scrollY / max * 100) : 0) + '%';
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  /* 主题按钮 UI + 切换 */
  function sync() {
    var cur = ThemeSwitch.current();
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.themeBtn === cur);
      b.setAttribute('aria-pressed', String(b.dataset.themeBtn === cur));
    });
  }
  document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
    b.addEventListener('click', function (e) { ThemeSwitch.set(b.dataset.themeBtn, e.clientX, e.clientY); });
  });
  document.addEventListener('themechange', sync);
  sync();

  FX.init(ThemeSwitch.current());
})();
