"use client";

import { FormEvent, useState } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { driverPhotoTypes, maxDriverPhotoBytes } from "../lib/report-options";

type Method = "phone" | "name" | "photo";
type SearchResult = { count: number; method: Method };

const descriptions: Record<Method, string> = {
  phone: "Checks the full driver number, including common +92 and 03 formats.",
  name: "Checks the name exactly as reported. Different drivers can share the same name.",
  photo: "Matches only the exact same image file. It does not recognize a face in another photo.",
};

export default function DriverSearch() {
  const { isLoaded, user } = useUser();
  const [method, setMethod] = useState<Method>("phone");
  const [value, setValue] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  function changeMethod(next: Method) {
    setMethod(next);
    setValue("");
    setPhoto(null);
    setResult(null);
    setError("");
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError("");
    if (!user) return;
    setSearching(true);
    try {
      let searchValue = value.trim();
      if (method === "photo") {
        if (!photo || !driverPhotoTypes.has(photo.type) || photo.size < 1 || photo.size > maxDriverPhotoBytes) {
          throw new Error("Choose a JPG, PNG, WebP, HEIC, or HEIF image under 8 MB.");
        }
        const digest = await crypto.subtle.digest("SHA-256", await photo.arrayBuffer());
        searchValue = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      }
      const response = await fetch("/api/drivers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, value: searchValue }),
      });
      const body = await response.json() as { count?: number; error?: string };
      if (!response.ok || typeof body.count !== "number") throw new Error(body.error || "Search is temporarily unavailable.");
      setResult({ count: body.count, method });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search is temporarily unavailable.");
    } finally {
      setSearching(false);
    }
  }

  return <>
    <div className="page-heading"><div><span className="overline">PRIVATE DRIVER CHECK</span><h1>Check before <em>you ride.</em></h1><p>Search identifiers in reviewed, private ride reports. No report narrative or proof file is shown here.</p></div></div>
    <section className="card lookup-card">
      {!isLoaded ? <p className="lookup-muted">Checking your account…</p> : !user ? <div className="lookup-gate"><h2>Log in to check a driver</h2><p>A free account is required to search. You can still share a report anonymously.</p><div className="lookup-actions"><SignInButton mode="modal"><button type="button" className="primary-button">Log in</button></SignInButton><SignUpButton mode="modal"><button type="button" className="account-button">Register</button></SignUpButton></div></div> : <>
        <div className="card-heading"><div><h3>Search reviewed reports</h3><p>Choose one identifier. Searches are limited to 20 per account in 24 hours.</p></div><span className="card-tag">ACCOUNT ONLY</span></div>
        <div className="lookup-tabs" role="group" aria-label="Search method">
          {(["phone", "name", "photo"] as const).map((option) => <button key={option} type="button" disabled={searching} className={method === option ? "lookup-tab active" : "lookup-tab"} aria-pressed={method === option} onClick={() => changeMethod(option)}>{option === "phone" ? "Phone number" : option === "name" ? "Driver name" : "Photo file"}</button>)}
        </div>
        <p className="lookup-hint">{descriptions[method]}</p>
        <form className="lookup-form" onSubmit={search}>
          {method === "photo" ? <label>Driver photo file<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required disabled={searching} onChange={(event) => { setPhoto(event.target.files?.[0] || null); setResult(null); setError(""); }} /></label> : <label>{method === "phone" ? "Driver phone number" : "Driver name"}<input type={method === "phone" ? "tel" : "text"} autoComplete="off" required disabled={searching} maxLength={method === "phone" ? 24 : 100} value={value} onChange={(event) => { setValue(event.target.value); setResult(null); setError(""); }} placeholder={method === "phone" ? "03XX XXXXXXX or +92…" : "Name shown in the ride app"} /></label>}
          <button className="primary-button" type="submit" disabled={searching}>{searching ? "Checking…" : "Check reviewed reports"}</button>
        </form>
        {error && <div className="form-feedback error" role="alert">{error}</div>}
        {result && <div className="lookup-result" role="status"><strong>{result.count === 0 ? "No reviewed match found" : `${result.count} rider ${result.count === 1 ? "report" : "reports"} matched`}</strong><p>{result.count === 0 ? "This does not guarantee the driver is safe. New or unreviewed reports are not included." : result.method === "photo" ? "The exact image file was attached to a reviewed report. This is not face recognition or proof of misconduct." : result.method === "name" ? "That exact name appears in reviewed reports. Names can be shared, and a match does not confirm this is the same driver or prove a claim." : "That number appears in reviewed reports. Numbers can change hands, and a match does not prove a claim."}</p>{result.count > 0 && <p>Reviewed means the report was checked for inclusion in search; it does not mean the incident was independently confirmed.</p>}</div>}
      </>}
    </section>
    <p className="lookup-disclaimer">Hifazati reports are submitted by users and reviewed before they can appear in lookup results. A match is a reason to be careful, not a verified finding against a person.</p>
  </>;
}
