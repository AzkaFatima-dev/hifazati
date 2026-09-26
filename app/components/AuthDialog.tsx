"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type AuthMode = "login" | "register";

type Props = {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSignedIn: () => void;
};

const heading: Record<AuthMode, string> = {
  login: "Welcome back",
  register: "Create your account",
};

export default function AuthDialog({ mode, onClose, onModeChange, onSignedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function switchMode(next: AuthMode) {
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    onModeChange(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    setMessage("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onSignedIn();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.session) onSignedIn();
        else setMessage("Your account is awaiting email confirmation. Please contact the Hifazati team if no email arrives.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-overlay">
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="auth-close" onClick={onClose} aria-label="Close">×</button>
      <span className="auth-mark">H</span>
      <span className="overline">HIFAZATI ACCOUNT</span>
      <h2 id="auth-title">{heading[mode]}</h2>
      <p className="auth-intro">{mode === "register" ? "Create an optional account to use Hifazati. You can also submit a private report without one. Password recovery is not available during this demo." : "Sign in to your Hifazati account. Reports can also be submitted anonymously."}</p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus placeholder="you@example.com" /></label>
        <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "login" ? undefined : 8} required placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} /></label>
        {mode === "register" && <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required placeholder="Repeat your password" /></label>}
        {error && <p className="auth-feedback error" role="alert">{error}</p>}
        {message && <p className="auth-feedback success" role="status">{message}</p>}
        <button type="submit" className="primary-button auth-submit" disabled={busy || !supabase}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      {mode === "login" && <div className="auth-links"><span>New here? <button type="button" onClick={() => switchMode("register")}>Register</button></span></div>}
      {mode === "register" && <div className="auth-links"><span>Already registered? <button type="button" onClick={() => switchMode("login")}>Log in</button></span></div>}
    </section>
  </div>;
}
