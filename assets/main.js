/* RAG · Agent 工程手记 — 站点交互 */
(function(){
  "use strict";

  /* ---------- 滚动渐入（no-JS 兜底完全可见） ---------- */
  document.documentElement.classList.add('js');
  const revealEls=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    revealEls.forEach(el=>el.classList.add('js-hide'));
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>{ if(e.isIntersecting){ const el=e.target; el.classList.add('in'); el.classList.remove('js-hide'); io.unobserve(el);} });
    },{threshold:.12});
    revealEls.forEach(el=>io.observe(el));
  }else revealEls.forEach(el=>el.classList.add('in'));

  /* ---------- 数字滚动 ---------- */
  const counters=document.querySelectorAll('[data-count]');
  if('IntersectionObserver' in window && counters.length){
    const io=new IntersectionObserver(es=>{
      es.forEach(e=>{
        if(!e.isIntersecting) return; io.unobserve(e.target);
        const el=e.target, target=+el.getAttribute('data-count'),
              dec=el.getAttribute('data-dec')!=null?+el.getAttribute('data-dec'):null,
              dur=1350, t0=performance.now();
        (function tick(t){
          const p=Math.min((t-t0)/dur,1), ease=1-Math.pow(1-p,3), v=target*ease;
          el.textContent=dec!=null?v.toFixed(dec):v.toLocaleString('en-US');
          if(p<1) requestAnimationFrame(tick);
        })(t0);
      });
    },{threshold:.5});
    counters.forEach(el=>io.observe(el));
  }

  /* ---------- 阅读进度 + 返回顶部 ---------- */
  const prog=document.getElementById('progress'), topBtn=document.getElementById('topBtn');
  function onScroll(){
    if(prog){ const h=document.documentElement.scrollHeight-innerHeight; prog.style.width=(h>0?(scrollY/h*100):0)+'%'; }
    if(topBtn) topBtn.classList.toggle('show',scrollY>320);
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(topBtn) topBtn.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

  /* ---------- 轻量代码高亮 ---------- */
  const KW=new Set(['def','class','return','import','from','if','else','elif','for','while',
    'in','not','and','or','None','True','False','with','as','try','except','lambda','async','await','yield','self']);
  document.querySelectorAll('pre code').forEach(blk=>{
    if(blk.dataset.hl) return;
    const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tokens=[];
    const out=esc(blk.textContent)
      .replace(/(#[^\n]*|"[^"]*"|'[^']*')/g,m=>{
        const cls=/^[\"'']/.test(m)?'s':'c';
        tokens.push('<span class="'+cls+'">'+m+'</span>');
        return '\u2400';
      })
      .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g,'<span class="f">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="n">$1</span>')
      .replace(/\b\w+\b/g,m=>KW.has(m)?'<span class="k">'+m+'</span>':m);
    let i=0;
    blk.innerHTML=out.replace(/\u2400/g,()=>tokens[i++]||'');
    blk.dataset.hl='1';
  });

  /* ---------- TOC 平滑滚动 ---------- */
  document.querySelectorAll('.toc a').forEach(a=>{
    a.addEventListener('click',e=>{
      const id=a.getAttribute('href');
      if(id&&id.startsWith('#')){
        e.preventDefault();
        const el=document.querySelector(id);
        if(el) scrollTo({top:el.getBoundingClientRect().top+scrollY-90,behavior:'smooth'});
      }
    });
  });

  /* ---------- 数据条形动画 ---------- */
  document.querySelectorAll('[data-bar]').forEach(b=>{
    const tick=setInterval(()=>{
      const r=b.getBoundingClientRect();
      if(r.top<innerHeight*.92){ clearInterval(tick); b.style.width=b.getAttribute('data-bar'); }
    },120);
  });
})();