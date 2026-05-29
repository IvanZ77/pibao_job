# 屁宝专属 IBD Compass

A daily brief of **Hong Kong IBD Vice President** openings, designed just for 屁宝 —
FT/Bloomberg styling, a per-role application tracker, and a little encouragement
every morning. ♥

Built with **Vite + React**.

## Develop

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

## Data pipeline

All listings live in **`src/data/jobs.json`** — that file is the single source of
truth. Everything else (today's stats, sector counts, the listings feed) is derived
from it at load time in `src/data/index.js`, so nothing else needs to change when the
data does.

A daily agent can simply **overwrite `src/data/jobs.json`** with freshly scraped roles
and rebuild. Each job is an object shaped like:

```json
{
  "id": "gs-001",
  "company": "Goldman Sachs",
  "companyShort": "GS",
  "logoColor": "#7399C6",
  "logoBg": "#0A2540",
  "title": "Vice President, M&A — TMT",
  "sector": "M&A",
  "subSector": "TMT",
  "location": "Cheung Kong Center, Central",
  "postedDaysAgo": 0,
  "postedDate": "2026-05-28",
  "salary": "HK$2.4M–3.2M base + bonus",
  "jdSummary": "…",
  "keyReqs": ["6–9 yrs IBD", "Mandarin native"],
  "applyUrl": "https://higher.gs.com/roles",
  "isNew": true,
  "isHot": true
}
```

Field notes:

- `sector` should be one of the values in `SECTORS` (`src/data/index.js`) so the filter
  chips and counts line up.
- `postedDaysAgo` drives the "New Today" / "This Week" stats and the recency sort.
- `isNew` / `isHot` are optional flags for the New / ★ Hot badges.

## Daily scraping

A real Playwright-based scraper lives in `agent/scrape.mjs`. It drives a headless
Chromium, intercepts each bank's own job API/JSON, filters to **Hong Kong · IBD · VP**
roles, and merges the result into `src/data/jobs.json` (id-stable, so 屁宝's tracker
progress survives refreshes).

```bash
npm run scrape                 # scrape all banks → update jobs.json
node agent/scrape.mjs --only=GS --dry   # debug one bank, don't write
HEADFUL=1 node agent/scrape.mjs         # watch the browser (local debugging)
IGNORE_HTTPS=1 node agent/scrape.mjs    # behind a TLS-intercepting proxy/CI
```

Status of the adapters:

- **Goldman Sachs** has a fully working dedicated adapter (its GraphQL `roleSearch`
  feed, with structured level/location/division filtering) — it pulls **real, live**
  HK IBD VP roles today.
- The other 21 banks use a **generic JSON interceptor** that works when a site exposes
  a discoverable jobs API, and falls back gracefully (a bank that yields nothing keeps
  its previous entries instead of disappearing). Each one may need per-bank tuning the
  way Goldman was done — career sites differ in JSON shape, and several (Workday-based)
  need their exact site URL discovered first.

So `jobs.json` is currently **mixed**: Goldman is live-scraped; the rest remain the
seeded mock roles until their adapter is tuned.

The scrape runs automatically every morning via `.github/workflows/scrape.yml`
(05:30 HKT), which commits the refreshed `jobs.json` and thereby triggers a redeploy.

See `agent/daily-scrape-prompt.md` for the full intent/spec an agent should follow.

## Application tracker

Each card carries a 5-stage progress control — 感兴趣 · Watching → 已投递 · Applied →
初面 · 1st Round → 终面 · Final → Offer (plus 忽略 / clear). Progress is saved to the
browser's `localStorage` under `pibao-statuses-v1`, and the right-hand rail rolls it up
into a live tracker with an 🏆 offer celebration.

## Project layout

```
index.html            Vite entry
src/
  main.jsx            React root
  App.jsx             page shell (strip, masthead, hero, filters, tracker, footer)
  JobCard.jsx         listing card + status control
  Icon.jsx            inline SVG icons
  styles.css          FT/Bloomberg design system
  data/
    jobs.json         ← listings (agent-populatable)
    index.js          derived stats, pipeline, sectors, greetings
```
