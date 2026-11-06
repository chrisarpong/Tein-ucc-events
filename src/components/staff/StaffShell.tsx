"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const items = [
  ["Overview", "/admin"],
  ["Attendees", "/admin/attendees"],
  ["Team", "/admin/team"],
  ["Event settings", "/admin/settings"],
  ["SMS", "/admin/messages"],
  ["Activity log", "/admin/audit"],
] as const;

export function StaffShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const staff = useQuery(api.staff.me);
  const { signOut } = useAuthActions();
  async function handleSignOut() { await signOut(); router.replace("/sign-in"); }
  return (
    <div className="staff-app">
      <aside className="staff-sidebar">
        <Link href="/admin" className="staff-brand"><span><strong>Summit desk</strong><small>TEIN-UCC · Staff</small></span></Link>
        <nav aria-label="Staff navigation">
          {staff?.role === "admin" && items.map(([label, href]) => <Link key={href} className={path === href || (href !== "/admin" && path.startsWith(href)) ? "is-current" : ""} href={href}>{label}</Link>)}
          <Link className={path.startsWith("/checkin") ? "is-current" : ""} href="/checkin">Door check-in</Link>
          <Link className={path.startsWith("/security") ? "is-current" : ""} href="/security">Account security</Link>
        </nav>
        <div className="staff-side-user"><strong>{staff?.name || staff?.email}</strong><small>{staff?.role === "admin" ? "Administrator" : "Check-in staff"}</small><button onClick={handleSignOut}>Sign out</button></div>
      </aside>
      <div className="staff-workspace">
        <header className="staff-topbar"><span>Women Empowerment Summit</span><span>{staff?.email}</span><button className="staff-topbar-signout" onClick={handleSignOut}>Sign out</button></header>
        <main className="staff-main">{children}</main>
      </div>
    </div>
  );
}
