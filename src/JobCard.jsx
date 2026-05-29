// JobCard.jsx — single job listing card
import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon.jsx";
import { PIPELINE, PIPELINE_KEYS, STAGE_MAP } from "./data/index.js";

function postedLabel(days) {
  if (days === 0) return { big: "Today", sub: "Just in" };
  if (days === 1) return { big: "Yesterday", sub: "1 day ago" };
  if (days <= 7) return { big: `${days}d`, sub: `${days} days ago` };
  return { big: `${days}d`, sub: `${days} days ago` };
}

const STAGE_ICON = { interested: "eye", applied: "send", first: "mic", final: "mic", offer: "trophy" };

// ===== Status control: pill + popover walking the full pipeline =====
function StatusControl({ status, onStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const stage = STAGE_MAP[status];

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const curIdx = PIPELINE_KEYS.indexOf(status);
  let pillLabel = "标记进度";
  let pillTone = "none";
  if (status === "ignored") {
    pillLabel = "已忽略";
    pillTone = "ignored";
  } else if (stage) {
    pillLabel = `${stage.label} · ${stage.en}`;
    pillTone = stage.tone;
  }

  return (
    <div className="status-control" ref={ref}>
      {/* 5-step progress rail */}
      <div className="stage-rail" title={stage ? `${stage.label} (${stage.step}/05)` : "未开始"}>
        {PIPELINE.map((s, i) => (
          <span
            key={s.key}
            className={`stage-seg ${curIdx >= i && status !== "ignored" ? "filled " + s.tone : ""}`}
          ></span>
        ))}
      </div>

      <button className={`status-pill tone-${pillTone}`} onClick={() => setOpen((o) => !o)}>
        {stage && (
          <span className="pill-ico">
            <Icon name={STAGE_ICON[status]} />
          </span>
        )}
        <span className="pill-label">{pillLabel}</span>
        <span className="pill-chev">
          <Icon name="chevron" />
        </span>
      </button>

      {open && (
        <div className="status-menu">
          <div className="menu-head">移动到阶段</div>
          {PIPELINE.map((s) => (
            <button
              key={s.key}
              className={`menu-row ${status === s.key ? "active" : ""}`}
              onClick={() => {
                onStatus(s.key);
                setOpen(false);
              }}
            >
              <span className="menu-step">{s.step}</span>
              <span className="menu-ico">
                <Icon name={STAGE_ICON[s.key]} />
              </span>
              <span className="menu-label">
                {s.label}
                <span className="menu-en">{s.en}</span>
              </span>
              {status === s.key && (
                <span className="menu-check">
                  <Icon name="check" />
                </span>
              )}
            </button>
          ))}
          <div className="menu-div"></div>
          <button
            className="menu-row subtle"
            onClick={() => {
              onStatus("ignored");
              setOpen(false);
            }}
          >
            <span className="menu-step">—</span>
            <span className="menu-ico">
              <Icon name="x" />
            </span>
            <span className="menu-label">
              忽略<span className="menu-en">Not for me</span>
            </span>
            {status === "ignored" && (
              <span className="menu-check">
                <Icon name="check" />
              </span>
            )}
          </button>
          {status && (
            <button
              className="menu-row subtle"
              onClick={() => {
                onStatus(null);
                setOpen(false);
              }}
            >
              <span className="menu-step">↺</span>
              <span className="menu-ico"></span>
              <span className="menu-label">
                清除标记<span className="menu-en">Clear</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function JobCard({ job, status, onStatus }) {
  const posted = postedLabel(job.postedDaysAgo);
  const isToday = job.postedDaysAgo === 0;
  const klass = ["job-card"];
  if (job.isHot) klass.push("is-hot");
  if (["applied", "first", "final", "offer"].includes(status)) klass.push("is-applied");
  if (status === "offer") klass.push("is-offer");
  if (status === "ignored") klass.push("is-ignored");

  return (
    <article className={klass.join(" ")}>
      {(job.isNew || job.isHot) && <div className="new-flag"></div>}

      <div className="job-logo" style={{ background: job.logoBg, color: job.logoColor }}>
        {job.companyShort}
      </div>

      <div className="job-body">
        <div className="job-top-row">
          <span className="job-company">{job.company}</span>
          <span className="job-sector-chip">
            {job.sector}
            {job.subSector ? ` · ${job.subSector}` : ""}
          </span>
          {job.isNew && <span className="job-flag-new">New</span>}
          {job.isHot && <span className="job-flag-hot">★ Hot</span>}
        </div>

        <h4 className="job-title">{job.title}</h4>

        <div className="job-meta-row">
          <span className="item">
            <span className="ico">
              <Icon name="pin" />
            </span>
            {job.location}
          </span>
          {job.salary && (
            <span className="item salary">
              <span className="ico">
                <Icon name="money" />
              </span>
              {job.salary}
            </span>
          )}
        </div>

        <p className="job-jd">{job.jdSummary}</p>

        <div className="job-reqs">
          {job.keyReqs.map((r, i) => (
            <span className="req-tag" key={i}>
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="job-aside">
        <div className={`job-posted ${isToday ? "today" : ""}`}>
          <div className="big">{posted.big}</div>
          <div>{job.postedDate}</div>
        </div>

        <a className="apply-link" href={job.applyUrl} target="_blank" rel="noopener">
          Apply
          <span className="arrow">
            <Icon name="ext" />
          </span>
        </a>

        <StatusControl status={status} onStatus={(s) => onStatus(job.id, s)} />
      </div>
    </article>
  );
}
