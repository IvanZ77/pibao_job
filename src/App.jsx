// App.jsx — main shell
import { useState, useEffect, useMemo } from "react";
import { JobCard } from "./JobCard.jsx";
import {
  JOBS,
  JOB_STATS,
  SECTORS,
  STAGES,
  PIPELINE_KEYS,
  GREETINGS,
} from "./data/index.js";

function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [key, v]);
  return [v, setV];
}

function TopStrip() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");

  return (
    <div className="top-strip">
      <div className="top-strip-inner">
        <span className="strip-item">
          <span className="dot"></span>Agent Online
        </span>
        <span className="sep">|</span>
        <span className="strip-item">
          HKT {hh}:{mm}
        </span>
        <span className="sep">|</span>
        <span className="strip-item">
          HKEX <span className="ticker">26,418.30 +0.42%</span>
        </span>
        <span className="sep">|</span>
        <span className="strip-item">
          USD/HKD <span className="ticker">7.8104</span>
        </span>
        <div className="right">
          <span className="strip-item">屁宝 · VIP Subscriber</span>
          <span className="sep">|</span>
          <span className="strip-item">Vol. I · No. 142</span>
        </div>
      </div>
    </div>
  );
}

function Masthead() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="masthead-left">
            <div className="label">Hong Kong Edition</div>
            <div>{dateStr}</div>
          </div>
          <div className="masthead-title">
            <div className="eyebrow">屁 宝 专 属 · For Pi-Bao Only</div>
            <h1>
              The <span className="accent">IBD</span> Compass
            </h1>
            <div className="sub">A Daily Brief on Vice President Openings · Hong Kong</div>
          </div>
          <div className="masthead-right">
            <div className="label">Coverage</div>
            <div>22 Banks · 9 Sectors</div>
          </div>
        </div>
      </header>
      <div className="edition-row">
        <span>Issue 142 · Curated by Agent Claude</span>
        <span className="price">For 屁宝 — Free Forever · ♥</span>
      </div>
    </>
  );
}

function Hero({ stats, greeting }) {
  return (
    <section className="hero">
      <div className="hero-greet">
        <div className="eyebrow">Today's Note</div>
        <h2>{greeting.line}</h2>
        <p className="sub">{greeting.sub}</p>
        <div className="signature">
          <span className="heart">♥</span>
          <span>Signed off by your in-house agent · 5:47 AM HKT</span>
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat-cell">
          <div className="label">New Today</div>
          <div className="number red">{stats.newToday}</div>
          <div className="delta">
            <span className="up">↑</span> Fresh postings · 5:47 AM scan
          </div>
        </div>
        <div className="stat-cell">
          <div className="label">This Week</div>
          <div className="number">{stats.newThisWeek}</div>
          <div className="delta">Last 7 days · across 22 banks</div>
        </div>
        <div className="stat-cell">
          <div className="label">★ Hot Picks</div>
          <div className="number gold">{stats.hot}</div>
          <div className="delta">Roles agent flagged as best-fit</div>
        </div>
        <div className="stat-cell">
          <div className="label">In Tracker</div>
          <div className="number green">{stats.tracked}</div>
          <div className="delta">Across all 5 stages</div>
        </div>
      </div>
    </section>
  );
}

function FilterBar({ activeSector, setActiveSector, sectorCounts }) {
  return (
    <div className="filter-bar">
      <span className="label-tiny">Sector</span>
      <button
        className={`chip ${activeSector === "ALL" ? "active" : ""}`}
        onClick={() => setActiveSector("ALL")}
      >
        All <span className="count">{sectorCounts.ALL}</span>
      </button>
      {SECTORS.map((s) => (
        <button
          key={s}
          className={`chip ${activeSector === s ? "active" : ""}`}
          onClick={() => setActiveSector(s)}
        >
          {s} {sectorCounts[s] ? <span className="count">{sectorCounts[s]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Tracker({ statuses, jobs }) {
  const byStage = useMemo(() => {
    const map = { interested: [], applied: [], first: [], final: [], offer: [] };
    Object.entries(statuses).forEach(([id, st]) => {
      if (map[st]) map[st].push(id);
    });
    return map;
  }, [statuses]);

  const jobsById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const totalActive = PIPELINE_KEYS.reduce((n, k) => n + byStage[k].length, 0);
  const offerCount = byStage.offer.length;

  return (
    <div className="tracker-block">
      <div className="tracker-head">
        <div className="title">
          Application <span className="accent">Tracker</span>
        </div>
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: ".15em",
            color: "var(--gold-bright)",
          }}
        >
          {String(totalActive).padStart(2, "0")} ACTIVE
        </div>
      </div>
      <div className="tracker-stages">
        {STAGES.map((s) => {
          const ids = byStage[s.key] || [];
          const hasItems = ids.length > 0;
          return (
            <div
              className={`stage ${hasItems ? "has-items" : ""} ${
                s.key === "offer" && hasItems ? "is-offer" : ""
              }`}
              key={s.key}
            >
              <div style={{ flex: 1 }}>
                <div className="stage-left">
                  <span className="step">{s.step}</span>
                  <span className="name">
                    {s.label}{" "}
                    <span style={{ color: "var(--ink-mute)", fontStyle: "italic" }}>· {s.labelEn}</span>
                  </span>
                </div>
                {hasItems && (
                  <div className="stage-companies">
                    {ids.slice(0, 8).map((id) => {
                      const j = jobsById[id];
                      if (!j) return null;
                      return (
                        <span key={id} className="stage-comp-pip" title={`${j.company} — ${j.title}`}>
                          {j.companyShort}
                        </span>
                      );
                    })}
                    {ids.length > 8 && <span className="stage-comp-pip">+{ids.length - 8}</span>}
                  </div>
                )}
              </div>
              <div className="count">{String(ids.length).padStart(2, "0")}</div>
            </div>
          );
        })}
      </div>
      {offerCount > 0 && (
        <div className="tracker-offer-banner">
          <span className="trophy">🏆</span>
          <span>{offerCount} 个 Offer 在手 —— 屁宝你做到了！</span>
        </div>
      )}
    </div>
  );
}

function PepBlock({ greeting }) {
  return (
    <div className="pep-block">
      <div className="big-quote">"</div>
      <div className="eyebrow">A Note for the Day</div>
      <div className="quote">{greeting.line}</div>
      <div className="by">
        <span className="heart">♥</span>
        <span>From the one who believes in you most</span>
      </div>
    </div>
  );
}

function AgentBox({ stats }) {
  return (
    <div className="agent-box">
      <div className="head">
        <div className="title">Agent Activity</div>
        <div className="status">
          <span className="dot"></span>Live
        </div>
      </div>
      <div className="agent-log">
        <div className="line">
          <span className="time">05:42</span>
          <span>Initialising scan across 22 banks…</span>
        </div>
        <div className="line">
          <span className="time">05:43</span>
          <span>
            Crawling <span className="num">22</span> career pages
          </span>
        </div>
        <div className="line">
          <span className="time">05:45</span>
          <span>
            Filtering <span className="num">VP · HK · IBD</span>
          </span>
        </div>
        <div className="line">
          <span className="time">05:47</span>
          <span className="ok">
            ✓ Found {stats.newToday} new role{stats.newToday !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="line">
          <span className="time">05:47</span>
          <span className="ok">✓ Brief delivered to 屁宝</span>
        </div>
        <div className="line">
          <span className="time">—</span>
          <span style={{ color: "var(--ink-mute)" }}>Next scan: tomorrow 05:30 HKT</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [statuses, setStatuses] = useLocalStorage("pibao-statuses-v1", {});
  const [activeSector, setActiveSector] = useState("ALL");

  // Stable greeting per day
  const greeting = useMemo(() => {
    const pool = GREETINGS;
    const today = new Date();
    const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
    return pool[seed % pool.length];
  }, []);

  const jobs = JOBS;

  function onStatus(id, st) {
    const next = { ...statuses };
    if (st === null) delete next[id];
    else next[id] = st;
    setStatuses(next);
  }

  const sectorCounts = useMemo(() => {
    const c = { ALL: jobs.length };
    for (const s of SECTORS) c[s] = jobs.filter((j) => j.sector === s).length;
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs
      .filter((j) => {
        if (statuses[j.id] === "ignored") return false; // 忽略的不显示
        if (activeSector !== "ALL" && j.sector !== activeSector) return false;
        return true;
      })
      .sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }, [jobs, statuses, activeSector]);

  const trackedCount = Object.values(statuses).filter((s) => s && s !== "ignored").length;
  const stats = { ...JOB_STATS, tracked: trackedCount };

  return (
    <>
      <TopStrip />
      <Masthead />
      <Hero stats={stats} greeting={greeting} />
      <FilterBar
        activeSector={activeSector}
        setActiveSector={setActiveSector}
        sectorCounts={sectorCounts}
      />

      <main className="main">
        <section>
          <div className="section-head">
            <h3>
              The <span className="ital">Listings</span>
            </h3>
            <div className="meta">
              {filtered.length} of {jobs.length} roles · sorted by recency
            </div>
          </div>
          <div className="jobs-list">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} status={statuses[job.id]} onStatus={onStatus} />
            ))}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "var(--ink-mute)",
                  fontFamily: "var(--f-serif)",
                  fontStyle: "italic",
                  fontSize: 18,
                }}
              >
                没有匹配的岗位。换个筛选试试。
              </div>
            )}
          </div>
        </section>

        <aside className="rail">
          <Tracker statuses={statuses} jobs={jobs} />
          <PepBlock greeting={greeting} />
          <AgentBox stats={stats} />
        </aside>
      </main>

      <footer className="footer">
        <div>The IBD Compass · A daily brief curated for 屁宝</div>
        <div>
          <span className="heart">♥</span> Made with love · Scans daily at 05:30 HKT
        </div>
      </footer>
    </>
  );
}
