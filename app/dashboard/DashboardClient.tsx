"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import AuthDialog, { type AuthMode } from "../components/AuthDialog";
import { areas, driverPhotoTypes, evidenceBucket, evidenceTypes, issues, maxDriverPhotoBytes, maxEvidenceBytes, maxEvidenceFiles, providers, type Provider } from "../lib/report-options";
import { supabase } from "../lib/supabase";

type View = "dashboard" | "report" | "about";
type Trend = { provider: Provider; issue_type: string; area: string; report_count: number };
type LoadState = "not-connected" | "loading" | "ready" | "error";
type IconName = "grid" | "note" | "info" | "arrow" | "shield" | "lock" | "pin" | "check";

const palette = ["#bb484d", "#d36b70", "#e39b9f", "#edbfc2", "#e8d7d8", "#aeb4bd"];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const connected = Boolean(supabaseUrl && supabaseKey);

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "note": return <svg {...common}><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
    case "info": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case "shield": return <svg {...common}><path d="M12 2 20 5v6c0 5-3.3 8.3-8 11-4.7-2.7-8-6-8-11V5l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "lock": return <svg {...common}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "pin": return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "check": return <svg {...common}><path d="m4 12 5 5L20 6" /></svg>;
  }
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-glyph"><span /></div><strong>{title}</strong><p>{description}</p></div>;
}

export default function DashboardClient({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [filter, setFilter] = useState("All services");
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(connected ? "loading" : "not-connected");
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(connected);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!connected) return;
    fetch(`${supabaseUrl}/rest/v1/public_ride_trends?select=provider,issue_type,area,report_count`, {
      headers: { apikey: supabaseKey! },
    }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load trends");
      const rows = (await response.json()) as Trend[];
      setTrends(rows.filter((row) => row.report_count >= 3));
      setLoadState("ready");
    }).catch(() => setLoadState("error"));
  }, []);

  const visible = useMemo(() => trends.filter((row) => filter === "All services" || row.provider === filter), [trends, filter]);
  const total = visible.reduce((sum, row) => sum + row.report_count, 0);
  const serviceTotals = providers.map((provider) => ({ provider, count: visible.filter((row) => row.provider === provider).reduce((sum, row) => sum + row.report_count, 0) })).filter((row) => row.count > 0);
  const issueTotals = issues.map((issue) => ({ issue, count: visible.filter((row) => row.issue_type === issue).reduce((sum, row) => sum + row.report_count, 0) })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count);
  const areaTotals = [...new Set(visible.map((row) => row.area))].map((area) => ({ area, count: visible.filter((row) => row.area === area).reduce((sum, row) => sum + row.report_count, 0) })).filter((row) => row.count > 0).sort((a, b) => b.count - a.count);
  const maxService = Math.max(1, ...serviceTotals.map((row) => row.count));
  const hasData = loadState === "ready" && total > 0;
  const donut = issueTotals.map((row, index) => {
    const start = total ? issueTotals.slice(0, index).reduce((sum, earlier) => sum + earlier.count, 0) / total * 100 : 0;
    const end = total ? start + row.count / total * 100 : 0;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  }).join(", ");

  function openView(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setFormError("Could not log out. Please try again.");
    else {
      setSession(null);
      setFormMessage("");
      setFormError("");
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const evidenceFiles = form.getAll("evidence").filter((value): value is File => value instanceof File && value.size > 0);
    const driverPhoto = form.get("driverPhoto");
    const photoFile = driverPhoto instanceof File && driverPhoto.size > 0 ? driverPhoto : null;
    if (evidenceFiles.length < 1 || evidenceFiles.length > maxEvidenceFiles ||
        evidenceFiles.some((file) => !evidenceTypes.has(file.type) || file.size > maxEvidenceBytes) ||
        (photoFile && (!driverPhotoTypes.has(photoFile.type) || photoFile.size > maxDriverPhotoBytes))) {
      setFormError("Add 1–3 proof files (up to 20 MB each). The optional driver photo must be an image under 8 MB.");
      return;
    }
    setSubmitting(true);
    setFormMessage("");
    setFormError("");
    try {
      const reportId = crypto.randomUUID();
      async function uploadFile(file: File, kind: "evidence" | "driver-photo") {
        const response = await fetch("/api/reports/upload-url", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, kind, contentType: file.type, size: file.size }),
        });
        const prepared = await response.json() as { path?: string; token?: string; error?: string };
        if (!response.ok || !prepared.path || !prepared.token) throw new Error(prepared.error || "Could not prepare the upload.");
        const { error } = await supabase!.storage.from(evidenceBucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
        if (error) throw new Error("A proof file could not be uploaded. Please try again.");
        return prepared.path;
      }
      const evidencePaths = await Promise.all(evidenceFiles.map((file) => uploadFile(file, "evidence")));
      const driverPhotoPath = photoFile ? await uploadFile(photoFile, "driver-photo") : null;
      const response = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          provider: String(form.get("provider")),
          providerOther: String(form.get("providerOther") || ""),
          issueType: String(form.get("issue")),
          area: String(form.get("area")),
          tripMonth: String(form.get("month")),
          details: String(form.get("details") || ""),
          driverContact: String(form.get("driverContact") || ""),
          evidencePaths, driverPhotoPath,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the report.");
      formElement.reset();
      setSelectedProvider("");
      setFormMessage("Your report and proof were sent privately for review. Your identity and the driver's details will not appear publicly.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "We could not send your report. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link className="brand" href="/" aria-label="Hifazati home"><span className="brand-icon"><Icon name="shield" size={21} /></span><span className="brand-text">hifazati<span className="brand-period">.</span><small lang="ur">حفاظتی</small></span></Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={view === "dashboard" ? "side-link active" : "side-link"} onClick={() => openView("dashboard")}><Icon name="grid" /> Dashboard</button>
          <button className={view === "report" ? "side-link active" : "side-link"} onClick={() => openView("report")}><Icon name="note" /> Share a report</button>
          <button className={view === "about" ? "side-link active" : "side-link"} onClick={() => openView("about")}><Icon name="info" /> How it works</button>
        </nav>
      </div>
      <div className="sidebar-bottom"><div className="sidebar-privacy"><Icon name="lock" size={17} /><span>Private stories.<br /><b>Public patterns.</b></span></div></div>
    </aside>

    <div className="main-area">
      <header className="topbar"><div className="crumb"><span>Hifazati</span><span className="crumb-divider">/</span><b>{view === "dashboard" ? "Dashboard" : view === "report" ? "Share a report" : "How it works"}</b></div><div className="topbar-right"><span className="location-pill"><Icon name="pin" size={15} /> Lahore, Pakistan</span>{session ? <><span className="account-email" title={session.user.email}>{session.user.email}</span><button type="button" className="account-button" onClick={signOut}>Log out</button></> : !authLoading && connected && <><button type="button" className="account-button" onClick={() => setAuthMode("login")}>Log in</button><button type="button" className="account-button register-button" onClick={() => setAuthMode("register")}>Register</button></>}</div></header>
      <main className="content">
        {view === "dashboard" && <>
          <div className="page-heading"><div><span className="overline">COMMUNITY SAFETY DASHBOARD</span><h1>Ride experiences, <em>made visible.</em></h1><p>Reviewed patterns from riders in Lahore. Individual reports stay private.</p></div><button className="primary-button" onClick={() => openView("report")}>Share an experience <Icon name="arrow" size={17} /></button></div>
          <div className={`connection-banner ${loadState === "ready" ? "online" : ""}`}><span className="banner-dot" /><span>{loadState === "not-connected" ? "Live reporting has not opened yet. No sample or invented reports are displayed." : loadState === "loading" ? "Loading reviewed community trends…" : loadState === "error" ? "Reviewed trends are temporarily unavailable." : total === 0 ? "No reviewed report groups have been published yet." : "Showing reviewed report groups only. Counts may exclude smaller groups to protect privacy."}</span></div>

          <section className="metric-grid" aria-label="Published trend summary">
            <article className="metric-card"><span className="metric-icon soft-red"><Icon name="note" size={19} /></span><span className="metric-label">Reports in published groups</span><strong>{loadState === "ready" ? total.toLocaleString() : "—"}</strong><small>{loadState === "ready" ? "Only reviewed, grouped reports" : "Awaiting live data"}</small></article>
            <article className="metric-card"><span className="metric-icon soft-gray"><Icon name="grid" size={19} /></span><span className="metric-label">Services with patterns</span><strong>{loadState === "ready" ? serviceTotals.length : "—"}</strong><small>Ride services represented</small></article>
            <article className="metric-card"><span className="metric-icon soft-pink"><Icon name="shield" size={19} /></span><span className="metric-label">Most reported concern</span><strong className="metric-word">{loadState === "ready" && issueTotals.length ? issueTotals[0].issue : "—"}</strong><small>{loadState === "ready" && issueTotals.length ? "In published groups" : "No published concerns yet"}</small></article>
          </section>

          <div className="section-title"><div><h2>Community overview</h2><p>Patterns become visible after reports are reviewed and grouped.</p></div><label className="filter-control">Service <select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All services</option>{providers.map((provider) => <option key={provider}>{provider}</option>)}</select></label></div>
          <section className="chart-grid" aria-label="Community trends">
            <article className="card chart-card"><div className="card-heading"><div><h3>Reports by service</h3><p>Share of published report groups</p></div><span className="card-tag">REVIEWED DATA</span></div>{hasData ? <div className="bar-list">{serviceTotals.map((row) => <div className="bar-item" key={row.provider}><div className="bar-meta"><b>{row.provider}</b><span>{row.count}</span></div><div className="bar-rail"><span style={{ width: `${(row.count / maxService) * 100}%` }} /></div></div>)}</div> : <EmptyState title="No report patterns yet" description="Reviewed report groups will appear here once live data is available." />}<div className="card-foot">Only groups with at least three reports are published.</div></article>
            <article className="card chart-card"><div className="card-heading"><div><h3>Reported concerns</h3><p>Topics riders chose to report</p></div><span className="mini-accent">●</span></div>{hasData ? <div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${donut})` }}><div><b>{total}</b><span>reports shown</span></div></div><div className="donut-legend">{issueTotals.map((row, index) => <div key={row.issue}><i style={{ background: palette[index % palette.length] }} /><span>{row.issue}</span><b>{row.count}</b></div>)}</div></div> : <EmptyState title="No concerns published" description="This chart will reflect reviewed reports without exposing anyone's story." />}<div className="card-foot">Counts are user-submitted and are not independently verified findings.</div></article>
          </section>

          <section className="lower-grid">
            <article className="card process-card"><div className="card-heading"><div><h3>How each report is handled</h3><p>Simple, private, and built around patterns</p></div></div><div className="process-list"><div><span>01</span><div><b>Share your experience</b><p>Choose a service, a topic, and a broad Lahore area.</p></div></div><div><span>02</span><div><b>Review before publishing</b><p>Individual descriptions stay private while reports are checked.</p></div></div><div><span>03</span><div><b>See the bigger picture</b><p>Only grouped counts appear on this dashboard.</p></div></div></div></article>
            <article className="card area-card"><div className="card-heading"><div><h3>Lahore area overview</h3><p>Broad locations from published groups</p></div></div><div className="table-head"><span>AREA</span><span>REPORTS SHOWN</span></div>{hasData ? <div className="area-rows">{areaTotals.map((row) => <div key={row.area}><span><Icon name="pin" size={15} />{row.area}</span><b>{row.count}</b></div>)}</div> : <div className="table-empty">No area trends are published yet.</div>}</article>
          </section>
        </>}


        {view === "report" && <>
          <div className="page-heading"><div><span className="overline">PRIVATE INCIDENT REPORT</span><h1>Your experience <em>matters.</em></h1><p>No account is needed. Your report, driver details, and proof files stay private while they are reviewed.</p></div></div>
          <div className="report-layout">
            <section className="card form-card">
              <div className="card-heading"><div><h3>About the ride</h3><p>Share only what is needed to understand the incident. Do not include your own contact details or exact addresses.</p></div><span className="card-tag">PRIVATE SUBMISSION</span></div>
              {!connected && <div className="form-offline"><Icon name="info" size={19} /><span>Reporting is temporarily unavailable.</span></div>}
              <form onSubmit={submitReport}>
                <fieldset disabled={!connected || submitting}>
                  <div className="field-grid">
                    <label><span className="field-label">Ride service <b className="required-mark" aria-hidden="true">*</b></span><select name="provider" required value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}><option value="" disabled>Select a service</option>{providers.map((provider) => <option key={provider}>{provider}</option>)}</select></label>
                    <label><span className="field-label">Type of concern <b className="required-mark" aria-hidden="true">*</b></span><select name="issue" required defaultValue=""><option value="" disabled>Choose a topic</option>{issues.map((issue) => <option key={issue}>{issue}</option>)}</select></label>
                    <label><span className="field-label">Lahore area <b className="required-mark" aria-hidden="true">*</b></span><input name="area" list="lahore-areas" type="text" required minLength={2} maxLength={80} autoComplete="off" placeholder="Search or type your area" /><small>Use the neighborhood, not an exact address.</small></label>
                    <label><span className="field-label">Month of ride <b className="required-mark" aria-hidden="true">*</b></span><input name="month" type="month" required max={new Date().toISOString().slice(0, 7)} /></label>
                    <label><span className="field-label">Driver contact number <b className="required-mark" aria-hidden="true">*</b></span><input name="driverContact" type="tel" inputMode="tel" required minLength={9} maxLength={24} placeholder="03XX XXXXXXX or +92…" /><small>Private to reviewers</small></label>
                    {selectedProvider === "Other" && <label><span className="field-label">Describe the service or local ride <b className="required-mark" aria-hidden="true">*</b></span><input name="providerOther" required minLength={3} maxLength={160} placeholder="E.g. local rickshaw from a nearby stand" /></label>}
                  </div>
                  <datalist id="lahore-areas">{areas.map((area) => <option key={area} value={area} />)}</datalist>
                  <label className="details-field"><span className="field-label">What happened? <b className="required-mark" aria-hidden="true">*</b></span><textarea name="details" required maxLength={2000} rows={5} placeholder="Describe the incident without sharing your own identifying details." /></label>
                  <label className="file-field"><span className="field-label">Proof of the incident <b className="required-mark" aria-hidden="true">*</b></span><span>1–3 FILES · UP TO 20 MB EACH</span><input name="evidence" type="file" multiple required accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp3,.m4a,.wav,.ogg,.webm,.mp4,.mov,.pdf" /><small>Images, audio messages, short videos, or PDF documents. Files are never shown publicly.</small></label>
                  <label className="file-field">Driver photo <span>UP TO 8 MB</span><input name="driverPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" /><small>Only add a photo if you have one. It stays private with the report.</small></label>
                  <label className="consent"><input type="checkbox" required /><span>I understand this is a private, user-submitted claim. Only reviewed group counts may appear publicly.</span></label>
                  {formMessage && <div className="form-feedback success" role="status">{formMessage}</div>}
                  {formError && <div className="form-feedback error" role="alert">{formError}</div>}
                  <button className="primary-button submit-button" type="submit">{submitting ? "Uploading proof…" : "Send report privately"}<Icon name="arrow" size={17} /></button>
                </fieldset>
              </form>
            </section>
            <aside className="report-side"><div className="card trust-card"><span className="trust-symbol"><Icon name="lock" size={23} /></span><h3>Privacy comes first.</h3><p>Anonymous reports are welcome. Your proof files and the driver&apos;s number are stored privately for review.</p><div className="trust-row"><Icon name="check" size={17} /> No public driver profiles</div><div className="trust-row"><Icon name="check" size={17} /> No public phone numbers or photos</div><div className="trust-row"><Icon name="check" size={17} /> No public descriptions</div></div><p className="emergency-note">Hifazati is not an emergency service. If you are in immediate danger, contact someone you trust or local emergency services.</p></aside>
          </div>
        </>}

        {view === "about" && <><div className="page-heading"><div><span className="overline">ABOUT HIFAZATI</span><h1>Safer conversations<br /><em>start here.</em></h1><p>A private place to report a difficult ride and a public view of reviewed patterns in Lahore.</p></div><button className="primary-button" onClick={() => openView("report")}>Share an experience <Icon name="arrow" size={17} /></button></div><div className="about-grid"><div className="card about-card"><span>01 / PRIVATE</span><Icon name="note" size={30} /><h3>Tell us what happened</h3><p>Reports are structured around service, concern, broad area, and month. Extra context stays private.</p></div><div className="card about-card"><span>02 / REVIEWED</span><Icon name="shield" size={30} /><h3>Look for patterns</h3><p>Reports are reviewed before being counted. Individual claims are not posted on the site.</p></div><div className="card about-card"><span>03 / SHARED</span><Icon name="grid" size={30} /><h3>Inform the community</h3><p>Only groups of at least three appear publicly, so people can see themes without identifying riders.</p></div></div></>}
      </main>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Hifazati · حفاظتی</span><span>Built for Lahore riders</span></footer>
    </div>
    {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSignedIn={() => setAuthMode(null)} />}
  </div>;
}
