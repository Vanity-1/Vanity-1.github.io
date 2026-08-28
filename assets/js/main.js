/* main.js —— 融合版页面逻辑：卡片渲染、滚动进度条、点赞计数、主题 UI 同步 */
(function () {
  'use strict';
  var THEMES_META = {
    playful: '奇趣互动派 · 彩带 / 弹性卡片 / 糖果进度条',
    cyber: '赛博暗色派 · 粒子 / 乱码解密 / 拖尾 / 3D 视差',
    editorial: '极简编辑派 · 打字机 / 滚动显现'
  };

  /* 卡片渲染：有 href 则渲染为可点击链接（跳转详情页），否则为展示容器 */
  function renderCards() {
    document.getElementById('cards').innerHTML = window.BLOG_ARTICLES.map(function (a) {
      var open = a.href ? '<a class="card reveal" href="' + a.href + '">' : '<div class="card reveal">';
      var close = a.href ? '</a>' : '</div>';
      return open +
        '<div class="meta"><span>' + a.date + '</span><span>' + a.readMin + ' 分钟阅读</span></div>' +
        '<h3>' + a.title + '</h3><p>' + a.excerpt + '</p>' +
        '<div class="tags">' + a.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' +
        close;
    }).join('');
  }

  function renderAboutTags() {
    document.getElementById('aboutTags').innerHTML =
      ['RAG', 'Agent', 'LangGraph', 'MCP', 'Python', 'FastAPI', 'CSS', 'Canvas', '动效设计']
        .map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
  }

  /* 滚动进度条（跨主题通用；条纹/发光/细线装饰由各主题 CSS 负责） */
  function initProgress() {
    var bar = document.getElementById('progress');
    function update() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, scrollY / max * 100) : 0) + '%';
    }
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* 点赞计数（彩带爆炸由 FX 绑定 [data-confetti]，两监听器共存） */
  function initLike() {
    var btn = document.getElementById('likeBtn'), n = 128;
    btn.addEventListener('click', function () {
      n++; btn.textContent = '👍 有帮助（' + n + '）';
    });
  }

  /* 留言板：localStorage 持久化，DOM 安全构建（不拼 HTML 字符串） */
  function initGuestbook() {
    var GB_KEY = 'blog-guestbook';
    var form = document.getElementById('gbForm');
    var nameInput = document.getElementById('gbName');
    var textInput = document.getElementById('gbText');
    var list = document.getElementById('gbList');
    var empty = document.getElementById('gbEmpty');

    function load() {
      try { var v = JSON.parse(localStorage.getItem(GB_KEY)); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    }
    function save(msgs) {
      try { localStorage.setItem(GB_KEY, JSON.stringify(msgs)); } catch (e) { /* 隐私模式下静默降级为仅展示 */ }
    }
    function makeCard(m) {
      var card = document.createElement('div');
      card.className = 'msg-card';
      var head = document.createElement('div'); head.className = 'msg-head';
      var name = document.createElement('strong'); name.textContent = m.name;
      var time = document.createElement('span'); time.textContent = m.time;
      head.appendChild(name); head.appendChild(time);
      var body = document.createElement('p'); body.textContent = m.text;
      card.appendChild(head); card.appendChild(body);
      return card;
    }
    function syncEmpty(msgs) { empty.style.display = msgs.length ? 'none' : ''; }
    function renderAll() {
      var msgs = load();
      list.textContent = '';
      msgs.slice().reverse().forEach(function (m) { list.appendChild(makeCard(m)); });
      syncEmpty(msgs);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = textInput.value.trim();
      if (!text) { textInput.focus(); return; }
      var msgs = load();
      msgs.push({
        name: nameInput.value.trim() || '匿名访客',
        text: text,
        time: new Date().toLocaleString('zh-CN', { hour12: false })
      });
      save(msgs);
      var card = makeCard(msgs[msgs.length - 1]);
      card.classList.add('msg-new');
      list.insertBefore(card, list.firstChild); /* 最新置顶 */
      syncEmpty(msgs);
      textInput.value = '';
    });
    renderAll();
  }

  /* 主题按钮状态 + 页脚提示 */
  function syncThemeUI() {
    var t = ThemeSwitch.current();
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.themeBtn === t);
      b.setAttribute('aria-pressed', String(b.dataset.themeBtn === t));
    });
    document.getElementById('themeTip').textContent = '当前风格：' + THEMES_META[t];
  }

  renderCards(); renderAboutTags();
  initProgress(); initLike(); initGuestbook();
  document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
    b.addEventListener('click', function (e) { ThemeSwitch.set(b.dataset.themeBtn, e.clientX, e.clientY); });
  });
  document.addEventListener('themechange', syncThemeUI);
  syncThemeUI();
  FX.init(ThemeSwitch.current());
})();
