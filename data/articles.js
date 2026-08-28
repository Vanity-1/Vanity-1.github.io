/* 文章数据：通过 <script src> 挂载全局变量（file:// 下禁止 fetch）
 * 条目字段：id / title / date / readMin / tags / excerpt / body / href
 * body 为文章正文（HTML 片段）；href 为详情页链接，点击卡片时跳转 */
window.BLOG_ARTICLES = [
  {
    id: 'fusion-three-theme', title: '一个页面装下三种风格：三主题切换、特效共存与零构建部署',
    date: '2026-08-28', readMin: 10, tags: ['前端', '动效', 'View Transitions', '零构建'],
    href: 'articles/fusion-three-theme.html',
    excerpt: 'CSS 变量切主题、FX 引擎让特效常驻共存、View Transitions 做转场、不用 fetch 也能跑在 file:// 上——这套融合页的完整实现拆解。',
    body: `
      <p>你现在看到的这个页面，就是本文要讲的东西：<strong>三个主题的全部专属特效常驻共存</strong>，顶栏开关只切换视觉风格与特效配色，不销毁、不重启任何特效；主题切换用 View Transitions 做圆形扩散，特殊主题对还加了 glitch 强化；整站零构建、零依赖、零 fetch，双击 <code>index.html</code> 就能跑。这篇文章把这几块实现逐个拆开。</p>
      <h2 id="sec-why">一、起因：为什么要把三个主题揉进一个页面</h2>
      <p>通常做法是「一个主题 = 一套页面」：奇趣风一个站、赛博风一个站、极简风一个站，各有各的特效。问题随之而来——换个口味就要重新加载、重开特效，用户记忆里「这个站长什么样」也随之断裂。</p>
      <p>于是换一个思路：<strong>把三套风格当成皮肤，而不是三个站点</strong>。页面结构、正文、特效引擎全部共享，唯一变化的是配色、字体、卡片样式这些「视觉层」。这样切换主题变成一件很轻的事，代价是特效引擎必须做到与主题解耦。</p>
      <h2 id="sec-cssvar">二、主题系统：17 个 CSS 变量 + data-theme</h2>
      <p>主题的核心是 CSS 自定义属性。根元素挂 <code>data-theme</code>，三套主题各自声明同一组变量：</p>
      <pre><code data-lang="css">:root { color-scheme: light dark; }
html[data-theme='playful'] {
  --bg: #FFF7EE; --text: #3D2C29; --accent: #FF5C8A;
  --font-display: 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif;
  --radius: 20px; /* 糖果圆角 */
}
html[data-theme='cyber'] {
  --bg: #06060F; --text: #EAF6FF; --accent: #00F0FF;
  --font-display: 'JetBrains Mono', Consolas, monospace;
  --radius: 12px; /* 玻璃拟态 */
}
html[data-theme='editorial'] {
  --bg: #111113; --text: #F5F5F0; --accent: #C9A86A;
  --font-display: Georgia, 'Times New Roman', serif;
  --radius: 6px;  /* 极简直角 */
}</code></pre>
      <p>base.css 里的所有组件——卡片、按钮、进度条、导航——都只引用变量，不写死颜色。主题之间的差异除了变量，还有少量「装饰性规则」：playful 的进度条是糖果条纹动画、cyber 的卡片有毛玻璃和霓虹辉光、editorial 的卡片是直角细边框。这些规则体量很小，各自独立成 <code>theme-*.css</code>，互不污染。</p>
      <blockquote>关键约束：一个主题文件只做「这一套皮肤长什么样」，绝不掺入「哪些特效开哪些关」。特效有无属于引擎的职责，主题只负责配色。</blockquote>
      <h2 id="sec-fx">三、特效共存：FX 引擎与运行时调色板</h2>
      <p>特效共存是本页最难的一环。九个特效（粒子网络、乱码解密、光标拖尾、3D 视差、彩带、打字机、滚动显现、弹性卡片、条纹进度条）全部常驻，但它们读取的「颜色」来自一个<strong>运行时调色板</strong>，而不是写死：</p>
      <pre><code data-lang="js">var PARTICLE_COLORS = {
  cyber:     { dot: '#00F0FF', line: '0,240,255' },
  playful:   { dot: '#FF5C8A', line: '255,92,138' },
  editorial: { dot: '#C9A86A', line: '201,168,106' }
};
var CONFETTI_COLORS = { /* 三套主题各 5 色 */ };

var FX = { theme: 'playful', cleanups: [] };
FX.applyTheme = function (t) { FX.theme = t; }; // 只改状态，不碰特效

function particlePal() { return PARTICLE_COLORS[FX.theme]; }</code></pre>
      <p>粒子在每一帧都重新读 <code>particlePal()</code>，彩带在点击瞬间读 <code>CONFETTI_COLORS[FX.theme]</code>，拖尾则直接走 CSS 变量 <code>--accent-2</code> 自动变色。于是<strong>切主题 = 改一个状态值</strong>，下一帧/下一次点击自然用上新配色，没有「销毁旧特效、重建新特效」的抖动，也不会留下残留。</p>
      <p>另一个工程细节是统一的生命周期管理：所有监听器、定时器、<code>requestAnimationFrame</code> 都登记进 <code>FX.cleanups</code>，<code>FX.destroy()</code> 只在重新初始化时幂等清理一遍。页面隐藏时粒子动画暂停、恢复时重启，避免后台空转耗电。</p>
      <h2 id="sec-vt">四、切换动画：View Transitions 圆形扩散与 glitch 强化</h2>
      <p>主题切换的体验由 <code>startViewTransition</code> 承担。常规主题对用<strong>圆形扩散</strong>，从鼠标点击的位置展开：</p>
      <pre><code data-lang="css">::view-transition-new(root) {
  animation: vt-circle .55s cubic-bezier(.4, 0, .2, 1);
}
@keyframes vt-circle {
  from { clip-path: circle(0px at var(--vt-x) var(--vt-y)); }
  to   { clip-path: circle(150% at var(--vt-x) var(--vt-y)); }
}</code></pre>
      <p>但 cyber 与 editorial 两套主题底色、文字色都很接近，圆形遮罩几乎看不出变化。于是给这对主题单独安排<strong>两段式 glitch 过渡</strong>：第一段用 <code>clip-path: inset()</code> 把新快照切成横向条带逐帧抖动，缝隙里露出旧快照形成错位；第二段在过渡完成后叠加一个全屏闪光覆盖层（SVG 噪点 + 扫描线 + 方向色辉光）。覆盖层不依赖 View Transitions，<strong>不支持的浏览器直接切换 + 闪光</strong>，降级不降体验。</p>
      <h2 id="sec-file">五、file:// 零构建：数据不走 fetch</h2>
      <p>双击 <code>index.html</code> 用的是 <code>file://</code> 协议，而 <code>fetch</code> 在 file 协议下会被 CORS 拦死。方案是绕开网络层：文章数据以 <code>&lt;script src="data/articles.js"&gt;</code> 注入，页面加载时挂一个全局 <code>window.BLOG_ARTICLES</code>，渲染直接用。字体走 Google Fonts，失败时回退系统字体栈。整站没有任何构建步骤、没有打包器、没有 npm install，改一行数据刷新即生效。</p>
      <p>这带来一个真实收益：<strong>部署成本趋近于零</strong>。往 GitHub Pages 一推就是线上版，本地和线上完全同构，不存在「本地能跑线上挂」的构建差异。</p>
      <h2 id="sec-a11y">六、降级策略：动效的刹车与触屏的取舍</h2>
      <p>炫技的前提是不打扰。三处硬性降级：</p>
      <ul>
        <li><code>prefers-reduced-motion: reduce</code>：JS 层 <code>FX.init</code> 提前返回，只保留滚动显现直出；CSS 层动画时长归零。</li>
        <li><code>pointer: coarse</code>（触屏）：跳过光标拖尾与 3D 视差，其余特效正常。</li>
        <li>隐私模式：<code>localStorage</code> 写入失败时静默降级，留言板退化为仅展示，不报错不崩溃。</li>
      </ul>
      <p>留言板渲染全程 <code>createElement</code> + <code>textContent</code>，不拼接 HTML 字符串，天然免疫 XSS——访客输入永远不会变成可执行代码。</p>
      <h2 id="sec-sum">七、小结：这套方案适合什么</h2>
      <ul>
        <li>主题与特效解耦，新增一套皮肤只需写一组变量 + 少量装饰规则，引擎零改动。</li>
        <li>特效常驻换来的是切换零开销，代价是初始化的特效数量更多，需要 <code>visibilitychange</code> 等省电手段兜底。</li>
        <li>零构建适合内容型站点：数据即文件、部署即推送，维护心智极低。</li>
      </ul>
      <blockquote>做完这个页面的体会是：所谓「炫技」，真正值钱的是让炫技<strong>可被控制、可被关闭、可被降级</strong>。特效是一层皮肤，内容才是页面本身。</blockquote>`
  },
  {
    id: 'multiagent-pitfalls', title: '多源客服系统二开：从「静默失败」到「检索可靠」',
    date: '2026-08-20', readMin: 8, tags: ['RAG', 'Agent', '踩坑实录'],
    href: 'articles/pitfalls-multiagent-rag.html',
    excerpt: '嵌入模型不一致导致的静默检索失败、多源拼接被强源淹没、chroma 落盘丢段、ADK 旧 API 停产——5 个坑的一套解法。',
    body: `
      <p>这是一篇踩坑实录：二开一套多源客服系统时，遇到五个典型的「跑得通但结果不对」的隐性故障。嵌入模型不一致会让检索静默失败，多源拼接时强源会把弱源的高相关文档淹没，chroma 落盘偶发丢段，上游 ADK 旧 API 直接停产。</p>
      <p>每个坑都有对应的定位方法和解法，核心结论是：<strong>检索可靠性问题不能靠调 Prompt 掩盖，要回到数据与索引层面用可复现的实验验证</strong>。完整排查过程与代码见详情页。</p>`
  },
  {
    id: 'rrf-vs-plain', title: 'RRF 融合 vs 直接拼接：命中率 9/12 → 12/12 的可复现对比',
    date: '2026-08-12', readMin: 6, tags: ['RRF', '融合检索', '量化实验'],
    href: 'articles/rrf-vs-plain-experiment.html',
    excerpt: '商品目录(9288) 淹没政策(8) 时怎么办？用倒数排名融合把弱源高相关文档稳定提升到第 2 位。',
    body: `
      <p>商品目录 9288 条、政策文档只有 8 条，直接拼接检索结果时，弱源的高相关文档总是被强源挤到排名末尾。用倒数排名融合（RRF）替代直接拼接后，Top-3 命中率从 9/12 提升到 12/12。</p>
      <p>实验固定了评测集与随机种子，数据与脚本可复现。结论：<strong>多源融合时排序策略与召回策略同等重要，RRF 是简单又稳健的默认选择</strong>。</p>`
  },
  {
    id: 'nanoagent', title: '700 行手写一个 Agent 框架：NanoAgent 的原理',
    date: '2026-08-05', readMin: 10, tags: ['Agent', '源码', '框架解析'],
    href: 'articles/700-lines-agent-nanoagent.html',
    excerpt: '一个成熟 Agent 的核心只有三件事：把函数变工具、reAct 主循环、可靠记进上下文。700 行如何自洽实现？',
    body: `
      <p>一个成熟 Agent 的核心只有三件事：<strong>把函数变成 LLM 能调用的工具、让模型在「思考→调工具→看结果」的循环里反复迭代、把每一步可靠地记进上下文</strong>。这三件事完全可以在 700 行 Python 内自洽实现。</p>
      <p>NanoAgent 把框架拆成 6 个职责单一的文件：Agent（描述）、Tool（工具 + 自动生成 JSON Schema）、Runner（reAct 主循环）、Context（消息历史）、Model（抽象 + 流式）、MCPToolGroup（接入 MCP 生态）。手写一遍，再翻任何框架文档都快很多——它们其实是同一件事的不同封装。</p>`
  },
  {
    id: 'clipmind', title: '把收藏视频变成可对话知识库：ClipMind 拆解',
    date: '2026-07-28', readMin: 9, tags: ['ASR', 'RAG', '工程实战'],
    href: 'articles/clipmind-video-knowledge-base.html',
    excerpt: 'B站/抖音收藏夹同步、ASR 转写、向量入库、RAG 问答追溯来源——一个本地优先视频知识库的工程取舍。',
    body: `
      <p>把收藏的视频变成可以对话的知识库：B 站/抖音收藏夹自动同步、ASR 语音转写、ChromaDB 向量入库、RAG 问答并追溯来源。ClipMind 是本地优先的架构，数据不出机。</p>
      <p>文章重点拆解工程取舍：转写质量与成本的平衡、长视频分段的边界如何定、云端与本地双模式如何切换。</p>`
  },
  {
    id: 'inference-gateway', title: '本地推理网关：给 ollama 加一层路由 + 缓存 + 校验',
    date: '2026-07-20', readMin: 8, tags: ['推理网关', '缓存', '工程实战'],
    href: 'articles/inference-gateway.html',
    excerpt: '多模型路由、提示缓存、结构化输出校验与回退——三个问题一次收口，缓存命中延迟从 208ms 降到 0.04ms。',
    body: `
      <p>在 ollama 之上加一层网关，一次收口三个问题：多模型路由与健康降级、响应缓存与 KV 前缀复用、结构化输出的校验重试回退。缓存命中时延迟从 208ms 降到 0.04ms。</p>
      <p>配套 41 个单测与一键基准脚本，让「网关有没有变慢」有数字可查。</p>`
  },
  {
    id: 'edu-db-gateway', title: '给业务库加一道只读网关：不写一条数据，也能放心交给 Agent 查',
    date: '2026-07-12', readMin: 7, tags: ['MCP', '数据安全', '工程实战'],
    href: 'articles/edu-db-readonly-gateway.html',
    excerpt: '词法校验 + 参数绑定 + 强制 LIMIT + mode=ro 四层纵深防御；Token 鉴权与审计留痕，让 Agent 安全查库。',
    body: `
      <p>把业务数据库交给 Agent 查询，最怕的是它写坏数据。这套只读网关用四层纵深防御收口风险：SQL 词法校验、参数绑定、强制 LIMIT、连接层 mode=ro，配合 Token 鉴权与审计留痕。</p>
      <p>不写一条数据，也能放心地把查询能力开放给 Agent。</p>`
  },
  {
    id: 'eval-first-rag', title: '检索评测优先的 RAG：别急着调优，先搞清检索到底行不行',
    date: '2026-07-03', readMin: 8, tags: ['RAG', '检索评测', '量化实验'],
    href: 'articles/eval-first-rag.html',
    excerpt: '517 条固定评测集 + 多策略对比 + 失败归因 + 忠实性校验，一次运行量化"检索行不行、差在哪、融合救不回什么"。',
    body: `
      <p>调优之前先回答三个问题：检索到底行不行、差在哪、融合救不回什么。这套评测体系用 517 条固定评测集、多策略对比、失败归因与忠实性校验，把答案变成数字。</p>
      <p>零依赖、seed=42 可复现，一次运行产出可对外的量化结论。</p>`
  },
  {
    id: 'markitdown-xlsx', title: '给 MarkItDown 补上 Excel 格式保留：一次 opt-in 配置的开源贡献',
    date: '2026-06-25', readMin: 8, tags: ['Excel', '文档转换', '开源贡献'],
    href: 'articles/markitdown-xlsx-formatting.html',
    excerpt: '$1,199.00 转出来只剩 1199？根因是 pandas 只读值不读格式。用 XlsxConfig 动态提取货币符号，默认行为完全向后兼容。',
    body: `
      <p>$1,199.00 转成 Markdown 只剩 1199——根因是转换链路用 pandas 只读值、不读格式。为微软 MarkItDown（60k+ star）补上 <code>XlsxConfig</code> 的 opt-in 格式保留：用 openpyxl 读取单元格格式元数据，动态还原货币符号、百分比与日期。</p>
      <p>默认行为完全向后兼容，8 个测试无回归，PR #2347 已提交上游。</p>`
  },
  {
    id: 'litellm-mor', title: '给 LiteLLM 加一个多目标路由策略：四维加权评分怎么设计',
    date: '2026-06-18', readMin: 9, tags: ['LLM 网关', '路由策略', '开源贡献'],
    href: 'articles/litellm-multi-objective-routing.html',
    excerpt: '官方策略都是单一目标。用延迟、成本、成功率、吞吐量四维加权评分，Min-Max 归一化 + 冷启动 + 限额过滤，18 个单测锁行为。',
    body: `
      <p>LiteLLM 官方路由策略都是单一目标（最快、最省、最稳）。这套多目标策略把<strong>延迟、成本、成功率、吞吐量</strong>四维加权评分，配 Min-Max 归一化、冷启动保护与限额过滤，18 个单测锁住行为。</p>
      <p>实现位于 fork 分支 <code>feat/multi-objective-routing</code>，共 451 行策略代码。</p>`
  }
];
