"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Attendee = { _id: string; ticketCode: string; fullName: string; phoneLast4: string; attendeeType: string; status: string; checkedInAt?: number; checkedInBy?: string };
type ScanState = { state: "checked_in" | "already_checked_in" | "not_eligible" | "not_found" | "created_and_checked_in" | "already_registered"; attendee?: Attendee };
type Detector = { detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
const attendeeTypeLabel: Record<string, string> = { student: "Student", staff: "Staff", alumni: "Alumni", guest: "Guest", executive: "Dignitary / Executive" };

export default function CheckinPage() {
  const [message, setMessage] = useState(""); const [result, setResult] = useState<ScanState | null>(null); const [camera, setCamera] = useState(false); const [busy, setBusy] = useState(false); const [walkInOpen, setWalkInOpen] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const lock = useRef(false);
  const roster = useQuery(api.checkin.roster); const counts = useQuery(api.checkin.counts);
  const checkTicket = useMutation(api.checkin.byCode); const walkIn = useMutation(api.checkin.walkIn);
  const check = useCallback(async (code: string) => { if (lock.current) return; lock.current = true; setBusy(true); try { const next = await checkTicket({ ticketCode: code.trim() }); setResult(next as ScanState); setMessage(next.state === "checked_in" ? "Check-in recorded." : next.state === "already_checked_in" ? "This attendee has already checked in." : next.state === "not_eligible" ? "This registration is not active. Please see an administrator." : "Ticket code not found."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not check in ticket."); } finally { setBusy(false); window.setTimeout(() => { lock.current = false; }, 700); } }, [checkTicket]);
  useEffect(() => {
    if (!camera) return;
    let timer = 0; let disposed = false;
    const setup = async () => {
      try {
        const detectorConstructor = (window as unknown as { BarcodeDetector?: new (options?: { formats?: string[] }) => Detector }).BarcodeDetector;
        if (!detectorConstructor) { setMessage("Camera scanning is not supported in this browser. Use the attendee list below."); setCamera(false); return; }
        const localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (disposed) { localStream.getTracks().forEach(track => track.stop()); return; }
        stream.current = localStream; if (video.current) { video.current.srcObject = localStream; await video.current.play(); }
        const detector = new detectorConstructor({ formats: ["qr_code"] });
        const scan = async () => { if (disposed || !video.current || lock.current) { if (!disposed) timer = window.setTimeout(scan, 250); return; } try { const codes = await detector.detect(video.current); const code = codes[0]?.rawValue; if (code) { const match = code.match(/WES-[A-Z0-9]{1,10}/i); if (match) { await check(match[0]); } else setMessage("That QR code is not a summit ticket."); } } catch { /* Wait for the next camera frame. */ } if (!disposed) timer = window.setTimeout(scan, 250); };
        timer = window.setTimeout(scan, 250);
      } catch { setMessage("Camera permission was unavailable. Use the attendee list below."); setCamera(false); }
    };
    void setup();
    return () => { disposed = true; window.clearTimeout(timer); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  }, [camera, check]);

  async function submitWalkIn(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const formElement = e.currentTarget; const form = new FormData(formElement); setBusy(true); try { const answer = await walkIn({ fullName: String(form.get("name")), phone: String(form.get("phone")), attendeeType: String(form.get("attendeeType")) as "student" | "staff" | "alumni" | "guest" | "executive", position: String(form.get("position") || "") || undefined, organization: String(form.get("organization") || "") || undefined, city: String(form.get("city") || "") || undefined, country: String(form.get("country") || "") || undefined, studentId: String(form.get("studentId") || "") || undefined, programme: String(form.get("programme") || "") || undefined, level: String(form.get("level") || "") || undefined }); setResult(answer); setMessage(answer.state === "created_and_checked_in" ? "Walk-in registered and checked in." : "This phone number already has an active registration."); setWalkInOpen(false); formElement.reset(); } catch (err) { setMessage(err instanceof Error ? err.message : "Could not register walk-in."); } finally { setBusy(false); } }

  return <><div className="staff-page-heading"><div><p className="staff-kicker">EVENT DAY</p><h1>Door check-in</h1><p>Check attendees in from the roster or scan their ticket QR code.</p></div><button className="staff-button staff-button-outline" onClick={() => setWalkInOpen(v => !v)}>{walkInOpen ? "Close walk-in form" : "+ Register walk-in"}</button></div>
    <div className="staff-stat-grid staff-stat-grid-compact"><article className="staff-stat-card"><span>Registered</span><strong>{counts?.registered ?? "—"}</strong></article><article className="staff-stat-card"><span>Checked in</span><strong>{counts?.checkedIn ?? "—"}</strong></article><article className="staff-stat-card"><span>Remaining</span><strong>{counts ? Math.max(counts.registered - counts.checkedIn, 0) : "—"}</strong></article></div>
    {walkInOpen && <section className="staff-section"><div className="staff-section-heading"><div><h2>Register a walk-in</h2><p>Walk-ins are checked in immediately and are not opted into SMS.</p></div></div><form className="staff-form staff-inline-form" onSubmit={submitWalkIn}><label>Full name<input name="name" required minLength={2} /></label><label>Phone number<input name="phone" required inputMode="tel" /></label><label>Type<select name="attendeeType"><option value="student">Student</option><option value="staff">Staff</option><option value="alumni">Alumni</option><option value="guest">Guest</option><option value="executive">Dignitary / Executive</option></select></label><label>Position / title<input name="position" maxLength={120} /></label><label>Organization / institution<input name="organization" maxLength={160} /></label><label>City / region<input name="city" maxLength={100} /></label><label>Country<input name="country" maxLength={100} /></label><label>Student ID<input name="studentId" /></label><label>Programme<input name="programme" /></label><label>Level<input name="level" /></label><button className="staff-button staff-button-primary" disabled={busy}>{busy ? "Saving…" : "Register and check in"}</button></form></section>}
    <section className="staff-section"><div className="staff-section-heading"><div><h2>Scan a ticket</h2><p>Allow camera access to scan a ticket QR code.</p></div></div>{camera ? <div className="staff-camera"><video ref={video} muted playsInline aria-label="Camera scanning ticket QR code"/><button className="staff-button staff-button-outline" onClick={() => setCamera(false)}>Stop camera</button></div> : <button className="staff-button staff-button-primary" onClick={() => { setMessage(""); setCamera(true); }}>Start camera scanner</button>}</section>
    <section className="staff-section"><div className="staff-section-heading"><div><h2>Registered attendees</h2><p>{counts ? `${counts.registered} active registrations · ${counts.checkedIn} checked in` : "Loading attendance…"} Check people in directly from this list.</p></div></div>
      {roster && roster.length > 0 && <div className="staff-match-list" aria-label="Registered attendees">{roster.map(person => <article key={person._id}><div><strong>{person.fullName}</strong><small>{person.ticketCode} · •••• {person.phoneLast4} · {attendeeTypeLabel[person.attendeeType] || person.attendeeType}{person.checkedInAt ? ` · Checked in ${new Date(person.checkedInAt).toLocaleTimeString()}` : ""}</small></div><button className="staff-button staff-button-small" onClick={() => void check(person.ticketCode)} disabled={busy || Boolean(person.checkedInAt)}>{person.checkedInAt ? "Checked in" : busy ? "Checking in…" : "Check in"}</button></article>)}</div>}
      {roster?.length === 0 && <p className="staff-empty">No active registrations yet.</p>}{roster === undefined && <p className="staff-empty">Loading registered attendees…</p>}
      {message && <p className="staff-notice" role="status">{message}</p>}{result?.attendee && <article className={`staff-checkin-result ${result.state === "checked_in" ? "is-success" : ""}`}><p className="staff-kicker">{result.state.replaceAll("_", " ")}</p><h2>{result.attendee.fullName}</h2><p>{result.attendee.ticketCode} · •••• {result.attendee.phoneLast4} · {attendeeTypeLabel[result.attendee.attendeeType] || result.attendee.attendeeType}</p>{result.attendee.checkedInAt && <small>Checked in {new Date(result.attendee.checkedInAt).toLocaleTimeString()} {result.attendee.checkedInBy ? `by ${result.attendee.checkedInBy}` : ""}</small>}</article>}
      <p className="staff-privacy-note">Names and masked phone digits are displayed only to authorized event staff.</p>
    </section>
  </>;
}
