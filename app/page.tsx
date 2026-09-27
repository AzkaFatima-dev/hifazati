"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

const steps = [
  { number: "01", title: "Share privately", text: "Choose a service and add the driver's contact number and at least one proof file. No account is needed." },
  { number: "02", title: "Look for patterns", text: "Reports are reviewed and grouped by concern, service, and broad area." },
  { number: "03", title: "Help riders see more", text: "The dashboard shows grouped trends, never individual accusations." },
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
        <Link href="/dashboard">Dashboard</Link>
      </nav>
      <div className="landing-account">
        {isLoaded && (user ? <><Link href="/dashboard" className="landing-account-link">My dashboard</Link><UserButton /></> : <>
          <SignInButton mode="modal"><button type="button" className="landing-login">Log in</button></SignInButton>
          <SignUpButton mode="modal"><button type="button" className="landing-register">Register <span aria-hidden="true">↗</span></button></SignUpButton>
        </>)}
      </div>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">Every ride has a story.<br /><em>Every story deserves care.</em></h1>
          <p>Hifazati is a private place to share a concerning ride experience, with supporting proof, and see the bigger picture through reviewed, grouped reports.</p>
          <div className="landing-hero-actions">
            <Link href="/dashboard?view=report" className="landing-primary">Share an experience <span aria-hidden="true">↗</span></Link>
            <Link href="/dashboard" className="landing-secondary">Explore the dashboard <span aria-hidden="true">→</span></Link>
          </div>
          <div className="landing-privacy-note"><span className="landing-lock" aria-hidden="true">✦</span> Your story stays private. Only grouped patterns appear publicly.</div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-logo-stage">
            <div className="landing-logo-reveal" key={logoRun}>
              <Image src="/hifazati-wordmark.png" alt="Hifazati written with Urdu and English letters" width={1100} height={460} priority />
            </div>
            <button type="button" className="landing-replay" onClick={() => setLogoRun((run) => run + 1)}>↺ Replay the logo</button>
          </div>
          <figure className="landing-hero-photo"><Image src="/images/lahore-mall-road.jpg" alt="A street off Mall Road in Lahore" fill sizes="(max-width: 760px) 100vw, 48vw" priority /><figcaption>LAHORE, PAKISTAN</figcaption></figure>
        </div>
      </section>

      <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
        <div className="landing-section-heading"><span className="landing-eyebrow">THE IDEA</span><h2 id="how-title">A clearer picture starts with one report.</h2><p>No public driver profiles. No exact trip locations. Just a careful way to see what riders are experiencing.</p></div>
        <div className="landing-how-body">
          <figure className="landing-how-photo"><Image src="/images/ride-driver-passenger.png" alt="View from the back seat of a driver at the wheel and a woman passenger inside the car" fill sizes="(max-width: 760px) 100vw, 40vw" /></figure>
          <div className="landing-step-grid">
            {steps.map((step) => <article className="landing-step" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="landing-bottom-cta"><div className="landing-bottom-copy"><span>YOUR EXPERIENCE MATTERS</span><h2>Help make ride concerns visible.</h2><p>Submit anonymously with proof. Individual reports stay private while reviewed patterns can inform other riders.</p><Link href="/dashboard?view=report" className="landing-primary">Share a report <span aria-hidden="true">↗</span></Link></div><figure className="landing-bottom-photo"><Image src="/images/lahore-sunrise-road.jpg" alt="Morning traffic on a road in Lahore" fill sizes="(max-width: 760px) 100vw, 42vw" /></figure></section>
    </main>

    <footer className="landing-footer"><span>© {new Date().getFullYear()} Hifazati</span><span>For Lahore riders · Not an emergency service</span></footer>
  </div>;
}
