"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Provider = "Uber" | "inDrive" | "Yango" | "Other";
type Trend = { provider: string; issue_type: string; area: string; report_count: number };
type LocalReport = { provider: Provider; issue: string; area: string; month: string };

const providers: Provider[] = ["Uber", "inDrive", "Yango", "Other"];
const issues = ["Harassment", "Unsafe driving", "Route concern", "Fare or payment", "Unprofessional conduct", "Other"];
const areas = ["Gulberg", "DHA", "Johar Town", "Model Town", "Cantt", "Walled City", "Other Lahore"];
const demoTrends: Trend[] = [
  { provider: "Uber", issue_type: "Unsafe driving", area: "Gulberg", report_count: 28 },
  { provider: "inDrive", issue_type: "Harassment", area: "Johar Town", report_count: 22 },
  { provider: "Yango", issue_type: "Fare or payment", area: "DHA", report_count: 17 },
  { provider: "Uber", issue_type: "Route concern", area: "Model Town", report_count: 14 },
  { provider: "inDrive", issue_type: "Unsafe driving", area: "Cantt", report_count: 12 },
  { provider: "Yango", issue_type: "Unprofessional conduct", area: "Gulberg", report_count: 9 },
  { provider: "Other", issue_type: "Route concern", area: "Other Lahore", report_count: 6 },
];

function envReady() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

function groupReports(reports: LocalReport[]) {
  const result = [...demoTrends];
  for (const report of reports) {
    const key = result.find((row) => row.provider === report.provider && row.issue_type === report.issue && row.area === report.area);
    if (key) key.report_count += 1;
    else result.push({ provider: report.provider, issue_type: report.issue, area: report.area, report_count: 1 });
  }
  return result;
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="brand-mark" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"pulse" | "report">("pulse");
  const [providerFilter, setProviderFilter] = useState("All services");
  const [trends, setTrends] = useState<Trend[]>(demoTrends);
  const demoMode = !envReady();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const configured = envReady();
    if (!configured) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${url}/rest/v1/public_ride_trends?select=provider,issue_type,area,report_count`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load shared trends.");
      const rows = (await response.json()) as Trend[];
      setTrends(rows.length ? rows.filter((row) => row.report_count >= 3) : []);
    }).catch(() => setError("Shared trends could not load. Please check the Supabase setup."));
  }, []);

  const filtered = useMemo(() => {
    const rows = trends.filter((row) => row.report_count >= 3 && (providerFilter === "All services" || row.provider === providerFilter));
    return rows.sort((a, b) => b.report_count - a.report_count);
  }, [trends, providerFilter]);
  const visibleTotal = filtered.reduce((sum, row) => sum + row.report_count, 0);
  const providerTotals = providers.map((provider) => ({
    provider,
    count: filtered.filter((row) => row.provider === provider).reduce((sum, row) => sum + row.report_count, 0),
  })).filter((row) => row.count > 0);
  const topCount = Math.max(1, ...providerTotals.map((row) => row.count));

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSuccess("");
    setSubmitting(true);
    const form = new FormData(formElement);
    const report: LocalReport = {
      provider: form.get("provider") as Provider,
      issue: String(form.get("issue")),
      area: String(form.get("area")),
      month: String(form.get("month")),
    };
    const narrative = String(form.get("details") || "").trim();
    try {
      if (envReady()) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${url}/rest/v1/ride_reports`, {
          method: "POST",
          headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ provider: report.provider, issue_type: report.issue, area: report.area, trip_month: `${report.month}-01`, details: narrative || null }),
        });
        if (!response.ok) throw new Error("Report could not be saved. Check the Supabase table and policies.");
        setSuccess("Thank you. Your report was received privately for review. It will not appear as an individual public post.");
      } else {
        const existing = JSON.parse(localStorage.getItem("ridesafe-demo-reports") || "[]") as LocalReport[];
        localStorage.setItem("ridesafe-demo-reports", JSON.stringify([...existing, report]));
        setTrends(groupReports([...existing, report]));
        setSuccess("Saved the report categories in this browser’s demo data. Optional text is discarded in demo mode; connect Supabase to store it privately for review.");
      }
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" onClick={() => setActiveTab("pulse")}><Mark>R</Mark><span>raasta<span className="brand-dot">.</span></span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={activeTab === "pulse" ? "nav-link active" : "nav-link"} onClick={() => setActiveTab("pulse")}>Community pulse</button>
          <button className={activeTab === "report" ? "nav-link active" : "nav-link"} onClick={() => { setActiveTab("report"); document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }); }}>Report an issue</button>
        </nav>
        <button className="button button-dark nav-cta" onClick={() => { setActiveTab("report"); document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }); }}>Share an experience <span aria-hidden="true">↗</span></button>
      </header>

      <div id="top" className="page-shell">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> MADE FOR LAHORE RIDERS</div>
            <h1>Make every ride<br />a <em>little safer.</em></h1>
            <p className="hero-text">A community-powered view of ride experiences across Lahore. Share what happened. Help the next person make an informed choice.</p>
            <div className="hero-actions">
              <button className="button button-green" onClick={() => { setActiveTab("report"); document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }); }}>Share your experience <span aria-hidden="true">↗</span></button>
              <button className="text-button" onClick={() => document.getElementById("pulse")?.scrollIntoView({ behavior: "smooth" })}>Explore the pulse <span aria-hidden="true">↓</span></button>
            </div>
            <div className="trust-line"><span className="avatar-stack"><i>R</i><i>✓</i><i>•</i></span><span>Private reports. Public patterns.</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a ride moving through a city">
            <div className="art-sun" />
            <div className="art-label"><span className="art-label-icon">↗</span><span><b>Better rides start</b><br />with honest stories.</span></div>
            <div className="road-line road-one" /><div className="road-line road-two" />
            <div className="city-block block-one"><span /><span /><span /></div><div className="city-block block-two"><span /><span /></div><div className="city-block block-three"><span /><span /><span /><span /></div>
            <div className="tree tree-one"><i /><b /></div><div className="tree tree-two"><i /><b /></div>
            <div className="route route-a" /><div className="route route-b" />
            <div className="map-pin pin-one"><span>•</span></div><div className="map-pin pin-two"><span>✓</span></div>
            <div className="car"><div className="car-window" /><div className="wheel wheel-left" /><div className="wheel wheel-right" /></div>
            <span className="street-label street-one">GULBERG III</span><span className="street-label street-two">LAHORE</span>
          </div>
        </section>

        <section className="quick-stats" aria-label="Community data summary">
          <div><span className="stat-kicker">COMMUNITY SIGNAL</span><strong>{visibleTotal.toLocaleString()}</strong><span className="stat-caption">reports shown{demoMode ? " · demo data" : " · reviewed totals"}</span></div>
          <div className="stat-separator" />
          <div><span className="stat-kicker">RIDE SERVICES</span><strong>{providerTotals.length || 0}</strong><span className="stat-caption">with report patterns</span></div>
          <div className="stat-separator" />
          <div><span className="stat-kicker">BUILT ON</span><strong className="word-stat">Shared experience</strong><span className="stat-caption">never individual accusations</span></div>
          <div className="stat-note"><span className="note-spark">✳</span><span>We publish patterns,<br /><b>not personal details.</b></span></div>
        </section>

        <section className="pulse-section" id="pulse">
          <div className="section-heading">
            <div><div className="eyebrow muted">THE LAHORE RIDE PULSE</div><h2>What riders are<br className="mobile-break" /> talking about.</h2></div>
            <div className="filter-wrap"><label htmlFor="provider-filter">Show</label><select id="provider-filter" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}><option>All services</option>{providers.map((name) => <option key={name}>{name}</option>)}</select><span className="select-chevron">⌄</span></div>
          </div>
          <div className="pulse-grid">
            <div className="panel service-panel">
              <div className="panel-title-row"><div><h3>Reports by service</h3><p>Community reports grouped by ride service</p></div><span className="tiny-badge"><span className="tiny-dot" /> LIVE PULSE</span></div>
              <div className="bars-list">{providerTotals.length ? providerTotals.map((row, index) => <div className="bar-row" key={row.provider}><div className="bar-label"><span className={`provider-icon provider-${row.provider.toLowerCase()}`}>{row.provider === "inDrive" ? "i" : row.provider === "Other" ? "+" : row.provider[0]}</span><span className="provider-name">{row.provider}</span><span className="bar-count">{row.count}</span></div><div className="bar-track"><div className={`bar-fill fill-${index % 4}`} style={{ width: `${Math.max(8, (row.count / topCount) * 100)}%` }} /></div></div>) : <div className="empty-state">No reviewed groups meet the minimum display threshold yet.</div>}</div>
              <div className="chart-foot"><span>Showing groups with 3+ reports</span><span className="foot-mark">Aggregated for privacy&nbsp; ↗</span></div>
            </div>
            <div className="panel topics-panel">
              <div className="panel-title-row"><div><h3>Common topics</h3><p>What riders choose to report</p></div><span className="topic-flower">✳</span></div>
              <div className="topic-list">{issues.map((issue, index) => {
                const count = filtered.filter((row) => row.issue_type === issue).reduce((sum, row) => sum + row.report_count, 0);
                if (count < 3) return null;
                return <div className="topic-row" key={issue}><span className={`topic-icon topic-${index}`}>{["◌", "↗", "⌁", "₨", "○", "＋"][index]}</span><span>{issue}</span><span className="topic-count">{count}</span></div>;
              })}</div>
              <div className="topics-foot"><span>Patterns help start a conversation.</span><span aria-hidden="true">✦</span></div>
            </div>
          </div>
          <p className="data-caption">{demoMode ? "Demo figures are illustrative sample data, not verified reports from Lahore riders." : "Totals are based on reports reviewed by the community. Individual reports and descriptions are never shown here."}</p>
        </section>

        <section className="report-band" id="report">
          <div className="form-intro">
            <div className="eyebrow">YOUR EXPERIENCE MATTERS</div>
            <h2>A better ride<br />starts with <em>one story.</em></h2>
            <p>Share a few details about a ride that didn’t feel right. Your report stays private; only reviewed, grouped patterns can appear here.</p>
            <div className="privacy-promise"><span className="lock-icon">⌑</span><span><b>Your details stay private.</b><br />No names or trip IDs appear in public.</span></div>
            <div className="form-decoration">✳</div>
          </div>
          <form className="report-form" onSubmit={submitReport}>
            <div className="form-step"><span>01</span><b>About the ride</b><i /></div>
            <div className="field-row">
              <label>Ride service<select name="provider" required defaultValue=""><option value="" disabled>Select a service</option>{providers.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label>What happened?<select name="issue" required defaultValue=""><option value="" disabled>Choose a topic</option>{issues.map((issue) => <option key={issue}>{issue}</option>)}</select></label>
            </div>
            <div className="field-row">
              <label>Area of Lahore<select name="area" required defaultValue=""><option value="" disabled>Select a broad area</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></label>
              <label>Month of ride<input name="month" type="month" required max={new Date().toISOString().slice(0, 7)} /></label>
            </div>
            <label className="details-label">A little more context <span>OPTIONAL · UP TO 280 CHARACTERS</span><textarea name="details" maxLength={280} placeholder="What happened? Please leave out names, phone numbers, number plates, and exact addresses." /><small className="field-help">Private reviewer context only. In demo mode, this text is discarded.</small></label>
            <label className="consent"><input type="checkbox" required /><span>I understand my report is user-submitted and will be reviewed before any trend is published.</span></label>
            {success && <div className="form-message success-message" role="status">✓&nbsp; {success}</div>}
            {error && <div className="form-message error-message" role="alert">{error}</div>}
            <button className="button button-green submit-button" disabled={submitting}>{submitting ? "Sending…" : "Send report privately"}<span aria-hidden="true">↗</span></button>
            <p className="form-disclaimer">Raasta is not an emergency service. If you are in immediate danger, contact someone you trust or local emergency services.</p>
          </form>
        </section>

        <section className="how-section">
          <div className="eyebrow muted">SIMPLE BY DESIGN</div><h2>Every report helps<br />build the bigger picture.</h2>
          <div className="how-steps"><article><span>01</span><h3>Share privately</h3><p>Choose a service, a topic, and a broad area. No account needed.</p></article><article><span>02</span><h3>We review patterns</h3><p>Reports are checked and grouped. We don’t publish individual stories.</p></article><article><span>03</span><h3>Ride informed</h3><p>See community signals and decide what feels right for your next trip.</p></article></div>
        </section>
        <footer className="footer"><a className="brand" href="#top"><Mark>R</Mark><span>raasta<span className="brand-dot">.</span></span></a><span>Built for Lahore, with care.</span><a href="#report" onClick={() => setActiveTab("report")}>Share an experience ↑</a></footer>
      </div>
    </main>
  );
}
