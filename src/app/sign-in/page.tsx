"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordInput } from "../../components/staff/PasswordInput";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuthActions();
  const recordLogin = useMutation(api.staff.recordLogin);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passwordChanged") === "success") setNotice("Password updated. Sign in with your new password.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const identifier = email.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      if (isEmail) {
        await signIn("password", { flow: "signIn", email: identifier.toLowerCase(), password });
      } else {
        await signIn("phone-password", { phone: identifier, password });
      }
      const result = await recordLogin({});
      const requested = new URLSearchParams(window.location.search).get("next") || "";
      const safeNext = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/sign-in") ? requested : "";
      router.replace(result.role === "checkin" ? "/checkin" : safeNext || "/admin");
    } catch {
      setError("We couldn’t sign you in with those details. Check your email and password or ask an administrator for help.");
    } finally { setBusy(false); }
  }

  return <main className="staff-auth-page"><section className="staff-auth-card"><Link href="/" className="staff-auth-back">← Summit website</Link><p className="staff-kicker">TEIN-UCC · Staff access</p><h1>Sign in to the summit desk</h1><p className="staff-subtitle">For invited committee and event-day staff.</p>{notice && <p className="staff-notice" role="status">{notice}</p>}<form onSubmit={submit} className="staff-form"><label>Email or verified phone number<input type="text" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.com or 024 000 0000" /></label><label>Password<PasswordInput autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className="staff-error" role="alert">{error}</p>}<button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="staff-auth-foot"><Link href="/forgot-password">Forgot password?</Link></p><p className="staff-auth-foot">Invited to the team? <Link href="/sign-up">Create your staff account</Link></p></section></main>;
}
