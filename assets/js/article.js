/* article.js —— 文章详情页逻辑：按文件名定位文章、渲染正文、进度条、主题 UI */
(function () {
  'use strict';
  var file = location.pathname.split('/').pop();
  var a = null, i;
  for (i = 0; i < (window.BLOG_ARTICLES || []).length; i++) {
    if (window.BLOG_ARTICLES[i].href && window.BLOG_ARTICLES[i].href.split('/').pop() === file) { a = window.BLOG_ARTICLES[i]; break; }
  }
  if (a) {
    document.title = a.title + ' · Code & Craft';
    var t = document.querySelector('.art-title');
    if (t) { t.dataset.text = a.title; t.textContent = a.title; }
    var d = document.getElementById('art-date'); if (d) d.textContent = a.date;
    var r = document.getElementById('art-read'); if (r) r.textContent = a.readMin + ' 分钟阅读';
    var tags = document.getElementById('art-tags');
    if (tags) tags.innerHTML = a.tags.map(function (tg) { return '<span class="tag">' + tg + '</span>'; }).join('');
    var body = document.getElementById('art-body');
    if (body) body.innerHTML = a.body;
  }

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
