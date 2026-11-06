"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminHome() {
  const stats = useQuery(api.stats.dashboard);
  const cards = [
    ["Registered", stats?.registered, "All active attendee registrations"],
    ["Checked in", stats?.checkedIn, "Attendance recorded at the door"],
    ["Waitlisted", stats?.waitlisted, "Waiting for an available place"],
    ["No shows", stats?.noShows, "Registered, not yet checked in"],
  ] as const;
  return <>
    <div className="staff-page-heading"><div><p className="staff-kicker">SUMMIT OPERATIONS</p><h1>Good to see you.</h1><p>Registration and event-day operations in one place.</p></div><span className={`staff-status ${stats?.registrationOpen ? "is-open" : ""}`}><i />{stats === undefined ? "Loading event" : stats.registrationOpen ? "Registration open" : "Registration closed"}</span></div>
    <div className="staff-stat-grid">{cards.map(([label, value, hint]) => <article className="staff-stat-card" key={label}><span>{label}</span><strong>{value ?? "—"}</strong><small>{hint}</small></article>)}</div>
    <section className="staff-section"><div className="staff-section-heading"><div><h2>Today’s tools</h2><p>Go directly to the task you need.</p></div></div><div className="staff-shortcuts"><Link href="/admin/attendees"><strong>Manage attendees</strong><span>Search registrations, update records, download a CSV →</span></Link><Link href="/checkin"><strong>Open the check-in desk</strong><span>Scan a pass, look up a guest, or register a walk-in →</span></Link><Link href="/admin/team"><strong>Staff and invitations</strong><span>Manage staff access and one-time invites →</span></Link></div></section>
    <p className="staff-privacy-note">Attendee contact details and accessibility information are visible only to authorized administrators. Check-in staff see only what is needed at the door.</p>
  </>;
}
