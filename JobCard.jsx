// JobCard.jsx — single job listing card
const { useState, useEffect, useMemo, useRef } = React;

function Icon({ name }) {
  const paths = {
    pin: <><circle cx="12" cy="10" r="3"/><path d="M12 22s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z"/></>,
    cal: <><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    money: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-2 2.5-2s2.5 1 2.5 2-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 2 2.5 2 2.5-1 2.5-2"/></>,
    star: <path d="M12 3l2.6 6.2 6.4.6-4.9 4.4 1.5 6.3L12 17.3 6.4 20.5 7.9 14.2 3 9.8l6.4-.6L12 3z"/>,
    check: <path d="M5 12l4 4 10-10"/>,
    x: <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    ext: <><path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6"/></>,
    chevron: <path d="M6 9l6 6 6-6"/>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/></>,
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

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
  const PIPELINE = window.PIPELINE;
  const stage = window.STAGE_MAP[status];

  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const curIdx = window.PIPELINE_KEYS.indexOf(status);
  let pillClass = "status-pill";
  let pillLabel = "标记进度";
  let pillTone = "none";
  if (status === "ignored") { pillLabel = "已忽略"; pillTone = "ignored"; }
  else if (stage) { pillLabel = `${stage.label} · ${stage.en}`; pillTone = stage.tone; }

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

      <button className={`status-pill tone-${pillTone}`} onClick={() => setOpen(o => !o)}>
        {stage && <span className="pill-ico"><Icon name={STAGE_ICON[status]} /></span>}
        <span className="pill-label">{pillLabel}</span>
        <span className="pill-chev"><Icon name="chevron" /></span>
      </button>

      {open && (
        <div className="status-menu">
          <div className="menu-head">移动到阶段</div>
          {PIPELINE.map((s, i) => (
            <button
              key={s.key}
              className={`menu-row ${status === s.key ? "active" : ""}`}
              onClick={() => { onStatus(s.key); setOpen(false); }}
            >
              <span className="menu-step">{s.step}</span>
              <span className="menu-ico"><Icon name={STAGE_ICON[s.key]} /></span>
              <span className="menu-label">{s.label}<span className="menu-en">{s.en}</span></span>
              {status === s.key && <span className="menu-check"><Icon name="check" /></span>}
            </button>
          ))}
          <div className="menu-div"></div>
          <button className="menu-row subtle" onClick={() => { onStatus("ignored"); setOpen(false); }}>
            <span className="menu-step">—</span>
            <span className="menu-ico"><Icon name="x" /></span>
            <span className="menu-label">忽略<span className="menu-en">Not for me</span></span>
            {status === "ignored" && <span className="menu-check"><Icon name="check" /></span>}
          </button>
          {status && (
            <button className="menu-row subtle" onClick={() => { onStatus(null); setOpen(false); }}>
              <span className="menu-step">↺</span>
              <span className="menu-ico"></span>
              <span className="menu-label">清除标记<span className="menu-en">Clear</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, status, onStatus }) {
  const posted = postedLabel(job.postedDaysAgo);
  const isToday = job.postedDaysAgo === 0;
  const klass = ["job-card"];
  if (job.isHot) klass.push("is-hot");
  if (["applied","first","final","offer"].includes(status)) klass.push("is-applied");
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
          <span className="job-sector-chip">{job.sector}{job.subSector ? ` · ${job.subSector}` : ""}</span>
          {job.isNew && <span className="job-flag-new">New</span>}
          {job.isHot && <span className="job-flag-hot">★ Hot</span>}
        </div>

        <h4 className="job-title">{job.title}</h4>

        <div className="job-meta-row">
          <span className="item"><span className="ico"><Icon name="pin" /></span>{job.location}</span>
          {job.salary && <span className="item salary"><span className="ico"><Icon name="money" /></span>{job.salary}</span>}
        </div>

        <p className="job-jd">{job.jdSummary}</p>

        <div className="job-reqs">
          {job.keyReqs.map((r, i) => <span className="req-tag" key={i}>{r}</span>)}
        </div>
      </div>

      <div className="job-aside">
        <div className={`job-posted ${isToday ? "today" : ""}`}>
          <div className="big">{posted.big}</div>
          <div>{job.postedDate}</div>
        </div>

        <a className="apply-link" href={job.applyUrl} target="_blank" rel="noopener">
          Apply
          <span className="arrow"><Icon name="ext" /></span>
        </a>

        <StatusControl status={status} onStatus={(s) => onStatus(job.id, s)} />
      </div>
    </article>
  );
}

window.JobCard = JobCard;
window.Icon = Icon;
