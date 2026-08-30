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

  /* 点赞计数（彩带爆炸由 FX 绑定 [data-confetti]，两监听器共存）
   * 状态持久化：localStorage 存增量与已点赞标记，刷新不重置；同一浏览器仅计一次、可取消 */
  function initLike() {
    var btn = document.getElementById('likeBtn');
    var BASE = 128, KEY = 'blog-like';
    var st = { n: 0, liked: false };
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v.n === 'number' && typeof v.liked === 'boolean') st = { n: Math.max(0, v.n), liked: v.liked };
    } catch (e) { /* 隐私模式降级为仅当前会话 */ }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    function render() {
      btn.textContent = '👍 有帮助（' + (BASE + st.n) + '）' + (st.liked ? ' · 已助力' : '');
      btn.classList.toggle('liked', st.liked);
    }
    btn.addEventListener('click', function () {
      st.liked ? st.n-- : st.n++;
      st.liked = !st.liked;
      save();
      render();
    });
    render();
  }

  /* 本机速记板：localStorage 持久化 + 多层加固
   * 保护层：控制字符清洗 / 字段形状校验 / 长度截断 / 条数上限 / 提交节流 / 一键清空
   * 渲染一律用 textContent（不拼 HTML 字符串），从源头杜绝 XSS */
  function initGuestbook() {
    var GB_KEY = 'blog-guestbook';
    var MAX_MSGS = 50, MAX_NAME = 20, MAX_TEXT = 500, MIN_GAP = 5000;
    var form = document.getElementById('gbForm');
    if (!form) return;
    var nameInput = document.getElementById('gbName');
    var textInput = document.getElementById('gbText');
    var list = document.getElementById('gbList');
    var empty = document.getElementById('gbEmpty');
    var count = document.getElementById('gbCount');
    var clearBtn = document.getElementById('gbClear');
    var lastSubmit = 0;

    function clean(s) {
      /* 剔除 NUL/控制字符/零宽与双向文本标记（保留换行，供正文换行显示） */
      return String(s == null ? '' : s)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
        .trim();
    }
    function sanitize(m) {
      /* 只接受 {name,text,time} 且均为字符串的合法记录，防篡改存储写入垃圾数据 */
      if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
      var name = clean(m.name);
      var text = clean(m.text);
      if (!text) return null;
      return {
        name: name ? name.slice(0, MAX_NAME) : '匿名访客',
        text: text.slice(0, MAX_TEXT),
        time: typeof m.time === 'string' ? m.time.slice(0, 64) : ''
      };
    }
    function load() {
      try {
        var v = JSON.parse(localStorage.getItem(GB_KEY));
        if (!Array.isArray(v)) return [];
        return v.map(sanitize).filter(Boolean).slice(-MAX_MSGS);
      } catch (e) { return []; } /* 隐私模式或被篡改的 JSON → 视为空 */
    }
    function save(msgs) {
      try { localStorage.setItem(GB_KEY, JSON.stringify(msgs)); }
      catch (e) { /* 配额满或隐私模式：静默降级为仅本次会话可见 */ }
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
    function syncCount(msgs) { if (count) count.textContent = msgs.length + ' 条'; }
    function renderAll() {
      var msgs = load();
      list.textContent = '';
      msgs.slice().reverse().forEach(function (m) { list.appendChild(makeCard(m)); });
      syncEmpty(msgs); syncCount(msgs);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - lastSubmit < MIN_GAP) { textInput.focus(); return; } /* 节流：5 秒一条，防连点刷存储 */
      var text = clean(textInput.value);
      if (!text) { textInput.focus(); return; }
      lastSubmit = now;
      var msgs = load();
      msgs.push({
        name: clean(nameInput.value),
        text: text,
        time: new Date().toLocaleString('zh-CN', { hour12: false })
      });
      if (msgs.length > MAX_MSGS) msgs.splice(0, msgs.length - MAX_MSGS); /* 只保留最近 N 条 */
      save(msgs);
      var card = makeCard(msgs[msgs.length - 1]);
      card.classList.add('msg-new');
      list.insertBefore(card, list.firstChild); /* 最新置顶 */
      syncEmpty(msgs); syncCount(msgs);
      textInput.value = '';
    });
    if (clearBtn) clearBtn.addEventListener('click', function () {
      try { localStorage.removeItem(GB_KEY); } catch (e) {}
      renderAll();
    });
    renderAll();
  }

  /* Giscus 公共留言：GitHub Discussions 托管，所有访客共享，数据不落本机 */
  var GISCUS = {
    src: 'https://giscus.app/client.js',
    repo: 'Vanity-1/Vanity-1.github.io',
    repoId: 'R_kgDOUAvTBQ',
    category: 'General',
    categoryId: 'DIC_kwDOUAvTBc4DEH5u',
    mapping: 'pathname',
    strict: '0',
    reactions: '1',
    metadata: '0',
    inputPosition: 'bottom',
    lang: 'zh-CN'
  };

  function giscusThemeURL(t) {
    /* Giscus 把自定义主题 URL 注入 iframe <link>，必须是页面同源绝对地址 */
    return new URL('assets/css/giscus-' + t + '.css', location.href).href;
  }

  function initGiscus() {
    var host = document.getElementById('giscus');
    if (!host) return;
    var s = document.createElement('script');
    s.src = GISCUS.src;
    s.setAttribute('data-repo', GISCUS.repo);
    s.setAttribute('data-repo-id', GISCUS.repoId);
    s.setAttribute('data-category', GISCUS.category);
    s.setAttribute('data-category-id', GISCUS.categoryId);
    s.setAttribute('data-mapping', GISCUS.mapping);
    s.setAttribute('data-strict', GISCUS.strict);
    s.setAttribute('data-reactions-enabled', GISCUS.reactions);
    s.setAttribute('data-emit-metadata', GISCUS.metadata);
    s.setAttribute('data-input-position', GISCUS.inputPosition);
    s.setAttribute('data-theme', giscusThemeURL(ThemeSwitch.current()));
    s.setAttribute('data-lang', GISCUS.lang);
    s.setAttribute('data-loading', 'lazy');
    s.crossOrigin = 'anonymous';
    s.async = true;
    host.appendChild(s);
  }

  function syncGiscusTheme(t) {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: giscusThemeURL(t) } } }, 'https://giscus.app');
    } catch (e) {}
  }

  /* Giscus 出错（未装应用/未开 Discussions 等）时显示可操作的提示
   * 注意："Discussion not found" 是"该页还没有讨论"的正常空状态（giscus 官方如此分类），不视为错误 */
  function initGiscusHint() {
    addEventListener('message', function (ev) {
      if (ev.origin !== 'https://giscus.app') return;
      var d = ev.data;
      if (!d || typeof d !== 'object' || !d.giscus || typeof d.giscus.error !== 'string') return;
      if (d.giscus.error.indexOf('Discussion not found') > -1) return;
      var hint = document.getElementById('giscusHint');
      if (hint) hint.hidden = false;
    });
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
  initGiscus(); initGiscusHint();
  document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
    b.addEventListener('click', function (e) { ThemeSwitch.set(b.dataset.themeBtn, e.clientX, e.clientY); });
  });
  document.addEventListener('themechange', function () {
    syncThemeUI();
    syncGiscusTheme(ThemeSwitch.current());
  });
  syncThemeUI();
  FX.init(ThemeSwitch.current());
})();
