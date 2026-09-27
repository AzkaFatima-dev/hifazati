"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

const steps = [
  { number: "01", title: "Check before a ride", text: "Log in to check a driver's number, reported name, or exact photo file against reviewed reports." },
  { number: "02", title: "Share what happened", text: "Describe a real ride, add the driver's details, and upload proof. Anonymous submissions are welcome." },
  { number: "03", title: "Stay in control", text: "Track reports linked to your account, or save a private receipt to manage an anonymous report." },
];

export default function LandingPage() {
  const { user, isLoaded } = useUser();
  const [logoRun, setLogoRun] = useState(0);

  return <div className="landing-shell">
    <header className="landing-header">
      <Link href="/" className="landing-brand" aria-label="Hifazati home">
        <Image src="/hifazati-wordmark.png" alt="Hifazati" width={145} height={61} priority />
      </Link>
      <nav className="landing-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#privacy">Privacy</a>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <div className="landing-account">
        {isLoaded && (user ? <><Link href="/dashboard?view=profile" className="landing-account-link">My reports</Link><UserButton /></> : <>
          <SignInButton mode="modal"><button type="button" className="landing-login">Log in</button></SignInButton>
          <SignUpButton mode="modal"><button type="button" className="landing-register">Register <span aria-hidden="true">↗</span></button></SignUpButton>
        </>)}
      </div>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow"><span className="landing-eyebrow-line" /> A SAFER WAY TO RIDE IN LAHORE</span>
          <h1 id="landing-title">A little more clarity<br />before <em>the next ride.</em></h1>
          <p>Check a driver against reviewed ride reports, or share a concerning experience with proof. Hifazati keeps individual stories private while helping riders make more informed choices.</p>
          <div className="landing-hero-actions">
            <Link href="/dashboard?view=search" className="landing-primary">Check a driver <span aria-hidden="true">↗</span></Link>
            <Link href="/dashboard?view=report" className="landing-secondary">Share an experience <span aria-hidden="true">→</span></Link>
          </div>
          <div className="landing-hero-assurance"><span>Private proof</span><i /><span>Reviewed match counts</span><i /><span>No public driver profiles</span></div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-logo-stage">
            <span className="landing-logo-caption">RIDE SAFETY, WRITTEN TOGETHER</span>
            <div className="landing-logo-reveal" key={logoRun}>
              <Image src="/hifazati-wordmark.png" alt="Hifazati written with Urdu and English letters" width={1100} height={460} priority />
            </div>
            <button type="button" className="landing-replay" onClick={() => setLogoRun((run) => run + 1)}>↺ Replay the logo</button>
          </div>
          <figure className="landing-hero-photo"><Image src="/images/lahore-mall-road.jpg" alt="A street off Mall Road in Lahore" fill sizes="(max-width: 760px) 100vw, 48vw" priority /><figcaption>LAHORE, PAKISTAN</figcaption></figure>
          <div className="landing-floating-card" aria-label="What you can check"><span className="landing-floating-symbol"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span><div><strong>Check with care.</strong><p>Phone number · Reported name · Exact photo</p></div><span className="landing-floating-arrow" aria-hidden="true">↗</span></div>
        </div>
      </section>

      <div className="landing-trust-strip" aria-label="Hifazati principles"><div><span>01 / PRIVATE</span><strong>Your story stays yours.</strong></div><div><span>02 / REVIEWED</span><strong>Reports are reviewed first.</strong></div><div><span>03 / CAREFUL</span><strong>A match is not a verdict.</strong></div></div>

      <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
        <div className="landing-section-heading"><span className="landing-eyebrow">HOW HIFAZATI WORKS</span><h2 id="how-title">From one difficult ride<br />to a clearer picture.</h2><p>Each report begins privately. What riders see later is deliberately limited.</p></div>
        <div className="landing-how-body">
          <figure className="landing-how-photo"><Image src="/images/ride-driver-passenger.png" alt="View from the back seat of a driver at the wheel and a woman passenger inside the car" fill sizes="(max-width: 760px) 100vw, 40vw" /><figcaption>THE RIDE IS PERSONAL. THE RESPONSE SHOULD BE THOUGHTFUL.</figcaption></figure>
          <div className="landing-step-grid">
            {steps.map((step) => <article className="landing-step" key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="landing-privacy" id="privacy" aria-labelledby="privacy-title"><div className="landing-privacy-heading"><span className="landing-eyebrow">BUILT WITH RESTRAINT</span><h2 id="privacy-title">Safety starts with <em>trust.</em></h2><p>Reports can contain sensitive details. Hifazati limits what other riders can see and gives contributors a way to remove their own submissions.</p></div><div className="landing-privacy-grid"><div><span>01</span><h3>Proof stays private</h3><p>Evidence and report narratives are stored for review, never shown in driver searches.</p></div><div><span>02</span><h3>Search shows counts</h3><p>Signed-in riders see whether a reviewed report matches an identifier, without a public accusation page.</p></div><div><span>03</span><h3>You can delete</h3><p>Account reports appear in My reports. Anonymous submissions get a private receipt for later management.</p></div></div></section>

      <section className="landing-bottom-cta"><div className="landing-bottom-copy"><span>YOUR EXPERIENCE MATTERS</span><h2>Make the next ride a little more informed.</h2><p>Check what has been reviewed, or share your own experience privately with proof.</p><div className="landing-bottom-actions"><Link href="/dashboard?view=search" className="landing-primary">Check a driver <span aria-hidden="true">↗</span></Link><Link href="/dashboard?view=report" className="landing-bottom-link">Share a report →</Link></div></div><figure className="landing-bottom-photo"><Image src="/images/lahore-sunrise-road.jpg" alt="Morning traffic on a road in Lahore" fill sizes="(max-width: 760px) 100vw, 42vw" /></figure></section>
    </main>

    <footer className="landing-footer"><span>© {new Date().getFullYear()} Hifazati</span><span>For Lahore riders · Not an emergency service</span></footer>
  </div>;
}
