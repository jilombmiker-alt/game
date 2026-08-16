import Link from "next/link";

const documents = [
  {
    index: "01",
    title: "教师版产品需求文档 PRD v2.0",
    copy: "完整说明问题、目标用户、11 个故事、核心循环、自由输入、人物关系、永久事实、存档和九界正史继承。",
    meta: "15–20 页 · 当前线上事实",
    base: "/teacher/life-branch-prd-v2",
  },
  {
    index: "02",
    title: "100 分测评与发布标准 v2.0",
    copy: "八个评分维度、80 分合格线、P0 一票否决项、证据等级、人工叙事评分卡和发布结论。",
    meta: "100 分制 · Go / Conditional Go / Block",
    base: "/teacher/life-branch-evaluation-standard-v2",
  },
  {
    index: "03",
    title: "72 条结构化测评集 v2.0",
    copy: "覆盖公开访问、剧情因果、人物自主、自由输入、71 个结局、旧存档、九界继承、安全与可访问性。",
    meta: "72 条 · A / H / U 三级证据",
    base: "/teacher/life-branch-evaluation-set-v2",
  },
  {
    index: "04",
    title: "测试与验收报告 v2.0",
    copy: "记录当前版本自动测试、构建结果、人工检查、已知限制和最终发布判断，区分已经验证与待真实玩家验证。",
    meta: "证据报告 · 不隐藏限制",
    base: "/teacher/life-branch-test-report-v2",
    markdownOnly: true,
  },
  {
    index: "05",
    title: "教师 5–10 分钟快速体验路线",
    copy: "用最短时间依次看到故事库、跨族亲子冲突、九界通道仲裁、自由输入和跨世界继承。",
    meta: "课堂演示 · 建议顺序",
    base: "/teacher/teacher-quick-start-v2",
    markdownOnly: true,
  },
  {
    index: "06",
    title: "GitHub 项目说明与证据入口",
    copy: "查看项目定位、版本演进、目录结构、运行方式、测评入口和在线产品。",
    meta: "公开仓库 · README",
    external: "https://github.com/jilombmiker-alt/game",
  },
  {
    index: "07",
    title: "完整可编辑源码",
    copy: "下载与当前教师审阅版本一致的源码 ZIP，用于离线检查项目结构、故事数据、测试和文档生成脚本。",
    meta: "源码快照 · 不含依赖与构建缓存",
    external: "/teacher/life-branch-source-v2.zip",
    download: true,
  },
] as const;

const status = [
  { name: "小型世界 S01–S04", state: "已上线", detail: "72 幕 · 16 个自由输入 · 20 个结局" },
  { name: "中型世界 M01–M05", state: "已上线", detail: "228 幕 · 47 个自由输入 · 35 个结局" },
  { name: "大型世界 L01–L02", state: "已上线", detail: "200 幕 · 40 个自由输入 · 16 个结局" },
  { name: "九界正史继承", state: "已实现", detail: "九界 → L01 → L02，只读快照" },
  { name: "旧浏览器存档", state: "兼容", detail: "原路由、原键名与旧运行方式保留" },
  { name: "教师证据包", state: "v2.0", detail: "PRD · 标准 · 72 条测评集 · 测试报告" },
] as const;

export default function ProductDocsPage() {
  return (
    <main className="docs-page">
      <header className="docs-nav">
        <Link href="/" className="brand" aria-label="返回人生岔路故事库">
          <span className="brand-mark" aria-hidden="true"><i />0</span>
          <span><strong>人生岔路</strong><small>TEACHER REVIEW PACK</small></span>
        </Link>
        <Link href="/#large-worlds" className="ghost-button">进入在线试玩</Link>
      </header>

      <section className="docs-hero">
        <p className="eyebrow"><span /> PRODUCT · EVALUATION · EVIDENCE</p>
        <h1>不只展示故事，<br /><em>也展示怎样证明它成立。</em></h1>
        <p>这是《人生岔路》的教师审阅总入口。产品需求、评分标准、结构化测评集、测试结论和快速体验路线使用同一版本事实，可直接打开或下载。</p>
        <div className="docs-summary" aria-label="产品与证据摘要">
          <div><strong>11</strong><span>可玩故事</span></div>
          <div><strong>500</strong><span>互动幕数</span></div>
          <div><strong>71</strong><span>可达结局</span></div>
          <div><strong>72</strong><span>测评案例</span></div>
        </div>
      </section>

      <section className="docs-review-route" aria-labelledby="review-route-title">
        <p className="eyebrow"><span /> 5–10 MIN REVIEW</p>
        <div>
          <h2 id="review-route-title">老师可以先看产品，再看证据。</h2>
          <ol>
            <li><strong>1 分钟</strong><span>浏览首页，确认 4+5+2 的三级故事规模。</span></li>
            <li><strong>3 分钟</strong><span>进入 M04，观察跨族亲情和生态冲突如何同时成立。</span></li>
            <li><strong>3 分钟</strong><span>进入 L01，查看九界通道仲裁员、正史来源与动态旧角色。</span></li>
            <li><strong>2 分钟</strong><span>抽查测评集中的否定输入、永久事实和 L01→L02 继承。</span></li>
          </ol>
        </div>
      </section>

      <section className="docs-library" aria-labelledby="docs-title">
        <div className="docs-section-heading">
          <span>DOCUMENT SET · V2.0</span>
          <h2 id="docs-title">一套可以独立复核的作业材料。</h2>
          <p>三份核心文档同时提供 Markdown、Word 和 PDF。测试报告与快速路线保留 Markdown，方便老师直接在浏览器查阅。</p>
        </div>
        <div className="docs-grid">
          {documents.map((document) => (
            <article key={document.index}>
              <span>{document.index}</span>
              <h3>{document.title}</h3>
              <p>{document.copy}</p>
              <small>{document.meta}</small>
              {"external" in document ? (
                <a className="primary-button" href={document.external} target="_blank" rel="noreferrer" download={"download" in document && document.download ? true : undefined}>
                  {"download" in document && document.download ? "下载源码" : "打开 GitHub"} <span>{"download" in document && document.download ? "↓" : "↗"}</span>
                </a>
              ) : (
                <div className="docs-format-links" aria-label={`${document.title}文件格式`}>
                  <a href={`${document.base}.md`}>MD</a>
                  {!("markdownOnly" in document && document.markdownOnly) && <a href={`${document.base}.docx`}>DOCX</a>}
                  {!("markdownOnly" in document && document.markdownOnly) && <a href={`${document.base}.pdf`}>PDF</a>}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="docs-status" aria-labelledby="status-title">
        <div>
          <p className="eyebrow"><span /> DELIVERY MAP</p>
          <h2 id="status-title">需求、实现和验收使用同一套数字。</h2>
        </div>
        <div className="docs-status-list">
          {status.map((item) => (
            <article key={item.name}>
              <div><strong>{item.name}</strong><span>{item.detail}</span></div>
              <em>{item.state}</em>
            </article>
          ))}
        </div>
      </section>

      <footer className="docs-footer">
        <p>教师审阅版 v2.0 · 2026-08-17 · 人机协作项目</p>
        <Link href="/">直接进入在线试玩</Link>
      </footer>
    </main>
  );
}
