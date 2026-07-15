import { mkdir, writeFile } from "node:fs/promises";
import { enrichStories } from "./enrich-news.mjs";

const MAX_AGE_DAYS = Math.max(1, Number(process.env.NEWS_MAX_AGE_DAYS || 30));
const MAX_STORIES = Math.max(20, Number(process.env.NEWS_MAX_STORIES || 80));
const cutoffTime = Date.now() - MAX_AGE_DAYS * 86400000;
const futureTolerance = Date.now() + 36 * 3600000;

const googleFeed = (query) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:${MAX_AGE_DAYS}d`)}&hl=en&gl=BD&ceid=BD:en`;

const feeds = [
  { name: "The Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml" },
  { name: "bdnews24.com", url: "https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true" },
  { name: "Banglanews24", url: "https://www.banglanews24.com/rss/rss.xml" },
  { name: "The Business Standard · 孟加拉", url: "https://www.tbsnews.net/bangladesh/rss.xml" },
  { name: "The Business Standard · 时政", url: "https://www.tbsnews.net/bangladesh/politics/rss.xml" },
  { name: "The Business Standard · 能源", url: "https://www.tbsnews.net/bangladesh/energy/rss.xml" },
  { name: "The Business Standard · 基建", url: "https://www.tbsnews.net/bangladesh/infrastructure/rss.xml" },
  { name: "The Business Standard · 经济", url: "https://www.tbsnews.net/economy/rss.xml" },
  { name: "Google News · 时政", url: googleFeed("Bangladesh government politics cabinet policy") },
  { name: "Google News · 宏观金融", url: googleFeed("Bangladesh economy bank finance budget tax currency trade") },
  { name: "Google News · 能源", url: googleFeed("Bangladesh power energy electricity gas LNG mining") },
  { name: "Google News · 基建", url: googleFeed("Bangladesh infrastructure railway road bridge airport project tender") },
  { name: "Google News · 港航", url: googleFeed("Bangladesh port shipping shipbuilding maritime Chattogram") },
  { name: "Google News · 教育医疗", url: googleFeed("Bangladesh education health hospital medicine government") },
  { name: "Google News · 通讯社与主流媒体", url: googleFeed("Bangladesh (site:bssnews.net OR site:unb.com.bd OR site:dhakatribune.com)") },
  { name: "Google News · 商业媒体", url: googleFeed("Bangladesh (site:tbsnews.net OR site:thefinancialexpress.com.bd OR site:businesspostbd.com)") },
  { name: "Google News · 政府采购与审批", url: googleFeed("Bangladesh government tender procurement ECNEC BPPA Power Division Bangladesh Bank") },
  { name: "Google News · 国际发展机构", url: googleFeed("Bangladesh (ADB OR World Bank OR AIIB OR IFC OR IMF) project loan investment") },
];

const categoryRules = [
  ["电力能源", /power|electric|energy|solar|gas|lng|fuel|coal|mining|bpdb|বিদ্যুৎ|জ্বালানি|গ্যাস/i],
  ["交通基建", /rail|road|bridge|metro|airport|infrastructure|construction|highway|expressway|flyover|রেল|সড়ক|সেতু|অবকাঠামো/i],
  ["港口船舶", /port|shipping|shipyard|shipbuild|maritime|vessel|chattogram|mongla|বন্দর|জাহাজ|নৌ/i],
  ["教育医疗", /health|hospital|medical|medicine|doctor|education|school|university|student|শিক্ষা|স্বাস্থ্য|হাসপাতাল/i],
  ["宏观金融", /bank|finance|econom|inflation|currency|forex|trade|export|import|tax|budget|investment|industry|industrial|manufactur|factory|economic zone|\bfdi\b|\bppp\b|bida|beza|banking|procurement|ব্যাংক|অর্থ|বাণিজ্য|বাজেট/i],
  ["时政政府", /government|cabinet|minister|ministry|parliament|election|president|prime minister|chief adviser|policy|regulation|reform|legislation|ordinance|ecnec|planning commission|administration|সরকার|মন্ত্রী|সংসদ|নির্বাচন|নীতি/i],
];

const bangladeshPattern = /bangladesh|bangladeshi|dhaka|chattogram|chittagong|gazipur|narayanganj|khulna|rajshahi|sylhet|barishal|barisal|rangpur|mymensingh|cumilla|comilla|patuakhali|payra|mongla|cox['’]?s bazar|jamuna|padma|rooppur|matarbari|bpdb|petrobangla|bida|beza|ecnec|bppa|nbr|bangladesh bank|বাংলাদেশ|ঢাকা|চট্টগ্রাম|গাজীপুর|নারায়ণগঞ্জ|খুলনা|রাজশাহী|সিলেট|বরিশাল|রংপুর|ময়মনসিংহ|কুমিল্লা|পায়রা|মোংলা/i;
const excludedTopicPattern = /cricket|football|world cup|tournament|sports?\b|actor|actress|film\b|cinema|music|celebrity|fashion|recipe|horoscope|entertainment/i;

const impactByCategory = {
  时政政府: "可能影响政策环境、政府审批或公共项目安排，建议结合政府正式文件继续核实。",
  宏观金融: "可能影响融资、汇率、税务或跨境付款安排，建议由财务团队核对原文。",
  电力能源: "可能影响能源项目、燃料供应及电力市场安排，建议跟踪主管部门后续通知。",
  交通基建: "可能涉及基础设施规划、融资或采购机会，建议关注业主与采购平台公告。",
  港口船舶: "可能影响港航、物流或船舶相关项目，建议核对港务及海事机构文件。",
  教育医疗: "可能涉及公共服务项目与设备采购，建议关注主管部门和采购公告。",
};

function decodeEntities(value = "") {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function plainText(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  return decodeEntities(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "").trim();
}

function categoryFor(text) {
  return categoryRules.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function isRelevant(text) {
  return bangladeshPattern.test(text) && !excludedTopicPattern.test(text) && Boolean(categoryFor(text));
}

function timeAgo(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "时间待核实";
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  return `${Math.floor(minutes / 1440)}天前`;
}

function validPublishedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp) || timestamp < cutoffTime || timestamp > futureTolerance) return null;
  return date;
}

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function tokens(title) {
  return new Set(
    title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((word) => word.length > 3)
  );
}

function similarity(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / Math.min(left.size, right.size);
}

function tagsFor(text, category) {
  const candidates = [
    ["政府政策", /government|policy|cabinet|minister/i], ["项目机会", /project|tender|procurement|contract/i],
    ["融资", /finance|loan|fund|investment|adb|world bank/i], ["电力", /power|electric/i],
    ["能源", /energy|gas|lng|fuel|coal/i], ["交通", /rail|road|bridge|metro|airport/i],
    ["港航", /port|shipping|maritime|vessel/i], ["医疗", /health|hospital|medical|medicine/i],
    ["教育", /education|school|university|student/i],
  ];
  const found = candidates.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  return [...new Set([category, ...found])].slice(0, 4);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { "user-agent": "BangladeshDailyIntel/1.0 (+https://gjn0012-dot.github.io/bangladesh-daily-intel/)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const xml = await response.text();
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi),
  ].map((match) => match[0]);
  return blocks.slice(0, 25).map((block) => {
    const title = plainText(tag(block, "title"));
    const url = plainText(tag(block, "link") || tag(block, "guid"));
    const description = plainText(tag(block, "description") || tag(block, "content:encoded"));
    const publishedDate = validPublishedDate(
      tag(block, "pubDate") || tag(block, "dc:date") || tag(block, "published") || tag(block, "updated")
    );
    const itemSource = plainText(tag(block, "source"));
    const source = itemSource || feed.name;
    const articleText = `${title} ${description}`;
    const category = categoryFor(articleText);
    const highPriority = /tender|contract|policy|cabinet|power|energy|rail|port|bank|budget|investment/i.test(title);
    return {
      id: hash(url || `${source}:${title}`), category, title,
      summary: description && description !== title ? description.slice(0, 320) : `来自${source}公开信息流的最新报道，请打开原始页面查看全文。`,
      impact: impactByCategory[category], source, sourceCount: 1,
      confidence: "有待核实",
      level: highPriority ? "重点" : "参考", time: timeAgo(publishedDate), location: "孟加拉国",
      stage: "媒体报道", tags: tagsFor(`${title} ${description}`, category),
      url, publishedAt: publishedDate?.toISOString() || "", sourceLinks: [{ name: source, url }],
    };
  }).filter((item) => item.title && item.publishedAt && item.category && isRelevant(`${item.title} ${item.summary}`) && /^https?:\/\//.test(item.url));
}

function cluster(items) {
  const groups = [];
  for (const item of items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))) {
    const existing = groups.find((group) => similarity(group[0].title, item.title) >= 0.62);
    if (existing) existing.push(item); else groups.push([item]);
  }
  return groups.map((group) => {
    const primary = group[0];
    const sources = [...new Set(group.map((item) => item.source))];
    const sourceLinks = [...new Map(group.flatMap((item) => item.sourceLinks).map((link) => [link.name, link])).values()];
    return {
      ...primary,
      source: sources.join(" · "),
      sourceCount: sources.length,
      sourceLinks,
      confidence: sources.length >= 2 && primary.confidence !== "官方确认" ? "多源证实" : primary.confidence,
    };
  });
}

const results = await Promise.allSettled(feeds.map(fetchFeed));
const failedSources = results.flatMap((result, index) => result.status === "rejected" ? [feeds[index].name] : []);
const rawStories = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
const uniqueStories = [...new Map(rawStories.map((item) => [item.url.replace(/[#?]utm_.*/, ""), item])).values()];
const clusteredStories = cluster(uniqueStories).slice(0, MAX_STORIES);

if (!clusteredStories.length) throw new Error(`All feeds failed: ${failedSources.join(", ")}`);

const enrichment = await enrichStories(clusteredStories);

const payload = {
  generatedAt: new Date().toISOString(),
  maxAgeDays: MAX_AGE_DAYS,
  sourceCount: feeds.length,
  successfulSources: feeds.length - failedSources.length,
  failedSources,
  aiStatus: enrichment.aiStatus,
  aiModel: enrichment.aiModel,
  translationStatus: enrichment.translationStatus,
  stories: enrichment.stories,
};

await mkdir("public/data", { recursive: true });
await writeFile("public/data/news.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Generated ${enrichment.stories.length} stories from ${payload.successfulSources}/${feeds.length} feeds. ${enrichment.aiStatus}`);
