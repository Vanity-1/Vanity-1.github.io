/* 文章数据：通过 <script src> 挂载全局变量（file:// 下禁止 fetch）
 * 条目字段：id / title / date / readMin / tags / excerpt / body / href
 * body 为文章正文（HTML 片段）；href 为详情页链接，点击卡片时跳转 */
window.BLOG_ARTICLES = [
  {
    id: 'ai-gateway', title: '给 AI 的 SQL 加一道安检门：预算、护栏与可审计的网关',
    date: '2026-10-24', readMin: 12, tags: ['AI 治理', 'Text-to-SQL', 'FastAPI', '安全'],
    href: 'articles/ai-gateway.html',
    excerpt: '同一个网关管两件事：钱和 SQL 安全。预算桶挡住 key 泄露后的账单，AST 重新生成挡住模型夹带的语句，行级权限和列级掩码落在执行路径上。文末给出 466 条测试与未上线边界。',
    body: ''
  },
  {
    id: 'recon-engine', title: '对账引擎为什么先配对、后比金额：分层确定性匹配的工程实现',
    date: '2026-10-24', readMin: 11, tags: ['支付系统', '对账', '算法', 'Python'],
    href: 'articles/recon-engine.html',
    excerpt: '先比金额会把一笔金额不符拆成两条单边差异，误报翻倍。L1/L2/L3 分层、双向唯一、差异归因和注入 200 条已知差错的回归，一起拆开讲。',
    body: ''
  },
  {
    id: 'aigc-label', title: '给 AI 生成内容打上可核验的来源标签：AIGC 七字段与哈希链台账',
    date: '2026-10-24', readMin: 10, tags: ['AIGC', '合规', '哈希链', '数字水印'],
    href: 'articles/aigc-label.html',
    excerpt: '往 PNG 的 iTXt 块写七字段、立刻读回核验，再用只追加哈希链记录每次落标与核验。文件内证明“谁生成的”，文件外证明“记录有没有被动过”。',
    body: ''
  },
  {
    id: 'fusion-three-theme', title: '一个页面两种气质：纸面与夜间终端的双主题实现',
    date: '2026-10-24', readMin: 9, tags: ['前端', '设计系统', 'View Transitions', '零构建'],
    href: 'articles/fusion-three-theme.html',
    excerpt: '从三套主题收敛到两套：纸面负责长文阅读，夜间终端负责实验与动效。CSS 变量、FX 调色板、非对称转场与零构建部署的完整拆解。',
    body: `
      <p>你现在看到的这个页面，就是本文要讲的东西：<strong>两套主题共用一套特效引擎</strong>，顶栏开关只切换视觉风格与特效配色，不销毁、不重启任何特效；从纸面切到夜间终端时用 glitch 强化情绪，从夜间回到纸面时用圆形扩散收束。整站零构建、零依赖、零 fetch，双击 <code>index.html</code> 就能跑。</p>
      <h2 id="sec-why">一、先做减法：为什么从三套收敛到两套</h2>
      <p>这个站最早有三套主题：粉色的奇趣风、霓虹的赛博风、暗金的编辑风。它们各自都能跑，但放在一起时，问题不是“不够多”，而是<strong>角色重叠</strong>：赛博和编辑都是暗色，编辑风想负责长文，赛博风也能读；奇趣风适合展示，却会把工程文章的气质带偏。</p>
      <p>于是按用途收敛成两套：<strong>纸面（paper）</strong>负责阅读与专业感，暖纸底、墨色正文、衬线标题、朱红书脊；<strong>夜间终端（cyber）</strong>负责实验与动效，深蓝黑、青色霓虹、等宽标签。一个安静，一个外放；一个白天读长文，一个晚上点沙盘。</p>
      <blockquote>主题数量不是卖点，主题分工才是。两套皮肤各有一个明确职责，用户不需要先理解三种风格再决定看哪篇文章。</blockquote>
      <h2 id="sec-cssvar">二、主题系统：一组 CSS 变量 + data-theme</h2>
      <p>主题的核心是 CSS 自定义属性。根元素挂 <code>data-theme</code>，两套主题各自声明同一组变量：</p>
      <pre><code data-lang="css">:root { color-scheme: light dark; }
html[data-theme='paper'] {
  --bg: #F5F0E6; --text: #1B1814; --accent: #B23A2A;
  --font-display: 'Newsreader', 'Songti SC', Georgia, serif;
  --radius: 4px; /* 纸片 */
}
html[data-theme='cyber'] {
  --bg: #06060F; --text: #EAF6FF; --accent: #00F0FF;
  --font-display: 'JetBrains Mono', Consolas, monospace;
  --radius: 12px; /* 玻璃与霓虹 */
}</code></pre>
      <p>base.css 里的组件——卡片、按钮、进度条、导航——都只引用变量，不写死颜色。主题之间的差异除了变量，还有少量「装饰性规则」：paper 用纸纹、朱红书脊和细线进度条，cyber 用毛玻璃、霓虹辉光和等宽标签。这些规则各自独立成 <code>theme-*.css</code>，互不污染。</p>
      <blockquote>关键约束：一个主题文件只做「这一套皮肤长什么样」，绝不掺入「哪些特效开哪些关」。特效有无属于引擎的职责，主题只负责配色。</blockquote>
      <h2 id="sec-fx">三、特效共存：FX 引擎与运行时调色板</h2>
      <p>特效不是按主题各写一套，而是共用一套引擎：粒子网络、乱码解密、光标拖尾、3D 视差、彩带、打字机、滚动显现、卡片悬停、进度条。它们读取的「颜色」来自一个<strong>运行时调色板</strong>，而不是写死：</p>
      <pre><code data-lang="js">var PARTICLE_COLORS = {
  paper: { dot: '#35586F', line: '53,88,111' },
  cyber: { dot: '#00F0FF', line: '0,240,255' }
};
var CONFETTI_COLORS = { /* 两套主题各 5 色 */ };

var FX = { theme: 'paper', cleanups: [] };
FX.applyTheme = function (t) {
  FX.theme = t;
  if (t !== 'cyber') {
    document.querySelectorAll('.card').forEach(function (c) { c.style.transform = ''; });
  }
};</code></pre>
      <p>粒子在每一帧都重新读调色板，彩带在点击瞬间读当前主题，拖尾直接走 CSS 变量 <code>--accent-2</code> 自动变色。于是<strong>切主题 = 改一个状态值</strong>，下一帧/下一次点击自然用上新配色，没有「销毁旧特效、重建新特效」的抖动，也不会留下残留。</p>
      <p>两套皮肤的性格差异也落在动效上：paper 下卡片不做 3D 倾斜，保留纸片的稳定；切到 cyber 后视差自动生效。生命周期仍然统一登记进 <code>FX.cleanups</code>，<code>FX.destroy()</code> 幂等清理；页面隐藏时粒子暂停，恢复时重启。</p>
      <h2 id="sec-vt">四、非对称转场：进入夜间用 glitch，回到纸面用圆形</h2>
      <p>主题切换由 <code>startViewTransition</code> 承担。两套主题的性格不同，转场也不对称：<strong>从纸面进入夜间终端</strong>时用两段式 glitch，先切片抖动，再叠一层噪点与扫描线闪光；<strong>从夜间回到纸面</strong>时用圆形扩散，从点击位置安静地展开新的纸面。</p>
      <pre><code data-lang="css">::view-transition-new(root) {
  animation: vt-circle .55s cubic-bezier(.4, 0, .2, 1);
}
@keyframes vt-circle {
  from { clip-path: circle(0px at var(--vt-x) var(--vt-y)); }
  to   { clip-path: circle(150% at var(--vt-x) var(--vt-y)); }
}</code></pre>
      <p>glitch 的闪烁覆盖层不依赖 View Transitions：不支持的浏览器直接切换 + 闪光，降级不降体验。反过来，回纸面时不闪，符合“夜里醒来不要被屏幕再闪一下”的直觉。</p>
      <h2 id="sec-file">五、file:// 零构建：数据不走 fetch</h2>
      <p>双击 <code>index.html</code> 用的是 <code>file://</code> 协议，而 <code>fetch</code> 在 file 协议下会被 CORS 拦死。方案是绕开网络层：文章数据以 <code>&lt;script src="data/articles.js"&gt;</code> 注入，页面加载时挂一个全局 <code>window.BLOG_ARTICLES</code>，渲染直接用。字体走 Google Fonts，失败时回退系统字体栈。整站没有构建步骤、没有打包器、没有 npm install。</p>
      <p>这带来一个真实收益：<strong>部署成本趋近于零</strong>。往 GitHub Pages 一推就是线上版，本地和线上完全同构，不存在「本地能跑线上挂」的构建差异。</p>
      <h2 id="sec-a11y">六、降级策略：动效的刹车与触屏的取舍</h2>
      <p>炫技的前提是不打扰。三处硬性降级：</p>
      <ul>
        <li><code>prefers-reduced-motion: reduce</code>：JS 层 <code>FX.init</code> 提前返回，只保留滚动显现直出；CSS 层动画时长归零。</li>
        <li><code>pointer: coarse</code>（触屏）：跳过光标拖尾与 3D 视差，其余特效正常。</li>
        <li>隐私模式：<code>localStorage</code> 写入失败时静默降级，留言板退化为仅展示，不报错不崩溃。</li>
      </ul>
      <p>留言板渲染全程 <code>createElement</code> + <code>textContent</code>，不拼接 HTML 字符串，天然免疫 XSS——访客输入永远不会变成可执行代码。</p>
      <h2 id="sec-sum">七、小结：两套皮肤已经够用</h2>
      <ul>
        <li>主题与特效解耦，新增或替换一套皮肤只需一组变量 + 少量装饰规则，引擎零改动。</li>
        <li>纸面与夜间终端分工明确：一个负责读，一个负责玩，切换有情绪但不打断内容。</li>
        <li>零构建适合内容型站点：数据即文件、部署即推送，维护心智极低。</li>
      </ul>
      <blockquote>做完这次收敛的体会是：所谓「炫技」，真正值钱的是让炫技<strong>可被控制、可被关闭、可被降级</strong>。特效是一层皮肤，内容才是页面本身。</blockquote>`
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
