// 屁宝专属 IBD Compass — data layer
//
// `jobs.json` is the single source of truth for listings. A daily agent can
// overwrite that file with freshly scraped roles; everything below is derived
// from it at load time, so the rest of the app never touches the raw array.
import jobsData from "./jobs.json";

export const JOBS = jobsData;

// today's stats — recomputed from whatever is in jobs.json
export const JOB_STATS = (() => {
  const newToday = JOBS.filter((j) => j.postedDaysAgo === 0).length;
  const newThisWeek = JOBS.filter((j) => j.postedDaysAgo <= 7).length;
  const hot = JOBS.filter((j) => j.isHot).length;
  return { newToday, newThisWeek, hot, total: JOBS.length };
})();

// 申请进度 pipeline — 全站统一引用
export const PIPELINE = [
  { key: "interested", step: "01", label: "感兴趣", en: "Watching", tone: "gold" },
  { key: "applied", step: "02", label: "已投递", en: "Applied", tone: "blue" },
  { key: "first", step: "03", label: "初面", en: "1st Round", tone: "green" },
  { key: "final", step: "04", label: "终面", en: "Final Round", tone: "green" },
  { key: "offer", step: "05", label: "Offer", en: "Offer", tone: "offer" },
];
export const PIPELINE_KEYS = PIPELINE.map((s) => s.key);
export const STAGE_MAP = Object.fromEntries(PIPELINE.map((s) => [s.key, s]));

// stages used for stepping the application pipeline (English labels for UI)
export const STAGES = [
  { key: "interested", step: "01", label: "感兴趣", labelEn: "Watching" },
  { key: "applied", step: "02", label: "已投递", labelEn: "Applied" },
  { key: "first", step: "03", label: "初面", labelEn: "First Round" },
  { key: "final", step: "04", label: "终面", labelEn: "Final Round" },
  { key: "offer", step: "05", label: "Offer", labelEn: "Offer" },
];

export const SECTORS = [
  "M&A",
  "ECM",
  "DCM",
  "FIG",
  "TMT",
  "Healthcare",
  "Industrials",
  "Natural Resources",
  "Real Estate",
];

// 加油语 pool — 屁宝早上打开时随机一条
export const GREETINGS = [
  { line: "屁宝，今天也要相信自己。", sub: "VP 的位置是为有准备的人留的。" },
  { line: "你比你以为的更厉害。", sub: "每一份 deck、每一次 pitch，都让你离 MD 更近一步。" },
  { line: "Good morning, 屁宝 ☀️", sub: "今天看哪家公司顺眼，就投哪家。" },
  { line: "稳一点，他们会发现你的。", sub: "你的 track record 已经在替你说话了。" },
  { line: "今天是个适合发简历的日子。", sub: "HKEX 开盘前，先开屁宝的 Bloomberg。" },
  { line: "屁宝牌投行雷达 已就绪。", sub: "Agent 跑了一整夜，给你筛出新机会。" },
  { line: "把面试当作 reverse interview。", sub: "你也在挑他们 —— 别忘了这一点。" },
  { line: "你已经走得很远了。", sub: "再投几份，就到下一个 chapter。" },
];
