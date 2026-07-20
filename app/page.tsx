"use client";

import { useEffect, useMemo, useState } from "react";

type Confidence = "官方确认" | "多源证实" | "单源报道" | "有待核实";

type KeyFacts = {
  organizations: string[];
  people: string[];
  locations: string[];
  amounts: string[];
  dates: string[];
  projectStage: string;
};

type Story = {
  id: number;
  category: string;
  title: string;
  summary: string;
  impact: string;
  source: string;
  sourceCount: number;
  confidence: Confidence;
  level: "重大" | "重点" | "参考";
  time: string;
  location: string;
  stage: string;
  trackedProject?: string;
  tags: string[];
  url?: string;
  publishedAt?: string;
  sourceLinks?: { name: string; url: string }[];
  originalTitle?: string;
  aiEnhanced?: boolean;
  ruleTranslated?: boolean;
  machineTranslated?: boolean;
  confidenceScore?: number;
  confidenceReasons?: string[];
  sourceTier?: string;
  officialDocument?: boolean;
  facts?: KeyFacts;
};

type NewsPayload = {
  generatedAt: string;
  maxAgeDays?: number;
  sourceCount: number;
  successfulSources: number;
  officialSourceCount?: number;
  successfulOfficialSources?: number;
  failedSources: string[];
  aiStatus?: string;
  aiModel?: string;
  translationStatus?: string;
  stories: Story[];
};

const demoStories: Story[] = [
  {
    id: 1,
    category: "电力能源",
    title: "电力部门拟于下周召开重点发电企业付款安排协调会议",
    summary:
      "根据主管部门公开日程及两家主流媒体报道，会议将讨论发电企业应收账款和燃料供应保障。具体拨款规模尚未正式公布。",
    impact:
      "与电站现金流和燃料采购直接相关，建议持续跟踪财政部门拨款及BPDB后续通知。",
    source: "Power Division · The Daily Star",
    sourceCount: 3,
    confidence: "多源证实",
    level: "重大",
    time: "18分钟前",
    location: "达卡",
    stage: "政策协调",
    tags: ["BPDB", "电费回款", "燃料供应"],
  },
  {
    id: 2,
    category: "时政政府",
    title: "内阁会议审议多项基础设施项目实施进度",
    summary:
      "官方会议简报显示，政府要求有关部门加快重点项目审批和土地征收，并强化跨部门进度协调。项目完整名单有待发布。",
    impact:
      "可能影响在建交通项目的审批及预算调整，应关注后续正式会议纪要和责任部门安排。",
    source: "Cabinet Division",
    sourceCount: 1,
    confidence: "官方确认",
    level: "重点",
    time: "42分钟前",
    location: "达卡",
    stage: "政府审议",
    tags: ["内阁", "项目审批", "土地征收"],
  },
  {
    id: 3,
    category: "交通基建",
    title: "铁路部门更新年度采购计划，多项咨询服务进入准备阶段",
    summary:
      "公共采购平台出现新的年度采购计划，涉及线路升级、信号系统及工程咨询。部分项目仍处于预算和融资确认阶段。",
    impact:
      "属于前期市场机会，可提前核对业绩门槛、潜在合作方和融资机构采购规则。",
    source: "BPPA e-GP · Bangladesh Railway",
    sourceCount: 2,
    confidence: "官方确认",
    level: "重点",
    time: "1小时前",
    location: "全国",
    stage: "采购计划",
    tags: ["铁路", "咨询服务", "招标机会"],
  },
  {
    id: 4,
    category: "港口船舶",
    title: "港口扩建配套航道工程正在研究新的融资方案",
    summary:
      "一家财经媒体援引项目相关人士称，业主正在与多家融资机构讨论建设方案，目前尚未发现业主或融资机构的正式公告。",
    impact:
      "可作为市场线索跟踪，但在正式文件发布前不宜判断项目融资已经落实。",
    source: "The Financial Express",
    sourceCount: 1,
    confidence: "单源报道",
    level: "参考",
    time: "2小时前",
    location: "吉大港",
    stage: "融资研究",
    tags: ["港口", "航道", "融资"],
  },
  {
    id: 5,
    category: "宏观金融",
    title: "央行发布外汇业务新通知，进一步简化部分对外付款材料",
    summary:
      "孟加拉央行发布正式通知，对授权银行办理部分进口和服务付款的文件要求作出调整，具体适用范围需结合原文判断。",
    impact:
      "可能影响设备进口、服务费及项目公司付款流程，建议财务和银行团队核对通知原文。",
    source: "Bangladesh Bank",
    sourceCount: 1,
    confidence: "官方确认",
    level: "重大",
    time: "3小时前",
    location: "全国",
    stage: "正式发布",
    tags: ["外汇", "付款", "央行"],
  },
  {
    id: 6,
    category: "教育医疗",
    title: "卫生部门计划启动区域医院设备升级项目",
    summary:
      "政府通讯社报道卫生主管部门正在准备一批区域医院设备升级项目，预计将使用政府预算和发展伙伴融资。",
    impact:
      "医疗设备和医院工程存在潜在机会，下一步应关注DPP审批和采购公告。",
    source: "BSS · Ministry of Health",
    sourceCount: 2,
    confidence: "多源证实",
    level: "参考",
    time: "5小时前",
    location: "多地区",
    stage: "项目准备",
    tags: ["医院", "医疗设备", "发展融资"],
  },
];

const categories = [
  "全部",
  "重点项目",
  "时政政府",
  "政府会议",
  "招标采购",
  "宏观金融",
  "电力能源",
  "交通基建",
  "港口船舶",
  "教育医疗",
];

const projects = [
  { name: "帕亚拉电站" },
  { name: "达卡—阿苏利亚高架" },
  { name: "ADB铁路项目" },
  { name: "孟中新能源" },
  { name: "港口项目" },
  { name: "LNG与FSRU" },
];

const confidenceClass: Record<Confidence, string> = {
  官方确认: "verified official",
  多源证实: "verified multi",
  单源报道: "verified single",
  有待核实: "verified pending",
};

const sourceDirectory: Record<string, { type: string; url: string }> = {
  "Power Division": { type: "政府官方", url: "https://powerdivision.gov.bd/" },
  "The Daily Star": { type: "主流媒体", url: "https://www.thedailystar.net/" },
  "Cabinet Division": { type: "政府官方", url: "https://cabinet.gov.bd/" },
  "BPPA e-GP": { type: "政府采购", url: "https://www.eprocure.gov.bd/" },
  "Bangladesh Railway": { type: "政府官方", url: "https://railway.gov.bd/" },
  "The Financial Express": { type: "主流媒体", url: "https://thefinancialexpress.com.bd/" },
  "Bangladesh Bank": { type: "监管机构", url: "https://www.bb.org.bd/" },
  BSS: { type: "国家通讯社", url: "https://www.bssnews.net/" },
  "Ministry of Health": { type: "政府官方", url: "https://mohfw.gov.bd/" },
};

export default function Home() {
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Story | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [news, setNews] = useState<NewsPayload>({
    generatedAt: "",
    sourceCount: 0,
    successfulSources: 0,
    failedSources: [],
    aiStatus: "正在载入",
    aiModel: "",
    stories: demoStories,
  });

  const stories = news.stories.length ? news.stories : demoStories;

  useEffect(() => {
    const stored = window.localStorage.getItem("bd-intel-saved");
    if (stored) setSaved(JSON.parse(stored));
    if ("serviceWorker" in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => undefined);
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${basePath}/data/news.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload: NewsPayload) => {
        if (Array.isArray(payload.stories) && payload.stories.length) setNews(payload);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setShowSources(false);
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stories.filter((story) => {
      const categoryMatch = category === "全部" || (category === "重点项目" ? Boolean(story.trackedProject) : story.category === category);
      const savedMatch = !showSaved || saved.includes(story.id);
      const queryMatch =
        !needle ||
        `${story.title}${story.summary}${story.trackedProject || ""}${story.tags.join("")}`
          .toLowerCase()
          .includes(needle);
      return categoryMatch && savedMatch && queryMatch;
    });
  }, [category, query, saved, showSaved, stories]);

  const generatedLabel = news.generatedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Dhaka",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(news.generatedAt))
    : "正在载入";

  const todayLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const priorityStory = stories.find((story) => story.level === "重大") || stories[0];

  function toggleSaved(id: number) {
    const next = saved.includes(id)
      ? saved.filter((item) => item !== id)
      : [...saved, id];
    setSaved(next);
    window.localStorage.setItem("bd-intel-saved", JSON.stringify(next));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="孟加拉每日头条">
          <span className="brand-mark">孟</span>
          <span>
            <strong>孟加拉每日头条</strong>
            <small>BUSINESS INTELLIGENCE</small>
          </span>
        </div>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索政策、项目、机构或人物"
            aria-label="搜索新闻"
          />
          <kbd>⌘ K</kbd>
        </label>
      </header>

      <main className="page">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">{todayLabel} · 达卡</p>
            <h1>今日情报速览</h1>
            <p className="subhead">
              已接入 <b>{news.sourceCount || 8}</b> 个实时信息流，本次收录 <b>{stories.length}</b> 条信息
            </p>
          </div>
          <div className="update-status">
            <span className="live-dot" />
            <span>自动监测中<small>{generatedLabel} 更新</small></span>
            <button onClick={() => window.location.reload()}>刷新</button>
          </div>
        </section>

        {priorityStory && <section className="alert-card" aria-label="重点新闻">
          <div className="alert-icon">!</div>
          <div className="alert-copy">
            <p><span>重点关注</span> · {priorityStory.time}</p>
            <h2>{priorityStory.title}</h2>
            <p>{priorityStory.impact}</p>
          </div>
          <button onClick={() => setSelected(priorityStory)}>查看详情 <span>→</span></button>
        </section>}

        <div className="content-grid">
          <section className="feed">
            <div className="section-heading">
              <div>
                <span className="section-kicker">DAILY BRIEF</span>
                <h2>今日头条 <em>{filtered.length}</em></h2>
              </div>
              <button
                className={showSaved ? "text-button active" : "text-button"}
                onClick={() => setShowSaved(!showSaved)}
              >
                {showSaved ? "查看全部" : `我的关注 ${saved.length || ""}`}
              </button>
            </div>

            <div className="category-tabs" role="tablist" aria-label="新闻分类">
              {categories.map((item) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="story-list">
              {filtered.length ? (
                filtered.map((story, index) => (
                  <article
                    className={`story-card ${story.level === "重大" ? "critical" : ""}`}
                    key={story.id}
                  >
                    <div className="story-index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="story-body">
                      <div className="story-meta">
                        <span className="category-label">{story.category}</span>
                        <span>{story.time}</span>
                        <span>{story.location}</span>
                      </div>
                      <button className="story-title" onClick={() => setSelected(story)}>
                        {story.aiEnhanced && <span className="ai-label">AI中文</span>}
                        {!story.aiEnhanced && story.machineTranslated && <span className="ai-label local">机器翻译</span>}
                        {!story.aiEnhanced && story.ruleTranslated && <span className="ai-label rule">中文导读</span>}
                        {story.title}
                      </button>
                      {(story.aiEnhanced || story.machineTranslated || story.ruleTranslated) && story.originalTitle && (
                        <p className="original-headline">原文：{story.originalTitle}</p>
                      )}
                      <p className="story-summary">{story.summary}</p>
                      <div className="story-footer">
                        <div className="source-line">
                          <span className={confidenceClass[story.confidence]}>
                            {story.confidence}{story.confidenceScore ? ` · ${story.confidenceScore}分` : ""}
                          </span>
                          <span>{story.source}</span>
                          <span>{story.sourceCount}个来源</span>
                        </div>
                        <button
                          className={saved.includes(story.id) ? "save-button saved" : "save-button"}
                          onClick={() => toggleSaved(story.id)}
                          aria-label={saved.includes(story.id) ? "取消关注" : "加入关注"}
                        >
                          {saved.includes(story.id) ? "★ 已关注" : "☆ 关注"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>没有找到相关信息</h3>
                  <p>试试其他关键词或切换行业分类。</p>
                </div>
              )}
            </div>
          </section>

          <aside className="sidebar">
            <section className="side-card pulse-card">
              <div className="side-title">
                <span>情报脉搏</span><small>过去24小时</small>
              </div>
              <div className="metric-row">
                <div><b>{stories.length}</b><span>本次收录</span></div>
                <div><b>{stories.filter((item) => item.level !== "参考").length}</b><span>重点关注</span></div>
                <div><b>{new Set(stories.map((item) => item.category)).size}</b><span>覆盖行业</span></div>
              </div>
              <div className="mini-bars" aria-label="七日信息趋势">
                {[42, 54, 39, 68, 56, 76, 92].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="bar-labels"><span>7月9日</span><span>今日</span></div>
            </section>

            <section className="side-card">
              <div className="side-title">
                <span>重点项目动态</span><button>全部项目</button>
              </div>
              <div className="project-list">
                {projects.map((project, index) => (
                  <button key={project.name} onClick={() => { setCategory("重点项目"); setQuery(project.name); }}>
                    <span className={`project-badge c${index + 1}`}>{index + 1}</span>
                    <span><b>{project.name}</b><small>{stories.filter((story) => story.trackedProject === project.name).length}条相关信息</small></span>
                  </button>
                ))}
              </div>
            </section>

            <section className="side-card source-card">
              <div className="side-title"><span>消息源状态</span><small>{news.successfulSources}/{news.sourceCount || 8} 正常</small></div>
              <div className="source-stat"><span><i className="green" />自动更新</span><b>每小时</b></div>
              <div className="source-stat"><span><i className="blue" />新闻范围</span><b>近{news.maxAgeDays || 30}天</b></div>
              <div className="source-stat"><span><i className="green" />政府官方网站</span><b>{news.successfulOfficialSources || 0}/{news.officialSourceCount || 9}</b></div>
              <div className="source-stat"><span><i className="green" />中文新闻标题</span><b>{news.translationStatus?.includes("翻译") || stories.some((item) => item.machineTranslated) ? "本地模型" : "处理中"}</b></div>
              <div className="source-stat"><span><i className="green" />中文智能摘要</span><b>{news.aiStatus === "AI中文摘要已启用" || news.aiStatus === "无需新增摘要" ? "已启用" : "待配置"}</b></div>
              <div className="source-stat"><span><i className="blue" />主流媒体/RSS</span><b>{news.successfulSources || 0}</b></div>
              <div className="source-stat"><span><i className="gold" />读取异常</span><b>{news.failedSources.length}</b></div>
              <p className="demo-note">标题与摘要来自公开信息流，请点击原始信息源核对全文。</p>
            </section>
          </aside>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="手机导航">
        <button className="active"><span>⌂</span>头条</button>
        <button onClick={() => setCategory("交通基建")}><span>◇</span>机会</button>
        <button onClick={() => setShowSaved(true)}><span>☆</span>关注</button>
        <button><span>☰</span>更多</button>
      </nav>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="story-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label="关闭详情">×</button>
            <div className="modal-meta">
              <span className="category-label">{selected.category}</span>
              <span className={confidenceClass[selected.confidence]}>{selected.confidence}</span>
              {selected.confidenceScore && <span className="score-chip">可信度 {selected.confidenceScore}/100</span>}
              <span>{selected.time}</span>
            </div>
            <h2>{selected.title}</h2>
            {(selected.aiEnhanced || selected.machineTranslated || selected.ruleTranslated) && selected.originalTitle && <p className="modal-original">原文标题：{selected.originalTitle}</p>}
            <section><h3>发生了什么</h3><p>{selected.summary}</p></section>
            {selected.facts && (
              <section className="facts-box">
                <h3>关键事实</h3>
                <div className="facts-grid">
                  <div><span>涉及机构</span><b>{selected.facts.organizations.join("、") || "未明确"}</b></div>
                  <div><span>人物</span><b>{selected.facts.people.join("、") || "未明确"}</b></div>
                  <div><span>地点</span><b>{selected.facts.locations.join("、") || "未明确"}</b></div>
                  <div><span>金额</span><b>{selected.facts.amounts.join("、") || "未明确"}</b></div>
                  <div><span>日期</span><b>{selected.facts.dates.join("、") || "未明确"}</b></div>
                  <div><span>项目阶段</span><b>{selected.facts.projectStage || selected.stage}</b></div>
                </div>
              </section>
            )}
            <section className="impact-box"><h3>对业务的影响</h3><p>{selected.impact}</p></section>
            {selected.confidenceReasons?.length ? (
              <section className="confidence-box">
                <h3>可信度依据</h3>
                <p>{selected.confidenceReasons.join("；")}。评分仅供筛选参考，不替代对原始文件的核查。</p>
              </section>
            ) : null}
            <dl>
              <div><dt>项目阶段</dt><dd>{selected.stage}</dd></div>
              <div><dt>消息来源</dt><dd>{selected.source}</dd></div>
              <div><dt>交叉来源</dt><dd>{selected.sourceCount}个独立来源</dd></div>
            </dl>
            <div className="source-panel-wrap">
              <button className="source-toggle" onClick={() => setShowSources(!showSources)}>
                <span>↗</span>
                {showSources ? "收起原始信息源" : `查看原始信息源（${selected.sourceCount}）`}
                <em>{showSources ? "−" : "+"}</em>
              </button>
              {showSources && (
                <div className="source-panel">
                  <p className="source-panel-note">
                    以下链接直接指向本条新闻的原始页面；重要信息请结合官方文件进一步核实。
                  </p>
                  {(selected.sourceLinks?.length
                    ? selected.sourceLinks
                    : selected.source.split(" · ").map((name) => ({
                        name,
                        url: sourceDirectory[name]?.url || selected.url || "#",
                      }))).map((entry, index) => {
                    const details = sourceDirectory[entry.name];
                    return (
                      <a
                        key={`${entry.name}-${entry.url}`}
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-item"
                      >
                        <span className="source-number">{index + 1}</span>
                        <span>
                          <b>{entry.name}</b>
                          <small>{details?.type || "补充来源"} · 查看英文/孟加拉语原文</small>
                        </span>
                        <em>打开 ↗</em>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="tag-row">{selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => toggleSaved(selected.id)}>
                {saved.includes(selected.id) ? "★ 已加入关注" : "☆ 加入关注"}
              </button>
              <button className="primary" onClick={() => alert("已生成简要汇报（演示）")}>生成领导汇报</button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
