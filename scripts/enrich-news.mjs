import { translateHeadlines } from "./local-translate.mjs";

const MAINSTREAM = /daily star|bdnews24|dhaka tribune|financial express|business standard|prothom alo|new age|daily sun|unb|banglanews24/i;
const STATE_NEWS = /\bbss\b|bangladesh sangbad sangstha/i;
const DEVELOPMENT = /world bank|asian development bank|\badb\b|\baiib\b|ifc/i;
const OFFICIAL_URL = /(?:^|\.)gov\.bd$|(?:^|\.)bb\.org\.bd$|(?:^|\.)eprocure\.gov\.bd$/i;

const ORGANIZATIONS = [
  "Bangladesh Bank", "BPDB", "Power Division", "Petrobangla", "Bangladesh Railway",
  "Bangladesh Bridge Authority", "Roads and Highways Department", "Chattogram Port Authority",
  "Mongla Port Authority", "Bangladesh Investment Development Authority", "BIDA", "BPPA",
  "Asian Development Bank", "ADB", "World Bank", "AIIB", "IFC", "IMF",
];

const LOCATIONS = [
  ["Dhaka", "达卡"], ["Chattogram", "吉大港"], ["Chittagong", "吉大港"], ["Mongla", "蒙格拉"],
  ["Payra", "帕亚拉"], ["Cox's Bazar", "科克斯巴扎尔"], ["Sylhet", "锡尔赫特"],
  ["Khulna", "库尔纳"], ["Rajshahi", "拉杰沙希"], ["Barishal", "巴里萨尔"],
  ["Rangpur", "朗布尔"], ["Mymensingh", "迈门辛"], ["Bangladesh", "孟加拉国"],
];

const unique = (values) => [...new Set(values.filter(Boolean))];
const canonicalUrl = (url = "") => url.replace(/[?#].*$/, "").replace(/\/$/, "");

const ORGANIZATION_ZH = new Map([
  ["Bangladesh Bank", "孟加拉央行"], ["Power Division", "电力司"], ["Petrobangla", "孟加拉石油天然气公司"],
  ["Bangladesh Railway", "孟加拉铁路局"], ["Bangladesh Bridge Authority", "孟加拉桥梁管理局"],
  ["Chattogram Port Authority", "吉大港港务局"], ["Mongla Port Authority", "蒙格拉港务局"],
  ["Asian Development Bank", "亚洲开发银行"], ["World Bank", "世界银行"],
]);

function ruleChineseTitle(story) {
  const original = story.originalTitle || story.title;
  const facts = story.facts || ruleFacts(story);
  const organization = facts.organizations.find((name) => ORGANIZATION_ZH.has(name) || /^[A-Z][A-Z0-9-]{2,8}$/.test(name));
  const actor = organization ? (ORGANIZATION_ZH.get(organization) || organization) : "";
  const location = facts.locations.find((name) => name !== "孟加拉国");
  const place = location ? `${location}：` : "孟加拉国：";
  const topics = [
    ["电力", /power|electric|bpdb|বিদ্যুৎ/i], ["天然气", /natural gas|\bgas\b|lng|গ্যাস/i], ["能源", /energy|fuel|coal|জ্বালানি/i],
    ["银行金融", /bank|finance|forex|currency|ব্যাংক/i], ["通胀", /inflation/i], ["预算", /budget|বাজেট/i],
    ["铁路", /rail|রেল/i], ["公路", /road|highway|সড়ক/i], ["桥梁", /bridge|সেতু/i],
    ["港口", /port|বন্দর/i], ["航运船舶", /shipping|ship|maritime|জাহাজ/i], ["基础设施项目", /infrastructure|construction|project|অবকাঠামো/i],
    ["医疗卫生", /health|hospital|medical|medicine|স্বাস্থ্য|হাসপাতাল/i], ["教育", /education|school|university|student|শিক্ষা/i],
    ["政府政策", /government|cabinet|minister|policy/i], ["选举", /election|vote/i], ["贸易", /trade|export|import/i],
  ];
  const topic = topics.find(([, pattern]) => pattern.test(original))?.[0] || story.category;
  const actions = [
    ["获批", /\bapprov(?:e|ed|al)|cabinet nod/i], ["宣布新安排", /\bannounc(?:e|ed|ement)/i], ["启动新计划", /\blaunch(?:es|ed|ing)?|inaugurat/i],
    ["签署相关协议", /\bsign(?:s|ed|ing)?|agreement signed/i], ["计划推进", /\bplan(?:s|ned|ning)?|proposal/i], ["寻求支持或融资", /\bseek(?:s|ing)?|funding|financing|loan/i],
    ["发布招标采购动态", /tender|procurement|invitation for bid|\brfp\b/i], ["更新建设进展", /construction|implementation|work progress/i],
    ["出现上升变化", /\brise|rises|rose|increase|surge|hike/i], ["出现下降变化", /\bfall|falls|fell|decrease|decline|cut/i],
    ["发出风险警示", /\bwarn|warning|risk|crisis|shortage/i], ["举行会谈", /\bmeet|meeting|talks/i],
    ["出现抗议或争议", /protest|demonstration|dispute/i], ["恢复运行", /resume|reopen/i], ["暂停或延期", /suspend|delay|postpone/i],
  ];
  const action = actions.find(([, pattern]) => pattern.test(original))?.[0] || `${facts.projectStage || "相关领域"}出现新动态`;
  const amount = facts.amounts[0] ? `，涉及${facts.amounts[0]}` : "";
  return `${place}${actor ? `${actor}` : ""}${topic}${action}${amount}`.replace(/动态出现新动态/, "最新动态");
}

function hostname(url = "") {
  try { return new URL(url).hostname; } catch { return ""; }
}

function sourceAssessment(story) {
  const links = story.sourceLinks?.length ? story.sourceLinks : [{ name: story.source, url: story.url }];
  const hasOfficialDocument = Boolean(story.officialSource) || links.some((link) => OFFICIAL_URL.test(hostname(link.url)));
  const names = links.map((link) => link.name).join(" ");
  let tier = "其他公开来源";
  let score = 48;

  if (hasOfficialDocument) { tier = "政府/监管机构原文"; score = 88; }
  else if (DEVELOPMENT.test(names)) { tier = "国际发展机构"; score = 78; }
  else if (STATE_NEWS.test(names)) { tier = "国家通讯社"; score = 72; }
  else if (MAINSTREAM.test(names)) { tier = "主流媒体"; score = 64; }

  const reasons = [tier];
  if (story.sourceCount >= 2) {
    score += Math.min(14, (story.sourceCount - 1) * 7);
    reasons.push(`${story.sourceCount}个独立来源交叉报道`);
  } else {
    reasons.push("目前仅发现一个独立来源");
  }

  const ageHours = (Date.now() - new Date(story.publishedAt).getTime()) / 3600000;
  if (Number.isFinite(ageHours) && ageHours <= 24) { score += 4; reasons.push("24小时内发布"); }
  else if (Number.isFinite(ageHours) && ageHours > 168) { score -= 5; reasons.push("发布时间超过7天"); }
  if (/news\.google\.com/i.test(story.url || "")) { score -= 3; reasons.push("链接经新闻聚合平台转发"); }

  score = Math.max(25, Math.min(100, Math.round(score)));
  const confidence = hasOfficialDocument
    ? "官方确认"
    : story.sourceCount >= 2 && score >= 70
      ? "多源证实"
      : score >= 50
        ? "单源报道"
        : "有待核实";

  return { confidence, confidenceScore: score, confidenceReasons: reasons, sourceTier: tier, officialDocument: hasOfficialDocument };
}

function stageFrom(text) {
  const rules = [
    ["合同签署", /contract signed|sign(?:ed|ing) agreement|award(?:ed)? contract/i],
    ["招标采购", /tender|procurement|invitation for bid|request for proposal|\brfp\b/i],
    ["政府审批", /approved|approval|cabinet nod|\bdpp\b|ecnec/i],
    ["融资安排", /financing|funding|loan agreement|credit facility|investment proposal/i],
    ["建设实施", /construction|implementation|work progress|commissioning/i],
    ["规划可研", /feasibility|master plan|proposal|planned|planning/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || "媒体报道";
}

function ruleFacts(story) {
  const text = `${story.originalTitle || story.title} ${story.summary}`;
  const organizations = ORGANIZATIONS.filter((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  const acronyms = [...text.matchAll(/\b[A-Z][A-Z0-9-]{2,8}\b/g)].map((match) => match[0]).filter((value) => !["THE", "AND", "FOR", "WITH", "USD", "BDT", "EUR", "GBP", "LNG"].includes(value));
  const amounts = [...text.matchAll(/(?:Tk|BDT|USD|US\$|\$|৳)\s?[\d,.]+(?:\s?(?:million|billion|crore|lakh))?|[\d,.]+\s?(?:million|billion|crore|lakh)\s?(?:taka|dollars?|USD|BDT)/gi)].map((match) => match[0]);
  const dates = [...text.matchAll(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi)].map((match) => match[0]);
  const locations = LOCATIONS.filter(([english]) => new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)).map(([, chinese]) => chinese);
  return {
    organizations: unique([...organizations, ...acronyms]).slice(0, 8), people: [], locations: unique(locations).slice(0, 5),
    amounts: unique(amounts).slice(0, 5), dates: unique(dates).slice(0, 5), projectStage: stageFrom(text),
  };
}

async function previousByUrl() {
  if (process.env.SKIP_PREVIOUS === "1") return new Map();
  try {
    const response = await fetch("https://gjn0012-dot.github.io/bangladesh-daily-intel/data/news.json", { signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!response.ok) return new Map();
    const payload = await response.json();
    return new Map((payload.stories || []).filter((story) => story.aiEnhanced || story.machineTranslated).map((story) => [canonicalUrl(story.url), story]));
  } catch { return new Map(); }
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) if (content.type === "output_text" && content.text) return content.text;
  }
  return "";
}

async function aiEnrich(stories) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !stories.length) return { items: [], status: apiKey ? "无需新增摘要" : "未配置API密钥" };

  const schema = {
    type: "object", additionalProperties: false, required: ["items"], properties: {
      items: { type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["id", "chineseTitle", "chineseSummary", "organizations", "people", "locations", "amounts", "dates", "projectStage"],
        properties: {
          id: { type: "integer" }, chineseTitle: { type: "string" }, chineseSummary: { type: "string" },
          organizations: { type: "array", items: { type: "string" } }, people: { type: "array", items: { type: "string" } },
          locations: { type: "array", items: { type: "string" } }, amounts: { type: "array", items: { type: "string" } },
          dates: { type: "array", items: { type: "string" } }, projectStage: { type: "string" },
        },
      } },
    },
  };

  const input = stories.map((story) => ({ id: story.id, title: story.originalTitle || story.title, excerpt: story.summary, source: story.source, category: story.category }));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", signal: AbortSignal.timeout(90000),
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      instructions: "你是孟加拉国商业情报编辑。只根据输入标题、摘要和来源工作，不补充外部事实。将标题和摘要准确翻译并压缩为中文；摘要不超过160个汉字。提取明确出现的机构、人物、地点、金额、日期和项目阶段；未出现的信息返回空数组或‘未明确’。保留机构常用英文缩写。",
      input: JSON.stringify(input),
      text: { format: { type: "json_schema", name: "news_enrichment", strict: true, schema } },
      max_output_tokens: 12000,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const outputText = extractOutputText(data);
  if (!outputText) throw new Error("OpenAI API returned no output text");
  return { items: JSON.parse(outputText).items || [], status: "AI中文摘要已启用" };
}

export async function enrichStories(inputStories) {
  const previous = await previousByUrl();
  const stories = inputStories.map((story) => {
    const assessed = { ...story, ...sourceAssessment(story), facts: ruleFacts(story) };
    const cached = previous.get(canonicalUrl(story.url));
    if (!cached) return assessed;
    return {
      ...assessed, title: cached.title, originalTitle: cached.originalTitle || story.title,
      summary: cached.summary,
      aiEnhanced: Boolean(cached.aiEnhanced), machineTranslated: Boolean(cached.machineTranslated),
      facts: cached.facts || assessed.facts,
    };
  });

  const limit = Math.max(0, Number(process.env.AI_STORY_LIMIT || 20));
  const candidates = stories.filter((story) => !story.aiEnhanced).slice(0, limit);
  let aiStatus = process.env.OPENAI_API_KEY ? "AI处理中" : "未配置API密钥";
  try {
    const ai = await aiEnrich(candidates);
    aiStatus = ai.status;
    const byId = new Map(ai.items.map((item) => [item.id, item]));
    for (const story of stories) {
      const item = byId.get(story.id);
      if (!item) continue;
      story.originalTitle = story.title;
      story.title = item.chineseTitle || story.title;
      story.summary = item.chineseSummary || story.summary;
      story.aiEnhanced = true;
      story.facts = {
        organizations: unique([...story.facts.organizations, ...item.organizations]).slice(0, 8),
        people: unique(item.people).slice(0, 6), locations: unique([...story.facts.locations, ...item.locations]).slice(0, 6),
        amounts: unique([...story.facts.amounts, ...item.amounts]).slice(0, 6), dates: unique([...story.facts.dates, ...item.dates]).slice(0, 6),
        projectStage: item.projectStage && item.projectStage !== "未明确" ? item.projectStage : story.facts.projectStage,
      };
      story.stage = story.facts.projectStage;
    }
  } catch (error) {
    aiStatus = `AI暂时不可用：${error.message}`;
    console.warn(aiStatus);
  }
  const localTranslation = await translateHeadlines(stories);
  for (const story of stories) {
    if (story.aiEnhanced || story.machineTranslated) continue;
    story.originalTitle = story.originalTitle || story.title;
    story.title = ruleChineseTitle(story);
    story.ruleTranslated = true;
  }
  return {
    stories, aiStatus, aiModel: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || "gpt-5.6") : "",
    translationStatus: localTranslation.status,
  };
}
