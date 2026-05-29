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

> Scraping itself is **not** wired up yet — this build provides the structure and the
> JSON contract so an agent can populate it. The current `jobs.json` holds 22 realistic
> mock roles.

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
