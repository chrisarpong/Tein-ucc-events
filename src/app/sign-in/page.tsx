"use client";

import { FormEvent, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuthActions();
  const recordLogin = useMutation(api.staff.recordLogin);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await signIn("password", { flow: "signIn", email: email.trim().toLowerCase(), password });
      const result = await recordLogin({});
      const requested = new URLSearchParams(window.location.search).get("next") || "";
      const safeNext = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/sign-in") ? requested : "";
      router.replace(result.role === "checkin" ? "/checkin" : safeNext || "/admin");
    } catch {
      setError("We couldn’t sign you in with those details. Check your email and password or ask an administrator for help.");
    } finally { setBusy(false); }
  }

  return <main className="staff-auth-page"><section className="staff-auth-card"><Link href="/" className="staff-auth-back">← Summit website</Link><p className="staff-kicker">TEIN-UCC · Staff access</p><h1>Sign in to the summit desk</h1><p className="staff-subtitle">For invited committee and event-day staff.</p><form onSubmit={submit} className="staff-form"><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<PasswordInput autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p className="staff-error" role="alert">{error}</p>}<button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><p className="staff-auth-foot">Invited to the team? <Link href="/sign-up">Create your staff account</Link></p></section></main>;
}
