/* fx-core.js —— 融合版特效引擎：全部特效常驻共存，主题切换只改配色
 * 契约：
 *   - FX.init(theme)：一次性启动所有特效（粒子/乱码/拖尾/3D 视差/彩带/打字机/滚动显现）
 *   - FX.applyTheme(theme)：仅更新当前主题（调色板、视差歪斜角度运行时读取），
 *     不销毁、不重启任何特效
 *   - 所有监听器/定时器/raf 注册进 FX.cleanups，仅在页面卸载语义下由 destroy 清理
 * 主题配色影响：粒子颜色、彩带配色；卡片 3D 视差只在 cyber 生效
 */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(pointer: fine)').matches;
  var isMobile = matchMedia('(max-width: 768px)').matches;

  /* 各主题特效调色板（运行时读取，切主题即时生效） */
  var PARTICLE_COLORS = {
    paper: { dot: '#35586F', line: '53,88,111' },
    cyber: { dot: '#00F0FF', line: '0,240,255' }
  };
  var CONFETTI_COLORS = {
    paper: ['#B23A2A', '#35586F', '#C49A3A', '#4F6F52', '#8A8175'],
    cyber: ['#00F0FF', '#A000FF', '#FF2EC4', '#4ADE80', '#EAF6FF']
  };

  var FX = {
    cleanups: [],
    theme: 'paper',
    applyTheme: function (theme) {
      FX.theme = theme;
      if (theme !== 'cyber') {
        document.querySelectorAll('.card').forEach(function (card) { card.style.transform = ''; });
      }
    }
  };

  function particlePal() { return PARTICLE_COLORS[FX.theme] || PARTICLE_COLORS.paper; }

  function on(t, ev, fn, opts) {
    t.addEventListener(ev, fn, opts);
    FX.cleanups.push(function () { t.removeEventListener(ev, fn, opts); });
  }

  /* Canvas 粒子网络（hero 背景，颜色随主题） */
  FX.particles = function (canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d'), W, H, rafId, running = true;
    function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
    resize(); on(window, 'resize', resize);
    var N = isMobile ? 30 : 60, pts = [], i;
    for (i = 0; i < N; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5 });
    var mouse = { x: -9999, y: -9999 };
    on(canvas.parentElement, 'mousemove', function (e) {
      var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var pal = particlePal();
      var paper = FX.theme === 'paper';
      var lineAlpha = paper ? .2 : .35, dotR = paper ? 1.5 : 1.8;
      var p, a, b, dd, ddx, ddy, dx, dy, d;
      for (i = 0; i < N; i++) {
        p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        dx = p.x - mouse.x; dy = p.y - mouse.y; d = Math.hypot(dx, dy);
        if (d < 80 && d > 0) { p.x += dx / d * 1.4; p.y += dy / d * 1.4; }
      }
      for (i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
        a = pts[i]; b = pts[j]; ddx = a.x - b.x; ddy = a.y - b.y; dd = ddx * ddx + ddy * ddy;
        if (dd < 12100) {
          ctx.strokeStyle = 'rgba(' + pal.line + ',' + (1 - dd / 12100) * lineAlpha + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = pal.dot;
      for (i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, dotR, 0, 7); ctx.fill(); }
      rafId = requestAnimationFrame(tick);
    }
    on(document, 'visibilitychange', function () {
      running = !document.hidden;
      if (running) { cancelAnimationFrame(rafId); tick(); }
    });
    FX.cleanups.push(function () { running = false; cancelAnimationFrame(rafId); ctx.clearRect(0, 0, W, H); });
    tick();
  };

  /* 文字乱码解密（首屏标题，页面加载时播放一次） */
  FX.scramble = function (el) {
    if (!el) return;
    var target = el.dataset.text || el.textContent; el.dataset.text = target;
    var chars = '!<>-_\\/[]{}=+*^?#01', frame = 0;
    /* 长标题也在一秒半内收敛，别让读者对着乱码等五秒 */
    var step = Math.max(1, Math.min(7, Math.round(70 / target.length)));
    var iv = setInterval(function () {
      var out = '', i;
      for (i = 0; i < target.length; i++) out += (frame / step > i) ? target[i] : chars[(Math.random() * chars.length) | 0];
      el.textContent = out; frame++;
      if (frame > target.length * step + 16) clearInterval(iv);
    }, 22);
    FX.cleanups.push(function () { clearInterval(iv); el.textContent = target; });
  };

  /* 光标拖尾（全站，颜色走 CSS 变量 --accent-2 自动随主题；仅精确指针设备） */
  FX.trail = function () {
    if (!finePointer) return;
    var dots = [], tx = innerWidth / 2, ty = innerHeight / 2, rafId, i;
    for (i = 0; i < 12; i++) {
      var d = document.createElement('div');
      d.className = 'fx-trail-dot';
      d.style.opacity = String(1 - i / 14);
      document.body.appendChild(d);
      dots.push({ el: d, x: tx, y: ty });
    }
    on(window, 'mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      var px = tx, py = ty;
      dots.forEach(function (d) {
        d.x += (px - d.x) * .35; d.y += (py - d.y) * .35;
        d.el.style.left = (d.x - 5) + 'px'; d.el.style.top = (d.y - 5) + 'px';
        px = d.x; py = d.y;
      });
      rafId = requestAnimationFrame(loop);
    })();
    FX.cleanups.push(function () { cancelAnimationFrame(rafId); dots.forEach(function (d) { d.el.remove(); }); });
  };

  /* 鼠标 3D 倾斜视差卡片（仅 cyber；paper 保持纸片的安静） */
  FX.tilt = function (cards) {
    if (!finePointer) return;
    cards.forEach(function (card) {
      function move(e) {
        if (FX.theme !== 'cyber') { card.style.transform = ''; return; }
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = 'perspective(700px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 10) + 'deg) translateY(-4px)';
      }
      function leave() { card.style.transform = ''; }
      on(card, 'mousemove', move); on(card, 'mouseleave', leave);
    });
    FX.cleanups.push(function () { cards.forEach(function (c) { c.style.transform = ''; }); });
  };

  /* 彩带喷发（绑定所有 [data-confetti] 元素；配色随当前主题） */
  FX.confetti = function (btn) {
    if (!btn) return;
    on(btn, 'click', function (e) {
      var colors = CONFETTI_COLORS[FX.theme] || CONFETTI_COLORS.paper;
      var cx = e.clientX || innerWidth / 2, cy = e.clientY || innerHeight / 2, i;
      for (i = 0; i < 28; i++) {
        var p = document.createElement('div');
        p.className = 'fx-confetti';
        p.style.background = colors[i % colors.length];
        p.style.left = cx + 'px'; p.style.top = cy + 'px';
        p.style.borderRadius = i % 2 ? '50%' : '2px';
        document.body.appendChild(p);
        var ang = Math.random() * Math.PI * 2, v = 70 + Math.random() * 110;
        p.animate([
          { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
          { transform: 'translate(' + (Math.cos(ang) * v - 50) + 'px,' + (Math.sin(ang) * v + 40) + 'px) rotate(' + (Math.random() * 540 - 270) + 'deg)', opacity: 0 }
        ], { duration: 750 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.4,1)' });
        setTimeout(function (el) { return function () { el.remove(); }; }(p), 1300);
      }
    });
  };

  /* 终端打字机（首屏副标题，持续循环） */
  FX.typewriter = function (el, lines) {
    if (!el || !lines || !lines.length) return;
    var original = el.textContent;
    var li = 0, ci = 0, mode = 'type', timer;
    function step() {
      var line = lines[li];
      if (mode === 'type') {
        ci++; el.textContent = line.slice(0, ci);
        if (ci >= line.length) { mode = 'hold'; timer = setTimeout(step, 1600); return; }
      } else if (mode === 'hold') { mode = 'erase'; }
      else if (mode === 'erase') {
        ci--; el.textContent = line.slice(0, ci);
        if (ci <= 0) { mode = 'type'; li = (li + 1) % lines.length; timer = setTimeout(step, 350); return; }
      }
      timer = setTimeout(step, mode === 'erase' ? 30 : 75);
    }
    step();
    FX.cleanups.push(function () { clearTimeout(timer); el.textContent = original; });
  };

  /* 滚动驱动内容显现（全站，IntersectionObserver） */
  FX.reveal = function () {
    var els = document.querySelectorAll('.reveal');
    if (reduced) { els.forEach(function (el) { el.classList.add('in-view'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
    FX.cleanups.push(function () { io.disconnect(); });
  };

  /* 启动全部特效（特效常驻，不随主题互斥） */
  FX.init = function (theme) {
    FX.destroy();
    FX.theme = theme;
    FX.reveal();
    if (reduced) return;
    FX.particles(document.getElementById('fx-canvas'));
    FX.scramble(document.getElementById('hero-title'));
    FX.trail();
    FX.tilt([].slice.call(document.querySelectorAll('.card')));
    [].slice.call(document.querySelectorAll('[data-confetti]')).forEach(FX.confetti);
    FX.typewriter(document.getElementById('hero-sub'), [
      '写 RAG 与 Agent 的工程手记，也做支付对账、AI 内容合规与可交互的前端实验。',
      '三个项目都做了可以在浏览器里直接操作的工程沙盘。',
      '尽量给出可复现的结论与数据，也把没做到的部分写清楚。'
    ]);
  };
  FX.destroy = function () { FX.cleanups.forEach(function (f) { f(); }); FX.cleanups = []; };
  window.FX = FX;
})();
