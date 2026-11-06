"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function StaffGate({
  children,
  allowCheckin = false,
}: {
  children: React.ReactNode;
  allowCheckin?: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const staff = useQuery(api.staff.me, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/sign-in?next=${encodeURIComponent(path || "/admin")}`);
    }
  }, [isAuthenticated, isLoading, path, router]);

  if (isLoading || (isAuthenticated && staff === undefined)) {
    return <main className="staff-loading" aria-live="polite">Checking staff access…</main>;
  }
  if (!isAuthenticated) {
    return <main className="staff-loading">Taking you to staff sign in…</main>;
  }
  if (!staff) {
    return (
      <main className="staff-loading">
        <section className="staff-message">
          <h1>Staff access is unavailable</h1>
          <p>This account is not active for the summit management system. Ask an administrator for an invite.</p>
          <Link href="/sign-in">Return to sign in</Link>
        </section>
      </main>
    );
  }
  if (staff.role === "checkin" && !allowCheckin) {
    return (
      <main className="staff-loading">
        <section className="staff-message">
          <h1>Check-in access only</h1>
          <p>Your account can use the event door check-in tools.</p>
          <Link className="staff-button staff-button-primary" href="/checkin">Open check-in</Link>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
