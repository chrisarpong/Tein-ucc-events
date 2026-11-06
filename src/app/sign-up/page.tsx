"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordInput } from "../../components/staff/PasswordInput";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const { signIn } = useAuthActions();
  const recordLogin = useMutation(api.staff.recordLogin);
  const requestPhoneCode = useAction(api.recovery.requestSignupPhoneCode);
  const verifyPhoneCode = useAction(api.recovery.verifySignupPhoneCode);
  const router = useRouter();

  function clearPhoneVerification() {
    setVerificationToken("");
    setPhoneCodeRequested(false);
    setPhoneCode("");
    setNotice("");
  }

  async function sendPhoneCode() {
    setPhoneBusy(true); setError(""); setNotice("");
    try {
      await requestPhoneCode({ email: email.trim().toLowerCase(), inviteCode: inviteCode.trim().toUpperCase(), phone });
      setPhoneCodeRequested(true);
      setNotice("If the invitation and phone are valid, a verification code will be sent. Codes expire after one minute; a new code can be requested after four minutes.");
    } catch {
      setError("Could not request a phone verification code. Check the details and try again later.");
    } finally { setPhoneBusy(false); }
  }

  async function verifyPhone() {
    setPhoneBusy(true); setError(""); setNotice("");
    try {
      const result = await verifyPhoneCode({ email: email.trim().toLowerCase(), phone, code: phoneCode.trim() });
      if (!result.success) throw new Error("invalid");
      setVerificationToken(result.verificationToken);
      setNotice("Phone verified. Finish creating your staff account.");
    } catch {
      setError("That code is invalid or expired. Request a new code after the four-minute wait.");
    } finally { setPhoneBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (!verificationToken) { setBusy(false); setError("Verify your phone number before creating the account."); return; }
    try {
      await signIn("password", {
        flow: "signUp",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        inviteCode: inviteCode.trim().toUpperCase(),
        recoveryPhone: phone,
        phoneVerificationToken: verificationToken,
        password,
      });
      const result = await recordLogin({});
      router.replace(result.role === "checkin" ? "/checkin" : "/admin");
    } catch {
      setError("We couldn’t create the account. Check the invite, verified phone, and password requirements.");
    } finally { setBusy(false); }
  }

  return <main className="staff-auth-page"><section className="staff-auth-card">
    <Link href="/" className="staff-auth-back">← Summit website</Link>
    <p className="staff-kicker">TEIN-UCC · Staff access</p>
    <h1>Join the summit desk</h1>
    <p className="staff-subtitle">Use the invited email and one-time code. Verify a phone number for sign-in and password recovery.</p>
    <form onSubmit={submit} className="staff-form">
      <label>Full name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Invited email<input type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); clearPhoneVerification(); }} /></label>
      <label>One-time invite code<input autoComplete="one-time-code" required minLength={8} maxLength={8} value={inviteCode} onChange={e => { setInviteCode(e.target.value.toUpperCase()); clearPhoneVerification(); }} /></label>
      <label>Recovery phone<input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e => { setPhone(e.target.value); clearPhoneVerification(); }} placeholder="024 000 0000 or +233 24 000 0000" /></label>
      {!verificationToken && <button type="button" className="staff-button staff-button-outline" disabled={phoneBusy || !email || inviteCode.length !== 8 || !phone} onClick={sendPhoneCode}>{phoneBusy ? "Please wait…" : phoneCodeRequested ? "Request another code" : "Send phone verification code"}</button>}
      {phoneCodeRequested && !verificationToken && <>
        <label>SMS verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" required minLength={8} maxLength={8} value={phoneCode} onChange={e => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 8))} /></label>
        <button type="button" className="staff-button staff-button-outline" disabled={phoneBusy || phoneCode.length !== 8} onClick={verifyPhone}>{phoneBusy ? "Checking…" : "Verify phone"}</button>
      </>}
      {verificationToken && <p className="staff-notice" role="status">Phone verified for this invitation.</p>}
      <label>Password <span className="staff-hint">At least 10 characters</span><PasswordInput autoComplete="new-password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} /></label>
      {(error || notice) && <p className={error ? "staff-error" : "staff-notice"} role={error ? "alert" : "status"}>{error || notice}</p>}
      <button className="staff-button staff-button-primary" disabled={busy || !verificationToken}>{busy ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="staff-auth-foot">Already have an account? <Link href="/sign-in">Sign in</Link></p>
  </section></main>;
}
