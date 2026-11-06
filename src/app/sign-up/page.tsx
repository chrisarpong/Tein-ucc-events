"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordInput } from "../../components/staff/PasswordInput";

export default function SignUpPage() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { signIn } = useAuthActions(); const recordLogin = useMutation(api.staff.recordLogin); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await signIn("password", { flow: "signUp", name: name.trim(), email: email.trim().toLowerCase(), inviteCode: code.trim().toUpperCase(), password }); const result = await recordLogin({}); router.replace(result.role === "checkin" ? "/checkin" : "/admin"); }
    catch { setError("We couldn’t create the account. Check that the invite is valid, unused, and addressed to this email."); }
    finally { setBusy(false); }
  }
  return <main className="staff-auth-page"><section className="staff-auth-card"><Link href="/" className="staff-auth-back">← Summit website</Link><p className="staff-kicker">TEIN-UCC · Staff access</p><h1>Join the summit desk</h1><p className="staff-subtitle">Use the email address and one-time invite code sent by an administrator.</p><form onSubmit={submit} className="staff-form"><label>Full name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label>Invited email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>One-time invite code<input autoComplete="one-time-code" required minLength={8} maxLength={8} value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></label><label>Password <span className="staff-hint">At least 10 characters</span><PasswordInput autoComplete="new-password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className="staff-error" role="alert">{error}</p>}<button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button></form><p className="staff-auth-foot">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>;
}
