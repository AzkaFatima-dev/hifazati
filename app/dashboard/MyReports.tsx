"use client";

import { FormEvent, useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { forgetGuestReceipt, getGuestReceipts, receiptPattern, saveGuestReceipt } from "../lib/report-receipts";

type Report = {
  id: string;
  provider: string;
  provider_other: string | null;
  issue_type: string;
  area: string;
  trip_month: string | null;
  details: string | null;
  driver_name: string;
  driver_contact: string;
  review_status: "pending" | "reviewed" | "rejected";
  created_at: string;
};
type ManagedReport = Report & { receipt?: string };

function ReportCard({ report, onDelete, deleting }: { report: ManagedReport; onDelete: (report: ManagedReport) => void; deleting: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const date = new Date(report.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  const contactHint = `•••• ${report.driver_contact.replace(/\D/g, "").slice(-4)}`;
  return <article className="card my-report-card">
    <div className="my-report-top"><div><span className="my-report-date">Submitted {date}</span><h3>{report.provider === "Other" ? report.provider_other || "Local ride" : report.provider} · {report.issue_type}</h3></div><span className={`my-report-status ${report.review_status}`}>{report.review_status}</span></div>
    <p className="my-report-meta">{report.area}{report.trip_month ? ` · ${new Date(report.trip_month).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}` : ""} · Driver: {report.driver_name} ({contactHint})</p>
    {report.details && <p className="my-report-details">{report.details}</p>}
    <p className="my-report-private">Your proof files remain private and are scheduled for removal when you delete this report.</p>
    {confirming ? <div className="my-report-confirm"><span>Delete this report and its proof files? This cannot be undone.</span><button type="button" className="my-report-delete" disabled={deleting} onClick={() => onDelete(report)}>{deleting ? "Deleting…" : "Yes, delete"}</button><button type="button" className="account-button" disabled={deleting} onClick={() => setConfirming(false)}>Cancel</button></div> : <button type="button" className="my-report-delete-link" onClick={() => setConfirming(true)}>Delete report</button>}
  </article>;
}

export default function MyReports({ onShare }: { onShare: () => void }) {
  const { user, isLoaded } = useUser();
  const [receipts, setReceipts] = useState<string[]>(() => getGuestReceipts());
  const [receiptInput, setReceiptInput] = useState("");
  const [accountReports, setAccountReports] = useState<Report[]>([]);
  const [guestReports, setGuestReports] = useState<ManagedReport[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingReceipt, setAddingReceipt] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userId = user?.id ?? null;
  const loadKey = `${userId || "guest"}:${receipts.join("|")}`;
  const loading = !isLoaded || loadedKey !== loadKey;

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    async function load() {
      try {
        const [accountResponse, guestResponse] = await Promise.all([
          userId ? fetch("/api/my-reports", { cache: "no-store" }) : null,
          receipts.length ? fetch("/api/my-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receipts }), cache: "no-store" }) : null,
        ]);
        const accountBody = accountResponse ? await accountResponse.json() as { reports?: Report[]; error?: string } : { reports: [] };
        const guestBody = guestResponse ? await guestResponse.json() as { reports?: Report[]; error?: string } : { reports: [] };
        if ((accountResponse && !accountResponse.ok) || (guestResponse && !guestResponse.ok)) throw new Error(accountBody.error || guestBody.error || "Could not load your reports.");
        const receiptById = new Map(receipts.map((receipt) => [receipt.split(".")[0].toLowerCase(), receipt]));
        if (active) {
          setAccountReports(accountBody.reports ?? []);
          setGuestReports((guestBody.reports ?? []).map((report) => ({ ...report, receipt: receiptById.get(report.id.toLowerCase()) })));
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load your reports.");
      } finally {
        if (active) setLoadedKey(loadKey);
      }
    }
    load();
    return () => { active = false; };
  }, [isLoaded, userId, receipts, loadKey]);

  async function addReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const receipt = receiptInput.trim();
    if (!receiptPattern.test(receipt)) { setError("Enter the complete private receipt shown after submission."); return; }
    setAddingReceipt(true);
    setError("");
    try {
      const response = await fetch("/api/my-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receipts: [receipt] }) });
      const body = await response.json() as { reports?: Report[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Could not check that receipt.");
      if (!body.reports?.some((report) => report.id.toLowerCase() === receipt.split(".")[0].toLowerCase())) throw new Error("No report matches that private receipt.");
      saveGuestReceipt(receipt);
      setReceipts(getGuestReceipts());
      setReceiptInput("");
      setMessage("Private receipt saved in this browser.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check that receipt.");
    } finally {
      setAddingReceipt(false);
    }
  }

  async function deleteReport(report: ManagedReport) {
    setDeletingId(report.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/my-reports/${report.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: report.receipt || null }),
      });
      const body = await response.json() as { deleted?: boolean; filesPending?: boolean; error?: string };
      if ((!response.ok && response.status !== 202) || !body.deleted) throw new Error(body.error || "Could not delete the report.");
      setAccountReports((existing) => existing.filter((item) => item.id !== report.id));
      setGuestReports((existing) => existing.filter((item) => item.id !== report.id));
      if (report.receipt) { forgetGuestReceipt(report.receipt); setReceipts(getGuestReceipts()); }
      setMessage(body.filesPending ? "Report deleted. Private file cleanup is pending with the site administrator." : "Report and its private proof files were deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the report.");
    } finally {
      setDeletingId(null);
    }
  }

  return <>
    <div className="page-heading"><div><span className="overline">YOUR PRIVATE SPACE</span><h1>My <em>reports.</em></h1><p>See what you submitted and remove a report when you choose.</p></div><button type="button" onClick={onShare} className="primary-button">Share another report</button></div>
    {!isLoaded || loading ? <div className="card my-reports-empty">Loading your reports…</div> : <>
      {!user && <div className="card my-reports-gate"><h2>Log in to see reports from your account</h2><p>Anonymous reports can still be managed below with their private receipts.</p><SignInButton mode="modal"><button type="button" className="primary-button">Log in</button></SignInButton></div>}
      {user && <section className="my-reports-section"><h2>Reports linked to your account</h2>{accountReports.length ? <div className="my-reports-list">{accountReports.map((report) => <ReportCard key={report.id} report={report} onDelete={deleteReport} deleting={deletingId === report.id} />)}</div> : <div className="card my-reports-empty">No reports linked to this account yet. Reports sent while logged out need their private receipt.</div>}</section>}
      <section className="my-reports-section"><h2>Anonymous reports</h2><p className="my-reports-note">Anonymous reports are not linked to an account. This browser remembers their private receipts; paste a receipt here if you saved it elsewhere.</p><form className="my-receipt-form" onSubmit={addReceipt}><label htmlFor="report-receipt">Private receipt</label><div><input id="report-receipt" type="text" autoComplete="off" value={receiptInput} onChange={(event) => setReceiptInput(event.target.value)} placeholder="Paste your private receipt" /><button type="submit" className="account-button" disabled={addingReceipt}>{addingReceipt ? "Checking…" : "Add receipt"}</button></div></form>{guestReports.length ? <div className="my-reports-list">{guestReports.map((report) => <ReportCard key={report.id} report={report} onDelete={deleteReport} deleting={deletingId === report.id} />)}</div> : <div className="card my-reports-empty">No anonymous reports saved in this browser.</div>}</section>
    </>}
    {message && <div className="form-feedback success" role="status">{message}</div>}
    {error && <div className="form-feedback error" role="alert">{error}</div>}
  </>;
}
