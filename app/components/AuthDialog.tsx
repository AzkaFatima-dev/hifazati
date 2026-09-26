"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type AuthMode = "login" | "register" | "reset" | "update";

type Props = {
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSignedIn: () => void;
};

const heading: Record<AuthMode, string> = {
  login: "Welcome back",
  register: "Create your account",
  reset: "Reset your password",
  update: "Choose a new password",
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
    if ((mode === "register" || mode === "update") && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onSignedIn();
      } else if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (authError) throw authError;
        if (data.session) onSignedIn();
        else setMessage("Check your email for a confirmation link, then return here to log in.");
      } else if (mode === "reset") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (authError) throw authError;
        setMessage("If this address has an account, a password reset link is on its way.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. You can continue using Hifazati.");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const needsEmail = mode !== "update";
  const needsPassword = mode !== "reset";
  const needsConfirmation = mode === "register" || mode === "update";

  return <div className="auth-overlay">
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="auth-close" onClick={onClose} aria-label="Close">×</button>
      <span className="auth-mark">H</span>
      <span className="overline">HIFAZATI ACCOUNT</span>
      <h2 id="auth-title">{heading[mode]}</h2>
      <p className="auth-intro">{mode === "register" ? "Join the Lahore rider community. Your individual reports stay private." : mode === "login" ? "Sign in to share an experience privately." : mode === "reset" ? "We will email you a link to choose a new password." : "Use a password you have not used before."}</p>
      <form onSubmit={submit}>
        {needsEmail && <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus placeholder="you@example.com" /></label>}
        {needsPassword && <label>{mode === "update" ? "New password" : "Password"}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "login" ? undefined : 8} required autoFocus={mode === "update"} placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"} /></label>}
        {needsConfirmation && <label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required placeholder="Repeat your password" /></label>}
        {error && <p className="auth-feedback error" role="alert">{error}</p>}
        {message && <p className="auth-feedback success" role="status">{message}</p>}
        <button type="submit" className="primary-button auth-submit" disabled={busy || !supabase}>{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "register" ? "Create account" : mode === "reset" ? "Send reset link" : "Update password"}</button>
      </form>
      {mode === "login" && <div className="auth-links"><button type="button" onClick={() => switchMode("reset")}>Forgot password?</button><span>New here? <button type="button" onClick={() => switchMode("register")}>Register</button></span></div>}
      {mode === "register" && <div className="auth-links"><span>Already registered? <button type="button" onClick={() => switchMode("login")}>Log in</button></span></div>}
      {mode === "reset" && <div className="auth-links"><button type="button" onClick={() => switchMode("login")}>Back to login</button></div>}
      {mode === "update" && message && <div className="auth-links"><button type="button" onClick={onClose}>Continue to Hifazati</button></div>}
    </section>
  </div>;
}
