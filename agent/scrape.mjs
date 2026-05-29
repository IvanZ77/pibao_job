// agent/scrape.mjs — 屁宝专属 IBD Compass 每日真实抓取脚本
//
// 用 Playwright 无头浏览器加载各投行 careers 页面,优先拦截页面自己发出的
// 职位 JSON 接口(对 SPA 远比抓 HTML / 逆向 API 稳定),归一化 + 过滤出
// 香港 IBD VP 岗位,并以 id 稳定的方式 merge 进 src/data/jobs.json。
//
// 用法:
//   node agent/scrape.mjs                 # 抓全部
//   node agent/scrape.mjs --only=EVR,MOE  # 只抓指定公司(便于调试单家适配)
//   node agent/scrape.mjs --dry           # 不写文件,只打印将要写入的结果
//   HEADFUL=1 node agent/scrape.mjs       # 显示浏览器窗口(本地调试反爬时有用)
//
// 维护说明:抓取天然脆弱 —— 站点改版 / 反爬升级时,对应公司可能抓到 0 条。
// 脚本对单家失败做了隔离(跳过并保留该公司上次结果),不会让整轮失败。

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOBS_PATH = join(__dirname, "..", "src", "data", "jobs.json");

// ---------- 目标公司 ----------
// url 用各家官方 careers 入口。host 含 "myworkdayjobs" 的走 Workday 适配器;
// 其余走通用 JSON 拦截器。每家可按需补一个 search query 收窄到 HK / IBD。
const BANKS = [
  { company: "Goldman Sachs", short: "GS", url: "https://higher.gs.com/results?LOCATION=Hong+Kong&DIVISION=Investment+Banking" },
  { company: "Morgan Stanley", short: "MS", url: "https://morganstanley.eightfold.ai/careers?location=Hong%20Kong&query=Investment%20Banking" },
  { company: "J.P. Morgan", short: "JPM", url: "https://careers.jpmorgan.com/global/en/search-results?keywords=Investment%20Banking%20Vice%20President&location=Hong%20Kong" },
  { company: "Citi", short: "Citi", url: "https://jobs.citi.com/search-jobs/Investment%20Banking%20Hong%20Kong" },
  { company: "Bank of America", short: "BofA", url: "https://careers.bankofamerica.com/en-us/job-search?ref=search&search=investment%20banking&location=Hong%20Kong" },
  { company: "UBS", short: "UBS", url: "https://jobs.ubs.com/TGnewUI/Search/home/HomeWithPreLoad?PageType=JobDetails&partnerid=25008&siteid=5012" },
  { company: "Barclays", short: "BARC", url: "https://search.jobs.barclays/search-jobs/Investment%20Banking/Hong%20Kong" },
  { company: "Deutsche Bank", short: "DB", url: "https://careers.db.com/professionals/search-roles/#/professional/result?Location=Hong+Kong&BusinessArea=Investment+Bank" },
  { company: "HSBC", short: "HSBC", url: "https://mycareer.hsbc.com/en_GB/external/SearchJobs/?3_56_3=2030" },
  { company: "Standard Chartered", short: "SC", url: "https://jobs.standardchartered.com/search-jobs/Investment%20Banking/Hong%20Kong" },
  { company: "CICC", short: "CICC", url: "https://career.cicc.com/" },
  { company: "CITIC Securities", short: "CITICS", url: "https://www.citics.com/careers" },
  { company: "Huatai International", short: "HTSC", url: "https://www.htsc.com.hk/career" },
  { company: "Haitong International", short: "HTI", url: "https://www.htisec.com/careers" },
  { company: "Nomura", short: "NOM", url: "https://www.nomura.com/careers/" },
  { company: "Mizuho", short: "MIZ", url: "https://www.mizuhogroup.com/careers" },
  { company: "MUFG", short: "MUFG", url: "https://careers.mufgemea.com/search/?q=Investment+Banking+Hong+Kong" },
  { company: "Jefferies", short: "JEF", url: "https://jefferies.tal.net/vx/lang-en-GB/mobile-0/appcentre-1/brand-2/candidate/jobboard/vacancy/1/adv/" },
  { company: "Lazard", short: "LAZ", url: "https://www.lazard.com/careers/job-search/" },
  { company: "Rothschild & Co", short: "ROTH", url: "https://www.rothschildandco.com/en/careers/job-search/" },
  { company: "Moelis & Company", short: "MOE", url: "https://moelis.wd1.myworkdayjobs.com/Experienced" },
  { company: "Evercore", short: "EVR", url: "https://evercore.wd1.myworkdayjobs.com/Evercore" },
];

// ---------- 品牌色(爬虫拿不到,用查找表保证 logo 观感一致) ----------
const BRAND = {
  GS: { bg: "#0A2540", fg: "#7399C6" }, MS: { bg: "#1B365D", fg: "#FFFFFF" },
  JPM: { bg: "#7B2D26", fg: "#FFFFFF" }, Citi: { bg: "#003B70", fg: "#FFFFFF" },
  BofA: { bg: "#012169", fg: "#E31837" }, UBS: { bg: "#FFFFFF", fg: "#E60000" },
  BARC: { bg: "#00AEEF", fg: "#FFFFFF" }, DB: { bg: "#0018A8", fg: "#FFFFFF" },
  HSBC: { bg: "#DB0011", fg: "#FFFFFF" }, SC: { bg: "#FFFFFF", fg: "#0473EA" },
  CICC: { bg: "#FFFFFF", fg: "#C8102E" }, CITICS: { bg: "#B81C25", fg: "#FFFFFF" },
  HTSC: { bg: "#C8102E", fg: "#FFFFFF" }, HTI: { bg: "#003D7C", fg: "#FFFFFF" },
  NOM: { bg: "#C8102E", fg: "#FFFFFF" }, MIZ: { bg: "#1A4A8A", fg: "#FFFFFF" },
  MUFG: { bg: "#C8102E", fg: "#FFFFFF" }, JEF: { bg: "#1F3864", fg: "#FFFFFF" },
  LAZ: { bg: "#FFFFFF", fg: "#003366" }, ROTH: { bg: "#1B1B1B", fg: "#FFFFFF" },
  MOE: { bg: "#FFFFFF", fg: "#0F2D52" }, EVR: { bg: "#0B2545", fg: "#FFFFFF" },
};

// ---------- 过滤 / 分类 ----------
const RE_HK = /hong\s?kong|香港|\bHK\b/i;
const RE_VP = /vice\s?president|\bVP\b|executive\s?director|\bED\b|副总裁|高级经理/i;
const RE_NOT_LEVEL = /\b(analyst|associate|intern|internship|graduate|trainee|apprentice|managing\s?director|\bMD\b|assistant\s?vice|\bAVP\b)\b/i;
const RE_IBD = /investment\s?bank|\bIBD\b|m&a|merger|acquisition|\bECM\b|\bDCM\b|equity\s?capital|debt\s?capital|capital\s?market|coverage|advisory|corporate\s?finance|global\s?banking|origination|sponsor/i;
// 强 IBD 信号:命中则优先保留,不被下面的部门排除词误杀(如 GS 把 IBD 归在 "Global Banking & Markets" 伞下)
const RE_IBD_STRONG = /investment\s?bank|\bIBD\b|m&a|merger|acquisition|\bECM\b|\bDCM\b|equity\s?capital|debt\s?capital|corporate\s?finance|financial\s?advisory|global\s?advisory/i;
// 部门排除:注意不要用裸 "markets"(会误杀 "Global Banking & Markets" 下的 IBD)
const RE_NOT_DEPT = /sales\s?(?:&|and)?\s?trading|\btrading\b|\bFICC\b|equities\b|prime\s?broker|global\s?markets|research|wealth|private\s?bank|asset\s?manage|operations\b|\brisk\b|compliance|audit|\blegal\b|human\s?resource|\bHR\b|quant|developer|engineer|controller/i;

const SECTOR_RULES = [
  [/health|biotech|pharma|medical|life\s?science|18a/i, "Healthcare", "Healthcare"],
  [/\bTMT\b|technology|\bmedia\b|telecom|internet|software|semiconductor/i, "TMT", "Tech & Internet"],
  [/\bFIG\b|financial\s?institution|insurance|\bbanks?\b|nbfi/i, "FIG", "Financial Institutions"],
  [/real\s?estate|\bREIT\b|property|developer/i, "Real Estate", "Real Estate"],
  [/energy|mining|metals|oil|gas|natural\s?resource|new\s?energy/i, "Natural Resources", "Energy & Resources"],
  [/industrial|manufactur|machinery|\bauto\b|\bEV\b/i, "Industrials", "Industrials"],
  [/\bECM\b|equity\s?capital|\bIPO\b|follow-?on/i, "ECM", "Equity Capital Markets"],
  [/\bDCM\b|debt\s?capital|fixed\s?income|bond/i, "DCM", "Debt Capital Markets"],
  [/m&a|merger|acquisition|advisory|strategic/i, "M&A", "Advisory"],
];

function classifySector(text) {
  for (const [re, sector, sub] of SECTOR_RULES) if (re.test(text)) return { sector, subSector: sub };
  return { sector: "M&A", subSector: "" }; // 兜底:绝大多数 IBD 岗位是 M&A / 综合咨询
}

// 解析各种发布日期写法 → ISO + 距今天数
function parsePosted(raw, today) {
  const t = today ?? new Date();
  if (!raw) return { postedDate: iso(t), postedDaysAgo: 0, estimated: true };
  const s = String(raw).trim();
  const rel = s.match(/(\d+)\+?\s*(day|week|month)/i);
  if (/today|just\s?posted|刚刚|今天/i.test(s)) return mk(0, t);
  if (/yesterday|昨天/i.test(s)) return mk(1, t);
  if (rel) {
    const n = +rel[1];
    const unit = rel[2].toLowerCase();
    const days = unit === "week" ? n * 7 : unit === "month" ? n * 30 : n;
    return mk(days, t);
  }
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    const days = Math.max(0, Math.round((t - d) / 86400000));
    return { postedDate: iso(d), postedDaysAgo: days, estimated: false };
  }
  return { postedDate: iso(t), postedDaysAgo: 0, estimated: true };
  function mk(days, base) {
    const d = new Date(base.getTime() - days * 86400000);
    return { postedDate: iso(d), postedDaysAgo: days, estimated: false };
  }
}
const iso = (d) => d.toISOString().slice(0, 10);

// 从任意 JSON 对象里模糊提取职位字段(适配 Workday / Greenhouse / Lever / 自建)
function pick(o, keys) {
  for (const k of Object.keys(o)) {
    const lk = k.toLowerCase();
    if (keys.some((want) => lk === want || lk.includes(want))) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof v === "object" && typeof v.text === "string") return v.text.trim();
      if (Array.isArray(v) && v.length && typeof v[0] === "string") return v.join(", ");
    }
  }
  return "";
}
function looksLikeJob(o) {
  return o && typeof o === "object" && !!pick(o, ["title", "jobtitle", "name", "postingtitle"]);
}
// 递归在响应 JSON 里找“职位对象数组”
function harvest(node, out, depth = 0) {
  if (!node || depth > 6) return;
  if (Array.isArray(node)) {
    if (node.length && node.filter(looksLikeJob).length >= node.length * 0.6) out.push(...node.filter(looksLikeJob));
    else node.forEach((n) => harvest(n, out, depth + 1));
  } else if (typeof node === "object") {
    for (const v of Object.values(node)) harvest(v, out, depth + 1);
  }
}

// 把一个原始 posting → 归一化的 raw 记录(尚未过滤)
function toRaw(o, origin) {
  let url = pick(o, ["externalpath", "applyurl", "url", "absolute_url", "joburl", "canonicalpositionurl", "apply"]);
  if (url && url.startsWith("/")) url = origin + url;
  return {
    title: pick(o, ["title", "jobtitle", "name", "postingtitle"]),
    level: "", // generic 站点没有独立级别字段,VP 判定回退到标题本身
    location: pick(o, ["locationstext", "primarylocation", "location", "city", "locations", "country"]),
    date: pick(o, ["postedon", "posteddate", "dateposted", "publisheddate", "updated_at", "startdate", "createddate"]),
    url,
    dept: pick(o, ["jobfamily", "department", "category", "businessarea", "division", "team", "function"]),
  };
}

// ---------- 抓取策略 ----------
async function scrapeBank(ctx, bank, today) {
  const origin = new URL(bank.url).origin;
  const isGS = /higher\.gs\.com/.test(bank.url);
  const page = await ctx.newPage();
  const captured = [];
  const gsItems = [];
  page.on("response", async (resp) => {
    try {
      const ct = (resp.headers()["content-type"] || "").toLowerCase();
      if (!ct.includes("json")) return;
      const j = await resp.json();
      if (isGS) {
        const items = j?.data?.roleSearch?.items;
        if (Array.isArray(items)) gsItems.push(...items);
      }
      harvest(j, captured);
    } catch { /* 非 JSON / 解析失败,忽略 */ }
  });

  try {
    await page.goto(bank.url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Workday:导航到根会重定向到真实 site,再用同源 fetch 调 CxS API 搜 "Hong Kong"
    if (/myworkdayjobs/.test(bank.url)) {
      await page.waitForTimeout(2500);
      const landing = page.url();
      const m = landing.match(/myworkdayjobs\.com\/(?:([a-z-]+)\/)?([^/?#]+)/i);
      if (m) {
        const tenant = new URL(landing).host.split(".")[0];
        const site = m[2];
        const api = `${origin}/wday/cxs/${tenant}/${site}/jobs`;
        const wd = await page.evaluate(async (api) => {
          const all = [];
          for (let offset = 0; offset < 100; offset += 20) {
            const r = await fetch(api, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: "Hong Kong" }),
            });
            if (!r.ok) break;
            const j = await r.json();
            const posts = j.jobPostings || [];
            all.push(...posts);
            if (posts.length < 20) break;
          }
          return all;
        }, api);
        harvest(wd, captured);
      }
    } else {
      // 通用:等 SPA 把职位 XHR 发完,滚动触发懒加载
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 4000);
        await page.waitForTimeout(1200);
      }
    }
  } catch (e) {
    await page.close();
    throw e;
  }
  await page.close();

  // ---- Goldman 专用适配器:级别在 corporateTitle、地点在 locations[].country ----
  if (isGS && gsItems.length) {
    const seen = new Set();
    const raws = [];
    for (const it of gsItems) {
      const key = it.roleId || it.jobTitle;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const loc = (it.locations || [])
        .map((l) => [...new Set([l.city, l.state, l.country].filter(Boolean))].join(", "))
        .filter(Boolean)[0] || "";
      raws.push({
        title: it.jobTitle || "",
        level: it.corporateTitle || "",
        location: loc,
        dept: [it.division, it.jobFunction].filter(Boolean).join(" "),
        date: "", // GS 列表不暴露发布日期 → normalize 会估计为今天
        url: `https://higher.gs.com/roles/${it.externalSource?.sourceId || it.roleId}`,
      });
    }
    return raws.map((r) => normalize(r, bank, today)).filter(Boolean);
  }

  // ---- 通用适配器:拦截到的任意职位 JSON ----
  const seen = new Set();
  const raws = [];
  for (const o of captured) {
    const r = toRaw(o, origin);
    const k = (r.title + "|" + r.location).toLowerCase();
    if (r.title && !seen.has(k)) { seen.add(k); raws.push(r); }
  }
  return raws.map((r) => normalize(r, bank, today)).filter(Boolean);
}

// raw → 最终 job 对象(含过滤)
function normalize(r, bank, today) {
  const hay = `${r.title} ${r.location} ${r.dept}`;
  const levelHay = r.level || r.title; // 有独立级别字段就用它(如 GS 的 corporateTitle),否则看标题
  if (!RE_HK.test(r.location || hay)) return null;        // 必须香港
  if (!RE_VP.test(levelHay)) return null;                 // 必须 VP / ED
  if (RE_NOT_LEVEL.test(levelHay)) return null;           // 排除 Analyst/Associate/MD/AVP...
  if (!RE_IBD.test(hay)) return null;                     // 必须 IBD 相关
  if (!RE_IBD_STRONG.test(hay) && RE_NOT_DEPT.test(hay)) return null; // 无强 IBD 信号时才按部门排除

  const { sector, subSector } = classifySector(hay);
  const { postedDate, postedDaysAgo } = parsePosted(r.date, today);
  const brand = BRAND[bank.short] || { bg: "#0E1E2B", fg: "#FFFFFF" };
  return {
    company: bank.company,
    companyShort: bank.short,
    logoColor: brand.fg,
    logoBg: brand.bg,
    title: r.title,
    sector,
    subSector,
    location: r.location || "Hong Kong",
    postedDaysAgo,
    postedDate,
    salary: "Competitive", // career 页极少公开薪资;有则后续可补,绝不编造数字
    jdSummary: `${bank.company} ${sector} VP 岗位,香港。详情见原始招聘页。`,
    keyReqs: [sector, r.level || "VP / ED", "Hong Kong"].filter(Boolean),
    applyUrl: r.url || bank.url,
    isNew: postedDaysAgo <= 1,
    _fp: `${bank.short}|${r.title}|${r.location}`.toLowerCase(),
  };
}

// best-fit 启发式:精品/bulge bracket 的 M&A 角色标 hot,控制在 ~30%
function applyHot(jobs) {
  const elite = new Set(["GS", "MS", "LAZ", "MOE", "EVR", "ROTH", "JEF"]);
  for (const j of jobs) j.isHot = j.sector === "M&A" && elite.has(j.companyShort);
  const hot = jobs.filter((j) => j.isHot);
  const cap = Math.ceil(jobs.length * 0.3);
  if (hot.length > cap) hot.slice(cap).forEach((j) => (j.isHot = false));
  return jobs;
}

// ---------- 主流程 ----------
const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1]?.split(",").map((s) => s.trim());
const dry = args.includes("--dry");
const today = new Date();

const targets = only ? BANKS.filter((b) => only.includes(b.short)) : BANKS;

let prev = [];
try { prev = JSON.parse(await readFile(JOBS_PATH, "utf8")); } catch { /* 首次运行没有旧文件 */ }
const prevByFp = new Map(prev.map((j) => [`${j.companyShort}|${j.title}|${j.location}`.toLowerCase(), j]));

const browser = await chromium.launch({ headless: !process.env.HEADFUL });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  viewport: { width: 1366, height: 900 },
  // 某些 CI / 沙箱通过 TLS 拦截代理出网,其 CA 不被浏览器信任 —— 设 IGNORE_HTTPS=1 跳过校验
  ignoreHTTPSErrors: !!process.env.IGNORE_HTTPS,
});

const report = [];
const collected = [];
const failedShorts = new Set();

for (const bank of targets) {
  process.stdout.write(`· ${bank.company} … `);
  try {
    const jobs = await scrapeBank(ctx, bank, today);
    collected.push(...jobs);
    report.push(`${bank.short}: ${jobs.length} 个`);
    console.log(`${jobs.length} 个 HK IBD VP 岗位`);
  } catch (e) {
    failedShorts.add(bank.short);
    report.push(`${bank.short}: 失败(${e.message.split("\n")[0]})`);
    console.log(`失败 — 保留上次结果`);
  }
}
await browser.close();

// id 稳定:沿用旧 id(保住屁宝在 localStorage 里的进度标记)
const counters = {};
function assignId(j) {
  const old = prevByFp.get(j._fp);
  if (old?.id) return old.id;
  counters[j.companyShort] = (counters[j.companyShort] || 0) + 1;
  return `${j.companyShort.toLowerCase()}-${String(counters[j.companyShort]).padStart(3, "0")}`;
}

// 保留这些公司上次的岗位,避免“整列消失”:抓取失败的,以及本次没在 --only 范围内的
const targetShorts = new Set(targets.map((t) => t.short));
const keptFromPrev = prev.filter(
  (j) => failedShorts.has(j.companyShort) || !targetShorts.has(j.companyShort)
);
let finalJobs = [...collected, ...keptFromPrev];

// 按指纹去重(新抓的优先),分配/沿用 id,清理内部字段
const byFp = new Map();
for (const j of finalJobs) if (!byFp.has(j._fp ?? `${j.companyShort}|${j.title}|${j.location}`.toLowerCase()))
  byFp.set(j._fp ?? `${j.companyShort}|${j.title}|${j.location}`.toLowerCase(), j);
finalJobs = [...byFp.values()];
applyHot(finalJobs);
finalJobs.forEach((j) => { j.id = assignId(j); delete j._fp; });
finalJobs.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);

// ---------- 运行简报 ----------
const newToday = finalJobs.filter((j) => j.postedDaysAgo === 0).length;
const thisWeek = finalJobs.filter((j) => j.postedDaysAgo <= 7).length;
const hot = finalJobs.filter((j) => j.isHot).length;
console.log("\n———— 屁宝今日招聘简报 ————");
console.log(report.join("  ·  "));
console.log(`合计 ${finalJobs.length} 个岗位 | 今日新增 ${newToday} | 本周 ${thisWeek} | Hot ${hot}`);
if (failedShorts.size) console.log(`⚠ 未能刷新:${[...failedShorts].join(", ")}(已保留上次结果)`);

if (dry) {
  console.log("\n[--dry] 未写入文件。");
} else if (finalJobs.length === 0) {
  console.log("\n抓到 0 个岗位,未覆盖 jobs.json(避免清空)。请检查反爬 / 选择器。");
} else {
  await writeFile(JOBS_PATH, JSON.stringify(finalJobs, null, 2) + "\n", "utf8");
  console.log(`\n✓ 已写入 ${JOBS_PATH}`);
}
console.log("屁宝加油,今天也会有好消息的 ♥");
