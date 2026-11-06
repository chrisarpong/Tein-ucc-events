"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordInput } from "../../components/staff/PasswordInput";

const RESEND_MS = 4 * 60_000;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestCode = useAction(api.recovery.requestPasswordResetCode);
  const verifyCode = useAction(api.recovery.verifyPasswordResetCode);
  const setNewPassword = useAction(api.recovery.setNewPassword);
  const router = useRouter();

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function request() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestCode({ email: email.trim().toLowerCase() });
      setRequested(true);
      setResendAt(Date.now() + RESEND_MS);
      setNotice(result.message);
    } catch {
      setError("Could not process that request. Please wait and try again.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await verifyCode({ email: email.trim().toLowerCase(), code: code.trim() });
      if (!result.success) throw new Error("invalid");
      setResetToken(result.resetToken);
      setNotice("Code accepted. Choose a new password.");
    } catch {
      setError("That code is invalid or expired. You can request another after the four-minute wait.");
    } finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (password !== confirmPassword) { setBusy(false); setError("The passwords do not match."); return; }
    try {
      await setNewPassword({ email: email.trim().toLowerCase(), resetToken, newPassword: password });
      router.replace("/sign-in?passwordReset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password. Request a new code and try again.");
    } finally { setBusy(false); }
  }

  return <main className="staff-auth-page"><section className="staff-auth-card">
    <Link href="/sign-in" className="staff-auth-back">← Back to sign in</Link>
    <p className="staff-kicker">TEIN-UCC · Staff access</p>
    <h1>Reset your password</h1>
    {!requested && <>
      <p className="staff-subtitle">Enter your staff email. If it belongs to an active account with a verified recovery phone, we’ll send an SMS code.</p>
      <form className="staff-form" onSubmit={e => { e.preventDefault(); void request(); }}>
        <label>Staff email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        {error && <p className="staff-error" role="alert">{error}</p>}
        <button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Requesting…" : "Send reset code"}</button>
      </form>
    </>}
    {requested && !resetToken && <>
      <p className="staff-subtitle">If the account is eligible, a code was sent to its verified phone. The code expires after one minute.</p>
      <form className="staff-form" onSubmit={verify}>
        <label>8-digit SMS code<input type="text" inputMode="numeric" autoComplete="one-time-code" required minLength={8} maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} /></label>
        {error && <p className="staff-error" role="alert">{error}</p>}
        <button className="staff-button staff-button-primary" disabled={busy || code.length !== 8}>{busy ? "Verifying…" : "Verify code"}</button>
      </form>
      <button className="staff-button staff-button-outline" disabled={busy || secondsLeft > 0} onClick={() => void request()}>{secondsLeft > 0 ? `Request another code in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "Request another code"}</button>
    </>}
    {requested && resetToken && <>
      <p className="staff-subtitle">Choose a new password. You’ll need to sign in again on your devices.</p>
      <form className="staff-form" onSubmit={savePassword}>
        <label>New password <span className="staff-hint">At least 10 characters</span><PasswordInput autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Confirm new password<PasswordInput autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
        {error && <p className="staff-error" role="alert">{error}</p>}
        <button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
      </form>
    </>}
    {notice && <p className="staff-notice" role="status">{notice}</p>}
  </section></main>;
}
