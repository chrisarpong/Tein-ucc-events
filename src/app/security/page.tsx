"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordInput } from "../../components/staff/PasswordInput";

export default function AccountSecurityPage() {
  const staff = useQuery(api.staff.me);
  const requestCode = useAction(api.recovery.requestMyPhoneChangeCode);
  const verifyCode = useAction(api.recovery.verifyMyPhoneChangeCode);
  const changePassword = useAction(api.recovery.changeOwnPassword);
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestCode({ phone, currentPassword });
      if (!result.success) { setError(result.message); return; }
      setRequested(true); setCode("");
      if (result.deliveryConfirmed) setNotice(result.message);
      else setError(result.message);
    } catch {
      setError("Could not send a verification code. Wait four minutes before trying again.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await verifyCode({ phone, code: code.trim() });
      if (!result.success) {
        const messages: Record<string, string> = {
          delivery_failed: "The SMS provider did not confirm delivery, so this code cannot be verified. Wait four minutes from your request, then request a new code.",
          expired: "This code expired after one minute. Wait until four minutes have passed from your request, then request a new code.",
          invalid_code: "That code does not match the latest code. Check the SMS and try again.",
          too_many_attempts: "Too many incorrect attempts. Request a fresh code after four minutes.",
          not_ready: "There is no active code for this phone number. Request a new code.",
        };
        setError(messages[result.reason ?? ""] ?? "Could not verify this code. Request a new one after four minutes.");
        return;
      }
      setPhone(""); setCode(""); setCurrentPassword(""); setRequested(false);
      setNotice("Your verified recovery phone has been updated. You can now use it to sign in or reset your password.");
    } catch {
      setError("Verification could not be completed. Refresh this page to check whether the phone was saved; if not, request a new code after four minutes.");
    } finally { setBusy(false); }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      router.replace("/sign-in?passwordChanged=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
      setBusy(false);
    }
  }

  return <>
    <div className="staff-page-heading"><div><p className="staff-kicker">ACCOUNT ACCESS</p><h1>Account security</h1><p>Manage the verified phone for sign-in and password recovery.</p></div></div>
    {notice && <p className="staff-notice" role="status">{notice}</p>}
    {error && <p className="staff-error" role="alert">{error}</p>}
    <section className="staff-section">
      <h2>Change your password</h2>
      <p>After signing in with a temporary password, use this form to choose your own password. You will need to sign in again afterwards.</p>
      <form className="staff-form staff-inline-form" onSubmit={submitPasswordChange}>
        <label>Current password<PasswordInput autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
        <label>New password <span className="staff-hint">At least 10 characters</span><PasswordInput autoComplete="new-password" required minLength={10} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
        <label>Confirm new password<PasswordInput autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
        <button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </section>
    <section className="staff-section">
      <h2>Verified recovery phone</h2>
      <p>{staff?.recoveryPhoneVerified ? `Current number: ${staff.recoveryPhoneMasked}` : "No verified recovery phone is set. Add one so you can sign in with your phone or reset your password by SMS."}</p>
      {!requested ? <form className="staff-form staff-inline-form" onSubmit={request}>
        <label>New phone number<input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={event => setPhone(event.target.value)} placeholder="024 000 0000 or +233 24 000 0000" /></label>
        <label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
        <button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Sending…" : "Verify password and send code"}</button>
      </form> : <form className="staff-form staff-inline-form" onSubmit={verify}>
        <label>8-digit code sent to the new phone<input type="text" inputMode="numeric" autoComplete="one-time-code" required minLength={8} maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} /></label>
        <p className="staff-hint">The code expires after one minute. Request another code after four minutes.</p>
        <button className="staff-button staff-button-primary" disabled={busy || code.length !== 8}>{busy ? "Verifying…" : "Verify and save phone"}</button>
        <button className="staff-button staff-button-outline" type="button" disabled={busy} onClick={() => { setRequested(false); setCode(""); setNotice(""); }}>Back to phone form</button>
      </form>}
    </section>
    <section className="staff-section"><h2>How phone sign-in works</h2><p>Use your verified phone number and your existing password on the staff sign-in page. Your email remains available as a sign-in option.</p></section>
  </>;
}
